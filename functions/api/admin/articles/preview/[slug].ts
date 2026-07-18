import {
  articleFromRow,
  getDatabase,
  json,
  jsonError,
  requireAdmin,
  type ArticleRow,
  type Env
} from "../../../../_shared";

export const onRequestGet: PagesFunction<Env> = async ({
  request,
  env,
  params
}) => {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const slug = String(params.slug ?? "");
    const db = await getDatabase(env);
    const row = await db.prepare("SELECT * FROM articles WHERE slug = ?")
      .bind(slug)
      .first<ArticleRow>();

    if (!row) {
      return jsonError("Article not found.", "NOT_FOUND", { status: 404 });
    }

    return json({ article: articleFromRow(row) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load article preview.";
    return json({ error: message }, { status: 500 });
  }
};
