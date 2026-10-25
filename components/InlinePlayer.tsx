"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import type { ChannelWithMeta } from "@/lib/types";
import { NowNext } from "@/components/player/NowNext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Maximize2,
  Minimize2,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Volume1,
  PictureInPicture2,
  Cast,
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
  Gauge,
  Moon,
  Camera,
  Keyboard,
  MoreHorizontal,
  Layers,
  Sparkles,
  Check,
  Zap,
  Copy,
  AlertCircle,
  ChevronRight,
  Maximize,
  X,
  History,
  Headphones,
  Leaf,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import { getPlaceholderLogo, formatViewerCount } from "@/lib/utils";
import { useUniversalPlayer } from "@/lib/player/useUniversalPlayer";
import { useT } from "@/lib/i18n";
import { MiniGuideStrip } from "@/components/player/MiniGuideStrip";
import { PlayerShell } from "@/components/player/PlayerShell";
import { logViewEvent } from "@/lib/history/viewLogger";
import { RatingButtons } from "@/components/RatingButtons";
import { toast } from "sonner";
import { addWatchSeconds } from "@/lib/history/watchTime";

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
const SLEEP_PRESETS = [
  { label: "Off", value: 0 },
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "1 hour", value: 60 },
  { label: "2 hours", value: 120 },
];

