import { getAdminTurnstileSettings, json, jsonError, type Env } from "../../_shared";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const settings = await getAdminTurnstileSettings(env);
    return json(
      {
        turnstileEnabled: settings.enabled,
        turnstileSiteKey: settings.siteKey
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return jsonError("Unable to load authentication settings.", "SERVER_ERROR", { status: 500 });
  }
};
