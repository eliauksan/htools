import {
  uploadImageToImageBed,
  writeImageBedErrorResponse
} from "../../_image-bed";
import { json, jsonError, requireAdmin, type Env } from "../../_shared";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return jsonError("Choose an image file first.", "IMAGE_FILE_INVALID", { status: 400 });
    }
    return json({ image: await uploadImageToImageBed(env, file) });
  } catch (error) {
    return writeImageBedErrorResponse(error, "Unable to upload image.");
  }
};
