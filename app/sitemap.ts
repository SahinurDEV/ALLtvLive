import type { MetadataRoute } from "next";
import { getCatalog, SITE_URL } from "@/lib/server/catalog";
import { getHiddenSet } from "@/lib/server/hiddenChannels";
import { SITEMAP_FILES, sitemapSlice } from "@/lib/server/sitemapChunks";

// Built once and regenerated daily (ISR), instead of on every request.
export const revalidate = 86400;
export const dynamic = "force-static";

/** /sitemap/0.xml … /sitemap/9.xml; robots.txt lists them all. */
export async function generateSitemaps() {
  return Array.from({ length: SITEMAP_FILES }, (_, id) => ({ id }));
}

export default async function sitemap({ id }: { id: number | string }): Promise<MetadataRoute.Sitemap> {
  const file = Number(id) || 0;
  const now = new Date();
  const pages: MetadataRoute.Sitemap =
    file === 0
      ? ["", "/watch", "/about", "/privacy", "/dmca", "/public-api", "/multiview", "/sports"].map((p) => ({
          url: `${SITE_URL}${p}`,
          lastModified: now,
          changeFrequency: "weekly" as const,
          priority: p === "" ? 1 : 0.5,
        }))
      : [];
  try {
    const [catalog, hidden] = await Promise.all([getCatalog(), getHiddenSet()]);
    // Channels the health check found dead are left out (their pages are noindex).
    const ids = [...catalog.keys()].filter((cid) => !hidden.has(cid)).sort();
    for (const cid of sitemapSlice(ids, file)) {
      pages.push({ url: `${SITE_URL}/${encodeURIComponent(cid)}`, lastModified: now, changeFrequency: "daily", priority: 0.6 });
    }
  } catch {
    // iptv-org unreachable: ship the static pages only.
  }
  return pages;
}
