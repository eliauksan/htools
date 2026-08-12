import {
  getDatabase,
  InvalidRequestError,
  jsonError,
  writeErrorResponse,
  type Env
} from "./_shared";
import {
  getAdminImageUploadValidationCode,
  type AdminImageUploadValidationCode
} from "../shared/image-upload";

export const IMAGE_BED_CHANNELS = [
  "telegram",
  "cfr2",
  "s3",
  "discord",
  "huggingface",
  "webdav"
] as const;
export const IMAGE_BED_UPLOAD_NAME_TYPES = [
  "default",
  "index",
  "origin",
  "short"
] as const;

export type ImageBedUploadChannel = (typeof IMAGE_BED_CHANNELS)[number];
export type ImageBedUploadNameType = (typeof IMAGE_BED_UPLOAD_NAME_TYPES)[number];

export type ImageBedSettings = {
  available: boolean;
  enabled: boolean;
  baseUrl: string;
  uploadChannel: ImageBedUploadChannel;
  channelName: string;
  uploadNameType: ImageBedUploadNameType;
  uploadFolder: string;
};

type ImageBedSettingsInput = Partial<Record<
  | "enabled"
  | "baseUrl"
  | "uploadChannel"
  | "channelName"
  | "uploadNameType"
  | "uploadFolder",
  unknown
>>;

type ImageBedErrorCode =
  | AdminImageUploadValidationCode
  | "IMAGE_BED_NOT_CONFIGURED"
  | "IMAGE_BED_DISABLED"
  | "IMAGE_BED_URL_INVALID"
  | "IMAGE_UPLOAD_TIMEOUT"
  | "IMAGE_UPLOAD_FAILED"
  | "IMAGE_UPLOAD_RESPONSE_INVALID";

const IMAGE_BED_SETTINGS_KEY = "image_bed_settings";
const IMAGE_UPLOAD_TIMEOUT_MS = 75_000;
class ImageBedError extends Error {
  constructor(
    message: string,
    readonly code: ImageBedErrorCode,
    readonly status: number
  ) {
    super(message);
    this.name = "ImageBedError";
  }
}

function normalizeBaseUrl(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw || raw.length > 2048) return "";
  const input = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const url = new URL(input);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return `${url.origin}${url.pathname.replace(/\/?$/, "/")}`;
  } catch {
    return "";
  }
}

function normalizeUploadChannel(value: unknown): ImageBedUploadChannel {
  return IMAGE_BED_CHANNELS.includes(value as ImageBedUploadChannel)
    ? value as ImageBedUploadChannel
    : "telegram";
}

function normalizeUploadNameType(value: unknown): ImageBedUploadNameType {
  return IMAGE_BED_UPLOAD_NAME_TYPES.includes(value as ImageBedUploadNameType)
    ? value as ImageBedUploadNameType
    : "default";
}

function normalizeOptionalName(value: unknown, maximumLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maximumLength) : "";
}

function normalizeUploadFolder(value: unknown) {
  const folder = normalizeOptionalName(value, 200)
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
  if (!folder) return "";
  if (folder.split("/").some((segment) => !segment || segment === "." || segment === "..")) {
    throw new InvalidRequestError("image upload folder is invalid.");
  }
  return folder;
}

function defaultSettings(env: Env): ImageBedSettings {
  return {
    available: Boolean(env.IMGBED_TOKEN?.trim()),
    enabled: false,
    baseUrl: "",
    uploadChannel: "telegram",
    channelName: "",
    uploadNameType: "default",
    uploadFolder: ""
  };
}

export async function getImageBedSettings(env: Env): Promise<ImageBedSettings> {
  const fallback = defaultSettings(env);
  const db = await getDatabase(env);
  const row = await db.prepare("SELECT value FROM app_settings WHERE key = ?")
    .bind(IMAGE_BED_SETTINGS_KEY)
    .first<{ value: string }>();
  if (!row) return fallback;

  try {
    const parsed = JSON.parse(row.value) as ImageBedSettingsInput;
    const baseUrl = normalizeBaseUrl(parsed.baseUrl);
    return {
      available: fallback.available,
      enabled: fallback.available && parsed.enabled === true && Boolean(baseUrl),
      baseUrl,
      uploadChannel: normalizeUploadChannel(parsed.uploadChannel),
      channelName: normalizeOptionalName(parsed.channelName, 80),
      uploadNameType: normalizeUploadNameType(parsed.uploadNameType),
      uploadFolder: normalizeUploadFolder(parsed.uploadFolder)
    };
  } catch {
    return fallback;
  }
}

