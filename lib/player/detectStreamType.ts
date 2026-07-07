import type { Stream } from "@/lib/types";

export type StreamType =
  | "hls"
  | "mpegts"
  | "progressive"
  | "youtube"
  | "dash"
  | "unknown";

export interface ResolvedSource {
  url: string;
  type: StreamType;
  quality: string | null;
  referrer: string | null;
  userAgent: string | null;
  youtubeId?: string;
}

const YOUTUBE_HOSTS = ["youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com", "youtube-nocookie.com"];

export function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      const id = u.pathname.replace(/^\//, "");
      return id || null;
    }
    if (YOUTUBE_HOSTS.includes(u.hostname)) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const embedMatch = u.pathname.match(/\/embed\/([^/?]+)/);
      if (embedMatch) return embedMatch[1];
      const liveMatch = u.pathname.match(/\/live\/([^/?]+)/);
      if (liveMatch) return liveMatch[1];
    }
    return null;
  } catch {
    return null;
  }
}

export function detectStreamType(url: string): StreamType {
  if (!url) return "unknown";
  const lower = url.toLowerCase().split("?")[0];

  if (extractYouTubeId(url)) return "youtube";
  if (lower.includes(".m3u8")) return "hls";
  if (lower.includes(".mpd")) return "dash";
  if (lower.endsWith(".ts") || lower.includes(".ts?")) return "mpegts";
  if (
    lower.endsWith(".mp4") ||
    lower.endsWith(".webm") ||
    lower.endsWith(".mov") ||
    lower.endsWith(".ogv")
  ) {
    return "progressive";
  }
  return "unknown";
}

/**
 * Take the raw streams for a channel and return an ordered list of resolved
 * sources to try. HLS preferred (widest support via HLS.js), then progressive,
 * then YouTube (needs iframe), then anything else. Sources within a group are
 * ordered by quality where available.
 */
export function buildSourceList(streams: Stream[]): ResolvedSource[] {
  const resolved: ResolvedSource[] = streams
    .filter((s) => !!s?.url)
    .map((s) => {
      const type = detectStreamType(s.url);
      const youtubeId = type === "youtube" ? extractYouTubeId(s.url) || undefined : undefined;
      return {
        url: s.url,
        type,
        quality: s.quality || null,
        referrer: s.referrer || null,
        userAgent: s.user_agent || null,
        youtubeId,
      };
    });

  const rank = (t: StreamType) => {
    switch (t) {
      case "hls":
        return 0;
      case "progressive":
        return 1;
      case "youtube":
        return 2;
      case "dash":
        return 3;
      case "mpegts":
        return 4;
      default:
        return 5;
    }
  };

  const qualityScore = (q: string | null) => {
    if (!q) return 0;
    const n = parseInt(q.replace(/[^\d]/g, ""), 10);
    return Number.isFinite(n) ? n : 0;
  };

  return resolved.sort((a, b) => {
    const r = rank(a.type) - rank(b.type);
    if (r !== 0) return r;
    return qualityScore(b.quality) - qualityScore(a.quality);
  });
}
