import {
  articleFromRow,
  articleSummaryFromRow,
  createArticleId,
  createSearchTerms,
  createUniqueArticleSlug,
  getDatabase,
  invalidatePublicApiCache,
  isFtsSearchUnavailable,
  json,
  jsonError,
  requireAdmin,
  validateArticlePayload,
  writeErrorResponse,
  type ArticleRow,
  type ArticleSummaryRow,
  type Env
} from "../../../_shared";

const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 100;
const MAX_SEARCH_LENGTH = 100;
const MAX_CURSOR_LENGTH = 1024;

type ArticleSortMode = "latest" | "name";
type AdminArticlePageRow = ArticleSummaryRow & { sort_key: string };
type AdminArticleCursor = {
  sort: ArticleSortMode;
  sortKey: string;
  id: string;
};
type ArticleCategoryCountRow = { category: string; total: number };

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const db = await getDatabase(env);
    const url = new URL(request.url);
    const category = (url.searchParams.get("category") ?? "").trim().slice(0, 48);
    const query = (url.searchParams.get("q") ?? "").trim().slice(0, MAX_SEARCH_LENGTH);
    const sort: ArticleSortMode =
      url.searchParams.get("sort") === "name" ? "name" : "latest";
    const limit = readPageInteger(url.searchParams.get("limit"));
    const cursor = parseCursor(url.searchParams.get("cursor"), sort);
    const terms = query ? createSearchTerms(query) : null;
    try {
      return json(
        await loadAdminArticlePage(db, {
          category,
          cursor,
          limit,
          sort,
          terms,
          useFts: terms?.useFts ?? false
        })
      );
    } catch (error) {
      if (!terms?.useFts || !isFtsSearchUnavailable(error)) throw error;
      return json(
        await loadAdminArticlePage(db, {
          category,
          cursor,
          limit,
          sort,
          terms,
          useFts: false
        })
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load articles.";
    return json(
      { error: message },
      { status: message === "cursor is invalid." ? 400 : 500 }
    );
  }
};

async function loadAdminArticlePage(
  db: D1Database,
  options: {
    category: string;
    cursor: AdminArticleCursor | null;
    limit: number;
    sort: ArticleSortMode;
    terms: ReturnType<typeof createSearchTerms> | null;
    useFts: boolean;
  }
) {
  const { category, cursor, limit, sort, terms, useFts } = options;
  const conditions: string[] = [];
  const params: Array<string | number> = [];

  if (category) {
    conditions.push("category = ?");
    params.push(category);
  }

  if (terms) {
    if (useFts) {
      conditions.push(
        `id IN (
          SELECT article_id FROM articles_search
          WHERE articles_search MATCH ?
        )`
      );
      params.push(terms.ftsPhrase);
    } else {
      conditions.push(
        `(title LIKE ? ESCAPE '\\' OR summary LIKE ? ESCAPE '\\' OR
          content LIKE ? ESCAPE '\\' OR slug LIKE ? ESCAPE '\\' OR
          category LIKE ? ESCAPE '\\' OR tags LIKE ? ESCAPE '\\')`
      );
      params.push(
        terms.likePattern,
        terms.likePattern,
        terms.likePattern,
        terms.likePattern,
        terms.likePattern,
        terms.likePattern
      );
    }
  }

  const countConditions = [...conditions];
  const countParams = [...params];
  const sortExpression =
    sort === "name" ? "title" : "COALESCE(published_at, updated_at, created_at)";

  if (cursor) {
    if (sort === "name") {
      conditions.push("(title, id) > (?, ?)");
      params.push(cursor.sortKey, cursor.id);
    } else {
      conditions.push(
        `(COALESCE(published_at, updated_at, created_at) < ? OR
          (COALESCE(published_at, updated_at, created_at) = ? AND id < ?))`
      );
      params.push(cursor.sortKey, cursor.sortKey, cursor.id);
    }
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const countWhereClause = countConditions.length
    ? `WHERE ${countConditions.join(" AND ")}`
    : "";
  const orderClause =
    sort === "name" ? "sort_key ASC, id ASC" : "sort_key DESC, id DESC";
  const [result, searchedTotalRow, categoryCountRows] = await Promise.all([
    db.prepare(
      `SELECT id, slug, title, summary, cover_image, category, tags,
              published, created_at, updated_at, published_at,
              ${sortExpression} AS sort_key
       FROM articles
       ${whereClause}
       ORDER BY ${orderClause}
       LIMIT ?`
    )
      .bind(...params, limit + 1)
      .all<AdminArticlePageRow>(),
    terms
      ? db.prepare(`SELECT COUNT(*) AS total FROM articles ${countWhereClause}`)
          .bind(...countParams)
          .first<{ total: number }>()
      : Promise.resolve(null),
    db.prepare(
      `SELECT category, COUNT(*) AS total
       FROM articles
       GROUP BY category`
    ).all<ArticleCategoryCountRow>()
  ]);
  const hasMore = result.results.length > limit;
  const rows = result.results.slice(0, limit);
  const lastRow = rows.at(-1);
  const categoryCounts = Object.fromEntries(
    categoryCountRows.results.map((row) => [row.category, Number(row.total ?? 0)])
  );
  const total = terms
    ? Number(searchedTotalRow?.total ?? 0)
    : category
      ? Number(categoryCounts[category] ?? 0)
      : Object.values(categoryCounts).reduce((sum, count) => sum + count, 0);

  return {
    articles: rows.map(articleSummaryFromRow),
    limit,
    hasMore,
    nextCursor:
      hasMore && lastRow
        ? createCursor({ sort, sortKey: lastRow.sort_key, id: lastRow.id })
        : null,
    total,
    categoryCounts
  };
}

function readPageInteger(value: string | null) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed)
    ? Math.min(MAX_PAGE_LIMIT, Math.max(1, parsed))
    : DEFAULT_PAGE_LIMIT;
}

