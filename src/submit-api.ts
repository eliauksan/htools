import type {
  GitHubAuthState,
  SubmissionInput,
  SubmissionResult
} from "./types";
import {
  ApiRequestTimeoutError,
  DEFAULT_API_REQUEST_TIMEOUT_MS,
  requestJsonWithTimeout
} from "./api-client";

const SUBMISSION_API_TIMEOUT_MS = 20_000;
const SUBMISSION_AUTH_TIMEOUT_MS = DEFAULT_API_REQUEST_TIMEOUT_MS;

async function requestSubmissionJsonWithTimeout<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = SUBMISSION_API_TIMEOUT_MS
) {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    return await readJson<T>(response);
  } catch (error) {
    if (controller.signal.aborted) throw new ApiRequestTimeoutError(timeoutMs);
    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

export class SubmissionApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfter: number,
    readonly existingTool: { name: string; url: string } | null,
    readonly code?: string
  ) {
    super(message);
  }
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "Request failed";
    const existingTool =
      typeof payload === "object" && payload !== null && "existingTool" in payload &&
      typeof payload.existingTool === "object" && payload.existingTool !== null &&
      "name" in payload.existingTool && typeof payload.existingTool.name === "string" &&
      "url" in payload.existingTool && typeof payload.existingTool.url === "string"
        ? { name: payload.existingTool.name, url: payload.existingTool.url }
        : null;
    const code =
      typeof payload === "object" && payload !== null && "code" in payload &&
      typeof payload.code === "string"
        ? payload.code
        : undefined;
    throw new SubmissionApiError(
      message,
      response.status,
      Number.parseInt(response.headers.get("Retry-After") ?? "0", 10) || 0,
      existingTool,
      code
    );
  }
  return payload as T;
}

export type SubmissionTurnstileConfig = {
  turnstileEnabled: boolean;
  turnstileSiteKey: string;
};

export async function loadSubmissionTurnstileConfig(): Promise<SubmissionTurnstileConfig> {
  return requestJsonWithTimeout<SubmissionTurnstileConfig>("/api/auth/config", {
    cache: "no-store",
    headers: { Accept: "application/json" }
  });
}

export async function loadGitHubAuthState(): Promise<GitHubAuthState> {
  return requestSubmissionJsonWithTimeout<GitHubAuthState>("/api/github/me", {
    cache: "no-store",
    headers: { Accept: "application/json" }
  }, SUBMISSION_AUTH_TIMEOUT_MS);
}

export async function submitTool(
  input: SubmissionInput,
  turnstileToken = ""
): Promise<SubmissionResult> {
  const data = await requestSubmissionJsonWithTimeout<{ submission: SubmissionResult }>("/api/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, turnstileToken })
  });
  return data.submission;
}

export async function logoutGitHub(): Promise<void> {
  await requestSubmissionJsonWithTimeout<{ success: true }>(
    "/api/github/logout",
    { method: "POST" },
    SUBMISSION_AUTH_TIMEOUT_MS
  );
}
