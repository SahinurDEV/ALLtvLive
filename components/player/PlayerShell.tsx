"use client";

import { forwardRef, useEffect, useState, type RefObject } from "react";
import { AlertTriangle, Loader2, Tv, RefreshCw, SkipForward, MessageSquareWarning, ChevronsRight, Check, Flag } from "lucide-react";
import { toast } from "sonner";
import { reportDeadChannel, wasReportedRecently } from "@/lib/player/reportDead";
import { Button } from "@/components/ui/button";
import type { PlayerPhase } from "@/lib/player/useUniversalPlayer";
import type { ChannelWithMeta } from "@/lib/types";
import { useT } from "@/lib/i18n";

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
  /** Offer "Next channel" in the error overlay. */
  onSkipNext?: () => void;
  nextChannelName?: string;
  /** When true, skip to the next channel automatically after a countdown. */
  autoSkip?: boolean;
  children?: React.ReactNode;
}

const AUTO_SKIP_SECONDS = 5;

/** Countdown + one-tap report shown once every source of a channel has failed. */
function DeadChannelActions({
  channel,
  onSkipNext,
  nextChannelName,
  autoSkip,
  onReport,
}: {
  channel: ChannelWithMeta | null;
  onSkipNext?: () => void;
  nextChannelName?: string;
  autoSkip?: boolean;
  onReport?: () => void;
}) {
  const t = useT();
  const [remaining, setRemaining] = useState<number | null>(autoSkip && onSkipNext ? AUTO_SKIP_SECONDS : null);
  const [reportState, setReportState] = useState<"idle" | "sending" | "done">(
    channel && wasReportedRecently(channel.id) ? "done" : "idle"
  );

  useEffect(() => {
    if (remaining === null || !onSkipNext) return;
    if (remaining <= 0) {
      onSkipNext();
      return;
    }
    const id = setTimeout(() => setRemaining((r) => (r === null ? null : r - 1)), 1000);
    return () => clearTimeout(id);
  }, [remaining, onSkipNext]);

  const report = async () => {
    if (!channel || reportState !== "idle") return;
    setReportState("sending");
    const res = await reportDeadChannel(channel.id, channel.name);
    if (res === "ok") {
      setReportState("done");
      toast.success(t("player.reported"));
    } else {
      setReportState("idle");
      toast.error(t(res === "rate_limited" ? "player.reportRateLimited" : "player.reportFailed"));
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      {onSkipNext && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button variant="neon" size="sm" onClick={onSkipNext} className="gap-1 text-xs h-8 px-3" data-testid="skip-next">
            <ChevronsRight className="h-3.5 w-3.5" />
            {t("player.nextChannel")}
          </Button>
          {remaining !== null && (
            <span className="text-[11px] text-white/60" aria-live="polite">
              {t("player.skippingIn")
                .replace("{name}", nextChannelName || t("player.nextChannel"))
                .replace("{s}", String(remaining))}
              <button type="button" onClick={() => setRemaining(null)} className="ml-2 underline hover:text-white">
                {t("player.cancel")}
              </button>
            </span>
          )}
        </div>
      )}
      {channel && (
        <div className="flex flex-wrap items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={report}
            disabled={reportState !== "idle"}
            className="gap-1 text-xs h-8 px-3 text-gray-300 hover:text-white"
            data-testid="report-dead"
          >
            {reportState === "done" ? (
              <Check className="h-3 w-3 text-neon" />
            ) : reportState === "sending" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Flag className="h-3 w-3" />
            )}
            {reportState === "done" ? t("player.reported") : t("player.reportDead")}
          </Button>
          {onReport && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onReport}
              className="h-8 w-8 text-gray-500 hover:text-white"
              aria-label="Report with details"
              title="Report with details"
            >
              <MessageSquareWarning className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
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
      onSkipNext,
      nextChannelName,
      autoSkip,
      children,
    },
    videoRef
  ) {
    const isLoading = phase === "loading";
    const isBuffering = phase === "buffering";
    const isError = phase === "error";
  const t = useT();

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
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/95 px-3 py-2 overflow-y-auto" data-testid="player-error">
            <div className="flex flex-col items-center gap-1.5 sm:gap-3 text-center max-w-sm m-auto">
              <div className="hidden sm:flex w-12 h-12 rounded-full bg-yellow-500/10 items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">
                  {t("player.unavailable")}
                </p>
                {errorMessage && (
                  <p className="text-gray-400 text-[11px] sm:text-xs mt-0.5 line-clamp-2">{errorMessage}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="gap-1 text-xs h-8 px-3"
                >
                  <RefreshCw className="h-3 w-3" />
                  {t("player.retry")}
                </Button>
                {sourceIndex + 1 < totalSources && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onTryNext}
                    className="gap-1 text-xs h-8 px-3"
                  >
                    <SkipForward className="h-3 w-3" />
                    {t("player.trySource")}
                  </Button>
                )}
              </div>
              {totalSources > 1 && sourceIndex + 1 >= totalSources && (
                <p className="text-[10px] text-white/40">
                  {t("player.triedAll").replace("{n}", String(totalSources))}
                </p>
              )}
              <DeadChannelActions
                key={channel?.id}
                channel={channel}
                onSkipNext={onSkipNext}
                nextChannelName={nextChannelName}
                autoSkip={autoSkip}
                onReport={onReport}
              />
            </div>
          </div>
        )}

        {children}
      </div>
    );
  }
);