function parseCursor(value: string | null, sort: ArticleSortMode) {
  if (!value) return null;
  if (value.length > MAX_CURSOR_LENGTH) throw new Error("cursor is invalid.");

  try {
    const parsed = JSON.parse(decodeBase64Url(value)) as Partial<AdminArticleCursor>;
    if (
      parsed.sort !== sort ||
      typeof parsed.sortKey !== "string" ||
      !parsed.sortKey ||
      parsed.sortKey.length > 160 ||
      typeof parsed.id !== "string" ||
      !parsed.id ||
      parsed.id.length > 256
    ) {
      throw new Error();
    }
    return parsed as AdminArticleCursor;
  } catch {
    throw new Error("cursor is invalid.");
  }
}

function createCursor(cursor: AdminArticleCursor) {
  const bytes = new TextEncoder().encode(JSON.stringify(cursor));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new TextDecoder().decode(bytes);
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const db = await getDatabase(env);
    const payload = validateArticlePayload((await request.json()) as object);
    const id = createArticleId();
    const slug = await createUniqueArticleSlug(db, payload.slug);
    const now = new Date().toISOString();
    const publishedAt = payload.published
      ? (payload.publishedAt ?? now)
      : payload.publishedAt;

    await db.prepare(
      `INSERT INTO articles
        (id, slug, title, summary, content, cover_image, category, tags, published, created_at, updated_at, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        slug,
        payload.title,
        payload.summary,
        payload.content,
        payload.coverImage,
        payload.category,
        JSON.stringify(payload.tags),
        payload.published ? 1 : 0,
        now,
        now,
        publishedAt
      )
      .run();

    const row = await db.prepare("SELECT * FROM articles WHERE id = ?")
      .bind(id)
      .first<ArticleRow>();

    await invalidatePublicApiCache(env);

    if (!row) {
      return jsonError("Article could not be loaded after creation.", "SERVER_ERROR", { status: 500 });
    }
    return json({ article: articleFromRow(row) }, { status: 201 });
  } catch (error) {
    return writeErrorResponse(error, "Unable to create article.");
  }
};
