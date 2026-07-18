import {
  invalidatePublicApiCache,
  json,
  requireAdmin,
  saveProxySettings,
  writeErrorResponse,
  type Env
} from "../../_shared";

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const payload = (await request.json()) as {
      enabled?: unknown;
      baseUrl?: unknown;
      mode?: unknown;
      scope?: unknown;
    };

    const settings = await saveProxySettings(env, payload);
    await invalidatePublicApiCache(env);
    return json({ settings });
  } catch (error) {
    return writeErrorResponse(error, "Unable to save proxy settings.");
  }
};
