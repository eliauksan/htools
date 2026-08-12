import {
  AdminAiError,
  convertAdminAiDocument,
  writeAdminAiErrorResponse
} from "../../../_ai";
import { json, requireAdmin, type Env } from "../../../_shared";
import { ADMIN_AI_DOCUMENT_MAX_BYTES } from "../../../../shared/admin-ai";

const MAX_MULTIPART_OVERHEAD = 512 * 1024;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  try {
    const mediaType = request.headers.get("content-type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase();
    if (mediaType !== "multipart/form-data") {
      throw new AdminAiError("A document file is required.", "AI_DOCUMENT_UNSUPPORTED", 400);
    }

    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > ADMIN_AI_DOCUMENT_MAX_BYTES + MAX_MULTIPART_OVERHEAD) {
      throw new AdminAiError(
        "The document is larger than the 10 MB limit.",
        "AI_DOCUMENT_TOO_LARGE",
        400
      );
    }

    const formData = await request.formData();
    const value = formData.get("file");
    if (!(value instanceof File)) {
      throw new AdminAiError("A document file is required.", "AI_DOCUMENT_UNSUPPORTED", 400);
    }

    const result = await convertAdminAiDocument(env, {
      name: value.name,
      size: value.size,
      blob: value
    });
    return json({ result });
  } catch (error) {
    return writeAdminAiErrorResponse(error);
  }
};
