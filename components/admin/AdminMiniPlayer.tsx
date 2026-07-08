"use client";

import { useState } from "react";
import Image from "next/image";
import {
  X,
  Star,
  Radio,
  Volume2,
  VolumeX,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import type { ChannelWithMeta } from "@/lib/types";
import { useUniversalPlayer } from "@/lib/player/useUniversalPlayer";
import { PlayerShell } from "@/components/player/PlayerShell";
import { Button } from "@/components/ui/button";

interface Props {
  channel: ChannelWithMeta | null;
  isFeatured: boolean;
  isPrimary: boolean;
  onToggleFeatured: () => void;
  onSetPrimary: () => void;
  onClose: () => void;
}

export function AdminMiniPlayer({
  channel,
  isFeatured,
  isPrimary,
  onToggleFeatured,
  onSetPrimary,
  onClose,
}: Props) {
  const [muted, setMuted] = useState(true);

  const {
    videoRef,
    phase,
    activeSource,
    sourceIndex,
    totalSources,
    isYouTube,
    youtubeEmbedUrl,
    retry,
    tryNextSource,
    errorMessage,
  } = useUniversalPlayer({
    channel,
    autoplay: true,
  });

  if (!channel) return null;

  const toggleMute = () => {
    setMuted((prev) => {
      if (videoRef.current) videoRef.current.muted = !prev;
      return !prev;
    });
  };

  return (
    <div className="rounded-2xl border border-neon/30 bg-card/60 backdrop-blur overflow-hidden shadow-[0_0_40px_rgba(0,255,157,0.08)]">
      <div className="flex flex-col md:flex-row">
        {/* Player */}
        <div className="relative w-full md:w-[55%] aspect-video bg-black shrink-0">
          <PlayerShell
            ref={videoRef}
            channel={channel}
            phase={phase}
            errorMessage={errorMessage}
            sourceIndex={sourceIndex}
            totalSources={totalSources}
            isYouTube={isYouTube}
            youtubeEmbedUrl={youtubeEmbedUrl}
            onRetry={retry}
            onTryNext={tryNextSource}
          />

          {/* Overlay top bar */}
          <div className="absolute top-0 inset-x-0 p-2 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
            <div className="flex items-center gap-1.5 text-white text-[10px] font-mono tracking-widest pointer-events-auto">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              PREVIEW
            </div>
            <div className="flex items-center gap-1 pointer-events-auto">
              {!isYouTube && (
                <button
                  onClick={toggleMute}
                  className="p-1.5 rounded-md bg-black/40 hover:bg-black/60 text-white transition-colors"
                  aria-label={muted ? "Unmute" : "Mute"}
                >
                  {muted ? (
                    <VolumeX className="h-3.5 w-3.5" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-md bg-black/40 hover:bg-black/60 text-white transition-colors"
                aria-label="Close preview"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Source cycle indicator */}
          {totalSources > 1 && (
            <div className="absolute bottom-2 left-2 text-white text-[10px] font-mono bg-black/50 px-1.5 py-0.5 rounded">
              Source {sourceIndex + 1}/{totalSources}
              {activeSource?.quality ? ` · ${activeSource.quality}` : ""}
            </div>
          )}
        </div>

        {/* Info + actions */}
        <div className="flex-1 p-4 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-black/40 border border-border/60 overflow-hidden flex items-center justify-center shrink-0 relative">
              {channel.logo ? (
                <Image
                  src={channel.logo}
                  alt=""
                  fill
                  sizes="48px"
                  className="object-contain p-1"
                  unoptimized
                />
              ) : (
                <Radio className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-base leading-tight truncate">
                {channel.name}
              </h3>
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                <code>{channel.id}</code>
                {channel.countryInfo && (
                  <>
                    {" · "}
                    {channel.countryInfo.flag} {channel.countryInfo.name}
                  </>
                )}
              </p>
              {channel.categories.length > 0 && (
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {channel.categories.slice(0, 3).join(" · ")}
                </p>
              )}
            </div>
          </div>

          {/* Status pills */}
          <div className="flex flex-wrap gap-1.5 text-[10px]">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                isFeatured
                  ? "bg-neon/10 border-neon/40 text-neon"
                  : "bg-muted/30 border-border/60 text-muted-foreground"
              }`}
            >
              <Star className={`h-3 w-3 ${isFeatured ? "fill-current" : ""}`} />
              {isFeatured ? "Featured" : "Not featured"}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                isPrimary
                  ? "bg-yellow-500/10 border-yellow-500/40 text-yellow-400"
                  : "bg-muted/30 border-border/60 text-muted-foreground"
              }`}
            >
              {isPrimary ? "★ Primary (plays first)" : "Not primary"}
            </span>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 mt-auto">
            <Button
              size="sm"
              variant={isFeatured ? "outline" : "neon"}
              onClick={onToggleFeatured}
              className="gap-1.5"
            >
              <Star className={`h-4 w-4 ${isFeatured ? "fill-current" : ""}`} />
              {isFeatured ? "Unfeature" : "Add to Featured"}
            </Button>
            <Button
              size="sm"
              variant={isPrimary ? "outline" : "default"}
              onClick={onSetPrimary}
              className={`gap-1.5 ${
                isPrimary
                  ? ""
                  : "bg-yellow-500/90 hover:bg-yellow-500 text-black"
              }`}
            >
              {isPrimary ? "Unset primary" : "Set as Primary"}
            </Button>
            <Link
              href={`/watch?ch=${encodeURIComponent(channel.id)}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto"
            >
              Open on /watch
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
