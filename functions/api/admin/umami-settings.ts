import {
  getUmamiSettings,
  invalidatePublicApiCache,
  json,
  requireAdmin,
  saveUmamiSettings,
  writeErrorResponse,
  type Env
} from "../../_shared";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  try {
    return json({ settings: await getUmamiSettings(env) });
  } catch (error) {
    return writeErrorResponse(error, "Unable to load Umami settings.");
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  try {
    const payload = (await request.json()) as {
      enabled?: unknown;
      scriptUrl?: unknown;
      websiteId?: unknown;
    };
    const settings = await saveUmamiSettings(env, payload);
    await invalidatePublicApiCache(env);
    return json({ settings });
  } catch (error) {
    return writeErrorResponse(error, "Unable to save Umami settings.");
  }
};
