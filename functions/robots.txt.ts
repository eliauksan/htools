import type { Env } from "./_shared";
import { getPublicSiteUrl } from "./_public-discovery";

const ROBOTS_HEADERS = {
  "Cache-Control": "public, max-age=3600",
  "Content-Type": "text/plain; charset=utf-8"
};

export const onRequestGet: PagesFunction<Env> = ({ request }) => {
  const siteUrl = getPublicSiteUrl(request.url).replace(/\/$/, "");

  return new Response(
    [
      "User-agent: *",
      "Allow: /",
      "Disallow: /admin",
      "Disallow: /api/",
      "Disallow: /__htools-cache/",
      `Sitemap: ${siteUrl}/sitemap.xml`,
      ""
    ].join("\n"),
    { headers: ROBOTS_HEADERS }
  );
};
