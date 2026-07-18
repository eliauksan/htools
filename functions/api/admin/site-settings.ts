import {
  invalidatePublicApiCache,
  json,
  patchSiteSettings,
  requireAdmin,
  writeErrorResponse,
  type SiteSettingsPatch,
  type Env
} from "../../_shared";

const SITE_SETTINGS_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache"
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  try {
    const payload = (await request.json()) as SiteSettingsPatch;
    const settings = await patchSiteSettings(env, payload);
    await invalidatePublicApiCache(env);
    return json({ settings }, { headers: SITE_SETTINGS_HEADERS });
  } catch (error) {
    return writeErrorResponse(error, "Unable to save site settings.", SITE_SETTINGS_HEADERS);
  }
};
