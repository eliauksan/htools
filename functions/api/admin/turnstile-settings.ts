import {
  getAdminTurnstileSettings,
  json,
  requireAdmin,
  saveAdminTurnstileEnabled,
  writeErrorResponse,
  type Env
} from "../../_shared";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  try {
    const settings = await getAdminTurnstileSettings(env);
    return json({ settings: { available: settings.available, enabled: settings.enabled } });
  } catch (error) {
    return writeErrorResponse(error, "Unable to load Turnstile settings.");
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  try {
    const payload = (await request.json()) as { enabled?: unknown };
    const settings = await saveAdminTurnstileEnabled(env, payload.enabled === true);
    return json({ settings: { available: settings.available, enabled: settings.enabled } });
  } catch (error) {
    return writeErrorResponse(error, "Unable to save Turnstile settings.");
  }
};
