import {
  PUBLIC_API_CACHE_KEYS,
  articleSummaryFromRow,
  cachedPublicJson,
  getDatabase,
  getPublicApiCacheVersion,
  json,
  type ArticleSummaryRow,
  type Env
} from "../../_shared";

const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 50;
const MAX_CURSOR_LENGTH = 1024;

type PublicArticlePageRow = ArticleSummaryRow & { sort_key: string };
type ArticleCategoryCountRow = { category: string; total: number };
type PublicArticleCursor = {
  version: 1;
  category: string;
  sortKey: string;
  id: string;
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  try {
    const url = new URL(request.url);
    const category = (url.searchParams.get("category") ?? "").trim().slice(0, 48);
    const limit = readPageLimit(url.searchParams.get("limit"));
    const pageNumber = readPageNumber(url.searchParams.get("page"));
    const includeCounts = url.searchParams.get("counts") !== "0";
    const cursor = parseCursor(url.searchParams.get("cursor"), category);
    const cacheVersion = await getPublicApiCacheVersion(env);
    const cacheKey = [
      PUBLIC_API_CACHE_KEYS.articles,
      `limit=${limit}`,
      `category=${category}`,
      `cursor=${cursor ? createCursor(cursor) : ""}`,
      `page=${pageNumber}`,
      `counts=${includeCounts ? 1 : 0}`
    ].join("|");

    return await cachedPublicJson(request, async () => {
      const db = await getDatabase(env);
      const conditions = ["published = 1"];
      const params: Array<string | number> = [];

      if (category) {
        conditions.push("category = ?");
        params.push(category);
      }

      if (cursor) {
        conditions.push(
          `(COALESCE(published_at, updated_at, created_at) < ? OR
            (COALESCE(published_at, updated_at, created_at) = ? AND id < ?))`
        );
        params.push(cursor.sortKey, cursor.sortKey, cursor.id);
      }

      const offset = (pageNumber - 1) * limit;
      const [result, categoryCountRows] = await Promise.all([
        db.prepare(
          `SELECT id, slug, title, summary, cover_image, category, tags,
                  published, created_at, updated_at, published_at,
                  COALESCE(published_at, updated_at, created_at) AS sort_key
           FROM articles
           WHERE ${conditions.join(" AND ")}
           ORDER BY sort_key DESC, id DESC
           LIMIT ?${pageNumber > 1 ? " OFFSET ?" : ""}`
        )
          .bind(...params, limit + 1, ...(pageNumber > 1 ? [offset] : []))
          .all<PublicArticlePageRow>(),
        includeCounts
          ? db.prepare(
              `SELECT category, COUNT(*) AS total
               FROM articles
               WHERE published = 1
               GROUP BY category`
            ).all<ArticleCategoryCountRow>()
          : Promise.resolve({ results: [] as ArticleCategoryCountRow[] })
      ]);
      const hasMore = result.results.length > limit;
      const rows = result.results.slice(0, limit);
      const lastRow = rows.at(-1);
      const categoryCounts = includeCounts
        ? Object.fromEntries(
            categoryCountRows.results.map((row) => [
              row.category,
              Number(row.total ?? 0)
            ])
          )
        : null;
      const total = categoryCounts
        ? category
          ? Number(categoryCounts[category] ?? 0)
          : Object.values(categoryCounts).reduce((sum, count) => sum + count, 0)
        : null;

      return {
        articles: rows.map(articleSummaryFromRow),
        limit,
        hasMore,
        nextCursor:
          hasMore && lastRow
            ? createCursor({
                version: 1,
                category,
                sortKey: lastRow.sort_key,
                id: lastRow.id
              })
            : null,
        total,
        categoryCounts
      };
    }, {
      cacheKey,
      cacheVersion,
      ttlSeconds: 30,
      waitUntil,
      shouldCache: (data) =>
        Array.isArray((data as { articles?: unknown }).articles) &&
        (data as { articles: unknown[] }).articles.length > 0
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load articles.";
    return json(
      { error: message },
      { status: message === "cursor is invalid." ? 400 : 500 }
    );
  }
};

function readPageLimit(value: string | null) {
  if (value === null || !value.trim()) return DEFAULT_PAGE_LIMIT;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed)
    ? Math.min(MAX_PAGE_LIMIT, Math.max(1, parsed))
    : DEFAULT_PAGE_LIMIT;
}

function readPageNumber(value: string | null) {
  if (value === null || !value.trim()) return 1;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? Math.min(10000, Math.max(1, parsed)) : 1;
}

function parseCursor(value: string | null, category: string) {
  if (!value) return null;
  if (value.length > MAX_CURSOR_LENGTH) throw new Error("cursor is invalid.");

  try {
    const parsed = JSON.parse(decodeBase64Url(value)) as Partial<PublicArticleCursor>;
    if (
      parsed.version !== 1 ||
      parsed.category !== category ||
      typeof parsed.sortKey !== "string" ||
      !parsed.sortKey ||
      parsed.sortKey.length > 64 ||
      typeof parsed.id !== "string" ||
      !parsed.id ||
      parsed.id.length > 256
    ) {
      throw new Error();
    }
    return parsed as PublicArticleCursor;
  } catch {
    throw new Error("cursor is invalid.");
  }
}

function createCursor(cursor: PublicArticleCursor) {
  return encodeBase64Url(JSON.stringify(cursor));
}

function encodeBase64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
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
