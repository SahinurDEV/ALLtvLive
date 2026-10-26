/** Channel sitemaps are split so each file stays small and fast. */
export const SITEMAP_CHUNK = 2500;
/** Fixed number of channel sitemap files (room for 25,000 channels). */
export const SITEMAP_FILES = 10;

/** Ids for one sitemap file: file 0 holds the static pages and the first chunk. */
export function sitemapSlice<T>(all: T[], file: number): T[] {
  return all.slice(file * SITEMAP_CHUNK, (file + 1) * SITEMAP_CHUNK);
}
