"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { motion } from "framer-motion";
import {
  Maximize2,
  Minimize2,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Volume1,
  PictureInPicture2,
  Heart,
  Share2,
  Loader2,
  Radio,
  Play,
  Pause,
  Users,
  Tv,
  Eye,
  Globe,
  Building2,
  Calendar,
  ExternalLink,
  Signal,
  Languages as LanguagesIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import { getPlaceholderLogo, formatViewerCount } from "@/lib/utils";
import { useUniversalPlayer } from "@/lib/player/useUniversalPlayer";
import { PlayerShell } from "@/components/player/PlayerShell";
import { toast } from "sonner";

export function InlinePlayer() {
  const {
    currentChannel,
    toggleFavorite,
    favorites,
    allChannels,
    openPlayer,
    openReportDialog,
    settings,
    markChannelBroken,
    unmarkChannelBroken,
  } = useAppStore();

  const playerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [showControls, setShowControls] = useState(true);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
    channel: currentChannel,
    autoplay: settings.autoplay,
    onFatalError: markChannelBroken,
  });

  const isPlaying = phase === "playing";
  const isPaused = phase === "paused";

  const isFav = currentChannel ? favorites.includes(currentChannel.id) : false;

  // If a previously-broken channel starts playing, clear its broken flag
  useEffect(() => {
    if (phase === "playing" && currentChannel) {
      unmarkChannelBroken(currentChannel.id);
    }
  }, [phase, currentChannel, unmarkChannelBroken]);

  const navigateChannel = useCallback(
    (direction: "next" | "prev") => {
      if (!currentChannel || allChannels.length === 0) return;
      const idx = allChannels.findIndex((ch) => ch.id === currentChannel.id);
      if (idx === -1) return;
      const newIdx =
        direction === "next"
          ? (idx + 1) % allChannels.length
          : (idx - 1 + allChannels.length) % allChannels.length;
      openPlayer(allChannels[newIdx]);
    },
    [currentChannel, allChannels, openPlayer]
  );

  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [videoRef]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      if (videoRef.current) videoRef.current.muted = !prev;
      return !prev;
    });
  }, [videoRef]);

  const changeVolume = useCallback(
    (val: number) => {
      setVolume(val);
      if (videoRef.current) {
        videoRef.current.volume = val / 100;
        videoRef.current.muted = val === 0;
        setIsMuted(val === 0);
      }
    },
    [videoRef]
  );

  const handleFullscreen = useCallback(() => {
    if (!playerRef.current) return;
    if (!document.fullscreenElement) {
      playerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  }, []);

  const togglePiP = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch {
      // PiP not supported / blocked
    }
  }, [videoRef]);

  const handleShare = useCallback(async () => {
    if (!currentChannel) return;
    const url = `${window.location.origin}/${currentChannel.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentChannel.name,
          text: `Watch ${currentChannel.name} live on ALLtvLive`,
          url,
        });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Couldn't copy link");
    }
  }, [currentChannel]);

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlayPause();
          break;
        case "m":
          toggleMute();
          break;
        case "f":
          handleFullscreen();
          break;
        case "ArrowUp":
          e.preventDefault();
          changeVolume(Math.min(100, volume + 5));
          break;
        case "ArrowDown":
          e.preventDefault();
          changeVolume(Math.max(0, volume - 5));
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [volume, togglePlayPause, toggleMute, handleFullscreen, changeVolume]);

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  // Touch swipe for next/prev channel
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setShowControls(true);
    clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 4000);
  }, []);
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      touchStartX.current = null;
      const THRESHOLD = 60;
      if (dx > THRESHOLD) navigateChannel("prev");
      else if (dx < -THRESHOLD) navigateChannel("next");
    },
    [navigateChannel]
  );

  const streamQuality = activeSource?.quality || null;

  // No channel yet — placeholder
  if (!currentChannel) {
    return (
      <div className="relative rounded-lg sm:rounded-xl overflow-hidden bg-gradient-to-br from-[#0a0a2e] via-[#111] to-[#0a1a1e] border border-border/30">
        <div className="aspect-video flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 sm:gap-3 text-center px-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-neon/10 flex items-center justify-center animate-pulse">
              <Tv className="h-5 w-5 sm:h-6 sm:w-6 text-neon" />
            </div>
            <div>
              <p className="text-foreground font-semibold text-xs sm:text-sm">Loading Live TV...</p>
              <p className="text-muted-foreground text-[10px] sm:text-xs mt-0.5">
                Finding the best channels for you
              </p>
            </div>
            <Loader2 className="h-4 w-4 text-neon animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id="main-player"
      className="rounded-lg sm:rounded-xl overflow-hidden border border-border/30 bg-card shadow-[0_0_30px_rgba(0,255,157,0.04)]"
    >
      <div className="flex flex-col md:flex-row">
        <div
          ref={playerRef}
          className="relative w-full md:w-[60%] lg:w-[58%] xl:w-[55%] aspect-video bg-black shrink-0"
          onMouseMove={resetControlsTimeout}
          onMouseLeave={() => setShowControls(false)}
          onMouseEnter={() => setShowControls(true)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <PlayerShell
            ref={videoRef}
            channel={currentChannel}
            phase={phase}
            errorMessage={errorMessage}
            sourceIndex={sourceIndex}
            totalSources={totalSources}
            isYouTube={isYouTube}
            youtubeEmbedUrl={youtubeEmbedUrl}
            onRetry={retry}
            onTryNext={tryNextSource}
            onReport={() => openReportDialog(currentChannel.id)}
            onVideoClick={togglePlayPause}
          />

          {/* Controls Overlay — hidden for YouTube (its iframe has its own) */}
          {!isYouTube && (
            <div
              className={`absolute inset-0 transition-opacity duration-300 pointer-events-none ${
                showControls || isPaused ? "opacity-100" : "opacity-0"
              }`}
            >
              {/* Top gradient — channel name (visible below md where info is stacked) */}
              <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-2 sm:p-2.5 pointer-events-auto md:hidden">
                <div className="flex items-center gap-1.5">
                  {currentChannel.logo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentChannel.logo}
                      alt=""
                      className="h-5 w-5 rounded object-contain bg-white/10 shrink-0"
                    />
                  )}
                  <span className="text-white font-medium text-[11px] sm:text-xs truncate">
                    {currentChannel.name}
                  </span>
                  <Badge className="bg-red-600 text-white border-0 text-[8px] sm:text-[9px] px-1 py-0 gap-0.5 shrink-0">
                    <Radio className="h-1.5 w-1.5 sm:h-2 sm:w-2 animate-pulse" />
                    LIVE
                  </Badge>
                </div>
              </div>

              {/* Center play button when paused */}
              {isPaused && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
                  <motion.button
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    onClick={togglePlayPause}
                    aria-label="Play"
                    className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-neon/90 flex items-center justify-center shadow-[0_0_30px_rgba(0,255,157,0.4)] hover:bg-neon active:scale-95 transition-all"
                  >
                    <Play className="h-5 w-5 sm:h-7 sm:w-7 text-black ml-0.5" fill="black" />
                  </motion.button>
                </div>
              )}

              {/* Bottom controls */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pt-6 sm:pt-8 pb-1.5 sm:pb-2 px-1.5 sm:px-2.5 pointer-events-auto">
                {/* Live indicator bar */}
                <div className="w-full h-[2px] bg-white/15 rounded-full mb-1.5 sm:mb-2 overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full w-full relative">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full shadow-[0_0_4px_rgba(239,68,68,0.8)]" />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  {/* Left controls */}
                  <div className="flex items-center gap-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigateChannel("prev")}
                      className="text-white hover:bg-white/10 active:bg-white/20 h-8 w-8 md:h-7 md:w-7"
                      aria-label="Previous channel"
                    >
                      <SkipBack className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-3.5 md:w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={togglePlayPause}
                      className="text-white hover:bg-white/10 active:bg-white/20 h-8 w-8 md:h-7 md:w-7"
                      aria-label={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? (
                        <Pause className="h-4 w-4 sm:h-[18px] sm:w-[18px] md:h-4 md:w-4" fill="white" />
                      ) : (
                        <Play className="h-4 w-4 sm:h-[18px] sm:w-[18px] md:h-4 md:w-4" fill="white" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigateChannel("next")}
                      className="text-white hover:bg-white/10 active:bg-white/20 h-8 w-8 md:h-7 md:w-7"
                      aria-label="Next channel"
                    >
                      <SkipForward className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-3.5 md:w-3.5" />
                    </Button>

                    <div
                      className="hidden sm:flex items-center ml-0.5"
                      onMouseEnter={() => setShowVolumeSlider(true)}
                      onMouseLeave={() => setShowVolumeSlider(false)}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleMute}
                        className="text-white hover:bg-white/10 h-8 w-8 md:h-7 md:w-7"
                        aria-label={isMuted ? "Unmute" : "Mute"}
                      >
                        {isMuted || volume === 0 ? (
                          <VolumeX className="h-4 w-4 md:h-3.5 md:w-3.5" />
                        ) : volume < 50 ? (
                          <Volume1 className="h-4 w-4 md:h-3.5 md:w-3.5" />
                        ) : (
                          <Volume2 className="h-4 w-4 md:h-3.5 md:w-3.5" />
                        )}
                      </Button>
                      <div
                        className={`overflow-hidden transition-all duration-200 ${
                          showVolumeSlider ? "w-14 md:w-16 opacity-100" : "w-0 opacity-0"
                        }`}
                      >
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={isMuted ? 0 : volume}
                          onChange={(e) => changeVolume(Number(e.target.value))}
                          className="w-full h-1 accent-neon cursor-pointer"
                          aria-label="Volume"
                        />
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleMute}
                      className="text-white hover:bg-white/10 active:bg-white/20 h-8 w-8 sm:hidden"
                      aria-label={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="h-3.5 w-3.5" />
                      ) : (
                        <Volume2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>

                  {/* Right controls */}
                  <div className="flex items-center gap-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={togglePiP}
                      className="text-white hover:bg-white/10 h-7 w-7 hidden md:flex"
                      aria-label="Picture in Picture"
                    >
                      <PictureInPicture2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleFullscreen}
                      className="text-white hover:bg-white/10 active:bg-white/20 h-8 w-8 md:h-7 md:w-7"
                      aria-label="Fullscreen"
                    >
                      {isFullscreen ? (
                        <Minimize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-3.5 md:w-3.5" />
                      ) : (
                        <Maximize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-3.5 md:w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Channel Info Panel */}
        <div className="flex-1 p-3 sm:p-3.5 md:p-4 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-neon/20 to-secondary overflow-hidden flex items-center justify-center shrink-0 border border-neon/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentChannel.logo || getPlaceholderLogo(currentChannel.name)}
                alt=""
                className="w-full h-full object-contain p-1"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm sm:text-base leading-tight truncate">
                  {currentChannel.name}
                </h2>
                <Badge className="bg-red-600 text-white border-0 text-[9px] px-1.5 py-0 gap-0.5 shrink-0 hidden md:flex">
                  <Radio className="h-2 w-2 animate-pulse" />
                  LIVE
                </Badge>
              </div>
              {currentChannel.alt_names?.length > 0 && (
                <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate mt-0.5">
                  {currentChannel.alt_names.slice(0, 2).join(" / ")}
                </p>
              )}
            </div>
          </div>

          {/* Detail rows */}
          <div className="mt-3 md:mt-4 space-y-2 md:space-y-2.5 text-[11px] sm:text-xs text-muted-foreground flex-1 overflow-y-auto">
            <div className="flex items-center gap-4 flex-wrap">
              {currentChannel.countryInfo && (
                <span className="flex items-center gap-1.5">
                  <Globe className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-neon/70 shrink-0" />
                  {currentChannel.countryInfo.flag} {currentChannel.countryInfo.name}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-neon/70 shrink-0" />
                {formatViewerCount(currentChannel.viewerCount)} watching
              </span>
            </div>

            {currentChannel.network && (
              <div className="flex items-center gap-1.5">
                <Building2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-neon/70 shrink-0" />
                <span>Network: <span className="text-foreground">{currentChannel.network}</span></span>
              </div>
            )}

            {currentChannel.owners?.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-neon/70 shrink-0" />
                <span className="truncate">Owner: <span className="text-foreground">{currentChannel.owners.join(", ")}</span></span>
              </div>
            )}

            {currentChannel.languages?.length > 0 && (
              <div className="flex items-center gap-1.5">
                <LanguagesIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-neon/70 shrink-0" />
                <span className="truncate">Language: <span className="text-foreground">{currentChannel.languages.join(", ").toUpperCase()}</span></span>
              </div>
            )}

            {currentChannel.launched && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-neon/70 shrink-0" />
                <span>Launched: <span className="text-foreground">{currentChannel.launched}</span></span>
              </div>
            )}

            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5">
                <Signal className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-neon/70 shrink-0" />
                {currentChannel.streams?.length || 0} stream{(currentChannel.streams?.length || 0) !== 1 ? "s" : ""}
              </span>
              {streamQuality && (
                <Badge variant="neon" className="text-[9px] px-1.5 py-0">
                  {streamQuality}
                </Badge>
              )}
            </div>

            {currentChannel.categories?.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {currentChannel.categories.map((cat) => (
                  <Badge key={cat} variant="neon" className="text-[9px] px-1.5 py-0">
                    {cat}
                  </Badge>
                ))}
              </div>
            )}

            {currentChannel.website && (
              <div className="flex items-center gap-1.5 pt-0.5">
                <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-neon/70 shrink-0" />
                <a
                  href={currentChannel.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neon hover:underline truncate"
                >
                  {currentChannel.website.replace(/^https?:\/\/(www\.)?/, "")}
                </a>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 pt-3 mt-auto border-t border-border/30">
            <Button
              variant={isFav ? "default" : "secondary"}
              size="sm"
              onClick={() => {
                toggleFavorite(currentChannel.id);
                toast.success(isFav ? "Removed from favorites" : "Added to favorites");
              }}
              className={`gap-1 rounded-full text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 ${
                isFav ? "bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30" : ""
              }`}
              aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${isFav ? "fill-current" : ""}`} />
              {isFav ? "Saved" : "Save"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleShare}
              className="gap-1 rounded-full text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 hidden sm:flex"
              aria-label="Share this channel"
            >
              <Share2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              Share
            </Button>
            <Button
              variant="neon"
              size="sm"
              onClick={() => navigateChannel("next")}
              className="gap-1 rounded-full text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 ml-auto"
              aria-label="Play next channel"
            >
              <SkipForward className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

