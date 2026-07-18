import {
  PUBLIC_API_CACHE_KEYS,
  cachedPublicJson,
  getProxySettings,
  getPublicApiCacheVersion,
  jsonError,
  type Env
} from "../_shared";

export const onRequestGet: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  try {
    const cacheVersion = await getPublicApiCacheVersion(env);
    return await cachedPublicJson(request, async () => ({
      settings: await getProxySettings(env)
    }), {
      cacheKey: PUBLIC_API_CACHE_KEYS.proxySettings,
      cacheVersion,
      ttlSeconds: 15,
      waitUntil
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load proxy settings.";
    return jsonError(message, "SERVER_ERROR", { status: 500 });
  }
};
