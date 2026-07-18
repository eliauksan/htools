import type { Env } from "./_shared";
import {
  createPublicArticleMetadata,
  createPublicUrl,
  getPublicSiteUrl,
  loadPublicArticles,
  loadPublicSiteIdentity,
  normalizePublicHttpUrl,
  parsePublicArticleTags
} from "./_public-discovery";

const JSON_FEED_HEADERS = {
  "Cache-Control": "public, max-age=300",
  "Content-Type": "application/feed+json; charset=utf-8"
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const siteUrl = getPublicSiteUrl(request.url);
  const site = await loadPublicSiteIdentity(env);
  const articles = await loadPublicArticles(env, 50);
  const siteIcon = normalizePublicHttpUrl(site.iconUrl, request.url) || undefined;

  return new Response(
    JSON.stringify(
      {
        version: "https://jsonfeed.org/version/1.1",
        title: site.name,
        description: site.subtitle,
        home_page_url: siteUrl,
        feed_url: createPublicUrl(request.url, "/rss.json"),
        icon: siteIcon,
        favicon: siteIcon,
        items: articles.map((article) => {
          const metadata = createPublicArticleMetadata(request.url, article);

          return {
            id: metadata.url,
            url: metadata.url,
            title: article.title,
            summary: stripMarkdown(article.summary || article.content),
            content_text: stripMarkdown(article.content || article.summary),
            image: metadata.image || undefined,
            date_published: metadata.datePublished || undefined,
            date_modified: metadata.dateModified || undefined,
            tags: parsePublicArticleTags(article.tags)
          };
        })
      },
      null,
      2
    ),
    { headers: JSON_FEED_HEADERS }
  );
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
    .slice(0, 2000);
}
