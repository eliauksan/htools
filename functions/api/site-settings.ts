import {
  PUBLIC_API_CACHE_KEYS,
  cachedPublicJson,
  getPublicApiCacheVersion,
  getSiteSettings,
  getUmamiSettings,
  jsonError,
  type Env
} from "../_shared";

const SITE_SETTINGS_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache"
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  try {
    const isBasic = new URL(request.url).searchParams.get("scope") === "basic";
    const cacheVersion = await getPublicApiCacheVersion(env);
    return await cachedPublicJson(request, async () => {
      const [settings, umamiSettings] = await Promise.all([
        getSiteSettings(env),
        getUmamiSettings(env)
      ]);
      return {
        settings: isBasic
          ? {
              ...settings,
              aboutContent: { zh: "", en: "" },
              privacyContent: { zh: "", en: "" },
              termsContent: { zh: "", en: "" }
            }
          : settings,
        umami: umamiSettings.enabled
          ? umamiSettings
          : { enabled: false, scriptUrl: "", websiteId: "" }
      };
    }, {
      cacheKey: isBasic
        ? PUBLIC_API_CACHE_KEYS.siteSettingsBasic
        : PUBLIC_API_CACHE_KEYS.siteSettingsFull,
      cacheVersion,
      ttlSeconds: 15,
      waitUntil
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load site settings.";
    return jsonError(message, "SERVER_ERROR", {
      status: 500,
      headers: SITE_SETTINGS_HEADERS
    });
  }
};
