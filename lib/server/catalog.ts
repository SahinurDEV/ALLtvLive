import { isBlocked } from "@/lib/blocklist";

/**
 * Server-side view of the iptv-org catalog.
 *
 * channels.json is about 8 MB, above Next's 2 MB data-cache limit, so it is
 * kept in a per-instance memory cache instead of `fetch` caching.
 */

const BASE = "https://iptv-org.github.io/api";
const TTL_MS = 60 * 60 * 1000;

export interface CatalogChannel {
  id: string;
  name: string;
  country: string;
  categories: string[];
  languages: string[];
  logo: string | null;
  website: string | null;
}

interface RawChannel {
  id: string;
  name: string;
  country: string;
  categories?: string[];
  languages?: string[];
  website?: string | null;
  is_nsfw?: boolean;
  closed?: string | null;
}

let cache: { at: number; data: Promise<Map<string, CatalogChannel>> } | null = null;

async function getJson<T>(name: string): Promise<T> {
  const res = await fetch(`${BASE}/${name}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`${name}: ${res.status}`);
  return res.json() as Promise<T>;
}

async function load(): Promise<Map<string, CatalogChannel>> {
  const [channels, streams, logos] = await Promise.all([
    getJson<RawChannel[]>("channels.json"),
    getJson<Array<{ channel: string | null }>>("streams.json"),
    getJson<Array<{ channel: string; url: string }>>("logos.json").catch(() => []),
  ]);
  const withStreams = new Set<string>();
  for (const s of streams) if (s.channel) withStreams.add(s.channel);
  const logo = new Map<string, string>();
  for (const l of logos) if (!logo.has(l.channel)) logo.set(l.channel, l.url);

  const map = new Map<string, CatalogChannel>();
  for (const c of channels) {
    if (c.is_nsfw || isBlocked(c.id) || !withStreams.has(c.id)) continue;
    map.set(c.id, {
      id: c.id,
      name: c.name,
      country: c.country,
      categories: c.categories || [],
      languages: c.languages || [],
      logo: logo.get(c.id) || null,
      website: c.website || null,
    });
  }
  return map;
}

/** Playable, non-blocked channels by id. Throws if iptv-org is unreachable. */
export function getCatalog(): Promise<Map<string, CatalogChannel>> {
  if (!cache || Date.now() - cache.at > TTL_MS) {
    const data = load();
    cache = { at: Date.now(), data };
    data.catch(() => {
      cache = null;
    });
  }
  return cache.data;
}

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://alltvlive.vercel.app").replace(/\/$/, "");
