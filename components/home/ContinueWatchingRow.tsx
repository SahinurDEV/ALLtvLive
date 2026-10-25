"use client";

import { useMemo } from "react";
import { History, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ChannelScrollRow } from "./ChannelScrollRow";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import type { ChannelWithMeta } from "@/lib/types";

interface Props {
  allChannels: ChannelWithMeta[];
}

/** Home row of recently watched channels (stored in localStorage, newest first). */
export function ContinueWatchingRow({ allChannels }: Props) {
  const t = useT();
  const historyIds = useAppStore((s) => s.historyIds);
  const clearRecentlyWatched = useAppStore((s) => s.clearRecentlyWatched);

  const channels = useMemo(() => {
    if (historyIds.length === 0) return [];
    const map = new Map(allChannels.map((c) => [c.id, c]));
    return historyIds
      .map((id) => map.get(id))
      .filter((c): c is ChannelWithMeta => !!c);
  }, [historyIds, allChannels]);

  if (channels.length === 0) return null;

  return (
    <section data-testid="continue-watching">
      <ChannelScrollRow
        channels={channels}
        title={t("home.continue")}
        icon={<History className="h-5 w-5 text-neon" />}
        action={
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              clearRecentlyWatched();
              toast.success(t("home.historyCleared"));
            }}
            aria-label={t("home.clearHistory")}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("home.clearHistory")}
          </Button>
        }
      />
    </section>
  );
}
