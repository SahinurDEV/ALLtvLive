/**
 * Free XMLTV guide data from epg.pw (one file per country), parsed on the
 * server into a small per-country index. Channels are matched by name,
 * because epg.pw uses its own numeric ids. Everything degrades to "no guide".
 */

export const EPG_COUNTRIES = new Set([
  "AU", "BR", "CA", "CN", "DE", "FR", "GB", "HK", "ID", "IN",
  "JP", "MY", "NZ", "PH", "RU", "SG", "TW", "US", "VN", "ZA",
]);

const TTL_MS = 6 * 60 * 60 * 1000;
const WINDOW_MS = 36 * 60 * 60 * 1000;

export interface Programme {
  title: string;
  start: number;
  stop: number;
  desc: string | null;
}

interface CountryIndex {
  byName: Map<string, string[]>; // normalized name -> epg channel ids
  programmes: Map<string, Programme[]>; // channel id -> sorted programmes
}

const cache = new Map<string, { at: number; data: Promise<CountryIndex> }>();

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&amp;/g, "&")
    .replace(/\b(hd|sd|fhd|uhd|4k)\b/g, "")
    .replace(/[^a-z0-9\u0980-\u09ff]+/g, "");
}

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

// XMLTV time: 20261024000000 +0000
function parseTime(s: string): number {
  const m = s.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?/);
  if (!m) return NaN;
  const [, y, mo, d, h, mi, se, tz] = m;
  let t = Date.UTC(+y, +mo - 1, +d, +h, +mi, +se);
  if (tz) {
    const sign = tz[0] === "-" ? -1 : 1;
    t -= sign * ((+tz.slice(1, 3)) * 60 + +tz.slice(3, 5)) * 60_000;
  }
  return t;
}

async function load(country: string): Promise<CountryIndex> {
  const res = await fetch(`https://epg.pw/xmltv/epg_${country}.xml`, {
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`epg ${country}: ${res.status}`);
  const xml = await res.text();

  const byName = new Map<string, string[]>();
  const chRe = /<channel id="([^"]+)">([\s\S]*?)<\/channel>/g;
  for (let m; (m = chRe.exec(xml)); ) {
    const id = m[1];
    const nameRe = /<display-name[^>]*>([\s\S]*?)<\/display-name>/g;
    for (let n; (n = nameRe.exec(m[2])); ) {
      const key = normalizeName(decode(n[1]));
      if (!key) continue;
      const list = byName.get(key) || [];
      if (!list.includes(id)) list.push(id);
      byName.set(key, list);
    }
  }

  const now = Date.now();
  const programmes = new Map<string, Programme[]>();
  const pRe = /<programme([^>]*)>([\s\S]*?)<\/programme>/g;
  for (let m; (m = pRe.exec(xml)); ) {
    const attrs = m[1];
    const ch = attrs.match(/channel="([^"]+)"/)?.[1];
    const start = parseTime(attrs.match(/start="([^"]+)"/)?.[1] || "");
    const stop = parseTime(attrs.match(/stop="([^"]+)"/)?.[1] || "");
    if (!ch || !Number.isFinite(start) || !Number.isFinite(stop)) continue;
    if (stop < now || start > now + WINDOW_MS) continue;
    const title = decode(m[2].match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] || "");
    if (!title) continue;
    const descRaw = m[2].match(/<desc[^>]*>([\s\S]*?)<\/desc>/)?.[1];
    const list = programmes.get(ch) || [];
    list.push({ title, start, stop, desc: descRaw ? decode(descRaw).slice(0, 300) : null });
    programmes.set(ch, list);
  }
  for (const list of programmes.values()) list.sort((a, b) => a.start - b.start);
  return { byName, programmes };
}

function getCountry(country: string): Promise<CountryIndex> {
  const hit = cache.get(country);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  const data = load(country);
  cache.set(country, { at: Date.now(), data });
  data.catch(() => cache.delete(country));
  return data;
}

/** Upcoming programmes (current first) for a channel name, or null. */
export async function lookupGuide(country: string, names: string[]): Promise<Programme[] | null> {
  const cc = country.toUpperCase() === "UK" ? "GB" : country.toUpperCase();
  if (!EPG_COUNTRIES.has(cc)) return null;
  const idx = await getCountry(cc);
  const now = Date.now();
  for (const name of names) {
    const key = normalizeName(name);
    if (!key) continue;
    for (const id of idx.byName.get(key) || []) {
      const list = (idx.programmes.get(id) || []).filter((p) => p.stop > now);
      if (list.length) return list.slice(0, 8);
    }
  }
  return null;
}
