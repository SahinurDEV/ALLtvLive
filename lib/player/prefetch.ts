import type { ChannelWithMeta } from "@/lib/types";
import { buildSourceList } from "./detectStreamType";

const warmed = new Set<string>();

/**
 * Warm up the next channel: open a connection to its stream host and fetch
 * its HLS playlist into the HTTP cache, so zapping to it starts faster.
 * Only touches the small playlist, never video segments.
 */
export function prefetchChannel(channel: ChannelWithMeta | null | undefined) {
  if (!channel || typeof document === "undefined") return;
  const src = buildSourceList(channel.streams || [])[0];
  if (!src || src.type !== "hls" || !/^https:\/\//i.test(src.url)) return;
  if (warmed.has(src.url)) return;
  warmed.add(src.url);
  try {
    const origin = new URL(src.url).origin;
    if (!document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) {
      const link = document.createElement("link");
      link.rel = "preconnect";
      link.href = origin;
      link.crossOrigin = "anonymous";
      document.head.appendChild(link);
    }
    fetch(src.url, { mode: "cors", credentials: "omit", cache: "force-cache" }).catch(() => {});
  } catch {
    // ignore bad URLs
  }
}
