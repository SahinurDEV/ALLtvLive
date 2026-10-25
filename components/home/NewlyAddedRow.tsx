"use client";

import { useMemo } from "react";
import { BadgePlus } from "lucide-react";
import { ChannelScrollRow } from "./ChannelScrollRow";
import { useChannelInsights } from "@/hooks/useChannelInsights";
import { useT } from "@/lib/i18n";
import type { ChannelWithMeta } from "@/lib/types";

/** Channels that joined the catalog in the last 14 days. */
export function NewlyAddedRow({ allChannels }: { allChannels: ChannelWithMeta[] }) {
  const t = useT();
  const { newIds } = useChannelInsights();
  const channels = useMemo(() => {
    const map = new Map(allChannels.map((c) => [c.id, c]));
    return newIds.map((id) => map.get(id)).filter((c): c is ChannelWithMeta => !!c);
  }, [allChannels, newIds]);
  if (channels.length < 2) return null;
  return (
    <div data-testid="newly-added-row">
      <ChannelScrollRow
        channels={channels}
        title={t("home.newlyAdded")}
        icon={<BadgePlus className="h-5 w-5 text-sky-400" />}
      />
    </div>
  );
}
