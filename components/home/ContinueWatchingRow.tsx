"use client";

import { useMemo } from "react";
import { History } from "lucide-react";
import { ChannelScrollRow } from "./ChannelScrollRow";
import { useAppStore } from "@/lib/store";
import type { ChannelWithMeta } from "@/lib/types";

interface Props {
  allChannels: ChannelWithMeta[];
}

export function ContinueWatchingRow({ allChannels }: Props) {
  const historyIds = useAppStore((s) => s.historyIds);

  const channels = useMemo(() => {
    if (historyIds.length === 0) return [];
    const map = new Map(allChannels.map((c) => [c.id, c]));
    return historyIds
      .map((id) => map.get(id))
      .filter((c): c is ChannelWithMeta => !!c);
  }, [historyIds, allChannels]);

  if (channels.length === 0) return null;

  return (
    <ChannelScrollRow
      channels={channels}
      title="Continue Watching"
      icon={<History className="h-5 w-5 text-neon" />}
    />
  );
}
