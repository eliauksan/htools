import {
  CONTENT_ITEM_SUMMARY_COLUMNS,
  contentItemSummaryFromRow,
  createSearchTerms,
  getDatabase,
  isFtsSearchUnavailable,
  json,
  requireAdmin,
  type ContentItemSummaryRow,
  type Env
} from "../../../_shared";

const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 100;
const MAX_SEARCH_LENGTH = 100;
const MAX_CURSOR_LENGTH = 1024;

type ContentItemPageRow = ContentItemSummaryRow & {
  sort_key: string;
};

type ContentSourceCountRow = {
  source_id: string;
  total: number;
};
type ContentCategoryCountRow = {
  category: string;
  total: number;
};

type ContentItemCursor =
  | { sort: "latest"; sortKey: string; id: string }
  | { sort: "name"; title: string; id: string };

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const db = await getDatabase(env);
    const url = new URL(request.url);
    const sourceId = readFilterValue(url.searchParams.get("sourceId"), 256);
    const category = readFilterValue(url.searchParams.get("category"), 48);
    const query = readFilterValue(url.searchParams.get("q"), MAX_SEARCH_LENGTH);
    const sort = url.searchParams.get("sort") === "name" ? "name" : "latest";
    const limit = readPageInteger(
      url.searchParams.get("limit"),
      DEFAULT_PAGE_LIMIT,
      1,
      MAX_PAGE_LIMIT
    );
    const cursor = parseCursor(url.searchParams.get("cursor"), sort);
    const terms = query ? createSearchTerms(query) : null;
    try {
      return json(
        await loadContentItemPage(db, {
          category,
          cursor,
          limit,
          sourceId,
          sort,
          terms,
          useFts: terms?.useFts ?? false
        })
      );
    } catch (error) {
      if (!terms?.useFts || !isFtsSearchUnavailable(error)) throw error;
      return json(
        await loadContentItemPage(db, {
          category,
          cursor,
          limit,
          sourceId,
          sort,
          terms,
          useFts: false
        })
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load content items.";
    return json(
      { error: message },
      { status: message === "cursor is invalid." ? 400 : 500 }
    );
  }
};

