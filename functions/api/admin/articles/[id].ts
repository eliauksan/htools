import {
  articleFromRow,
  articleSummaryFromRow,
  badRequest,
  createUniqueArticleSlug,
  getDatabase,
  invalidatePublicApiCache,
  json,
  jsonDeleted,
  jsonError,
  requireAdmin,
  validateArticlePayload,
  writeErrorResponse,
  type ArticleRow,
  type ArticleSummaryRow,
  type Env
} from "../../../_shared";

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  try {
    const id = String(params.id ?? "");
    const db = await getDatabase(env);
    const row = await db.prepare("SELECT * FROM articles WHERE id = ?")
      .bind(id)
      .first<ArticleRow>();

    if (!row) return jsonError("Article not found.", "NOT_FOUND", { status: 404 });
    return json({ article: articleFromRow(row) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load article.";
    return json({ error: message }, { status: 500 });
  }
};

export const onRequestPatch: PagesFunction<Env> = async ({
  request,
  env,
  params
}) => {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  try {
    const payload = (await request.json()) as { published?: unknown };
    if (typeof payload.published !== "boolean") {
      return badRequest("published must be a boolean.");
    }

    const id = String(params.id ?? "");
    const db = await getDatabase(env);
    const now = new Date().toISOString();
    const result = await db.prepare(
      `UPDATE articles
       SET published = ?, updated_at = ?,
           published_at = CASE
             WHEN ? = 1 AND published_at IS NULL THEN ?
             ELSE published_at
           END
       WHERE id = ?`
    )
      .bind(payload.published ? 1 : 0, now, payload.published ? 1 : 0, now, id)
      .run();

    if (!result.meta.changes) {
      return jsonError("Article not found.", "NOT_FOUND", { status: 404 });
    }

    const row = await db.prepare(
      `SELECT id, slug, title, summary, cover_image, category, tags,
              published, created_at, updated_at, published_at
       FROM articles WHERE id = ?`
    )
      .bind(id)
      .first<ArticleSummaryRow>();
    await invalidatePublicApiCache(env);
    if (!row) {
      return jsonError("Article could not be loaded after update.", "SERVER_ERROR", { status: 500 });
    }
    return json({ article: articleSummaryFromRow(row) });
  } catch (error) {
    return writeErrorResponse(error, "Unable to update article.");
  }
};

export const onRequestPut: PagesFunction<Env> = async ({
  request,
  env,
  params
}) => {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const id = String(params.id ?? "");
    const db = await getDatabase(env);
    const existing = await db.prepare("SELECT id FROM articles WHERE id = ?")
      .bind(id)
      .first<{ id: string }>();

    if (!existing) {
      return jsonError("Article not found.", "NOT_FOUND", { status: 404 });
    }

    const payload = validateArticlePayload((await request.json()) as object);
    const slug = await createUniqueArticleSlug(db, payload.slug, id);
    const now = new Date().toISOString();
    const publishedAt = payload.published
      ? (payload.publishedAt ?? now)
      : payload.publishedAt;

    await db.prepare(
      `UPDATE articles
       SET slug = ?, title = ?, summary = ?, content = ?, cover_image = ?,
           category = ?, tags = ?, published = ?, updated_at = ?, published_at = ?
       WHERE id = ?`
    )
      .bind(
        slug,
        payload.title,
        payload.summary,
        payload.content,
        payload.coverImage,
        payload.category,
        JSON.stringify(payload.tags),
        payload.published ? 1 : 0,
        now,
        publishedAt,
        id
      )
      .run();

    const row = await db.prepare("SELECT * FROM articles WHERE id = ?")
      .bind(id)
      .first<ArticleRow>();

    await invalidatePublicApiCache(env);

    if (!row) {
      return jsonError("Article could not be loaded after update.", "SERVER_ERROR", { status: 500 });
    }
    return json({ article: articleFromRow(row) });
  } catch (error) {
    return writeErrorResponse(error, "Unable to update article.");
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({
  request,
  env,
  params
}) => {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) {
    return unauthorized;
  }

  const id = String(params.id ?? "");
  const db = await getDatabase(env);
  const result = await db.prepare("DELETE FROM articles WHERE id = ?").bind(id).run();
  if (!result.meta.changes) {
    return jsonError("Article not found.", "NOT_FOUND", { status: 404 });
  }
  await db.prepare("UPDATE content_items SET article_id = NULL WHERE article_id = ?")
    .bind(id)
    .run();
  await invalidatePublicApiCache(env);
  return jsonDeleted("article", id);
};
