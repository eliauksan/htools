import type { UmamiSettings } from "./types";

export function normalizeUmamiScriptUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed || trimmed.length > 2048) return "";

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

export function normalizeUmamiWebsiteId(value: string) {
  return value.trim().slice(0, 200);
}

export function hasCompleteUmamiSettings(
  settings: Pick<UmamiSettings, "scriptUrl" | "websiteId">
) {
  return Boolean(
    normalizeUmamiScriptUrl(settings.scriptUrl) &&
      normalizeUmamiWebsiteId(settings.websiteId)
  );
}
