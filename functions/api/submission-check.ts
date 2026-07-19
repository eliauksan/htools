import { getDatabase, json, jsonError, type Env } from "../_shared";

type SubmissionCheckPayload = {
  url?: unknown;
};

const MAX_REQUEST_BODY_BYTES = 4 * 1024;
const MAX_PROJECT_URL_LENGTH = 2048;
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 30;

class SubmissionPayloadError extends Error {
  constructor(
    message: string,
    readonly status = 400
  ) {
    super(message);
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const retryAfter = await checkSubmissionRateLimit(request);
    if (retryAfter > 0) {
      return jsonError("Too many submission checks. Try again later.", "RATE_LIMITED", {
        status: 429,
        headers: { "Retry-After": String(retryAfter) }
      });
    }

    const payload = (await readLimitedJsonBody(request)) as SubmissionCheckPayload;
    if (typeof payload.url !== "string" || !payload.url.trim()) {
      return jsonError("A project URL is required.", "INVALID_REQUEST", { status: 400 });
    }
    if (payload.url.length > MAX_PROJECT_URL_LENGTH) {
      return jsonError("The project URL is too long.", "INVALID_REQUEST", { status: 400 });
    }

    const canonicalUrl = getCanonicalSubmissionUrl(payload.url);
    if (!canonicalUrl) {
      return jsonError("Enter a valid HTTP or HTTPS URL.", "INVALID_REQUEST", {
        status: 400
      });
    }

    const db = await getDatabase(env);
    const result = await db
      .prepare("SELECT url, demo_url FROM tools")
      .all<{ url: string; demo_url: string }>();
    const exists = (result.results ?? []).some(
      (tool) =>
        getCanonicalSubmissionUrl(tool.url) === canonicalUrl ||
        (tool.demo_url && getCanonicalSubmissionUrl(tool.demo_url) === canonicalUrl)
    );

    return json({ exists });
  } catch (error) {
    if (error instanceof SubmissionPayloadError) {
      return jsonError(error.message, "INVALID_REQUEST", { status: error.status });
    }
    return jsonError("Unable to check the submitted URL.", "SERVER_ERROR", {
      status: 500
    });
  }
};

async function readLimitedJsonBody(request: Request) {
  const declaredLength = Number(request.headers.get("Content-Length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BODY_BYTES) {
    throw new SubmissionPayloadError("The request body is too large.", 413);
  }

  if (!request.body) {
    throw new SubmissionPayloadError("A JSON request body is required.");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_REQUEST_BODY_BYTES) {
      await reader.cancel();
      throw new SubmissionPayloadError("The request body is too large.", 413);
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(body)) as unknown;
  } catch {
    throw new SubmissionPayloadError("The request body must be valid JSON.");
  }
}

async function checkSubmissionRateLimit(request: Request) {
  if (typeof caches === "undefined") return 0;

  try {
    const cache = (caches as CacheStorage & { default: Cache }).default;
    const forwarded = request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim();
    const address = request.headers.get("CF-Connecting-IP")?.trim() || forwarded || "unknown";
    const userAgent = request.headers.get("User-Agent")?.slice(0, 200) ?? "";
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${address}\n${userAgent}`)
    );
    const clientKey = Array.from(
      new Uint8Array(digest),
      (byte) => byte.toString(16).padStart(2, "0")
    ).join("");
    const windowNumber = Math.floor(Date.now() / (RATE_LIMIT_WINDOW_SECONDS * 1000));
    const cacheUrl = new URL(request.url);
    cacheUrl.pathname = `/__htools-rate/submission-check/${windowNumber}/${clientKey}`;
    cacheUrl.search = "";
    const cacheKey = new Request(cacheUrl.toString(), { method: "GET" });
    const cached = await cache.match(cacheKey);
    const count = Number(cached ? await cached.text() : 0) || 0;
    const secondsIntoWindow = Math.floor(Date.now() / 1000) % RATE_LIMIT_WINDOW_SECONDS;
    const retryAfter = RATE_LIMIT_WINDOW_SECONDS - secondsIntoWindow;

    if (count >= RATE_LIMIT_MAX_REQUESTS) return retryAfter;

    await cache.put(
      cacheKey,
      new Response(String(count + 1), {
        headers: { "Cache-Control": `max-age=${RATE_LIMIT_WINDOW_SECONDS + 5}` }
      })
    );
    return 0;
  } catch {
    return 0;
  }
}

function getCanonicalSubmissionUrl(value: string) {
  const normalized = /^[a-z][a-z0-9+.-]*:\/\//i.test(value.trim())
    ? value.trim()
    : `https://${value.trim()}`;

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    parsed.hash = "";
    parsed.hostname = parsed.hostname.toLowerCase();
    const githubMatch = parsed.hostname === "github.com"
      ? parsed.pathname.match(/^\/([^/]+)\/([^/]+)/)
      : null;
    if (githubMatch) {
      return `github.com/${githubMatch[1]}/${githubMatch[2].replace(/\.git$/i, "")}`.toLowerCase();
    }
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^(utm_.+|ref|source)$/i.test(key)) parsed.searchParams.delete(key);
    }
    parsed.searchParams.sort();
    parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}${parsed.pathname}${parsed.search}`;
  } catch {
    return "";
  }
}
