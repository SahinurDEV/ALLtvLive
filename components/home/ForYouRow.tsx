"use client";

import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { ChannelScrollRow } from "./ChannelScrollRow";
import { useForYou } from "@/hooks/useForYou";
import { useAppStore } from "@/lib/store";
import { loadPopular } from "@/lib/history/watchHistory";
import { buildTaste, recommendForYou } from "@/lib/recommend";
import { useT } from "@/lib/i18n";
import type { ChannelWithMeta } from "@/lib/types";

interface Props {
  allChannels: ChannelWithMeta[];
}

/**
 * New channels picked from what the user watches most (country, category,
 * language). Falls back to the server's list until there's local history.
 */
export function ForYouRow({ allChannels }: Props) {
  const t = useT();
  const { channelIds } = useForYou();
  const historyIds = useAppStore((s) => s.historyIds);
  const favorites = useAppStore((s) => s.favorites);

  const channels = useMemo(() => {
    const counts = typeof window === "undefined" ? {} : loadPopular();
    const taste = buildTaste(allChannels, counts, favorites);
    const exclude = new Set([...Object.keys(counts), ...favorites, ...historyIds]);
    const picks = recommendForYou(allChannels, taste, exclude, 20);
    if (picks.length >= 3) return picks;
    const map = new Map(allChannels.map((c) => [c.id, c]));
    return channelIds.map((id) => map.get(id)).filter((c): c is ChannelWithMeta => !!c);
  }, [allChannels, favorites, historyIds, channelIds]);

  if (channels.length < 3) return null;

  return (
    <div data-testid="for-you-row">
      <ChannelScrollRow
        channels={channels}
        title={t("home.forYou")}
        icon={<Sparkles className="h-5 w-5 text-neon" />}
      />
    </div>
  );
}
