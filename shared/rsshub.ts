const RSSHUB_ROUTE_PREFIX = "rsshub://";

export const DEFAULT_RSSHUB_BASE_URL = "https://rsshub.rssforever.com/";

export function normalizeRssHubRouteUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed.toLowerCase().startsWith(RSSHUB_ROUTE_PREFIX)) return "";

  const route = trimmed.slice(RSSHUB_ROUTE_PREFIX.length);
  const queryIndex = route.indexOf("?");
  const pathname = (queryIndex >= 0 ? route.slice(0, queryIndex) : route)
    .replace(/^\/+|\/+$/g, "");
  const query = queryIndex >= 0 ? route.slice(queryIndex) : "";

  if (
    !pathname ||
    pathname.includes("//") ||
    pathname.includes("\\") ||
    /\s|#/.test(pathname) ||
    /\s|#/.test(query) ||
    pathname.split("/").some((segment) => segment === "." || segment === "..")
  ) {
    return "";
  }

  return `${RSSHUB_ROUTE_PREFIX}${pathname}${query}`;
}

export function normalizeRssHubBaseUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password
    ) {
      return "";
    }
    url.search = "";
    url.hash = "";
    url.pathname = `${url.pathname.replace(/\/+$/, "")}/`;
    return url.toString();
  } catch {
    return "";
  }
}

export function resolveRssHubRouteUrl(routeUrl: string, baseUrl: string) {
  const route = normalizeRssHubRouteUrl(routeUrl);
  const base = normalizeRssHubBaseUrl(baseUrl);
  if (!route || !base) return "";

  const resolved = new URL(route.slice(RSSHUB_ROUTE_PREFIX.length), base);
  return resolved.origin === new URL(base).origin ? resolved.toString() : "";
}
