import type { MetadataRoute } from "next";
import { getCatalog, SITE_URL } from "@/lib/server/catalog";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = ["", "/watch", "/about", "/privacy", "/dmca", "/public-api", "/multiview", "/sports"].map(
    (p) => ({ url: `${SITE_URL}${p}`, lastModified: now, changeFrequency: "weekly", priority: p === "" ? 1 : 0.5 })
  );
  try {
    const catalog = await getCatalog();
    for (const ch of catalog.values()) {
      pages.push({
        url: `${SITE_URL}/${encodeURIComponent(ch.id)}`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.6,
      });
    }
  } catch {
    // iptv-org unreachable: ship the static pages only.
  }
  return pages;
}
