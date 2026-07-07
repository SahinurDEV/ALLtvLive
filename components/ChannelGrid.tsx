"use client";

import { useState, useCallback, useMemo } from "react";
import { ChannelCard } from "./ChannelCard";
import { ChannelCardSkeleton } from "./ChannelCardSkeleton";
import { Button } from "@/components/ui/button";
import { ChevronDown, LayoutGrid, List, LayoutList, SearchX } from "lucide-react";
import type { ChannelWithMeta } from "@/lib/types";
import { useAppStore, type ViewMode } from "@/lib/store";
import { getPlaceholderLogo, formatViewerCount } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface ChannelGridProps {
  channels: ChannelWithMeta[];
  isLoading?: boolean;
  title?: string;
  pageSize?: number;
  showLoadMore?: boolean;
  showViewToggle?: boolean;
}

function ChannelListRow({ channel }: { channel: ChannelWithMeta }) {
  const openPlayer = useAppStore((s) => s.openPlayer);
  return (
    <button
      onClick={() => openPlayer(channel)}
      className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-border/40 hover:border-neon/40 hover:bg-secondary/50 transition-colors text-left"
      aria-label={`Play ${channel.name}`}
    >
      <div className="w-11 h-11 rounded-lg bg-secondary shrink-0 overflow-hidden flex items-center justify-center border border-border/50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={channel.logo || getPlaceholderLogo(channel.name)}
          alt=""
          className="w-full h-full object-contain p-1"
          loading="lazy"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{channel.name}</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          {channel.countryInfo && (
            <span>
              {channel.countryInfo.flag} {channel.countryInfo.name}
            </span>
          )}
          {channel.categories?.[0] && (
            <Badge variant="neon" className="text-[9px] px-1.5 py-0">
              {channel.categories[0]}
            </Badge>
          )}
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
        <Users className="h-3 w-3" />
        {formatViewerCount(channel.viewerCount)}
      </div>
    </button>
  );
}

function ChannelCompactCard({ channel }: { channel: ChannelWithMeta }) {
  const openPlayer = useAppStore((s) => s.openPlayer);
  return (
    <button
      onClick={() => openPlayer(channel)}
      className="rounded-lg border border-border/40 bg-card hover:border-neon/40 hover:bg-secondary/50 transition-colors p-2 flex flex-col items-center gap-1.5 text-center"
      aria-label={`Play ${channel.name}`}
    >
      <div className="w-full aspect-square rounded-md bg-secondary overflow-hidden flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={channel.logo || getPlaceholderLogo(channel.name)}
          alt=""
          className="w-full h-full object-contain p-2"
          loading="lazy"
        />
      </div>
      <div className="text-xs font-medium truncate max-w-full">{channel.name}</div>
    </button>
  );
}

export function ChannelGrid({
  channels,
  isLoading,
  title,
  pageSize = 20,
  showLoadMore = true,
  showViewToggle = false,
}: ChannelGridProps) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const viewMode = useAppStore((s) => s.settings.viewMode);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const clearFilters = useAppStore((s) => s.clearFilters);

  const visibleChannels = useMemo(
    () => channels.slice(0, visibleCount),
    [channels, visibleCount]
  );

  const hasMore = visibleCount < channels.length;

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => prev + pageSize);
  }, [pageSize]);

  if (isLoading) {
    return (
      <div>
        {title && <h2 className="text-xl font-bold mb-4">{title}</h2>}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <ChannelCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className="text-center py-16 flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-secondary/60 flex items-center justify-center">
          <SearchX className="h-7 w-7 text-muted-foreground" />
        </div>
        <div>
          <p className="text-foreground font-semibold">No channels found</p>
          <p className="text-muted-foreground text-sm mt-0.5">
            Try adjusting your search or filters
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={clearFilters}>
          Clear filters
        </Button>
      </div>
    );
  }

  const setView = (v: ViewMode) => updateSettings({ viewMode: v });

  return (
    <div>
      {(title || showViewToggle) && (
        <div className="flex items-center justify-between mb-4 gap-2">
          {title && <h2 className="text-xl font-bold">{title}</h2>}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {channels.length.toLocaleString()} channels
            </span>
            {showViewToggle && (
              <div className="flex items-center gap-0.5 border border-border/50 rounded-lg p-0.5">
                <button
                  onClick={() => setView("grid")}
                  className={`p-1.5 rounded ${viewMode === "grid" ? "bg-neon/10 text-neon" : "text-muted-foreground hover:text-foreground"}`}
                  aria-label="Grid view"
                  aria-pressed={viewMode === "grid"}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setView("list")}
                  className={`p-1.5 rounded ${viewMode === "list" ? "bg-neon/10 text-neon" : "text-muted-foreground hover:text-foreground"}`}
                  aria-label="List view"
                  aria-pressed={viewMode === "list"}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setView("compact")}
                  className={`p-1.5 rounded ${viewMode === "compact" ? "bg-neon/10 text-neon" : "text-muted-foreground hover:text-foreground"}`}
                  aria-label="Compact view"
                  aria-pressed={viewMode === "compact"}
                >
                  <LayoutList className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === "list" ? (
        <div className="space-y-1.5">
          {visibleChannels.map((channel) => (
            <ChannelListRow key={channel.id} channel={channel} />
          ))}
        </div>
      ) : viewMode === "compact" ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
          {visibleChannels.map((channel) => (
            <ChannelCompactCard key={channel.id} channel={channel} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {visibleChannels.map((channel, i) => (
            <ChannelCard key={channel.id} channel={channel} index={i} />
          ))}
        </div>
      )}

      {showLoadMore && hasMore && (
        <div className="flex justify-center mt-8">
          <Button
            variant="outline"
            size="lg"
            onClick={loadMore}
            className="gap-2 border-neon/30 hover:border-neon/60 hover:bg-neon/5"
          >
            <ChevronDown className="h-4 w-4" />
            Load More ({channels.length - visibleCount} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}
