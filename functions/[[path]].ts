import type { Env } from "./_shared";

const FILE_EXTENSION_PATTERN = /\/[^/]+\.[^/]+$/;

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  if (url.pathname.startsWith("/api/")) {
    return withRobotsPolicy(await context.next(), true);
  }

  if (
    (request.method !== "GET" && request.method !== "HEAD") ||
    FILE_EXTENSION_PATTERN.test(url.pathname)
  ) {
    return context.next();
  }

  const response = await context.next();

  if (response.status !== 404) {
    return withRobotsPolicy(response, shouldBlockIndexing(url));
  }

  const indexUrl = new URL("/index.html", request.url);
  const indexResponse = await env.ASSETS.fetch(new Request(indexUrl, request));
  return withRobotsPolicy(indexResponse, shouldBlockIndexing(url));
};

function shouldBlockIndexing(url: URL) {
  const pathname = normalizePathname(url.pathname);

  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/api" ||
    pathname.startsWith("/api/") ||
    url.searchParams.has("preview") ||
    url.searchParams.has("contentItem") ||
    !isKnownPublicPath(pathname)
  );
}

function isKnownPublicPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/tools" ||
    pathname.startsWith("/tools/") ||
    pathname === "/articles" ||
    pathname.startsWith("/articles/") ||
    pathname === "/submit" ||
    pathname === "/about" ||
    pathname === "/privacy" ||
    pathname === "/terms"
  );
}

function normalizePathname(pathname: string) {
  return pathname.replace(/\/+$/, "") || "/";
}

function withRobotsPolicy(response: Response, blockIndexing: boolean) {
  if (!blockIndexing) return response;

  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText
  });
}
