import {
  getDatabase,
  invalidatePublicApiCache,
  json,
  jsonDeleted,
  jsonError,
  requireAdmin,
  toolFromRow,
  validateToolPayload,
  writeErrorResponse,
  type Env,
  type ToolRow
} from "../../../_shared";

export const onRequestPut: PagesFunction<Env> = async ({
  request,
  env,
  params
}) => {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  try {
    const id = String(params.id ?? "");
    const db = await getDatabase(env);
    const payload = validateToolPayload((await request.json()) as object);
    const now = new Date().toISOString();

    await db.prepare(
      `UPDATE tools
       SET name = ?, description = ?, url = ?, demo_url = ?, image = ?, category = ?,
           tags = ?, github_language = ?, github_license = ?, featured = ?, updated_at = ?
       WHERE id = ?`
    )
      .bind(
        payload.name,
        payload.description,
        payload.url,
        payload.demoUrl,
        payload.image,
        payload.category,
        JSON.stringify(payload.tags),
        payload.githubLanguage,
        payload.githubLicense,
        payload.featured ? 1 : 0,
        now,
        id
      )
      .run();

    const row = await db.prepare("SELECT * FROM tools WHERE id = ?")
      .bind(id)
      .first<ToolRow>();

    if (!row) {
      return jsonError("Tool not found.", "NOT_FOUND", { status: 404 });
    }

    await invalidatePublicApiCache(env);
    return json({ tool: toolFromRow(row) });
  } catch (error) {
    return writeErrorResponse(error, "Unable to update tool.");
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({
  request,
  env,
  params
}) => {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  const id = String(params.id ?? "");
  const db = await getDatabase(env);
  const result = await db.prepare("DELETE FROM tools WHERE id = ?").bind(id).run();
  if (!result.meta.changes) {
    return jsonError("Tool not found.", "NOT_FOUND", { status: 404 });
  }
  await invalidatePublicApiCache(env);
  return jsonDeleted("tool", id);
};