async function loadContentItemPage(
  db: D1Database,
  options: {
    category: string;
    cursor: ContentItemCursor | null;
    limit: number;
    sourceId: string;
    sort: "latest" | "name";
    terms: ReturnType<typeof createSearchTerms> | null;
    useFts: boolean;
  }
) {
  const { category, cursor, limit, sort, sourceId, terms, useFts } = options;
  const sharedConditions: string[] = [];
  const sharedParams: string[] = [];

  if (category) {
    sharedConditions.push("content_items.category = ?");
    sharedParams.push(category);
  }

  if (terms) {
    if (useFts) {
      sharedConditions.push(
        `content_items.id IN (
          SELECT item_id FROM content_items_search
          WHERE content_items_search MATCH ?
        )`
      );
      sharedParams.push(terms.ftsPhrase);
    } else {
      sharedConditions.push(
        `(content_items.title LIKE ? ESCAPE '\\' OR
          content_items.summary LIKE ? ESCAPE '\\' OR
          content_items.url LIKE ? ESCAPE '\\' OR
          content_items.author LIKE ? ESCAPE '\\' OR
          content_items.tags LIKE ? ESCAPE '\\' OR
          content_sources.title LIKE ? ESCAPE '\\')`
      );
      sharedParams.push(
        terms.likePattern,
        terms.likePattern,
        terms.likePattern,
        terms.likePattern,
        terms.likePattern,
        terms.likePattern
      );
    }
  }

  const conditions = [...sharedConditions];
  const params: Array<string | number> = [...sharedParams];

  if (sourceId) {
    conditions.push("content_items.source_id = ?");
    params.push(sourceId);
  }

  if (cursor?.sort === "latest") {
    conditions.push(
      `(COALESCE(content_items.published_at, content_items.updated_at, content_items.created_at) < ? OR
        (COALESCE(content_items.published_at, content_items.updated_at, content_items.created_at) = ?
         AND content_items.id < ?))`
    );
    params.push(cursor.sortKey, cursor.sortKey, cursor.id);
  } else if (cursor?.sort === "name") {
    conditions.push(
      `(content_items.title COLLATE NOCASE > ? OR
        (content_items.title COLLATE NOCASE = ? COLLATE NOCASE
         AND content_items.id > ?))`
    );
    params.push(cursor.title, cursor.title, cursor.id);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const sourceCountWhereClause = sharedConditions.length
    ? `WHERE ${sharedConditions.join(" AND ")}`
    : "";
  const sourceCountJoin = terms && !useFts
    ? "JOIN content_sources ON content_sources.id = content_items.source_id"
    : "";
  const orderBy = sort === "name"
    ? "content_items.title COLLATE NOCASE ASC, content_items.id ASC"
    : "sort_key DESC, content_items.id DESC";
  const [result, sourceCountRows, categoryCountRows] = await Promise.all([
    db.prepare(
      `SELECT ${CONTENT_ITEM_SUMMARY_COLUMNS},
              COALESCE(content_items.published_at, content_items.updated_at, content_items.created_at) AS sort_key
       FROM content_items
       JOIN content_sources ON content_sources.id = content_items.source_id
       LEFT JOIN articles ON articles.id = content_items.article_id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT ?`
    )
      .bind(...params, limit + 1)
      .all<ContentItemPageRow>(),
    db.prepare(
      `SELECT content_items.source_id, COUNT(*) AS total
       FROM content_items
       ${sourceCountJoin}
       ${sourceCountWhereClause}
       GROUP BY content_items.source_id`
    )
      .bind(...sharedParams)
      .all<ContentSourceCountRow>(),
    db.prepare(
      `SELECT category, COUNT(*) AS total
       FROM content_items
       GROUP BY category`
    ).all<ContentCategoryCountRow>()
  ]);
  const hasMore = result.results.length > limit;
  const items = result.results.slice(0, limit);
  const lastItem = items.at(-1);
  const nextCursor =
    hasMore && lastItem
      ? createCursor(
          sort === "name"
            ? { sort: "name", title: lastItem.title, id: lastItem.id }
            : { sort: "latest", sortKey: lastItem.sort_key, id: lastItem.id }
        )
      : null;
  const sourceCounts = Object.fromEntries(
    sourceCountRows.results.map((row) => [row.source_id, Number(row.total ?? 0)])
  );
  const total = sourceId
    ? Number(sourceCounts[sourceId] ?? 0)
    : Object.values(sourceCounts).reduce((sum, count) => sum + count, 0);

  return {
    items: items.map(contentItemSummaryFromRow),
    limit,
    hasMore,
    nextCursor,
    total,
    sourceCounts,
    categoryCounts: Object.fromEntries(
      categoryCountRows.results.map((row) => [row.category, Number(row.total ?? 0)])
    )
  };
}

function readPageInteger(
  value: string | null,
  fallback: number,
  minimum: number,
  maximum: number
) {
  if (value === null || !value.trim()) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, parsed));
}

function readFilterValue(value: string | null, maximumLength: number) {
  return (value ?? "").trim().slice(0, maximumLength);
}

function parseCursor(
  value: string | null,
  sort: "latest" | "name"
): ContentItemCursor | null {
  if (!value) {
    return null;
  }

  if (value.length > MAX_CURSOR_LENGTH) {
    throw new Error("cursor is invalid.");
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(value)) as Partial<ContentItemCursor>;
    if (parsed.sort !== sort || typeof parsed.id !== "string" || !parsed.id || parsed.id.length > 256) {
      throw new Error();
    }
    if (sort === "latest" && parsed.sort === "latest") {
      if (typeof parsed.sortKey !== "string" || !parsed.sortKey || parsed.sortKey.length > 64) {
        throw new Error();
      }
      return { sort: "latest", sortKey: parsed.sortKey, id: parsed.id };
    }
    if (sort === "name" && parsed.sort === "name") {
      if (typeof parsed.title !== "string" || !parsed.title || parsed.title.length > 512) {
        throw new Error();
      }
      return { sort: "name", title: parsed.title, id: parsed.id };
    }
    throw new Error();
  } catch {
    throw new Error("cursor is invalid.");
  }
}

function createCursor(cursor: ContentItemCursor) {
  return encodeBase64Url(JSON.stringify(cursor));
}

function encodeBase64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new TextDecoder().decode(bytes);
}
