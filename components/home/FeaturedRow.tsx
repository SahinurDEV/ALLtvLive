"use client";

import { Sparkles } from "lucide-react";
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
      title="Featured"
      icon={<Sparkles className="h-5 w-5 text-neon" />}
    />
  );
}