export async function saveImageBedSettings(env: Env, payload: ImageBedSettingsInput) {
  const available = Boolean(env.IMGBED_TOKEN?.trim());
  const enabled = payload.enabled === true;
  const rawBaseUrl = typeof payload.baseUrl === "string" ? payload.baseUrl.trim() : "";
  const baseUrl = normalizeBaseUrl(payload.baseUrl);
  if (rawBaseUrl && !baseUrl) {
    throw new ImageBedError(
      "Enter a valid HTTP or HTTPS image bed URL.",
      "IMAGE_BED_URL_INVALID",
      400
    );
  }
  if (enabled && !available) {
    throw new ImageBedError(
      "ImgBed API token is not configured.",
      "IMAGE_BED_NOT_CONFIGURED",
      400
    );
  }
  if (enabled && !baseUrl) {
    throw new ImageBedError(
      "Enter a valid HTTP or HTTPS image bed URL.",
      "IMAGE_BED_URL_INVALID",
      400
    );
  }

  const stored = {
    enabled,
    baseUrl,
    uploadChannel: normalizeUploadChannel(payload.uploadChannel),
    channelName: normalizeOptionalName(payload.channelName, 80),
    uploadNameType: normalizeUploadNameType(payload.uploadNameType),
    uploadFolder: normalizeUploadFolder(payload.uploadFolder)
  };
  const db = await getDatabase(env);
  await db.prepare(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
  ).bind(IMAGE_BED_SETTINGS_KEY, JSON.stringify(stored)).run();
  return getImageBedSettings(env);
}

function resolveUploadedUrl(value: unknown, baseUrl: string) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value.trim(), baseUrl);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export async function uploadImageToImageBed(env: Env, file: File) {
  const settings = await getImageBedSettings(env);
  if (!settings.available) {
    throw new ImageBedError(
      "ImgBed API token is not configured.",
      "IMAGE_BED_NOT_CONFIGURED",
      400
    );
  }
  if (!settings.enabled || !settings.baseUrl) {
    throw new ImageBedError("Image upload is disabled.", "IMAGE_BED_DISABLED", 409);
  }
  const validationCode = getAdminImageUploadValidationCode(file);
  if (validationCode === "IMAGE_FILE_INVALID") {
    throw new ImageBedError("Choose a supported image file.", validationCode, 400);
  }
  if (validationCode === "IMAGE_FILE_TOO_LARGE") {
    throw new ImageBedError(
      "Image files must be no larger than 10 MB.",
      validationCode,
      413
    );
  }

  const uploadUrl = new URL("upload", settings.baseUrl);
  uploadUrl.searchParams.set("returnFormat", "full");
  uploadUrl.searchParams.set("uploadChannel", settings.uploadChannel);
  uploadUrl.searchParams.set("uploadNameType", settings.uploadNameType);
  uploadUrl.searchParams.set("serverCompress", "true");
  uploadUrl.searchParams.set("autoRetry", "true");
  if (settings.channelName) uploadUrl.searchParams.set("channelName", settings.channelName);
  if (settings.uploadFolder) uploadUrl.searchParams.set("uploadFolder", settings.uploadFolder);

  const body = new FormData();
  body.append("file", file, file.name);
  let response: Response;
  try {
    response = await fetch(uploadUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.IMGBED_TOKEN!.trim()}` },
      body,
      signal: AbortSignal.timeout(IMAGE_UPLOAD_TIMEOUT_MS)
    });
  } catch (error) {
    const timedOut = error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError");
    throw new ImageBedError(
      timedOut ? "Image upload timed out." : "Image upload request failed.",
      timedOut ? "IMAGE_UPLOAD_TIMEOUT" : "IMAGE_UPLOAD_FAILED",
      timedOut ? 504 : 502
    );
  }

  if (!response.ok) {
    throw new ImageBedError("Image bed rejected the upload.", "IMAGE_UPLOAD_FAILED", 502);
  }

  const payload = await response.json().catch(() => null) as unknown;
  const result = Array.isArray(payload) ? payload[0] : null;
  const record = result && typeof result === "object"
    ? result as { publicUrl?: unknown; src?: unknown }
    : null;
  const url = resolveUploadedUrl(record?.publicUrl, settings.baseUrl) ||
    resolveUploadedUrl(record?.src, settings.baseUrl);
  if (!url) {
    throw new ImageBedError(
      "Image bed returned an invalid response.",
      "IMAGE_UPLOAD_RESPONSE_INVALID",
      502
    );
  }

  return { url, name: file.name, size: file.size, type: file.type };
}

export function writeImageBedErrorResponse(error: unknown, fallback: string) {
  if (error instanceof ImageBedError) {
    return jsonError(error.message, error.code, { status: error.status });
  }
  return writeErrorResponse(error, fallback);
}
