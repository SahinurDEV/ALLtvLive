"use client";

import { memo, useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Heart, Users, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ChannelWithMeta } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { getPlaceholderLogo, formatViewerCount } from "@/lib/utils";
import { getCachedHealth, type HealthStatus } from "@/lib/player/streamHealthCheck";

interface ChannelCardProps {
  channel: ChannelWithMeta;
  index?: number;
}

export const ChannelCard = memo(function ChannelCard({
  channel,
  index = 0,
}: ChannelCardProps) {
  const openPlayer = useAppStore((s) => s.openPlayer);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const favorites = useAppStore((s) => s.favorites);
  const isFav = favorites.includes(channel.id);
  const [imgError, setImgError] = useState(false);
  const [health, setHealth] = useState<HealthStatus>("unknown");

  useEffect(() => {
    // Read cached status only; never blocks initial render
    setHealth(getCachedHealth(channel.id));
  }, [channel.id]);

  const handlePlay = useCallback(() => {
    openPlayer(channel);
  }, [openPlayer, channel]);

  const handleFavorite = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      toggleFavorite(channel.id);
    },
    [toggleFavorite, channel.id]
  );

  const logoSrc =
    !imgError && channel.logo ? channel.logo : getPlaceholderLogo(channel.name);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.3) }}
      className="group relative"
    >
      <div
        onClick={handlePlay}
        className="relative overflow-hidden rounded-xl border border-border/50 bg-card cursor-pointer transition-all duration-300 hover:border-neon/40 hover:shadow-[0_0_30px_rgba(0,255,157,0.1)] hover:scale-[1.02]"
        role="button"
        tabIndex={0}
        aria-label={`Play ${channel.name}`}
        onKeyDown={(e) => e.key === "Enter" && handlePlay()}
      >
        {/* Logo / Thumbnail */}
        <div className="relative aspect-video bg-gradient-to-br from-secondary to-background flex items-center justify-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt={channel.name}
            className="w-full h-full object-contain p-4"
            loading="lazy"
            onError={() => setImgError(true)}
          />

          {/* Live indicator + health dot */}
          {channel.isLive && (
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              <Radio className="h-3 w-3 animate-pulse" />
              LIVE
            </div>
          )}
          {health !== "unknown" && (
            <div
              className={`absolute top-2 left-16 h-2 w-2 rounded-full ring-2 ring-black/40 ${
                health === "online" ? "bg-emerald-400" : "bg-red-500"
              }`}
              aria-label={health === "online" ? "Stream recently working" : "Stream recently failed"}
              title={health === "online" ? "Stream recently working" : "Stream recently failed"}
            />
          )}

          {/* Viewer count */}
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full">
            <Users className="h-3 w-3" />
            {formatViewerCount(channel.viewerCount)}
          </div>

          {/* Play overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-75 group-hover:scale-100">
              <div className="w-14 h-14 rounded-full bg-neon flex items-center justify-center shadow-[0_0_30px_rgba(0,255,157,0.5)]">
                <Play className="h-7 w-7 text-black ml-1" fill="black" />
              </div>
            </div>
          </div>

          {/* Favorite button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute bottom-2 right-2 h-8 w-8 bg-black/50 backdrop-blur-sm hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-all"
            onClick={handleFavorite}
            aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart
              className={`h-4 w-4 transition-colors ${
                isFav ? "fill-red-500 text-red-500" : "text-white"
              }`}
            />
          </Button>
        </div>

        {/* Info */}
        <div className="p-3">
          <h3 className="font-semibold text-sm truncate">{channel.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            {channel.countryInfo && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <span>{channel.countryInfo.flag}</span>
                {channel.countryInfo.name}
              </span>
            )}
          </div>
          {channel.categories?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {channel.categories.slice(0, 2).map((cat) => (
                <Badge key={cat} variant="neon" className="text-[10px] px-1.5 py-0">
                  {cat}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});