function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0:00";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

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
    theaterMode,
    toggleTheaterMode,
    updateSettings,
    hideChannel,
    unhideChannel,
  } = useAppStore();

  const t = useT();
  const playerRef = useRef<HTMLDivElement>(null);
  // Mini player: when the player scrolls out of view the video itself docks
  // into a corner and keeps playing.
  const dockAnchorRef = useRef<HTMLDivElement>(null);
  const [offscreen, setOffscreen] = useState(false);
  const [dockDismissed, setDockDismissed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [showControls, setShowControls] = useState(true);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // NEW: player extras
  const [playbackRate, setPlaybackRate] = useState(1);
  const [sleepDeadline, setSleepDeadline] = useState<number | null>(null);
  const [sleepRemainingSec, setSleepRemainingSec] = useState<number>(0);
  const [watchElapsedSec, setWatchElapsedSec] = useState<number>(0);
  const [showExtras, setShowExtras] = useState(false);
  const [showSourceMenu, setShowSourceMenu] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [autoNext, setAutoNext] = useState(false);
  const [audioOnly, setAudioOnly] = useState(false);
  const [bgPlay, setBgPlay] = useState(false);
  const watchStartRef = useRef<number>(Date.now());

  const {
    videoRef,
    phase,
    activeSource,
    sources,
    sourceIndex,
    setSource,
    totalSources,
    isYouTube,
    youtubeEmbedUrl,
    retry,
    tryNextSource,
    errorMessage,
    levels,
    level,
    setLevel,
    audioTracks,
    audioTrack,
    setAudioTrack,
    bytesLoaded,
  } = useUniversalPlayer({
    channel: currentChannel,
    autoplay: settings.autoplay,
    onFatalError: markChannelBroken,
    // Audio-only mode fetches the smallest rendition to save data.
    maxAutoHeight: audioOnly ? 1 : settings.dataSaver ? 360 : null,
  });

  const isPlaying = phase === "playing";
  const docked = offscreen && !dockDismissed && !!currentChannel && !isFullscreen;

  useEffect(() => {
    const el = dockAnchorRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        setOffscreen(!entry.isIntersecting);
        if (entry.isIntersecting) setDockDismissed(false);
      },
      { threshold: 0, rootMargin: "-56px 0px 0px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [currentChannel?.id]);

  const undockScroll = useCallback(() => {
    dockAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);
  const closeDock = useCallback(() => {
    videoRef.current?.pause();
    setDockDismissed(true);
  }, [videoRef]);
  const isPaused = phase === "paused";

  const isFav = currentChannel ? favorites.includes(currentChannel.id) : false;

  // Clear broken flag on successful play + log view to server (once per channel/session)
  useEffect(() => {
    if (phase === "playing" && currentChannel) {
      unmarkChannelBroken(currentChannel.id);
      logViewEvent({
        channelId: currentChannel.id,
        channelName: currentChannel.name,
        country: currentChannel.countryInfo?.name || currentChannel.country || null,
        category: currentChannel.categories?.[0] || null,
      });
    }
  }, [phase, currentChannel, unmarkChannelBroken]);

  // Reset watch counter when channel changes
  useEffect(() => {
    watchStartRef.current = Date.now();
    setWatchElapsedSec(0);
  }, [currentChannel?.id]);

  // Count real watch time per channel for the Watch stats (every 15s)
  useEffect(() => {
    if (!isPlaying || !currentChannel) return;
    const id = currentChannel.id;
    const iv = setInterval(() => addWatchSeconds(id, 15), 15_000);
    return () => clearInterval(iv);
  }, [isPlaying, currentChannel]);

  // Tick watch counter every second while playing
  useEffect(() => {
    if (!isPlaying) return;
    const iv = setInterval(() => {
      setWatchElapsedSec(Math.floor((Date.now() - watchStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(iv);
  }, [isPlaying]);

  // Apply playback rate
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackRate;
  }, [playbackRate, currentChannel?.id, videoRef]);

  // Sleep timer tick — pauses video when it hits 0
  useEffect(() => {
    if (!sleepDeadline) {
      setSleepRemainingSec(0);
      return;
    }
    const tick = () => {
      const remain = Math.max(0, Math.floor((sleepDeadline - Date.now()) / 1000));
      setSleepRemainingSec(remain);
      if (remain === 0) {
        setSleepDeadline(null);
        if (videoRef.current) videoRef.current.pause();
        toast.info("Sleep timer ended", {
          description: "Playback paused. Sweet dreams.",
        });
      }
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [sleepDeadline, videoRef]);

  // Where the current channel sits in the list. A channel that just failed can
  // drop out of the list (hide broken channels), so remember its last position.
  const lastIdxRef = useRef(0);
  const channelPos = useMemo(() => {
    if (!currentChannel || allChannels.length === 0) return null;
    const idx = allChannels.findIndex((ch) => ch.id === currentChannel.id);
    if (idx !== -1) {
      lastIdxRef.current = idx;
      return { idx, inList: true };
    }
    return { idx: Math.min(lastIdxRef.current, allChannels.length - 1), inList: false };
  }, [currentChannel, allChannels]);

  const neighborIndex = useCallback(
    (direction: "next" | "prev") => {
      if (!channelPos) return -1;
      const n = allChannels.length;
      const { idx, inList } = channelPos;
      if (direction === "next") return inList ? (idx + 1) % n : idx % n;
      return (idx - 1 + n) % n;
    },
    [channelPos, allChannels.length]
  );

  const navigateChannel = useCallback(
    (direction: "next" | "prev") => {
      const i = neighborIndex(direction);
      if (i < 0) return;
      openPlayer(allChannels[i]);
    },
    [neighborIndex, allChannels, openPlayer]
  );

  // Mini guide strip: shown briefly after every zap so viewers see where they are.
  const [guideVisible, setGuideVisible] = useState(false);
  const guideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const flashGuide = useCallback(() => {
    setGuideVisible(true);
    clearTimeout(guideTimerRef.current);
    guideTimerRef.current = setTimeout(() => setGuideVisible(false), 3000);
  }, []);
  useEffect(() => () => clearTimeout(guideTimerRef.current), []);
  const zap = useCallback(
    (direction: "next" | "prev") => {
      navigateChannel(direction);
      flashGuide();
    },
    [navigateChannel, flashGuide]
  );
  const playerHoverRef = useRef(false);
  const neighbors = useMemo(() => {
    if (!currentChannel || !channelPos || allChannels.length < 2) return null;
    return {
      prev: allChannels[neighborIndex("prev")],
      next: allChannels[neighborIndex("next")],
      position: channelPos.idx + 1,
      total: allChannels.length,
    };
  }, [currentChannel, channelPos, allChannels, neighborIndex]);

  // "Last channel" (like a TV remote's recall button)
  const prevChannelRef = useRef<ChannelWithMeta | null>(null);
  const lastSeenRef = useRef<ChannelWithMeta | null>(null);
  useEffect(() => {
    if (!currentChannel) return;
    if (lastSeenRef.current && lastSeenRef.current.id !== currentChannel.id) {
      prevChannelRef.current = lastSeenRef.current;
    }
    lastSeenRef.current = currentChannel;
  }, [currentChannel]);
  const historyIds = useAppStore((s) => s.historyIds);
  const lastChannel = useMemo(() => {
    if (prevChannelRef.current && prevChannelRef.current.id !== currentChannel?.id) return prevChannelRef.current;
    const id = historyIds.find((h) => h !== currentChannel?.id);
    return id ? allChannels.find((c) => c.id === id) ?? null : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyIds, currentChannel?.id, allChannels]);
  const recallLastChannel = useCallback(() => {
    if (lastChannel) openPlayer(lastChannel);
    else toast.info(t("player.noLast"));
  }, [openPlayer, lastChannel, t]);

  // Lock-screen / notification controls (Media Session API)
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator) || !currentChannel) return;
    const msn = navigator.mediaSession;
    try {
      msn.metadata = new MediaMetadata({
        title: currentChannel.name,
        artist: "ALLtvLive",
        album: currentChannel.countryInfo?.name || currentChannel.country || "Live TV",
        artwork: currentChannel.logo ? [{ src: currentChannel.logo, sizes: "512x512" }] : [],
      });
      const set = (a: MediaSessionAction, h: MediaSessionActionHandler | null) => {
        try {
          msn.setActionHandler(a, h);
        } catch {
          // unsupported action
        }
      };
      set("play", () => videoRef.current?.play().catch(() => {}));
      set("pause", () => videoRef.current?.pause());
      set("nexttrack", () => zap("next"));
      set("previoustrack", () => zap("prev"));
      set("enterpictureinpicture" as MediaSessionAction, () => {
        videoRef.current?.requestPictureInPicture?.().catch(() => {});
      });
    } catch {
      // ignore
    }
  }, [currentChannel, zap, videoRef]);

  // Number keys: type a channel number (like a TV remote), jump after a pause.
  const [numberEntry, setNumberEntry] = useState("");
  const numberTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pushDigit = useCallback(
    (d: string) => {
      setNumberEntry((cur) => {
        const next = (cur + d).slice(0, 5);
        if (numberTimerRef.current) clearTimeout(numberTimerRef.current);
        numberTimerRef.current = setTimeout(() => {
          setNumberEntry("");
          const n = parseInt(next, 10);
          const target = n >= 1 ? allChannels[n - 1] : undefined;
          if (target) openPlayer(target);
          else toast.info(t("player.noChannelNumber", { n: next }));
        }, 1500);
        return next;
      });
    },
    [allChannels, openPlayer, t]
  );

  // Cast to a TV: Remote Playback API (Chrome/Android: Chromecast) or
  // Safari's AirPlay picker. No SDK or API key required.
  const [canCast, setCanCast] = useState(false);
  useEffect(() => {
    const v = videoRef.current as (HTMLVideoElement & { webkitShowPlaybackTargetPicker?: () => void }) | null;
    if (!v) return;
    setCanCast(!!(v.remote || v.webkitShowPlaybackTargetPicker));
  }, [videoRef, currentChannel]);
  const handleCast = useCallback(async () => {
    const v = videoRef.current as (HTMLVideoElement & { webkitShowPlaybackTargetPicker?: () => void }) | null;
    if (!v) return;
    try {
      if (v.webkitShowPlaybackTargetPicker) {
        v.webkitShowPlaybackTargetPicker();
      } else if (v.remote) {
        await v.remote.prompt();
      }
    } catch {
      toast.error("No cast device found, or this stream can't be cast from the browser.");
    }
  }, [videoRef]);

  // Remember the auto-skip choice between visits.
  useEffect(() => {
    setAutoNext(localStorage.getItem("alltvlive-autoskip") === "1");
  }, []);
  const toggleAutoNext = useCallback(() => {
    setAutoNext((v) => {
      try {
        localStorage.setItem("alltvlive-autoskip", v ? "0" : "1");
      } catch {
        // ignore
      }
      return !v;
    });
  }, []);

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
      toast.error("Picture-in-Picture isn't available on this browser.");
    }
  }, [videoRef]);

  // PiP support (Android Chrome and desktop; iOS Safari via webkit API)
  const [canPiP, setCanPiP] = useState(false);
  useEffect(() => {
    setCanPiP(typeof document !== "undefined" && !!document.pictureInPictureEnabled);
  }, []);

  // Audio-only ("radio") mode and keep playing in the background
  useEffect(() => {
    try {
      setAudioOnly(localStorage.getItem("alltvlive-audio-only") === "1");
      setBgPlay(localStorage.getItem("alltvlive-bg-play") === "1");
    } catch {
      // ignore
    }
  }, []);
  const toggleAudioOnly = useCallback(() => {
    setAudioOnly((v) => {
      try {
        localStorage.setItem("alltvlive-audio-only", v ? "0" : "1");
      } catch {
        // ignore
      }
      return !v;
    });
  }, []);
  const toggleBgPlay = useCallback(() => {
    setBgPlay((v) => {
      try {
        localStorage.setItem("alltvlive-bg-play", v ? "0" : "1");
      } catch {
        // ignore
      }
      return !v;
    });
  }, []);
  // When the tab is hidden some mobile browsers pause video; resume it when
  // background play is on (audio keeps going, like a radio).
  useEffect(() => {
    if (!bgPlay) return;
    let wasPlaying = false;
    const onVis = () => {
      const v = videoRef.current;
      if (!v) return;
      if (document.visibilityState === "hidden") {
        wasPlaying = !v.paused;
        setTimeout(() => {
          if (wasPlaying && v.paused) v.play().catch(() => {});
        }, 300);
      }
    };
    const onPause = () => {
      const v = videoRef.current;
      if (document.visibilityState === "hidden" && wasPlaying && v) v.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVis);
    const v = videoRef.current;
    v?.addEventListener("pause", onPause);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      v?.removeEventListener("pause", onPause);
    };
  }, [bgPlay, videoRef, currentChannel?.id]);

  const cyclePlaybackRate = useCallback(
    (dir: "up" | "down") => {
      const idx = PLAYBACK_SPEEDS.indexOf(playbackRate as typeof PLAYBACK_SPEEDS[number]);
      const safeIdx = idx === -1 ? PLAYBACK_SPEEDS.indexOf(1 as typeof PLAYBACK_SPEEDS[number]) : idx;
      const nextIdx =
        dir === "up"
          ? Math.min(PLAYBACK_SPEEDS.length - 1, safeIdx + 1)
          : Math.max(0, safeIdx - 1);
      const rate = PLAYBACK_SPEEDS[nextIdx];
      setPlaybackRate(rate);
      toast.success(`Speed ${rate}x`);
    },
    [playbackRate]
  );

  const handleScreenshot = useCallback(() => {
    if (!videoRef.current || !currentChannel) return;
    if (isYouTube) {
      toast.info("Screenshots aren't available for YouTube streams.");
      return;
    }
    const v = videoRef.current;
    if (!v.videoWidth || !v.videoHeight) {
      toast.error("Video isn't ready yet.");
      return;
    }
    try {
      const canvas = document.createElement("canvas");
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no context");
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error("Screenshot failed — the stream may be cross-origin protected.");
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const ts = new Date().toISOString().replace(/[:.]/g, "-");
        a.href = url;
        a.download = `${currentChannel.id}-${ts}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Screenshot saved");
      }, "image/png");
    } catch {
      toast.error("Screenshot blocked by the stream provider (CORS).");
    }
  }, [videoRef, currentChannel, isYouTube]);

  const handleCopyLink = useCallback(async () => {
    if (!currentChannel) return;
    const url = `${window.location.origin}/${currentChannel.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Direct link copied");
    } catch {
      toast.error("Couldn't copy link");
    }
  }, [currentChannel]);

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

  const setSleepMinutes = useCallback((minutes: number) => {
    if (minutes <= 0) {
      setSleepDeadline(null);
      toast.info("Sleep timer cleared");
      return;
    }
    setSleepDeadline(Date.now() + minutes * 60_000);
    toast.success(`Sleeping in ${minutes < 60 ? `${minutes} min` : `${minutes / 60} h`}`);
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (/^[0-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        pushDigit(e.key);
        return;
      }
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
        case "t":
          toggleTheaterMode();
          break;
        case "s":
          handleScreenshot();
          break;
        case "n":
        case "PageDown":
        case "ChannelDown":
        case "MediaTrackNext":
          e.preventDefault();
          zap("next");
          break;
        case "p":
        case "PageUp":
        case "ChannelUp":
        case "MediaTrackPrevious":
          e.preventDefault();
          zap("prev");
          break;
        case "l":
        case "L":
          recallLastChannel();
          break;
        case ".":
        case ">":
          cyclePlaybackRate("up");
          break;
        case ",":
        case "<":
          cyclePlaybackRate("down");
          break;
        case "?":
          setShowShortcuts((v) => !v);
          break;
        case "ArrowUp":
        case "ArrowDown": {
          // Only zap when the player is the thing being used (hovered, focused
          // or fullscreen); otherwise arrows keep scrolling the page.
          const el = playerRef.current;
          const active =
            !!document.fullscreenElement ||
            playerHoverRef.current ||
            (!!el && el.contains(document.activeElement));
          if (!active) break;
          e.preventDefault();
          zap(e.key === "ArrowDown" ? "next" : "prev");
          break;
        }
        case "+":
        case "=":
          changeVolume(Math.min(100, volume + 5));
          break;
        case "-":
        case "_":
          changeVolume(Math.max(0, volume - 5));
          break;
        case "Escape":
          setShowExtras(false);
          setShowSourceMenu(false);
          setShowShortcuts(false);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    volume,
    togglePlayPause,
    toggleMute,
    handleFullscreen,
    changeVolume,
    toggleTheaterMode,
    handleScreenshot,
    zap,
    cyclePlaybackRate,
    recallLastChannel,
    pushDigit,
  ]);

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  // Touch swipe: up = next channel, down = previous (left/right also work).
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setShowControls(true);
    clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 4000);
  }, []);
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStart.current) return;
      const dx = e.changedTouches[0].clientX - touchStart.current.x;
      const dy = e.changedTouches[0].clientY - touchStart.current.y;
      touchStart.current = null;
      const THRESHOLD = 50;
      if (Math.abs(dy) > Math.abs(dx)) {
        if (dy < -THRESHOLD) zap("next");
        else if (dy > THRESHOLD) zap("prev");
      } else {
        if (dx > THRESHOLD) zap("prev");
        else if (dx < -THRESHOLD) zap("next");
      }
    },
    [zap]
  );

  const streamQuality = activeSource?.quality || null;
  const watchElapsedLabel = formatDuration(watchElapsedSec);
  const sleepLabel = sleepRemainingSec > 0 ? formatDuration(sleepRemainingSec) : null;

  const sourceOptions = useMemo(
    () =>
      sources.map((s, i) => ({
        idx: i,
        label: s.quality || s.type.toUpperCase(),
        subLabel: s.type.toUpperCase(),
        url: s.url,
      })),
    [sources]
  );

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

  const playerWidthClass = theaterMode
    ? "w-full md:w-[70%] lg:w-[72%] xl:w-[75%]"
    : "w-full md:w-[60%] lg:w-[58%] xl:w-[55%]";

  return (
    <div
      id="main-player"
      className={`rounded-lg sm:rounded-xl overflow-hidden border shadow-[0_0_30px_rgba(0,255,157,0.04)] transition-colors ${
        theaterMode
          ? "border-neon/40 shadow-[0_0_50px_rgba(0,255,157,0.15)] bg-black"
          : "border-border/30 bg-card"
      }`}
    >
      <div className="flex flex-col md:flex-row">
        <div ref={dockAnchorRef} className={`relative ${playerWidthClass} aspect-video shrink-0 bg-black`}>
        <div
          ref={playerRef}
          data-docked={docked ? "true" : "false"}
          className={`${
            docked
              ? "fixed bottom-20 right-3 lg:bottom-4 lg:right-4 z-50 w-[200px] sm:w-[320px] rounded-lg overflow-hidden border border-neon/40 shadow-[0_0_30px_rgba(0,255,157,0.25)]"
              : "absolute inset-0"
          } aspect-video bg-black outline-none focus-visible:ring-2 focus-visible:ring-neon focus-visible:ring-inset`}
          onMouseMove={resetControlsTimeout}
          onMouseLeave={() => {
            playerHoverRef.current = false;
            setShowControls(false);
          }}
          onMouseEnter={() => {
            playerHoverRef.current = true;
            setShowControls(true);
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onFocus={(e) => {
            // Keyboard / remote focus only, not mouse or touch clicks.
            if (e.target === e.currentTarget && e.currentTarget.matches(":focus-visible")) flashGuide();
          }}
          tabIndex={0}
          aria-label={t("zap.hint")}
          style={{ touchAction: "pinch-zoom" }}
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
            onSkipNext={neighbors ? () => zap("next") : undefined}
            nextChannelName={neighbors?.next.name}
            autoSkip={autoNext}
          />

          {numberEntry && (
            <div className="absolute top-2 right-2 z-30 px-3 py-1 rounded-lg bg-black/80 text-neon font-mono text-2xl font-bold border border-neon/40" data-testid="number-entry" aria-live="polite">
              {numberEntry}
              <span className="animate-pulse">_</span>
            </div>
          )}

          {audioOnly && !isYouTube && (
            <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#0a0a2e] via-black to-[#1a0a1e] pointer-events-none" data-testid="audio-only">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={currentChannel.logo || getPlaceholderLogo(currentChannel.name)} alt="" className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-xl bg-white/5 p-2" />
              <div className="flex items-center gap-1.5 text-xs text-white/80">
                <Headphones className="h-3.5 w-3.5 text-pink-400" />
                {t("player.listening")}
              </div>
            </div>
          )}

          {/* Watch time badge — top-left, always visible when playing */}
          {isPlaying && !isYouTube && (
            <div className="absolute top-2 left-2 z-10 pointer-events-none flex items-center gap-1.5">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-white text-[10px] font-mono border border-white/10">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                </span>
                {watchElapsedLabel}
              </div>
              {sleepLabel && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/25 backdrop-blur text-purple-200 text-[10px] font-mono border border-purple-500/40">
                  <Moon className="h-2.5 w-2.5" />
                  {sleepLabel}
                </div>
              )}
              {playbackRate !== 1 && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neon/25 backdrop-blur text-neon text-[10px] font-mono border border-neon/40">
                  <Gauge className="h-2.5 w-2.5" />
                  {playbackRate}x
                </div>
              )}
            </div>
          )}

          {/* Controls Overlay — hidden for YouTube */}
          {!isYouTube && (
            <div
              className={`absolute inset-0 transition-opacity duration-300 pointer-events-none ${
                showControls || isPaused ? "opacity-100" : "opacity-0"
              }`}
            >
              {/* Top gradient — channel name (mobile) */}
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
                      onClick={() => zap("prev")}
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
                      onClick={() => zap("next")}
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
                    {/* Source selector — only when multiple sources */}
                    {totalSources > 1 && (
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setShowSourceMenu((v) => !v);
                            setShowExtras(false);
                          }}
                          className="text-white hover:bg-white/10 active:bg-white/20 h-8 w-8 md:h-7 md:w-7 relative"
                          aria-label="Change stream source"
                          title={`Source ${sourceIndex + 1}/${totalSources}${streamQuality ? ` · ${streamQuality}` : ""}`}
                        >
                          <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-3.5 md:w-3.5" />
                          <span className="absolute -top-0.5 -right-0.5 text-[8px] font-bold bg-neon text-black rounded-full h-3 w-3 flex items-center justify-center leading-none">
                            {totalSources}
                          </span>
                        </Button>
                        <AnimatePresence>
                          {showSourceMenu && (
                            <motion.div
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 6 }}
                              className="absolute bottom-full right-0 mb-2 w-56 rounded-xl bg-black/95 backdrop-blur border border-white/10 shadow-2xl overflow-hidden z-40"
                            >
                              <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2">
                                <Layers className="h-3.5 w-3.5 text-neon" />
                                <span className="text-[11px] font-semibold text-white uppercase tracking-wider">
                                  Streams
                                </span>
                                <span className="text-[10px] text-white/50 ml-auto">
                                  {totalSources} available
                                </span>
                              </div>
                              <div className="max-h-56 overflow-y-auto">
                                {sourceOptions.map((opt) => (
                                  <button
                                    key={opt.idx}
                                    onClick={() => {
                                      setSource(opt.idx);
                                      setShowSourceMenu(false);
                                    }}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors ${
                                      opt.idx === sourceIndex ? "bg-neon/10" : ""
                                    }`}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span
                                          className={`text-xs font-medium ${
                                            opt.idx === sourceIndex ? "text-neon" : "text-white"
                                          }`}
                                        >
                                          {opt.label}
                                        </span>
                                        <span className="text-[9px] font-mono text-white/40 px-1 rounded bg-white/5">
                                          {opt.subLabel}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-white/40 truncate mt-0.5">
                                        {opt.url}
                                      </p>
                                    </div>
                                    {opt.idx === sourceIndex && (
                                      <Check className="h-3.5 w-3.5 text-neon" />
                                    )}
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Extras "..." menu */}
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setShowExtras((v) => !v);
                          setShowSourceMenu(false);
                        }}
                        className="text-white hover:bg-white/10 active:bg-white/20 h-8 w-8 md:h-7 md:w-7"
                        aria-label="More options"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-3.5 md:w-3.5" />
                      </Button>
                      <AnimatePresence>
                        {showExtras && (
                          <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 6 }}
                            className="fixed inset-x-2 bottom-20 max-h-[60vh] overflow-y-auto sm:absolute sm:inset-x-auto sm:bottom-full sm:right-0 sm:mb-2 sm:w-64 sm:max-h-[70vh] rounded-xl bg-black/95 backdrop-blur border border-white/10 shadow-2xl z-50"
                          >
                            <div className="p-2 space-y-1">
                              {levels.length > 0 && (
                                <div className="px-2 pt-1.5 pb-2 border-b border-white/10" data-testid="quality-menu">
                                  <div className="text-[10px] font-semibold text-white/80 uppercase tracking-wider mb-1.5">
                                    {t("player.quality")}
                                  </div>
                                  <div className="grid grid-cols-4 gap-1">
                                    {[{ index: -1, height: 0 }, ...levels].map((l) => (
                                      <button
                                        key={l.index}
                                        onClick={() => setLevel(l.index)}
                                        className={`text-[10px] font-mono py-1 rounded transition-colors ${
                                          level === l.index
                                            ? "bg-neon text-black font-bold"
                                            : "bg-white/5 text-white hover:bg-white/10"
                                        }`}
                                      >
                                        {l.index === -1 ? t("player.qualityAuto") : `${l.height}p`}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {audioTracks.length > 0 && (
                                <div className="px-2 pt-1.5 pb-2 border-b border-white/10">
                                  <div className="text-[10px] font-semibold text-white/80 uppercase tracking-wider mb-1.5">
                                    {t("player.audio")}
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {audioTracks.map((a) => (
                                      <button
                                        key={a.id}
                                        onClick={() => setAudioTrack(a.id)}
                                        className={`text-[10px] px-2 py-1 rounded transition-colors ${
                                          audioTrack === a.id
                                            ? "bg-neon text-black font-bold"
                                            : "bg-white/5 text-white hover:bg-white/10"
                                        }`}
                                      >
                                        {a.name}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {/* Playback speed */}
                              <div className="px-2 pt-1.5 pb-2 border-b border-white/10">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <Gauge className="h-3 w-3 text-neon" />
                                  <span className="text-[10px] font-semibold text-white/80 uppercase tracking-wider">
                                    Speed
                                  </span>
                                  <span className="text-[10px] text-white/40 ml-auto">
                                    {playbackRate}x
                                  </span>
                                </div>
                                <div className="grid grid-cols-6 gap-1">
                                  {PLAYBACK_SPEEDS.map((s) => (
                                    <button
                                      key={s}
                                      onClick={() => {
                                        setPlaybackRate(s);
                                        toast.success(`Speed ${s}x`);
                                      }}
                                      className={`text-[10px] font-mono py-1 rounded transition-colors ${
                                        playbackRate === s
                                          ? "bg-neon text-black font-bold"
                                          : "bg-white/5 text-white hover:bg-white/10"
                                      }`}
                                    >
                                      {s}x
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Sleep timer */}
                              <div className="px-2 py-2 border-b border-white/10">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <Moon className="h-3 w-3 text-purple-400" />
                                  <span className="text-[10px] font-semibold text-white/80 uppercase tracking-wider">
                                    Sleep timer
                                  </span>
                                  {sleepLabel && (
                                    <span className="text-[10px] text-purple-300 ml-auto font-mono">
                                      {sleepLabel}
                                    </span>
                                  )}
                                </div>
                                <div className="grid grid-cols-5 gap-1">
                                  {SLEEP_PRESETS.map((p) => (
                                    <button
                                      key={p.value}
                                      onClick={() => setSleepMinutes(p.value)}
                                      className={`text-[10px] py-1 rounded transition-colors ${
                                        (p.value === 0 && !sleepDeadline) ||
                                        (p.value > 0 &&
                                          sleepDeadline &&
                                          Math.abs(sleepDeadline - Date.now() - p.value * 60000) <
                                            3000)
                                          ? "bg-purple-500/40 text-purple-100 font-bold"
                                          : "bg-white/5 text-white hover:bg-white/10"
                                      }`}
                                    >
                                      {p.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Row toggles */}
                              <ExtrasRow
                                icon={<Sparkles className="h-3.5 w-3.5 text-yellow-400" />}
                                label="Theater mode"
                                hint="T"
                                active={theaterMode}
                                onClick={toggleTheaterMode}
                              />
                              {canPiP && (
                                <ExtrasRow
                                  icon={<PictureInPicture2 className="h-3.5 w-3.5 text-sky-400" />}
                                  label={t("player.pip")}
                                  onClick={() => {
                                    togglePiP();
                                    setShowExtras(false);
                                  }}
                                />
                              )}
                              <ExtrasRow
                                icon={<Leaf className="h-3.5 w-3.5 text-green-400" />}
                                label={t("player.dataSaver")}
                                active={settings.dataSaver}
                                onClick={() => updateSettings({ dataSaver: !settings.dataSaver })}
                              />
                              <div className="px-3 pb-1 text-[10px] text-white/50" data-testid="data-used">
                                {t("player.dataUsed", { mb: (bytesLoaded / 1048576).toFixed(1) })}
                              </div>
                              <ExtrasRow
                                icon={<Headphones className="h-3.5 w-3.5 text-pink-400" />}
                                label={t("player.audioOnly")}
                                active={audioOnly}
                                onClick={toggleAudioOnly}
                              />
                              <ExtrasRow
                                icon={<Radio className="h-3.5 w-3.5 text-orange-400" />}
                                label={t("player.bgPlay")}
                                active={bgPlay}
                                onClick={toggleBgPlay}
                              />
                              <ExtrasRow
                                icon={<Zap className="h-3.5 w-3.5 text-neon" />}
                                label={t("player.autoSkip")}
                                active={autoNext}
                                onClick={toggleAutoNext}
                              />
                              <ExtrasRow
                                icon={<EyeOff className="h-3.5 w-3.5 text-white/70" />}
                                label={t("hide.this")}
                                onClick={() => {
                                  const ch = currentChannel;
                                  setShowExtras(false);
                                  zap("next");
                                  hideChannel(ch.id);
                                  toast(t("hide.done", { name: ch.name }), {
                                    action: { label: t("hide.undo"), onClick: () => unhideChannel(ch.id) },
                                  });
                                }}
                              />
                              <ExtrasRow
                                icon={<Camera className="h-3.5 w-3.5 text-blue-400" />}
                                label="Screenshot"
                                hint="S"
                                onClick={() => {
                                  handleScreenshot();
                                  setShowExtras(false);
                                }}
                              />
                              <ExtrasRow
                                icon={<Copy className="h-3.5 w-3.5 text-white/70" />}
                                label="Copy direct link"
                                onClick={() => {
                                  handleCopyLink();
                                  setShowExtras(false);
                                }}
                              />
                              <ExtrasRow
                                icon={<AlertCircle className="h-3.5 w-3.5 text-red-400" />}
                                label="Report broken stream"
                                onClick={() => {
                                  openReportDialog(currentChannel.id);
                                  setShowExtras(false);
                                }}
                              />
                              <ExtrasRow
                                icon={<Keyboard className="h-3.5 w-3.5 text-white/70" />}
                                label="Keyboard shortcuts"
                                hint="?"
                                onClick={() => {
                                  setShowShortcuts(true);
                                  setShowExtras(false);
                                }}
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {canCast && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCast}
                        className="text-white hover:bg-white/10 h-7 w-7"
                        aria-label="Cast to TV"
                      >
                        <Cast className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={togglePiP}
                      className={`text-white hover:bg-white/10 h-7 w-7 ${canPiP ? "flex" : "hidden"}`}
                      aria-label="Picture in Picture"
                    >
                      <PictureInPicture2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleTheaterMode}
                      className={`hover:bg-white/10 h-7 w-7 hidden md:flex ${
                        theaterMode ? "text-neon" : "text-white"
                      }`}
                      aria-label="Theater mode"
                      title="Theater mode (T)"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
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

          {/* Mini guide strip: previous / current / next channel */}
          {neighbors && !isYouTube && phase !== "error" && (
            <MiniGuideStrip
              visible={guideVisible}
              prev={neighbors.prev}
              next={neighbors.next}
              current={currentChannel}
              position={neighbors.position}
              total={neighbors.total}
              onPrev={() => zap("prev")}
              onNext={() => zap("next")}
            />
          )}

          {/* Keyboard shortcuts overlay */}
          <AnimatePresence>
            {showShortcuts && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={() => setShowShortcuts(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="max-w-md w-full rounded-2xl bg-card border border-neon/30 p-5 shadow-[0_0_40px_rgba(0,255,157,0.15)]"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Keyboard className="h-4 w-4 text-neon" />
                    <h3 className="font-bold text-sm">Keyboard shortcuts</h3>
                    <button
                      onClick={() => setShowShortcuts(false)}
                      className="ml-auto text-muted-foreground hover:text-foreground text-xs"
                    >
                      Esc
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <Shortcut k="Space" desc="Play / Pause" />
                    <Shortcut k="M" desc="Mute / Unmute" />
                    <Shortcut k="F" desc="Fullscreen" />
                    <Shortcut k="T" desc="Theater mode" />
                    <Shortcut k="S" desc="Screenshot" />
                    <Shortcut k="↓ / N / PgDn" desc="Next channel" />
                    <Shortcut k="↑ / P / PgUp" desc="Previous channel" />
                    <Shortcut k="L" desc="Last channel" />
                    <Shortcut k="+ / −" desc="Volume ±5%" />
                    <Shortcut k="> / <" desc="Speed ± step" />
                    <Shortcut k="0-9" desc={t("player.numberHint")} />
                    <Shortcut k="?" desc="Toggle this menu" />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-4 pt-3 border-t border-border/50 text-center">
                    Press <kbd className="px-1 py-0.5 rounded bg-muted text-foreground font-mono">?</kbd> anytime to reopen.
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          {docked && (
            <div className="absolute inset-0 z-40 flex items-start justify-end gap-1 p-1 bg-gradient-to-b from-black/60 to-transparent">
              <button
                type="button"
                onClick={undockScroll}
                className="flex-1 h-full text-left"
                aria-label={t("mini.expand")}
              />
              <button
                type="button"
                onClick={undockScroll}
                className="h-7 w-7 rounded-md bg-black/60 text-white flex items-center justify-center"
                aria-label={t("mini.expand")}
                data-testid="mini-expand"
              >
                <Maximize className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={closeDock}
                className="h-7 w-7 rounded-md bg-black/60 text-white flex items-center justify-center"
                aria-label={t("mini.close")}
                data-testid="mini-close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
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
            {/* Big watch-time / status pill on info side */}
            {isPlaying && (
              <div className="hidden md:flex flex-col items-end gap-1 text-right">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Watching
                </span>
                <span className="font-mono text-xs text-neon">
                  {watchElapsedLabel}
                </span>
              </div>
            )}
          </div>

          {/* Status chips row */}
          <div className="flex flex-wrap gap-1.5 mt-3 md:mt-3.5">
            {playbackRate !== 1 && (
              <StatusChip
                icon={<Gauge className="h-2.5 w-2.5" />}
                text={`${playbackRate}x speed`}
                tone="neon"
              />
            )}
            {sleepLabel && (
              <StatusChip
                icon={<Moon className="h-2.5 w-2.5" />}
                text={`Sleep in ${sleepLabel}`}
                tone="purple"
              />
            )}
            {theaterMode && (
              <StatusChip
                icon={<Sparkles className="h-2.5 w-2.5" />}
                text="Theater mode"
                tone="yellow"
              />
            )}
            {autoNext && (
              <StatusChip
                icon={<Zap className="h-2.5 w-2.5" />}
                text="Auto-next"
                tone="neon"
              />
            )}
            {totalSources > 1 && (
              <StatusChip
                icon={<Layers className="h-2.5 w-2.5" />}
                text={`Source ${sourceIndex + 1}/${totalSources}`}
                tone="neutral"
              />
            )}
          </div>

          {/* Detail rows */}
          <div className="mt-3 md:mt-3.5 space-y-2 md:space-y-2.5 text-[11px] sm:text-xs text-muted-foreground flex-1 overflow-y-auto">
            <div className="flex items-center gap-4 flex-wrap">
              {currentChannel.countryInfo && (
                <span className="flex items-center gap-1.5">
                  <Globe className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-neon/70 shrink-0" />
                  {currentChannel.countryInfo.flag} {currentChannel.countryInfo.name}
                </span>
              )}
              {currentChannel.viewerCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-neon/70 shrink-0" />
                  {formatViewerCount(currentChannel.viewerCount)} watching
                </span>
              )}
            </div>

            <NowNext channel={currentChannel} />

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
          <div className="flex items-center gap-1.5 pt-3 mt-auto border-t border-border/30 flex-wrap">
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
            <RatingButtons
              channelId={currentChannel.id}
              channelName={currentChannel.name}
              compact
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={toggleTheaterMode}
              className={`gap-1 rounded-full text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 hidden md:flex ${
                theaterMode
                  ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/25"
                  : ""
              }`}
              aria-label="Toggle theater mode"
              title="Theater mode (T)"
            >
              <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              {theaterMode ? "Exit theater" : "Theater"}
            </Button>
            {lastChannel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={recallLastChannel}
                className="gap-1 rounded-full text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 ml-auto max-w-[9rem]"
                aria-label={`${t("player.last")}: ${lastChannel.name}`}
                title={`${t("player.last")} (L)`}
                data-testid="last-channel"
              >
                <History className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                <span className="truncate">{t("player.last")}</span>
              </Button>
            )}
            <Button
              variant="neon"
              size="sm"
              onClick={() => zap("next")}
              className={`gap-1 rounded-full text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 ${lastChannel ? "" : "ml-auto"}`}
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

function ExtrasRow({
  icon,
  label,
  hint,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
        active ? "bg-neon/10 text-neon" : "text-white hover:bg-white/5"
      }`}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {typeof active === "boolean" ? (
        <span
          className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
            active
              ? "bg-neon text-black"
              : "bg-white/10 text-white/60"
          }`}
        >
          {active ? "ON" : "OFF"}
        </span>
      ) : hint ? (
        <kbd className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/70">
          {hint}
        </kbd>
      ) : (
        <ChevronRight className="h-3 w-3 text-white/30" />
      )}
    </button>
  );
}

function Shortcut({ k, desc }: { k: string; desc: string }) {
  return (
    <div className="flex items-center gap-2">
      <kbd className="min-w-[52px] text-center text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-foreground border border-border/60">
        {k}
      </kbd>
      <span className="text-muted-foreground">{desc}</span>
    </div>
  );
}

function StatusChip({
  icon,
  text,
  tone,
}: {
  icon: React.ReactNode;
  text: string;
  tone: "neon" | "purple" | "yellow" | "neutral";
}) {
  const cls =
    tone === "neon"
      ? "bg-neon/10 text-neon border-neon/30"
      : tone === "purple"
        ? "bg-purple-500/15 text-purple-300 border-purple-500/40"
        : tone === "yellow"
          ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/40"
          : "bg-muted/40 text-muted-foreground border-border/60";
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] ${cls}`}
    >
      {icon}
      {text}
    </span>
  );
}

