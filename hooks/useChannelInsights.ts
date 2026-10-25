"use client";

import useSWR from "swr";
import type { ChannelInsights } from "@/lib/server/insights";

const EMPTY: ChannelInsights = { reliability: {}, rating: {}, newIds: [] };

const fetcher = (url: string) =>
  fetch(url).then((r) => (r.ok ? (r.json() as Promise<ChannelInsights>) : EMPTY));

export function useChannelInsights(): ChannelInsights {
  const { data } = useSWR<ChannelInsights>("/api/channel-insights", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 15 * 60_000,
  });
  return data ?? EMPTY;
}
