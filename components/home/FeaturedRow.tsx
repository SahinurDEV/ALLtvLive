"use client";

import { ChannelScrollRow } from "./ChannelScrollRow";
import type { ChannelWithMeta } from "@/lib/types";

interface Props {
  channels: ChannelWithMeta[];
}

export function FeaturedRow({ channels }: Props) {
  if (channels.length === 0) return null;

  return (
    <ChannelScrollRow
      channels={channels}
      title="24/7 Live"
      icon={
        <span className="relative inline-flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 motion-reduce:animate-none" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
        </span>
      }
    />
  );
}
