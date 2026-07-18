import {
  getDatabase,
  json,
  jsonError,
  requireAdmin,
  syncContentSource,
  writeErrorResponse,
  type Env
} from "../../../../_shared";

export const onRequestPost: PagesFunction<Env> = async ({
  request,
  env,
  params
}) => {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const db = await getDatabase(env);
    const id = String(params.id ?? "");
    const source = await db.prepare("SELECT id FROM content_sources WHERE id = ?")
      .bind(id)
      .first<{ id: string }>();
    if (!source) {
      return jsonError("Content source not found.", "NOT_FOUND", { status: 404 });
    }
    const result = await syncContentSource(db, id);

    return json(result);
  } catch (error) {
    return writeErrorResponse(error, "Unable to sync content source.");
  }
};
