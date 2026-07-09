import type { Channel, Stream, Country, ChannelWithMeta } from "./types";
import { WEB_API_BASE_URL } from "./config";

const BASE_URL = "https://iptv-org.github.io/api";

async function fetchJSON<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${BASE_URL}/${endpoint}`);
  if (!res.ok) throw new Error(`Failed ${endpoint}: ${res.status}`);
  return res.json();
}

export interface CatalogData {
  channels: ChannelWithMeta[];
  countries: Country[];
}

let cache: CatalogData | null = null;
let pending: Promise<CatalogData> | null = null;

export async function loadCatalog(): Promise<CatalogData> {
  if (cache) return cache;
  if (pending) return pending;

  pending = (async () => {
    const [channels, streams, logos, countries] = await Promise.all([
      fetchJSON<Channel[]>("channels.json"),
      fetchJSON<Stream[]>("streams.json"),
      fetchJSON<Array<{ channel: string; url: string }>>("logos.json"),
      fetchJSON<Country[]>("countries.json"),
    ]);

    const streamMap = new Map<string, Stream[]>();
    for (const s of streams) {
      if (!s.channel) continue;
      const arr = streamMap.get(s.channel);
      if (arr) arr.push(s);
      else streamMap.set(s.channel, [s]);
    }

    const logoMap = new Map<string, string>();
    for (const l of logos) if (!logoMap.has(l.channel)) logoMap.set(l.channel, l.url);

    const enriched: ChannelWithMeta[] = [];
    for (const ch of channels) {
      if (ch.is_nsfw) continue;
      const chStreams = streamMap.get(ch.id);
      if (!chStreams || chStreams.length === 0) continue;
      enriched.push({
        ...ch,
        // The iptv-org API no longer guarantees these array fields on every
        // channel (e.g. `languages` was dropped), so normalise them here to
        // keep every consumer safe from `.length`/`.map` on undefined.
        alt_names: Array.isArray(ch.alt_names) ? ch.alt_names : [],
        owners: Array.isArray(ch.owners) ? ch.owners : [],
        languages: Array.isArray(ch.languages) ? ch.languages : [],
        categories: Array.isArray(ch.categories) ? ch.categories : [],
        logo: logoMap.get(ch.id) || null,
        streams: chStreams,
      });
    }

    cache = { channels: enriched, countries };
    return cache;
  })();

  const result = await pending;
  pending = null;
  return result;
}

export function pickBestStream(streams: Stream[]): string | null {
  if (streams.length === 0) return null;
  const hls = streams.find((s) => s.url.includes(".m3u8"));
  return (hls || streams[0]).url;
}

export interface FeaturedInfo {
  ids: string[];
  primary: string | null;
}

// Fetches the admin-managed featured list + primary from the web app.
// Falls back to an empty list on any error — caller decides how to handle.
export async function loadFeatured(): Promise<FeaturedInfo> {
  try {
    const res = await fetch(`${WEB_API_BASE_URL}/api/featured`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`featured ${res.status}`);
    const data = (await res.json()) as {
      ids?: string[];
      primary?: string | null;
    };
    return {
      ids: Array.isArray(data.ids) ? data.ids : [],
      primary: typeof data.primary === "string" ? data.primary : null,
    };
  } catch {
    return { ids: [], primary: null };
  }
}

export interface BroadcastRawChannel {
  id: string;
  name: string;
  url: string;
  logo: string | null;
  category: string | null;
  country: string | null;
  description: string | null;
  addedAt: number;
}

// Fetches admin-managed broadcast channels (custom channels visible to
// every user). Falls back to an empty array on any error.
export async function loadBroadcastChannels(): Promise<BroadcastRawChannel[]> {
  try {
    const res = await fetch(`${WEB_API_BASE_URL}/api/broadcast-channels`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`broadcast ${res.status}`);
    const data = (await res.json()) as { channels?: BroadcastRawChannel[] };
    return Array.isArray(data.channels) ? data.channels : [];
  } catch {
    return [];
  }
}

export function broadcastToChannelWithMeta(
  c: BroadcastRawChannel
): ChannelWithMeta {
  return {
    id: c.id,
    name: c.name,
    alt_names: [],
    network: null,
    owners: [],
    country: c.country || "INT",
    languages: [],
    categories: c.category ? [c.category] : [],
    is_nsfw: false,
    logo: c.logo,
    streams: [
      {
        channel: c.id,
        feed: null,
        title: c.name,
        url: c.url,
        quality: null,
        user_agent: null,
        referrer: null,
      },
    ],
  };
}
