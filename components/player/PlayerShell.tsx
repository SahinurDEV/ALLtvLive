"use client";

import { forwardRef, type RefObject } from "react";
import { AlertTriangle, Loader2, Tv, RefreshCw, SkipForward, MessageSquareWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlayerPhase } from "@/lib/player/useUniversalPlayer";
import type { ChannelWithMeta } from "@/lib/types";

interface PlayerShellProps {
  channel: ChannelWithMeta | null;
  phase: PlayerPhase;
  errorMessage: string | null;
  sourceIndex: number;
  totalSources: number;
  isYouTube: boolean;
  youtubeEmbedUrl: string | null;
  onRetry: () => void;
  onTryNext: () => void;
  onReport?: () => void;
  onVideoClick?: () => void;
  children?: React.ReactNode;
}

export const PlayerShell = forwardRef<HTMLVideoElement, PlayerShellProps>(
  function PlayerShell(
    {
      channel,
      phase,
      errorMessage,
      sourceIndex,
      totalSources,
      isYouTube,
      youtubeEmbedUrl,
      onRetry,
      onTryNext,
      onReport,
      onVideoClick,
      children,
    },
    videoRef
  ) {
    const isLoading = phase === "loading";
    const isBuffering = phase === "buffering";
    const isError = phase === "error";

    return (
      <div className="absolute inset-0 bg-black">
        {isYouTube && youtubeEmbedUrl ? (
          <iframe
            src={youtubeEmbedUrl}
            className="w-full h-full"
            frameBorder={0}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            title={channel?.name || "Live channel"}
          />
        ) : (
          <video
            ref={videoRef as RefObject<HTMLVideoElement>}
            className="w-full h-full object-contain"
            playsInline
            autoPlay
            onClick={onVideoClick}
            aria-label={channel ? `Video player for ${channel.name}` : "Video player"}
          />
        )}

        {/* Loading overlay */}
        {isLoading && !isError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0a0a2e]/90 to-black/90">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-[3px] border-neon/20 border-t-neon animate-spin" />
                <Tv className="absolute inset-0 m-auto h-5 w-5 sm:h-6 sm:w-6 text-neon" />
              </div>
              <div className="text-center px-4">
                <p className="text-white font-medium text-sm truncate max-w-[220px]">
                  {channel?.name}
                </p>
                <p className="text-white/50 text-xs mt-1">
                  {totalSources > 1
                    ? `Source ${sourceIndex + 1} of ${totalSources}`
                    : "Connecting..."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Non-blocking buffering indicator */}
        {isBuffering && !isError && (
          <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm rounded-full p-2 z-10">
            <Loader2 className="h-4 w-4 text-neon animate-spin" />
          </div>
        )}

        {/* Error overlay */}
        {isError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/95 px-4">
            <div className="flex flex-col items-center gap-3 text-center max-w-sm">
              <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">
                  This channel isn&apos;t available right now
                </p>
                {errorMessage && (
                  <p className="text-gray-400 text-xs mt-1">{errorMessage}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 justify-center pt-1">
                <Button
                  variant="neon"
                  size="sm"
                  onClick={onRetry}
                  className="gap-1 text-xs h-8 px-3"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry
                </Button>
                {sourceIndex + 1 < totalSources && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onTryNext}
                    className="gap-1 text-xs h-8 px-3"
                  >
                    <SkipForward className="h-3 w-3" />
                    Try another source
                  </Button>
                )}
                {onReport && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onReport}
                    className="gap-1 text-xs h-8 px-3 text-gray-400 hover:text-white"
                  >
                    <MessageSquareWarning className="h-3 w-3" />
                    Report
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {children}
      </div>
    );
  }
);
