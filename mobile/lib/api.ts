import type { Channel, Stream, Country, ChannelWithMeta } from "./types";

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
