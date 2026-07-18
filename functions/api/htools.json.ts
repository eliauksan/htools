import {
  PUBLIC_API_CACHE_KEYS,
  cachedPublicJson,
  getDatabase,
  getPublicApiCacheVersion,
  json,
  toolSourceFromRow,
  type Env,
  type ToolRow
} from "../_shared";

const SOURCE_PUBLIC_KEY = "source_public_enabled";
const SOURCE_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store"
};

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, {
    status: 204,
    headers: SOURCE_HEADERS
  });

export const onRequestGet: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  try {
    const cacheVersion = await getPublicApiCacheVersion(env);
    return await cachedPublicJson(request, async () => {
      const db = await getDatabase(env);

      if (!(await isSourcePublic(db))) {
        throw new Error("Public source is disabled.");
      }

      const result = await db.prepare(
        "SELECT * FROM tools ORDER BY updated_at DESC, created_at DESC"
      ).all<ToolRow>();

      return result.results.map(toolSourceFromRow);
    }, {
      cacheKey: PUBLIC_API_CACHE_KEYS.toolSource,
      cacheVersion,
      ttlSeconds: 30,
      waitUntil,
      headers: SOURCE_HEADERS,
      responseCacheControl: "public, no-cache, max-age=0",
      shouldCache: (data) => Array.isArray(data) && data.length > 0
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load public source.";
    return json(
      { error: message },
      {
        status: message === "Public source is disabled." ? 404 : 400,
        headers: SOURCE_HEADERS
      }
    );
  }
};

async function isSourcePublic(db: D1Database) {
  const row = await db.prepare("SELECT value FROM app_settings WHERE key = ?")
    .bind(SOURCE_PUBLIC_KEY)
    .first<{ value: string }>();

  if (!row) {
    return false;
  }

  try {
    const parsed = JSON.parse(row.value) as { enabled?: unknown };
    return parsed.enabled === true;
  } catch {
    return false;
  }
}
