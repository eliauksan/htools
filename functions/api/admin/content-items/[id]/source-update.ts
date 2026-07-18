import {
  articleFromRow,
  badRequest,
  buildContentItemArticleContent,
  createContentVersion,
  getDatabase,
  invalidatePublicApiCache,
  json,
  jsonError,
  requireAdmin,
  type ArticleRow,
  type ContentItemRow,
  type Env,
  writeErrorResponse
} from "../../../../_shared";

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  try {
    const id = String(params.id ?? "");
    const payload = await request.json().catch(() => ({}));
    const action = (payload as { action?: unknown }).action;
    if (action !== "ignore" && action !== "sync-content") {
      return badRequest("Invalid source update action.");
    }

    const db = await getDatabase(env);
    const item = await db.prepare("SELECT * FROM content_items WHERE id = ?")
      .bind(id)
      .first<ContentItemRow>();
    if (!item?.article_id) {
      return jsonError("Linked article not found.", "NOT_FOUND", { status: 404 });
    }
    const article = await db.prepare("SELECT * FROM articles WHERE id = ?")
      .bind(item.article_id)
      .first<ArticleRow>();
    if (!article) return jsonError("Linked article not found.", "NOT_FOUND", { status: 404 });

    const body = item.content || item.summary || item.title;
    const version = item.content_version || createContentVersion(`${body}\n\u0000${item.url}`);
    const now = new Date().toISOString();
    const content = buildContentItemArticleContent({
      body,
      contentItemId: item.id,
      originalUrl: item.url
    });

    await db.prepare(
      action === "sync-content"
        ? `UPDATE articles SET content = ?, source_content_version = ?, updated_at = ? WHERE id = ?`
        : `UPDATE articles SET source_content_version = ? WHERE id = ?`
    )
      .bind(...(action === "sync-content"
        ? [content, version, now, article.id]
        : [version, article.id]))
      .run();

    const updated = await db.prepare("SELECT * FROM articles WHERE id = ?")
      .bind(article.id)
      .first<ArticleRow>();
    if (action === "sync-content") await invalidatePublicApiCache(env);
    if (!updated) {
      return jsonError("Article could not be loaded after update.", "SERVER_ERROR", { status: 500 });
    }
    return json({ article: articleFromRow(updated) });
  } catch (error) {
    return writeErrorResponse(error, "Unable to process source update.");
  }
};
