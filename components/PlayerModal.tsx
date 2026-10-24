"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
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
  AlertTriangle,
  Loader2,
  Radio,
  Play,
  Pause,
  Users,
  Tv,
  ThumbsUp,
  ChevronDown,
  ListVideo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAppStore } from "@/lib/store";
import { getPlaceholderLogo, formatViewerCount } from "@/lib/utils";
import type { ChannelWithMeta } from "@/lib/types";
import Hls from "hls.js";

export function PlayerModal() {
  const {
    currentChannel,
    playerOpen,
    closePlayer,
    toggleFavorite,
    favorites,
    allChannels,
    openPlayer,
  } = useAppStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"upnext" | "related">("upnext");
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const isFav = currentChannel
    ? favorites.includes(currentChannel.id)
    : false;

  // Get stream URL — prefer HLS
  const streamUrl =
    currentChannel?.streams?.find((s) => s.url.includes(".m3u8"))?.url ||
    currentChannel?.streams?.[0]?.url;

  // Build "Up Next" list — same category channels
  const upNextChannels = useMemo(() => {
    if (!currentChannel || allChannels.length === 0) return [];
    const currentCats = new Set(currentChannel.categories);
    const currentCountry = currentChannel.country;

    // Same category channels first, then same country, then others
    const scored = allChannels
      .filter((ch) => ch.id !== currentChannel.id && ch.isLive)
      .map((ch) => {
        let score = 0;
        if (ch.categories?.some((c) => currentCats.has(c))) score += 3;
        if (ch.country === currentCountry) score += 2;
        score += ch.viewerCount / 100000;
        return { ch, score };
      })
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, 50).map((s) => s.ch);
  }, [currentChannel, allChannels]);

  // Navigate to next/prev channel from the upNext list
  const navigateChannel = useCallback(
    (direction: "next" | "prev") => {
      if (!currentChannel || upNextChannels.length === 0) return;
      if (direction === "next") {
        openPlayer(upNextChannels[0]);
      } else {
        // Find current in allChannels and go back
        const idx = allChannels.findIndex((ch) => ch.id === currentChannel.id);
        if (idx > 0) openPlayer(allChannels[idx - 1]);
      }
    },
    [currentChannel, upNextChannels, allChannels, openPlayer]
  );

  // Init HLS player
  useEffect(() => {
    if (!playerOpen || !streamUrl || !videoRef.current) return;

    const video = videoRef.current;
    setIsLoading(true);
    setHasError(false);
    setIsPaused(false);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (streamUrl.includes(".m3u8") && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 30,
        startLevel: -1,
      });
      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setHasError(true);
          setIsLoading(false);
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            setTimeout(() => hls.startLoad(), 3000);
          }
        }
      });
    } else if (
      video.canPlayType("application/vnd.apple.mpegurl") ||
      !streamUrl.includes(".m3u8")
    ) {
      video.src = streamUrl;
      video.addEventListener("loadeddata", () => setIsLoading(false), {
        once: true,
      });
      video.addEventListener(
        "error",
        () => {
          setHasError(true);
          setIsLoading(false);
        },
        { once: true }
      );
      video.play().catch(() => {});
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [playerOpen, streamUrl]);

  // Keyboard controls
  useEffect(() => {
    if (!playerOpen) return;

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      switch (e.key) {
        case "Escape":
          if (isFullscreen) {
            document.exitFullscreen();
            setIsFullscreen(false);
          } else {
            closePlayer();
          }
          break;
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
        case "ArrowRight":
          navigateChannel("next");
          break;
        case "ArrowLeft":
          navigateChannel("prev");
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
  }, [playerOpen, closePlayer, navigateChannel, isFullscreen, volume]);

  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPaused(false);
    } else {
      videoRef.current.pause();
      setIsPaused(true);
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      if (videoRef.current) videoRef.current.muted = !prev;
      return !prev;
    });
  }, []);

  const changeVolume = useCallback((val: number) => {
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val / 100;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  }, []);

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  const handleFullscreen = useCallback(() => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current
        .requestFullscreen()
        .then(() => setIsFullscreen(true));
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
      // PiP not supported
    }
  }, []);

  const handleShare = useCallback(() => {
    if (!currentChannel) return;
    const url = `${window.location.origin}/${currentChannel.id}`;
    navigator.clipboard.writeText(url).catch(() => {});
  }, [currentChannel]);

  if (!currentChannel) return null;

  return (
    <AnimatePresence>
      {playerOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-background overflow-hidden"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="h-full flex flex-col"
          >
            {/* Top bar — close button */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-background/95 backdrop-blur-sm shrink-0">
              <div className="flex items-center gap-2">
                <Tv className="h-5 w-5 text-neon" />
                <span className="font-bold text-sm">
                  Stream<span className="text-neon">Hub</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                  className="lg:hidden gap-1.5"
                >
                  <ListVideo className="h-4 w-4" />
                  Channels
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closePlayer}
                  aria-label="Close player"
                  className="h-8 w-8"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Main layout: YouTube style — video left, sidebar right */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* Left: Video + Info */}
              <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
                {/* Video Player */}
                <div
                  ref={playerContainerRef}
                  className="relative w-full aspect-video bg-black shrink-0"
                  onMouseMove={resetControlsTimeout}
                  onMouseLeave={() => setShowControls(false)}
                  onMouseEnter={() => setShowControls(true)}
                >
                  <video
                    ref={videoRef}
                    className="w-full h-full object-contain"
                    playsInline
                    autoPlay
                    muted={isMuted}
                    onClick={togglePlayPause}
                  />

                  {/* Loading */}
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-12 w-12 text-neon animate-spin" />
                        <p className="text-white text-sm">
                          Loading stream...
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {hasError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/90">
                      <div className="flex flex-col items-center gap-3 text-center px-4">
                        <AlertTriangle className="h-12 w-12 text-yellow-500" />
                        <p className="text-white font-semibold text-lg">
                          Stream Unavailable
                        </p>
                        <p className="text-gray-400 text-sm max-w-sm">
                          This stream is currently offline. Try another channel
                          from the list.
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigateChannel("prev")}
                            className="gap-1"
                          >
                            <SkipBack className="h-4 w-4" /> Previous
                          </Button>
                          <Button
                            variant="neon"
                            size="sm"
                            onClick={() => navigateChannel("next")}
                            className="gap-1"
                          >
                            Next <SkipForward className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Player Controls Overlay */}
                  <div
                    className={`absolute inset-0 transition-opacity duration-300 pointer-events-none ${
                      showControls || isPaused ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    {/* Center play/pause */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
                      {isPaused && !isLoading && !hasError && (
                        <motion.button
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          onClick={togglePlayPause}
                          className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors"
                          aria-label="Play"
                        >
                          <Play
                            className="h-8 w-8 text-white ml-1"
                            fill="white"
                          />
                        </motion.button>
                      )}
                    </div>

                    {/* Bottom controls bar */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-16 pb-2 px-3 pointer-events-auto">
                      {/* Progress bar (fake for live) */}
                      <div className="w-full h-1 bg-white/20 rounded-full mb-2 group cursor-pointer">
                        <div className="h-full bg-red-600 rounded-full w-full relative">
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        {/* Left controls */}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigateChannel("prev")}
                            className="text-white hover:bg-white/10 h-9 w-9"
                            aria-label="Previous channel"
                          >
                            <SkipBack className="h-5 w-5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={togglePlayPause}
                            className="text-white hover:bg-white/10 h-9 w-9"
                            aria-label={isPaused ? "Play" : "Pause"}
                          >
                            {isPaused ? (
                              <Play className="h-5 w-5" fill="white" />
                            ) : (
                              <Pause className="h-5 w-5" fill="white" />
                            )}
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigateChannel("next")}
                            className="text-white hover:bg-white/10 h-9 w-9"
                            aria-label="Next channel"
                          >
                            <SkipForward className="h-5 w-5" />
                          </Button>

                          {/* Volume */}
                          <div
                            className="flex items-center gap-1 group/vol"
                            onMouseEnter={() => setShowVolumeSlider(true)}
                            onMouseLeave={() => setShowVolumeSlider(false)}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={toggleMute}
                              className="text-white hover:bg-white/10 h-9 w-9"
                              aria-label={isMuted ? "Unmute" : "Mute"}
                            >
                              {isMuted || volume === 0 ? (
                                <VolumeX className="h-5 w-5" />
                              ) : volume < 50 ? (
                                <Volume1 className="h-5 w-5" />
                              ) : (
                                <Volume2 className="h-5 w-5" />
                              )}
                            </Button>
                            <div
                              className={`overflow-hidden transition-all duration-200 ${
                                showVolumeSlider ? "w-20 opacity-100" : "w-0 opacity-0"
                              }`}
                            >
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={isMuted ? 0 : volume}
                                onChange={(e) =>
                                  changeVolume(Number(e.target.value))
                                }
                                className="w-full h-1 accent-white cursor-pointer"
                                aria-label="Volume"
                              />
                            </div>
                          </div>

                          {/* Live badge */}
                          {currentChannel.isLive && (
                            <div className="flex items-center gap-1 bg-red-600/90 text-white text-xs font-bold px-2 py-1 rounded ml-2">
                              <Radio className="h-3 w-3 animate-pulse" />
                              LIVE
                            </div>
                          )}
                        </div>

                        {/* Right controls */}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={togglePiP}
                            className="text-white hover:bg-white/10 h-9 w-9 hidden sm:flex"
                            aria-label="Picture in Picture"
                          >
                            <PictureInPicture2 className="h-5 w-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleFullscreen}
                            className="text-white hover:bg-white/10 h-9 w-9"
                            aria-label="Fullscreen"
                          >
                            {isFullscreen ? (
                              <Minimize2 className="h-5 w-5" />
                            ) : (
                              <Maximize2 className="h-5 w-5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Channel Info — below video (YouTube style) */}
                <div className="p-4 space-y-3 shrink-0">
                  <h1 className="text-lg md:text-xl font-bold leading-tight">
                    {currentChannel.name}
                  </h1>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Channel identity */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden flex items-center justify-center shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            currentChannel.logo ||
                            getPlaceholderLogo(currentChannel.name)
                          }
                          alt=""
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">
                          {currentChannel.countryInfo
                            ? `${currentChannel.countryInfo.flag} ${currentChannel.countryInfo.name}`
                            : currentChannel.country}
                        </p>
                        {currentChannel.viewerCount > 0 && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {formatViewerCount(currentChannel.viewerCount)}{" "}
                            watching
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant={isFav ? "default" : "secondary"}
                        size="sm"
                        onClick={() => toggleFavorite(currentChannel.id)}
                        className={`gap-1.5 rounded-full ${
                          isFav
                            ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                            : ""
                        }`}
                      >
                        <Heart
                          className={`h-4 w-4 ${isFav ? "fill-current" : ""}`}
                        />
                        {isFav ? "Saved" : "Save"}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleShare}
                        className="gap-1.5 rounded-full"
                      >
                        <Share2 className="h-4 w-4" />
                        Share
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="gap-1.5 rounded-full"
                        onClick={() => navigateChannel("next")}
                      >
                        <SkipForward className="h-4 w-4" />
                        Next
                      </Button>
                    </div>
                  </div>

                  {/* Categories */}
                  {currentChannel.categories?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {currentChannel.categories.map((cat) => (
                        <Badge key={cat} variant="neon" className="text-xs">
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Mobile: Up Next section (visible when toggled) */}
                <div className="lg:hidden">
                  <AnimatePresence>
                    {showMobileSidebar && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <ChannelSidebar
                          channels={upNextChannels}
                          currentId={currentChannel.id}
                          onSelect={openPlayer}
                          favorites={favorites}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Right Sidebar: Channel List (desktop) */}
              <div className="hidden lg:flex w-[400px] xl:w-[420px] border-l border-border/50 flex-col shrink-0">
                {/* Sidebar tabs */}
                <div className="flex items-center gap-1 p-3 border-b border-border/50 shrink-0">
                  <button
                    onClick={() => setSidebarTab("upnext")}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      sidebarTab === "upnext"
                        ? "bg-foreground text-background"
                        : "bg-secondary text-foreground hover:bg-secondary/80"
                    }`}
                  >
                    Up Next
                  </button>
                  <button
                    onClick={() => setSidebarTab("related")}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      sidebarTab === "related"
                        ? "bg-foreground text-background"
                        : "bg-secondary text-foreground hover:bg-secondary/80"
                    }`}
                  >
                    All Live
                  </button>
                </div>

                {/* Channel list */}
                <ChannelSidebar
                  channels={
                    sidebarTab === "upnext"
                      ? upNextChannels
                      : allChannels.filter(
                          (ch) => ch.isLive && ch.id !== currentChannel.id
                        )
                  }
                  currentId={currentChannel.id}
                  onSelect={openPlayer}
                  favorites={favorites}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── Channel Sidebar List ─── */

function ChannelSidebar({
  channels,
  currentId,
  onSelect,
  favorites,
}: {
  channels: ChannelWithMeta[];
  currentId: string;
  onSelect: (ch: ChannelWithMeta) => void;
  favorites: string[];
}) {
  const [visibleCount, setVisibleCount] = useState(30);
  const visible = channels.slice(0, visibleCount);

  return (
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-1">
        {visible.map((ch, i) => (
          <SidebarChannelItem
            key={ch.id}
            channel={ch}
            isActive={ch.id === currentId}
            isFav={favorites.includes(ch.id)}
            index={i + 1}
            onClick={() => onSelect(ch)}
          />
        ))}

        {visibleCount < channels.length && (
          <button
            onClick={() => setVisibleCount((p) => p + 30)}
            className="w-full py-2 text-sm text-neon hover:underline flex items-center justify-center gap-1"
          >
            <ChevronDown className="h-4 w-4" />
            Show more ({channels.length - visibleCount} remaining)
          </button>
        )}

        {channels.length === 0 && (
          <p className="text-center text-muted-foreground py-8 text-sm">
            No channels available
          </p>
        )}
      </div>
    </ScrollArea>
  );
}

/* ─── Single Sidebar Channel Item ─── */

function SidebarChannelItem({
  channel,
  isActive,
  isFav,
  index,
  onClick,
}: {
  channel: ChannelWithMeta;
  isActive: boolean;
  isFav: boolean;
  index: number;
  onClick: () => void;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-2 p-2 rounded-lg text-left transition-colors group ${
        isActive
          ? "bg-neon/10 border border-neon/30"
          : "hover:bg-secondary/80"
      }`}
    >
      {/* Index number */}
      <span className="text-xs text-muted-foreground w-5 pt-2 text-center shrink-0">
        {index}
      </span>

      {/* Thumbnail */}
      <div className="relative w-40 aspect-video rounded-md overflow-hidden bg-secondary shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={
            !imgError && channel.logo
              ? channel.logo
              : getPlaceholderLogo(channel.name)
          }
          alt={channel.name}
          className="w-full h-full object-contain p-1"
          loading="lazy"
          onError={() => setImgError(true)}
        />
        {/* Live dot */}
        {channel.isLive && (
          <div className="absolute bottom-1 left-1 bg-red-600 text-white text-[9px] font-bold px-1 py-0.5 rounded flex items-center gap-0.5">
            <Radio className="h-2 w-2" />
            LIVE
          </div>
        )}
        {/* Viewer count */}
        {channel.viewerCount > 0 && (
          <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1 py-0.5 rounded">
            {formatViewerCount(channel.viewerCount)}
          </div>
        )}
        {/* Play hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <Play className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="white" />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-sm font-medium leading-tight line-clamp-2">
          {channel.name}
        </p>
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          {channel.countryInfo && (
            <>
              <span>{channel.countryInfo.flag}</span>
              <span>{channel.countryInfo.name}</span>
            </>
          )}
        </p>
        {channel.categories?.length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {channel.categories.slice(0, 2).join(" · ")}
          </p>
        )}
        {isFav && (
          <Heart className="h-3 w-3 text-red-500 fill-red-500 mt-1" />
        )}
      </div>
    </button>
  );
}
