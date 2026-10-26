import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/server/catalog";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`, // the index of /sitemap/0.xml …
    host: SITE_URL,
  };
}
