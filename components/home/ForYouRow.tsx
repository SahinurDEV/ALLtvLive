"use client";

import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { ChannelScrollRow } from "./ChannelScrollRow";
import { useForYou } from "@/hooks/useForYou";
import type { ChannelWithMeta } from "@/lib/types";

interface Props {
  allChannels: ChannelWithMeta[];
}

export function ForYouRow({ allChannels }: Props) {
  const { channelIds } = useForYou();

  const channels = useMemo(() => {
    if (channelIds.length === 0) return [];
    const map = new Map(allChannels.map((c) => [c.id, c]));
    return channelIds
      .map((id) => map.get(id))
      .filter((c): c is ChannelWithMeta => !!c);
  }, [channelIds, allChannels]);

  if (channels.length < 3) return null;

  return (
    <ChannelScrollRow
      channels={channels}
      title="For You"
      icon={<Sparkles className="h-5 w-5 text-neon" />}
    />
  );
}
