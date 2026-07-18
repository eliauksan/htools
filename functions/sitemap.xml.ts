import {
  getDatabase,
  type ArticleRow,
  type Env
} from "./_shared";
import {
  createPublicArticleMetadata,
  createPublicUrl,
  parsePublicDate
} from "./_public-discovery";

const SITEMAP_HEADERS = {
  "Cache-Control": "public, max-age=300",
  "Content-Type": "application/xml; charset=utf-8"
};

type SitemapArticleRow = Pick<
  ArticleRow,
  "slug" | "cover_image" | "updated_at" | "published_at" | "created_at"
>;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const urls = [
    createUrlEntry(request.url, "/", "daily", "1.0"),
    createUrlEntry(request.url, "/tools", "daily", "0.8"),
    createUrlEntry(request.url, "/articles", "daily", "0.8"),
    createUrlEntry(request.url, "/submit", "monthly", "0.5"),
    createUrlEntry(request.url, "/about", "monthly", "0.5"),
    createUrlEntry(request.url, "/privacy", "yearly", "0.3"),
    createUrlEntry(request.url, "/terms", "yearly", "0.3")
  ];

  try {
    const db = await getDatabase(env);
    const result = await db.prepare(
      `SELECT slug, cover_image, updated_at, published_at, created_at
       FROM articles
       WHERE published = 1
       ORDER BY COALESCE(published_at, updated_at, created_at) DESC
       LIMIT 1000`
    ).all<SitemapArticleRow>();

    urls.push(
      ...result.results.map((article) => {
        const metadata = createPublicArticleMetadata(request.url, article);

        return createUrlEntry(
          request.url,
          metadata.url,
          "weekly",
          "0.7",
          metadata.dateModified
        );
      })
    );
  } catch {
    // Keep the sitemap useful even when a fresh deployment has not bound D1 yet.
  }

  return new Response(createSitemap(urls), {
    headers: SITEMAP_HEADERS
  });
};

function createSitemap(urls: string[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

function createUrlEntry(
  requestUrl: string,
  path: string,
  changefreq: string,
  priority: string,
  lastmod = ""
) {
  const normalizedLastmod = normalizeSitemapDate(lastmod);

  return [
    "  <url>",
    `    <loc>${escapeXml(createPublicUrl(requestUrl, path))}</loc>`,
    normalizedLastmod ? `    <lastmod>${normalizedLastmod}</lastmod>` : "",
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>"
  ].filter(Boolean).join("\n");
}

function normalizeSitemapDate(value: string) {
  const date = parsePublicDate(value);

  return date ? date.toISOString() : "";
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
