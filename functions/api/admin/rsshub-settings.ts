import {
  getDatabase,
  getRssHubSettings,
  json,
  requireAdmin,
  saveRssHubSettings,
  writeErrorResponse,
  type Env
} from "../../_shared";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  try {
    return json({ settings: await getRssHubSettings(await getDatabase(env)) });
  } catch (error) {
    return writeErrorResponse(error, "Unable to load RSSHub settings.");
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  try {
    return json({
      settings: await saveRssHubSettings(
        await getDatabase(env),
        (await request.json()) as { enabled?: unknown; baseUrl?: unknown }
      )
    });
  } catch (error) {
    return writeErrorResponse(error, "Unable to save RSSHub settings.");
  }
};
