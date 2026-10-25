import type { ChannelWithMeta } from "./types";

export interface Taste {
  countries: Map<string, number>;
  categories: Map<string, number>;
  languages: Map<string, number>;
  total: number;
}

function bump(m: Map<string, number>, k: string | undefined | null, w: number) {
  if (!k) return;
  m.set(k, (m.get(k) || 0) + w);
}

/** Build a taste profile from watch counts and favorites (favorites count double). */
export function buildTaste(
  channels: ChannelWithMeta[],
  watchCounts: Record<string, number>,
  favorites: string[]
): Taste {
  const byId = new Map(channels.map((c) => [c.id, c]));
  const taste: Taste = { countries: new Map(), categories: new Map(), languages: new Map(), total: 0 };
  const weights = new Map<string, number>();
  for (const [id, n] of Object.entries(watchCounts)) weights.set(id, (weights.get(id) || 0) + Math.min(n, 20));
  for (const id of favorites) weights.set(id, (weights.get(id) || 0) + 2);
  for (const [id, w] of weights) {
    const c = byId.get(id);
    if (!c) continue;
    taste.total += w;
    bump(taste.countries, c.country, w);
    for (const cat of c.categories || []) bump(taste.categories, cat, w);
    for (const l of c.languages || []) bump(taste.languages, l, w);
  }
  return taste;
}

function share(m: Map<string, number>, k: string, total: number) {
  return total > 0 ? (m.get(k) || 0) / total : 0;
}

/**
 * Channels the user hasn't watched that match what they watch most
 * (country, category, language). Empty until there's some history.
 */
export function recommendForYou(
  channels: ChannelWithMeta[],
  taste: Taste,
  exclude: Set<string>,
  limit = 20
): ChannelWithMeta[] {
  if (taste.total === 0) return [];
  const scored: Array<{ c: ChannelWithMeta; s: number }> = [];
  for (const c of channels) {
    if (exclude.has(c.id)) continue;
    let s = 1.0 * share(taste.countries, c.country, taste.total);
    s += 1.2 * Math.max(0, ...(c.categories || []).map((k) => share(taste.categories, k, taste.total)));
    s += 0.8 * Math.max(0, ...(c.languages || []).map((k) => share(taste.languages, k, taste.total)));
    if (c.logo) s += 0.05;
    if (s > 0.3) scored.push({ c, s });
  }
  scored.sort((a, b) => b.s - a.s || a.c.name.localeCompare(b.c.name));
  // Keep some variety: at most 4 channels per category in a row.
  const perCat = new Map<string, number>();
  const out: ChannelWithMeta[] = [];
  for (const { c } of scored) {
    const cat = c.categories?.[0] || "general";
    if ((perCat.get(cat) || 0) >= 4) continue;
    perCat.set(cat, (perCat.get(cat) || 0) + 1);
    out.push(c);
    if (out.length >= limit) break;
  }
  return out;
}

export type DayPart = "morning" | "afternoon" | "evening" | "night";

export function dayPart(hour: number): DayPart {
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

/** Categories that suit each part of the day, best first. */
export const DAYPART_CATEGORIES: Record<DayPart, string[]> = {
  morning: ["news", "weather", "religious", "kids", "cooking"],
  afternoon: ["kids", "entertainment", "cooking", "education", "animation", "news"],
  evening: ["sports", "movies", "entertainment", "series", "news"],
  night: ["movies", "music", "series", "documentary", "comedy"],
};

/**
 * Suggestions for the current time of day, nudged toward the user's
 * country and language when known.
 */
export function timeOfDaySuggestions(
  channels: ChannelWithMeta[],
  hour: number,
  opts: { country?: string | null; taste?: Taste; exclude?: Set<string>; limit?: number } = {}
): ChannelWithMeta[] {
  const cats = DAYPART_CATEGORIES[dayPart(hour)];
  const limit = opts.limit ?? 16;
  const scored: Array<{ c: ChannelWithMeta; s: number }> = [];
  for (const c of channels) {
    if (opts.exclude?.has(c.id)) continue;
    const idx = Math.min(...(c.categories || []).map((k) => {
      const i = cats.indexOf(k);
      return i < 0 ? 99 : i;
    }), 99);
    if (idx === 99) continue;
    let s = (cats.length - idx) / cats.length;
    if (opts.country && c.country === opts.country) s += 0.6;
    if (opts.taste && opts.taste.total > 0) {
      s += 0.4 * share(opts.taste.countries, c.country, opts.taste.total);
      s += 0.3 * Math.max(0, ...(c.languages || []).map((k) => share(opts.taste!.languages, k, opts.taste!.total)));
    }
    if (c.logo) s += 0.05;
    scored.push({ c, s });
  }
  scored.sort((a, b) => b.s - a.s || a.c.name.localeCompare(b.c.name));
  return scored.slice(0, limit).map((x) => x.c);
}
