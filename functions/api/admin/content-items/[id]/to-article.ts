import {
  articleFromRow,
  badRequest,
  buildContentItemArticleContent,
  createContentItemMarker,
  createContentVersion,
  createArticleId,
  getDatabase,
  invalidatePublicApiCache,
  json,
  jsonError,
  normalizeFeedItemTags,
  normalizeFeedItemSummary,
  normalizeFeedItemTitle,
  requireAdmin,
  type ArticleRow,
  type ContentItemRow,
  type Env,
  writeErrorResponse
} from "../../../../_shared";

export const onRequestPost: PagesFunction<Env> = async ({
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
    const item = await db.prepare(
      `SELECT content_items.*, content_sources.title AS source_title,
              content_sources.url AS source_url
       FROM content_items
       JOIN content_sources ON content_sources.id = content_items.source_id
       WHERE content_items.id = ?`
    )
      .bind(id)
      .first<ContentItemRow>();

    if (!item) {
      return jsonError("Content item not found.", "NOT_FOUND", { status: 404 });
    }

    const payload = await request.json().catch(() => ({}));
    const category =
      typeof (payload as { category?: unknown }).category === "string"
        ? (payload as { category: string }).category.trim().slice(0, 48)
        : "";
    const published = (payload as { published?: unknown }).published === true;

    if (
      !category ||
      category === "全部" ||
      category === "精选" ||
      category.toLowerCase() === "all" ||
      category.toLowerCase() === "featured"
    ) {
      return badRequest("Article category is required.");
    }

    const now = new Date().toISOString();
    const articleTitle = normalizeFeedItemTitle(
      item.title,
      item.content || item.summary,
      item.summary
    );
    const articleSummary = normalizeFeedItemSummary(
      item.summary,
      item.content || item.summary,
      articleTitle
    );
    const articleTags = normalizeFeedItemTags(
      safelyParseTags(item.tags),
      item.title,
      item.summary,
      item.content
    );
    const sourceContentVersion =
      item.content_version ||
      createContentVersion(
        `${item.content || item.summary || item.title}\n\u0000${item.url}`
      );

    if (item.article_id) {
      const existingArticle = await db.prepare("SELECT * FROM articles WHERE id = ?")
        .bind(item.article_id)
        .first<ArticleRow>();

      if (
        existingArticle &&
        isContentItemLinkedArticle(item, existingArticle, articleTitle)
      ) {
        const updatedArticle = await updateExistingArticleSettings(
          db,
          existingArticle.id,
          category,
          published,
          now,
          sourceContentVersion
        );
        await invalidatePublicApiCache(env);
        if (!updatedArticle) {
          return jsonError("Article could not be loaded after update.", "SERVER_ERROR", { status: 500 });
        }
        return json({ article: articleFromRow(updatedArticle) });
      }

      await db.prepare(
        `UPDATE content_items
         SET article_id = NULL, updated_at = ?
         WHERE id = ?`
      )
        .bind(now, id)
        .run();
    }

    const claimedArticle = await db.prepare(
      "SELECT * FROM articles WHERE content_item_id = ? LIMIT 1"
    )
      .bind(item.id)
      .first<ArticleRow>();

    if (claimedArticle) {
      await db.prepare(
        `UPDATE content_items
         SET article_id = ?, updated_at = ?
         WHERE id = ?`
      )
        .bind(claimedArticle.id, now, id)
        .run();
      const updatedArticle = await updateExistingArticleSettings(
        db,
        claimedArticle.id,
        category,
        published,
        now,
        sourceContentVersion
      );
      await invalidatePublicApiCache(env);
      if (!updatedArticle) {
        return jsonError("Article could not be loaded after update.", "SERVER_ERROR", { status: 500 });
      }
      return json({ article: articleFromRow(updatedArticle) });
    }

    const existingArticle = await db.prepare(
      `SELECT * FROM articles
       WHERE instr(content, ?) > 0
       ORDER BY updated_at DESC
       LIMIT 1`
    )
      .bind(createContentItemMarker(item.id))
      .first<ArticleRow>();

    if (existingArticle) {
      await db.batch([
        db.prepare(
          `UPDATE articles
           SET content_item_id = COALESCE(content_item_id, ?)
           WHERE id = ?`
        ).bind(item.id, existingArticle.id),
        db.prepare(
          `UPDATE content_items
           SET article_id = ?, updated_at = ?
           WHERE id = ?`
        ).bind(existingArticle.id, now, id)
      ]);

      const updatedArticle = await updateExistingArticleSettings(
        db,
        existingArticle.id,
        category,
        published,
        now,
        sourceContentVersion
      );
      await invalidatePublicApiCache(env);
      if (!updatedArticle) {
        return jsonError("Article could not be loaded after update.", "SERVER_ERROR", { status: 500 });
      }
      return json({ article: articleFromRow(updatedArticle) });
    }

    const articleId = createArticleId();
    const slug = await createUniqueContentArticleSlug(db, item);
    const contentBody = item.content || item.summary || item.title;
    const content = buildContentItemArticleContent({
      body: contentBody,
      contentItemId: item.id,
      originalUrl: item.url
    });
    const publishedAt = item.published_at ?? (published ? now : null);

    const insertArticle = db.prepare(
      `INSERT INTO articles
        (id, slug, title, summary, content, cover_image, category, tags,
         published, created_at, updated_at, published_at, content_item_id,
         source_content_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        articleId,
        slug,
        articleTitle,
        articleSummary || articleTitle,
        content,
        item.cover_image,
        category,
        JSON.stringify(articleTags),
        published ? 1 : 0,
        now,
        now,
        publishedAt,
        item.id,
        sourceContentVersion
      );

    try {
      await db.batch([
        insertArticle,
        db.prepare(
          `UPDATE content_items
         SET article_id = ?, content_version = ?, updated_at = ?
         WHERE id = ?`
        ).bind(articleId, sourceContentVersion, now, id)
      ]);
    } catch (error) {
      if (!isContentItemClaimConflict(error)) throw error;
      const concurrentArticle = await db.prepare(
        "SELECT * FROM articles WHERE content_item_id = ? LIMIT 1"
      )
        .bind(item.id)
        .first<ArticleRow>();
      if (!concurrentArticle) throw error;

      await db.prepare(
        `UPDATE content_items
         SET article_id = ?, updated_at = ?
         WHERE id = ?`
      )
        .bind(concurrentArticle.id, now, id)
        .run();
      const updatedArticle = await updateExistingArticleSettings(
        db,
        concurrentArticle.id,
        category,
        published,
        now,
        sourceContentVersion
      );
      await invalidatePublicApiCache(env);
      if (!updatedArticle) {
        return jsonError("Article could not be loaded after update.", "SERVER_ERROR", { status: 500 });
      }
      return json({ article: articleFromRow(updatedArticle) });
    }

    const article = await db.prepare("SELECT * FROM articles WHERE id = ?")
      .bind(articleId)
      .first<ArticleRow>();

    await invalidatePublicApiCache(env);

    if (!article) {
      return jsonError("Article could not be loaded after creation.", "SERVER_ERROR", { status: 500 });
    }
    return json({ article: articleFromRow(article) }, { status: 201 });
  } catch (error) {
    return writeErrorResponse(error, "Unable to convert content item.");
  }
};

async function createUniqueContentArticleSlug(
  db: D1Database,
  item: ContentItemRow
) {
  const baseDate = getContentSlugDate(item);

  for (let index = 0; index < 1000; index += 1) {
    const candidate = formatContentTimestampSlug(
      new Date(baseDate.getTime() + index)
    );
    const row = await db.prepare("SELECT id FROM articles WHERE slug = ?")
      .bind(candidate)
      .first<{ id: string }>();

    if (!row) {
      return candidate;
    }
  }

  return formatContentTimestampSlug(new Date());
}

function getContentSlugDate(item: ContentItemRow) {
  const date = new Date(
    item.published_at ?? item.created_at ?? new Date().toISOString()
  );
  const validDate = Number.isNaN(date.getTime()) ? new Date() : date;

  if (validDate.getUTCMilliseconds() === 0) {
    validDate.setUTCMilliseconds(
      createStableMillisecond(
        `${item.external_id || ""}|${item.url || ""}|${item.title || ""}`
      )
    );
  }

  return validDate;
}

function formatContentTimestampSlug(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
    String(date.getUTCHours()).padStart(2, "0"),
    String(date.getUTCMinutes()).padStart(2, "0"),
    String(date.getUTCSeconds()).padStart(2, "0"),
    String(date.getUTCMilliseconds()).padStart(3, "0")
  ].join("");
}

function isContentItemLinkedArticle(
  item: ContentItemRow,
  article: ArticleRow,
  articleTitle: string
) {
  if (article.content.includes(createContentItemMarker(item.id))) {
    return true;
  }

  if (article.title.trim() !== articleTitle.trim()) {
    return false;
  }

  const itemUrl = item.url.trim();

  return !itemUrl || article.content.includes(itemUrl);
}

function createStableMillisecond(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) % 1000;
}

function safelyParseTags(value: string) {
  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed)
      ? parsed.filter((tag): tag is string => typeof tag === "string")
      : [];
  } catch {
    return [];
  }
}

async function updateExistingArticleSettings(
  db: D1Database,
  articleId: string,
  category: string,
  published: boolean,
  now: string,
  sourceContentVersion: string
) {
  await db.prepare(
    `UPDATE articles
     SET category = ?,
         published = ?,
         published_at = CASE
           WHEN ? = 1 AND published_at IS NULL THEN ?
           ELSE published_at
         END,
         source_content_version = CASE
           WHEN source_content_version = '' THEN ?
           ELSE source_content_version
         END,
         updated_at = ?
     WHERE id = ?`
  )
    .bind(
      category,
      published ? 1 : 0,
      published ? 1 : 0,
      now,
      sourceContentVersion,
      now,
      articleId
    )
    .run();

  return db.prepare("SELECT * FROM articles WHERE id = ?")
    .bind(articleId)
    .first<ArticleRow>();
}

function isContentItemClaimConflict(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /UNIQUE constraint failed:\s*articles\.(?:content_item_id|slug)/i.test(message);
}
