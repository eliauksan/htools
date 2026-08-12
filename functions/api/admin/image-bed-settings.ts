import {
  getImageBedSettings,
  saveImageBedSettings,
  writeImageBedErrorResponse
} from "../../_image-bed";
import {
  json,
  requireAdmin,
  type Env
} from "../../_shared";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;
  try {
    return json({ settings: await getImageBedSettings(env) });
  } catch (error) {
    return writeImageBedErrorResponse(error, "Unable to load image bed settings.");
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;
  try {
    return json({ settings: await saveImageBedSettings(env, await request.json()) });
  } catch (error) {
    return writeImageBedErrorResponse(error, "Unable to save image bed settings.");
  }
};
