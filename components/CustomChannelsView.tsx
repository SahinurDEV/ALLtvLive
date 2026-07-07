"use client";

import { useMemo } from "react";
import { Plus, Radio, Trash2, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChannelGrid } from "./ChannelGrid";
import { useAppStore } from "@/lib/store";
import type { ChannelWithMeta } from "@/lib/types";
import { toast } from "sonner";

interface CustomChannelsViewProps {
  allChannels: ChannelWithMeta[];
}

export function CustomChannelsView({ allChannels }: CustomChannelsViewProps) {
  const customChannels = useAppStore((s) => s.customChannels);
  const openCustomDialog = useAppStore((s) => s.openCustomDialog);
  const removeCustomChannel = useAppStore((s) => s.removeCustomChannel);

  const list = useMemo(() => {
    const ids = new Set(customChannels.map((c) => c.id));
    return allChannels.filter((ch) => ids.has(ch.id));
  }, [allChannels, customChannels]);

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <Radio className="h-14 w-14 text-muted-foreground/30 mb-3" />
        <h2 className="text-xl font-bold mb-2">No Custom Channels</h2>
        <p className="text-muted-foreground max-w-sm mb-4 text-sm">
          Add your own IPTV stream URLs (HLS, MP4, etc.) to watch them here alongside the built-in channels.
        </p>
        <Button variant="neon" onClick={() => openCustomDialog()} className="gap-1">
          <Plus className="h-4 w-4" />
          Add Custom Channel
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg">My Channels</h2>
          <p className="text-xs text-muted-foreground">
            {list.length} custom channel{list.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button variant="neon" size="sm" onClick={() => openCustomDialog()} className="gap-1">
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      <ChannelGrid
        channels={list}
        title=""
        showLoadMore={false}
      />

      <div className="mt-6 pt-4 border-t border-border/50">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Manage
        </h3>
        <div className="space-y-1.5">
          {customChannels.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 p-2.5 rounded-lg border border-border/40 bg-card"
            >
              <div className="w-9 h-9 rounded bg-secondary overflow-hidden flex items-center justify-center shrink-0">
                {c.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.logo} alt="" className="w-full h-full object-contain p-0.5" />
                ) : (
                  <Radio className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{c.name}</div>
                <div className="text-[10px] text-muted-foreground truncate">{c.url}</div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => openCustomDialog(c.id)}
                aria-label={`Edit ${c.name}`}
                className="h-8 w-8 shrink-0"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  removeCustomChannel(c.id);
                  toast.success("Custom channel removed");
                }}
                aria-label={`Delete ${c.name}`}
                className="h-8 w-8 shrink-0 text-red-500 hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
