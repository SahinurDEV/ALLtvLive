import type { CatalogChannel } from "@/lib/server/catalog";

export const LANDING_LIMIT = 300;

/** Channels for a country or category landing page, sorted by name. */
export function pickChannels(
  all: Iterable<CatalogChannel>,
  kind: "country" | "category",
  key: string,
  hidden: Set<string> = new Set()
): CatalogChannel[] {
  const k = key.toLowerCase();
  const out: CatalogChannel[] = [];
  for (const c of all) {
    if (hidden.has(c.id)) continue;
    const hit = kind === "country" ? c.country.toLowerCase() === k : c.categories.includes(k);
    if (hit) out.push(c);
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** Most common countries and categories, for the sitemap and internal links. */
export function topKeys(all: Iterable<CatalogChannel>, kind: "country" | "category", min = 3): string[] {
  const n = new Map<string, number>();
  for (const c of all) {
    const keys = kind === "country" ? (c.country ? [c.country.toLowerCase()] : []) : c.categories;
    for (const k of keys) n.set(k, (n.get(k) || 0) + 1);
  }
  return [...n.entries()].filter(([, v]) => v >= min).sort((a, b) => b[1] - a[1]).map(([k]) => k);
}
