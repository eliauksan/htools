import type { Env } from "./_shared";
import {
  createPublicArticleMetadata,
  createPublicUrl,
  getLatestPublicDate,
  getPublicSiteUrl,
  loadPublicArticles,
  loadPublicSiteIdentity,
  parsePublicArticleTags,
  parsePublicDate
} from "./_public-discovery";

const RSS_HEADERS = {
  "Cache-Control": "public, max-age=300",
  "Content-Type": "application/rss+xml; charset=utf-8"
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const siteUrl = getPublicSiteUrl(request.url);
  const site = await loadPublicSiteIdentity(env);
  const articles = await loadPublicArticles(env, 50);
  const publicArticles = articles.map((article) => ({
    article,
    metadata: createPublicArticleMetadata(request.url, article)
  }));
  const latestModified = getLatestPublicDate(
    publicArticles.map(({ metadata }) => metadata.dateModified)
  );
  const lastBuildDate = parsePublicDate(latestModified) ?? new Date();

  const items = publicArticles.map(({ article, metadata }) => {
    const publishedAt = parsePublicDate(metadata.datePublished);
    const tags = parsePublicArticleTags(article.tags);

    return [
      "    <item>",
      `      <title>${escapeXml(article.title)}</title>`,
      `      <link>${escapeXml(metadata.url)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(metadata.url)}</guid>`,
      `      <description>${escapeXml(stripMarkdown(article.summary || article.content))}</description>`,
      metadata.image
        ? `      <media:content url="${escapeXml(metadata.image)}" medium="image" />`
        : "",
      publishedAt ? `      <pubDate>${publishedAt.toUTCString()}</pubDate>` : "",
      metadata.dateModified
        ? `      <atom:updated>${metadata.dateModified}</atom:updated>`
        : "",
      ...tags.map((tag) => `      <category>${escapeXml(tag)}</category>`),
      "    </item>"
    ].filter(Boolean).join("\n");
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">',
    "  <channel>",
    `    <title>${escapeXml(site.name)}</title>`,
    `    <link>${escapeXml(siteUrl)}</link>`,
    `    <description>${escapeXml(site.subtitle)}</description>`,
    `    <lastBuildDate>${lastBuildDate.toUTCString()}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(
      createPublicUrl(request.url, "/rss.xml")
    )}" rel="self" type="application/rss+xml" />`,
    ...items,
    "  </channel>",
    "</rss>",
    ""
  ].join("\n");

  return new Response(xml, { headers: RSS_HEADERS });
};

function stripMarkdown(value: string) {
  return value
    .replace(/`{3,}[\s\S]*?`{3,}/g, " ")
    .replace(/!\[([^\]]*)\]\((?:[^)(]|\([^)]*\))*\)/g, "$1")
    .replace(/\[([^\]]+)\]\((?:[^)(]|\([^)]*\))*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+(?:#[\p{L}\p{N}_-]+\s*){2,}(?:频道\s*[|｜]\s*聊天)?\s*$/u, "")
    .replace(/[*_~|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
