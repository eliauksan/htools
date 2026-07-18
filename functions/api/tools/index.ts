import {
  PUBLIC_API_CACHE_KEYS,
  cachedPublicJson,
  getDatabase,
  getPublicApiCacheVersion,
  json,
  toolFromRow,
  type Env,
  type ToolRow
} from "../../_shared";

const DEFAULT_PAGE_LIMIT = 16;
const MAX_PAGE_LIMIT = 50;
const MAX_CURSOR_LENGTH = 1024;

type ToolCountRow = {
  category: string;
  total: number;
  featured_total: number;
};
type ToolFilterKind = "all" | "category" | "featured";
type PublicToolCursor = {
  version: 1;
  filterKind: ToolFilterKind;
  filterValue: string;
  updatedAt: string;
  createdAt: string;
  id: string;
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  try {
    const url = new URL(request.url);
    const featured = url.searchParams.get("featured") === "1";
    const category = featured
      ? ""
      : (url.searchParams.get("category") ?? "").trim().slice(0, 48);
    const filterKind: ToolFilterKind = featured
      ? "featured"
      : category
        ? "category"
        : "all";
    const filterValue = category;
    const limit = readPageLimit(url.searchParams.get("limit"));
    const pageNumber = readPageNumber(url.searchParams.get("page"));
    const includeCounts = url.searchParams.get("counts") !== "0";
    const cursor = parseCursor(
      url.searchParams.get("cursor"),
      filterKind,
      filterValue
    );
    const cacheVersion = await getPublicApiCacheVersion(env);
    const cacheKey = [
      PUBLIC_API_CACHE_KEYS.tools,
      `limit=${limit}`,
      `filter=${filterKind}`,
      `value=${filterValue}`,
      `cursor=${cursor ? createCursor(cursor) : ""}`,
      `page=${pageNumber}`,
      `counts=${includeCounts ? 1 : 0}`
    ].join("|");

    return await cachedPublicJson(request, async () => {
      const db = await getDatabase(env);
      const conditions: string[] = [];
      const params: Array<string | number> = [];

      if (featured) {
        conditions.push("featured = 1");
      } else if (category) {
        conditions.push("category = ?");
        params.push(category);
      }

      if (cursor) {
        conditions.push(
          `(updated_at < ? OR
            (updated_at = ? AND
              (created_at < ? OR (created_at = ? AND id < ?))))`
        );
        params.push(
          cursor.updatedAt,
          cursor.updatedAt,
          cursor.createdAt,
          cursor.createdAt,
          cursor.id
        );
      }

      const whereClause = conditions.length
        ? `WHERE ${conditions.join(" AND ")}`
        : "";
      const offset = (pageNumber - 1) * limit;
      const [result, countRows] = await Promise.all([
        db.prepare(
          `SELECT * FROM tools
           ${whereClause}
           ORDER BY updated_at DESC, created_at DESC, id DESC
           LIMIT ?${pageNumber > 1 ? " OFFSET ?" : ""}`
        )
          .bind(...params, limit + 1, ...(pageNumber > 1 ? [offset] : []))
          .all<ToolRow>(),
        includeCounts
          ? db.prepare(
              `SELECT category, COUNT(*) AS total,
                      SUM(CASE WHEN featured = 1 THEN 1 ELSE 0 END) AS featured_total
               FROM tools
               GROUP BY category`
            ).all<ToolCountRow>()
          : Promise.resolve({ results: [] as ToolCountRow[] })
      ]);
      const hasMore = result.results.length > limit;
      const rows = result.results.slice(0, limit);
      const lastRow = rows.at(-1);
      const categoryCounts = includeCounts
        ? Object.fromEntries(
            countRows.results.map((row) => [row.category, Number(row.total ?? 0)])
          )
        : null;
      const featuredTotal = includeCounts
        ? countRows.results.reduce(
            (sum, row) => sum + Number(row.featured_total ?? 0),
            0
          )
        : null;
      const total = categoryCounts
        ? featured
          ? featuredTotal
          : category
            ? Number(categoryCounts[category] ?? 0)
            : Object.values(categoryCounts).reduce((sum, count) => sum + count, 0)
        : null;

      return {
        tools: rows.map(toolFromRow),
        limit,
        hasMore,
        nextCursor:
          hasMore && lastRow
            ? createCursor({
                version: 1,
                filterKind,
                filterValue,
                updatedAt: lastRow.updated_at,
                createdAt: lastRow.created_at,
                id: lastRow.id
              })
            : null,
        total,
        categoryCounts,
        featuredTotal
      };
    }, {
      cacheKey,
      cacheVersion,
      ttlSeconds: 30,
      waitUntil,
      shouldCache: (data) =>
        Array.isArray((data as { tools?: unknown }).tools) &&
        (data as { tools: unknown[] }).tools.length > 0
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load tools.";
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

function parseCursor(
  value: string | null,
  filterKind: ToolFilterKind,
  filterValue: string
) {
  if (!value) return null;
  if (value.length > MAX_CURSOR_LENGTH) throw new Error("cursor is invalid.");

  try {
    const parsed = JSON.parse(decodeBase64Url(value)) as Partial<PublicToolCursor>;
    if (
      parsed.version !== 1 ||
      parsed.filterKind !== filterKind ||
      parsed.filterValue !== filterValue ||
      typeof parsed.updatedAt !== "string" ||
      !parsed.updatedAt ||
      parsed.updatedAt.length > 64 ||
      typeof parsed.createdAt !== "string" ||
      !parsed.createdAt ||
      parsed.createdAt.length > 64 ||
      typeof parsed.id !== "string" ||
      !parsed.id ||
      parsed.id.length > 256
    ) {
      throw new Error();
    }
    return parsed as PublicToolCursor;
  } catch {
    throw new Error("cursor is invalid.");
  }
}

function createCursor(cursor: PublicToolCursor) {
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
