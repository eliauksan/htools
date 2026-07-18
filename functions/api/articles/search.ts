import {
  articleSummaryFromRow,
  createSearchTerms,
  getDatabase,
  isFtsSearchUnavailable,
  json,
  type ArticleSummaryRow,
  type Env
} from "../../_shared";

const MAX_QUERY_LENGTH = 100;
const SEARCH_RESULT_LIMIT = 6;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (!query) {
      return json({ articles: [] });
    }

    const db = await getDatabase(env);
    const terms = createSearchTerms(query.slice(0, MAX_QUERY_LENGTH));
    let result;
    try {
      result = await searchArticles(db, terms, terms.useFts);
    } catch (error) {
      if (!terms.useFts || !isFtsSearchUnavailable(error)) throw error;
      result = await searchArticles(db, terms, false);
    }

    return json({
      articles: result.results.map(articleSummaryFromRow)
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to search articles.";
    return json({ error: message }, { status: 500 });
  }
};

async function searchArticles(
  db: D1Database,
  terms: ReturnType<typeof createSearchTerms>,
  useFts: boolean
) {
  if (useFts) {
    return db.prepare(
      `SELECT id, slug, title, summary, cover_image, category, tags,
              published, created_at, updated_at, published_at
       FROM articles
       WHERE published = 1
         AND id IN (
           SELECT article_id FROM articles_search
           WHERE articles_search MATCH ?
         )
       ORDER BY COALESCE(published_at, updated_at, created_at) DESC, id DESC
       LIMIT ?`
    )
      .bind(terms.ftsPhrase, SEARCH_RESULT_LIMIT)
      .all<ArticleSummaryRow>();
  }

  return db.prepare(
    `SELECT id, slug, title, summary, cover_image, category, tags,
            published, created_at, updated_at, published_at
     FROM articles
     WHERE published = 1
       AND (
         title LIKE ? ESCAPE '\\' OR
         summary LIKE ? ESCAPE '\\' OR
         content LIKE ? ESCAPE '\\' OR
         category LIKE ? ESCAPE '\\' OR
         tags LIKE ? ESCAPE '\\'
       )
     ORDER BY COALESCE(published_at, updated_at, created_at) DESC, id DESC
     LIMIT ?`
  )
    .bind(
      terms.likePattern,
      terms.likePattern,
      terms.likePattern,
      terms.likePattern,
      terms.likePattern,
      SEARCH_RESULT_LIMIT
    )
    .all<ArticleSummaryRow>();
}
