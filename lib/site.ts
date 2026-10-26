/**
 * The one public address used for canonical links, the sitemap and share
 * cards. Set NEXT_PUBLIC_SITE_URL to override; without it the custom domain is
 * used, so both domains point search engines at the same URLs.
 */
export const DEFAULT_SITE_URL = "https://livetv.sahinur.dev";

export function resolveSiteUrl(env: string | undefined): string {
  const raw = (env || "").trim();
  if (!/^https?:\/\/[^/\s]+/i.test(raw)) return DEFAULT_SITE_URL;
  return raw.replace(/\/+$/, "");
}

export const SITE_URL = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

export function websiteJsonLd(site = SITE_URL) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ALLtvLive",
    url: site,
    inLanguage: ["en", "bn"],
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${site}/watch?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}
