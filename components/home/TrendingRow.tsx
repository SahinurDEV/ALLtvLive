"use client";

import { useMemo } from "react";
import { Flame } from "lucide-react";
import { ChannelScrollRow } from "./ChannelScrollRow";
import { useAppStore } from "@/lib/store";
import type { ChannelWithMeta } from "@/lib/types";

interface Props {
  allChannels: ChannelWithMeta[];
  fallbackChannels: ChannelWithMeta[];
}

export function TrendingRow({ allChannels, fallbackChannels }: Props) {
  const popularIds = useAppStore((s) => s.popularIds);

  const channels = useMemo(() => {
    if (popularIds.length >= 3) {
      const map = new Map(allChannels.map((c) => [c.id, c]));
      const popular = popularIds
        .map((id) => map.get(id))
        .filter((c): c is ChannelWithMeta => !!c);
      if (popular.length >= 3) return popular;
    }
    return fallbackChannels.slice(0, 12);
  }, [popularIds, allChannels, fallbackChannels]);

  if (channels.length === 0) return null;

  return (
    <ChannelScrollRow
      channels={channels}
      title="Popular Now"
      icon={<Flame className="h-5 w-5 text-orange-400" />}
    />
  );
}
