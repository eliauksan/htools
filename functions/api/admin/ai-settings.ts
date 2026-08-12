import {
  getAdminAiSettings,
  json,
  requireAdmin,
  saveAdminAiSettings,
  writeErrorResponse,
  type Env
} from "../../_shared";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  try {
    return json({ settings: await getAdminAiSettings(env) });
  } catch (error) {
    return writeErrorResponse(error, "Unable to load Workers AI settings.");
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  try {
    const payload = (await request.json()) as {
      enabled?: unknown;
      model?: unknown;
    };
    return json({ settings: await saveAdminAiSettings(env, payload) });
  } catch (error) {
    return writeErrorResponse(error, "Unable to save Workers AI settings.");
  }
};
