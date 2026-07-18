import {
  createSearchTerms,
  getDatabase,
  json,
  toolFromRow,
  type Env,
  type ToolRow
} from "../../_shared";

const MAX_QUERY_LENGTH = 100;
const SEARCH_RESULT_LIMIT = 8;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (!query) {
      return json({ tools: [] }, { headers: { "Cache-Control": "no-store" } });
    }

    const db = await getDatabase(env);
    const terms = createSearchTerms(query.slice(0, MAX_QUERY_LENGTH));
    const result = await db.prepare(
      `SELECT * FROM tools
       WHERE name LIKE ? ESCAPE '\\' OR
             description LIKE ? ESCAPE '\\' OR
             category LIKE ? ESCAPE '\\' OR
             tags LIKE ? ESCAPE '\\'
       ORDER BY updated_at DESC, created_at DESC, id DESC
       LIMIT ?`
    )
      .bind(
        terms.likePattern,
        terms.likePattern,
        terms.likePattern,
        terms.likePattern,
        SEARCH_RESULT_LIMIT
      )
      .all<ToolRow>();

    return json(
      { tools: result.results.map(toolFromRow) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to search tools.";
    return json(
      { error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
};
