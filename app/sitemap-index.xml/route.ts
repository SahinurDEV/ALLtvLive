import { SITE_URL } from "@/lib/server/catalog";
import { SITEMAP_FILES } from "@/lib/server/sitemapChunks";

export const dynamic = "force-static";

/** Sitemap index, also served at /sitemap.xml (see next.config.js rewrites). */
export function GET() {
  const items = Array.from(
    { length: SITEMAP_FILES },
    (_, i) => `  <sitemap><loc>${SITE_URL}/sitemap/${i}.xml</loc></sitemap>`
  ).join("\n");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>\n`,
    { headers: { "content-type": "application/xml; charset=utf-8" } }
  );
}
