import {
  createToken,
  getDatabase,
  json,
  jsonError,
  verifyTurnstileRequest,
  verifyPassword,
  type Env
} from "../../_shared";

const FAILURE_WINDOW_MS = 10 * 60 * 1000;
const BLOCK_DURATION_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

async function getClientKey(request: Request) {
  const forwarded = request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim();
  const address = request.headers.get("CF-Connecting-IP")?.trim() || forwarded || "unknown";
  const userAgent = request.headers.get("User-Agent")?.slice(0, 200) ?? "";
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${address}\n${userAgent}`)
  );
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function readLoginBlock(env: Env, clientKey: string) {
  const db = await getDatabase(env);
  const row = await db.prepare(
    "SELECT blocked_until FROM admin_login_attempts WHERE client_key = ?"
  ).bind(clientKey).first<{ blocked_until: string | null }>();
  const blockedUntil = row?.blocked_until ? Date.parse(row.blocked_until) : 0;
  return blockedUntil > Date.now() ? Math.ceil((blockedUntil - Date.now()) / 1000) : 0;
}

async function recordLoginFailure(env: Env, clientKey: string) {
  const db = await getDatabase(env);
  const now = new Date();
  const windowStart = new Date(now.getTime() - FAILURE_WINDOW_MS).toISOString();
  const blockUntil = new Date(now.getTime() + BLOCK_DURATION_MS).toISOString();
  await db.prepare(
    `INSERT INTO admin_login_attempts
       (client_key, failed_count, window_started_at, blocked_until, updated_at)
     VALUES (?, 1, ?, NULL, CURRENT_TIMESTAMP)
     ON CONFLICT(client_key) DO UPDATE SET
       failed_count = CASE
         WHEN window_started_at < ? THEN 1
         ELSE failed_count + 1
       END,
       window_started_at = CASE
         WHEN window_started_at < ? THEN excluded.window_started_at
         ELSE window_started_at
       END,
       blocked_until = CASE
         WHEN (CASE WHEN window_started_at < ? THEN 1 ELSE failed_count + 1 END) >= ?
         THEN ? ELSE NULL
       END,
       updated_at = CURRENT_TIMESTAMP`
  ).bind(clientKey, now.toISOString(), windowStart, windowStart, windowStart, MAX_FAILURES, blockUntil).run();
}

async function clearLoginFailures(env: Env, clientKey: string) {
  const db = await getDatabase(env);
  await db.prepare("DELETE FROM admin_login_attempts WHERE client_key = ?").bind(clientKey).run();
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const payload = (await request.json()) as {
      password?: unknown;
      turnstileToken?: unknown;
    };
    const password =
      typeof payload.password === "string" ? payload.password.trim() : "";
    const turnstileError = await verifyTurnstileRequest(
      request,
      env,
      payload.turnstileToken
    );
    if (turnstileError) return turnstileError;

    const clientKey = await getClientKey(request);
    const retryAfter = await readLoginBlock(env, clientKey);
    if (retryAfter > 0) {
      return jsonError("Too many failed login attempts. Try again later.", "RATE_LIMITED", {
        status: 429,
        headers: { "Retry-After": String(retryAfter) }
      });
    }

    if (!password || !(await verifyPassword(password, env))) {
      await recordLoginFailure(env, clientKey);
      return jsonError("Invalid password.", "INVALID_PASSWORD", { status: 401 });
    }

    await clearLoginFailures(env, clientKey);

    return json({ token: await createToken(env) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to login.";
    return jsonError(message, "INVALID_REQUEST", { status: 400 });
  }
};
