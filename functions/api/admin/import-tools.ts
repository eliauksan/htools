import {
  createId,
  badRequest,
  getDatabase,
  invalidatePublicApiCache,
  json,
  jsonError,
  requireAdmin,
  validateToolPayload,
  type Env,
  type ToolPayload
} from "../../_shared";

type ImportMode = "skip" | "upsert";

type ImportError = {
  index: number;
  message: string;
};

type StoredToolKey = {
  id: string;
  url: string;
  updated_at: string;
};

const MAX_IMPORT_TOOLS = 1000;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) {
    return unauthorized;
  }

  let mode: ImportMode;
  let prepared: ReturnType<typeof prepareImportTools>;

  try {
    const payload = (await request.json()) as { tools?: unknown; mode?: unknown };
    mode = readMode(payload.mode);
    prepared = prepareImportTools(readImportTools(payload.tools));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Import file is invalid.";
    return badRequest(message);
  }

  try {
    const db = await getDatabase(env);
    const existing = await db.prepare("SELECT id, url, updated_at FROM tools").all<StoredToolKey>();
    const existingByUrl = new Map(existing.results.map((row) => [normalizeUrl(row.url), row]));
    const existingIds = new Set(existing.results.map((row) => row.id));
    const seenUrls = new Set<string>();
    const seenIds = new Set<string>();
    const statements: D1PreparedStatement[] = [];
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors = [...prepared.errors];

    for (const item of prepared.tools) {
      const urlKey = normalizeUrl(item.payload.url);

      if (seenUrls.has(urlKey)) {
        skipped += 1;
        continue;
      }

      const existingTool = existingByUrl.get(urlKey);
      seenUrls.add(urlKey);

      if (existingTool && mode === "skip") {
        skipped += 1;
        continue;
      }

      if (existingTool && mode === "upsert") {
        statements.push(
          db.prepare(
            `UPDATE tools
             SET name = ?, description = ?, url = ?, demo_url = ?, image = ?, category = ?,
                 tags = ?, github_language = ?, github_license = ?, featured = ?, updated_at = ?
             WHERE id = ?`
          ).bind(
            item.payload.name,
            item.payload.description,
            item.payload.url,
            item.payload.demoUrl,
            item.payload.image,
            item.payload.category,
            JSON.stringify(item.payload.tags),
            item.payload.githubLanguage,
            item.payload.githubLicense,
            item.payload.featured ? 1 : 0,
            item.updatedAt ?? existingTool.updated_at,
            existingTool.id
          )
        );
        updated += 1;
        continue;
      }

      const id = createImportId(item.id, item.payload.name, existingIds, seenIds);
      const timestamps = resolveImportTimestamps(
        item.createdAt,
        item.updatedAt,
        new Date().toISOString()
      );
      seenIds.add(id);
      statements.push(
        db.prepare(
          `INSERT INTO tools
            (id, name, description, url, demo_url, image, category, tags,
             github_language, github_license, featured, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          id,
          item.payload.name,
          item.payload.description,
          item.payload.url,
          item.payload.demoUrl,
          item.payload.image,
          item.payload.category,
          JSON.stringify(item.payload.tags),
          item.payload.githubLanguage,
          item.payload.githubLicense,
          item.payload.featured ? 1 : 0,
          timestamps.createdAt,
          timestamps.updatedAt
        )
      );
      imported += 1;
    }

    if (statements.length) {
      await db.batch(statements);
      await invalidatePublicApiCache(env);
    }

    return json({
      imported,
      updated,
      skipped,
      failed: errors.length,
      errors
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to import tools.";
    return jsonError(message, "SERVER_ERROR", { status: 500 });
  }
};

function readImportTools(value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error("tools must be an array.");
  }

  if (value.length === 0) {
    throw new Error("tools must include at least one item.");
  }

  if (value.length > MAX_IMPORT_TOOLS) {
    throw new Error(`tools can include at most ${MAX_IMPORT_TOOLS} items.`);
  }

  return value;
}

function readMode(value: unknown): ImportMode {
  return value === "upsert" ? "upsert" : "skip";
}

export function prepareImportTools(tools: unknown[]) {
  const valid: Array<{
    id: string;
    payload: ReturnType<typeof validateToolPayload>;
    createdAt: string | null;
    updatedAt: string | null;
  }> = [];
  const errors: ImportError[] = [];

  tools.forEach((tool, index) => {
    try {
      if (!tool || typeof tool !== "object") {
        throw new Error("Item must be an object.");
      }

      const item = tool as ToolPayload & {
        id?: unknown;
        createdAt?: unknown;
        created_at?: unknown;
        updatedAt?: unknown;
        updated_at?: unknown;
      };
      valid.push({
        id: readOptionalId(item.id),
        payload: validateToolPayload(normalizeImportPayload(item)),
        createdAt: normalizeImportTimestamp(
          "createdAt" in item ? item.createdAt : item.created_at
        ),
        updatedAt: normalizeImportTimestamp(
          "updatedAt" in item ? item.updatedAt : item.updated_at
        )
      });
    } catch (error) {
      errors.push({
        index,
        message: error instanceof Error ? error.message : "Invalid item."
      });
    }
  });

  return { tools: valid, errors };
}

export function resolveImportTimestamps(
  createdAt: string | null,
  updatedAt: string | null,
  fallback: string
) {
  const resolvedCreatedAt = createdAt ?? updatedAt ?? fallback;
  return {
    createdAt: resolvedCreatedAt,
    updatedAt: updatedAt ?? resolvedCreatedAt
  };
}

function normalizeImportTimestamp(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error("updatedAt must be a valid date.");
  return new Date(timestamp).toISOString();
}

function normalizeImportPayload(item: ToolPayload) {
  return {
    ...item,
    demoUrl:
      typeof item.demoUrl === "string"
        ? item.demoUrl
        : typeof item.demo_url === "string"
          ? item.demo_url
          : "",
    tags: normalizeTags(item.tags),
    featured: normalizeFeatured(item.featured)
  };
}

function normalizeTags(value: unknown) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeFeatured(value: unknown) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function readOptionalId(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function createImportId(
  requestedId: string,
  name: string,
  existingIds: Set<string>,
  seenIds: Set<string>
) {
  if (requestedId && !existingIds.has(requestedId) && !seenIds.has(requestedId)) {
    return requestedId;
  }

  let id = createId(name);
  while (existingIds.has(id) || seenIds.has(id)) {
    id = createId(name);
  }

  return id;
}

function normalizeUrl(value: string) {
  return value.trim().replace(/\/+$/, "").toLowerCase();
}
