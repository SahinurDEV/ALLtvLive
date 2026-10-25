"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Hls from "hls.js";
import type { ChannelWithMeta } from "@/lib/types";
import { buildSourceList, type ResolvedSource } from "./detectStreamType";
import { reportPlaybackResult } from "./streamHealthCheck";

export type PlayerPhase =
  | "idle"
  | "loading"
  | "buffering"
  | "playing"
  | "paused"
  | "error";

interface UseUniversalPlayerOptions {
  channel: ChannelWithMeta | null;
  autoplay?: boolean;
  onFatalError?: (channelId: string) => void;
  /** Data saver: cap automatic quality at this height (e.g. 360). */
  maxAutoHeight?: number | null;
}

export interface QualityLevel {
  index: number;
  height: number;
  bitrate: number;
}

export interface AudioTrackInfo {
  id: number;
  name: string;
  lang: string | null;
}

interface UseUniversalPlayerResult {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  phase: PlayerPhase;
  activeSource: ResolvedSource | null;
  sources: ResolvedSource[];
  sourceIndex: number;
  setSource: (idx: number) => void;
  totalSources: number;
  isYouTube: boolean;
  youtubeEmbedUrl: string | null;
  play: () => void;
  pause: () => void;
  retry: () => void;
  tryNextSource: () => void;
  errorMessage: string | null;
  /** HLS renditions, highest first. Empty for non-HLS or single-rendition streams. */
  levels: QualityLevel[];
  /** -1 = automatic */
  level: number;
  setLevel: (index: number) => void;
  audioTracks: AudioTrackInfo[];
  audioTrack: number;
  setAudioTrack: (id: number) => void;
}

const LOAD_TIMEOUT_MS = 8000;
const MAX_RETRIES_PER_SOURCE = 1;

export function useUniversalPlayer({
  channel,
  autoplay = true,
  onFatalError,
  maxAutoHeight = null,
}: UseUniversalPlayerOptions): UseUniversalPlayerResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);
  const currentChannelIdRef = useRef<string | null>(null);

  const sources = useMemo(
    () => (channel?.streams ? buildSourceList(channel.streams) : []),
    [channel]
  );

  const [sourceIndex, setSourceIndex] = useState(0);
  // Bumped to force the load effect to re-run for the same source (retries).
  const [reloadNonce, setReloadNonce] = useState(0);
  const [phase, setPhase] = useState<PlayerPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [level, setLevelState] = useState(-1);
  const [audioTracks, setAudioTracks] = useState<AudioTrackInfo[]>([]);
  const [audioTrack, setAudioTrackState] = useState(-1);
  const maxAutoHeightRef = useRef(maxAutoHeight);
  maxAutoHeightRef.current = maxAutoHeight;
  // HTTP status of the last failed source and how many sources were refused
  // (401/403/451), so the final message can say "blocked in your region".
  const lastStatusRef = useRef<number | null>(null);
  const refusedCountRef = useRef(0);

  // One-shot listener that resumes playback with sound as soon as the user
  // interacts with the page — used only when the browser blocks sound autoplay.
  const gestureCleanupRef = useRef<(() => void) | null>(null);

  const clearGestureListener = useCallback(() => {
    if (gestureCleanupRef.current) {
      gestureCleanupRef.current();
      gestureCleanupRef.current = null;
    }
  }, []);

  const attemptAutoplay = useCallback((video: HTMLVideoElement) => {
    video.play().catch(() => {
      // Browser blocked autoplay with sound. Don't mute — instead, arm a
      // one-shot listener that resumes playback the moment the user touches
      // the page. Video stays paused with the play button visible until then.
      setPhase("paused");
      clearGestureListener();
      const resume = () => {
        clearGestureListener();
        video.play().catch(() => {
          // Even with a gesture play failed — leave paused for manual retry
        });
      };
      const opts = { once: true, capture: true } as const;
      document.addEventListener("pointerdown", resume, opts);
      document.addEventListener("keydown", resume, opts);
      document.addEventListener("touchstart", resume, opts);
      gestureCleanupRef.current = () => {
        document.removeEventListener("pointerdown", resume, opts);
        document.removeEventListener("keydown", resume, opts);
        document.removeEventListener("touchstart", resume, opts);
      };
    });
  }, [clearGestureListener]);

  const activeSource = sources[sourceIndex] || null;
  const isYouTube = activeSource?.type === "youtube";
  const youtubeEmbedUrl = useMemo(() => {
    if (!activeSource || activeSource.type !== "youtube" || !activeSource.youtubeId) return null;
    const id = activeSource.youtubeId;
    const params = new URLSearchParams({
      autoplay: autoplay ? "1" : "0",
      rel: "0",
      modestbranding: "1",
      playsinline: "1",
    });
    return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
  }, [activeSource, autoplay]);

  const clearTimers = useCallback(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const teardownHls = useCallback(() => {
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch {
        // ignore
      }
      hlsRef.current = null;
    }
  }, []);

  // Reset when channel changes
  useEffect(() => {
    if (channel?.id !== currentChannelIdRef.current) {
      currentChannelIdRef.current = channel?.id || null;
      setSourceIndex(0);
      attemptsRef.current = 0;
      lastStatusRef.current = null;
      refusedCountRef.current = 0;
      setPhase(channel ? "loading" : "idle");
      setErrorMessage(null);
      clearGestureListener();
    }
  }, [channel, clearGestureListener]);

  useEffect(() => clearGestureListener, [clearGestureListener]);

  const advanceSource = useCallback(() => {
    attemptsRef.current = 0;
    setSourceIndex((idx) => {
      const next = idx + 1;
      if (next >= sources.length) {
        setPhase("error");
        const allRefused = sources.length > 0 && refusedCountRef.current >= sources.length;
        setErrorMessage(
          allRefused
            ? "The broadcaster refused the connection (HTTP 403). The stream is probably blocked in your region, or only works on the broadcaster's own site."
            : "No working streams available for this channel."
        );
        if (channel) {
          reportPlaybackResult(channel.id, false, channel.name);
          onFatalError?.(channel.id);
        }
        return idx;
      }
      setPhase("loading");
      return next;
    });
  }, [sources.length, channel, onFatalError]);

  const handleSourceFailure = useCallback(
    (reason: string) => {
      clearTimers();
      teardownHls();
      const status = lastStatusRef.current;
      lastStatusRef.current = null;
      // A refusal or missing file won't fix itself on retry: move on now.
      const permanent = status === 401 || status === 403 || status === 404 || status === 410 || status === 451;
      if (status === 401 || status === 403 || status === 451) refusedCountRef.current += 1;
      if (!permanent && attemptsRef.current < MAX_RETRIES_PER_SOURCE) {
        attemptsRef.current += 1;
        const backoff = attemptsRef.current === 1 ? 1000 : 3000;
        retryTimeoutRef.current = setTimeout(() => {
          setPhase("loading");
          // Re-run the load effect for the same source. (Setting sourceIndex to
          // the same value doesn't re-render, which left the player stuck.)
          setReloadNonce((n) => n + 1);
        }, backoff);
        return;
      }
      // Give up on this source, try the next
      advanceSource();
      // suppress unused-var lint
      void reason;
    },
    [advanceSource, clearTimers, teardownHls]
  );

  // Load the current source whenever it changes
  useEffect(() => {
    if (!channel || !activeSource) return;
    const video = videoRef.current;

    // For YouTube, no <video> handling needed
    if (activeSource.type === "youtube") {
      clearTimers();
      teardownHls();
      setPhase("playing");
      reportPlaybackResult(channel.id, true, channel.name);
      return;
    }

    if (!video) return;

    clearTimers();
    teardownHls();
    setPhase("loading");
    setErrorMessage(null);
    setLevels([]);
    setLevelState(-1);
    setAudioTracks([]);
    setAudioTrackState(-1);

    const url = activeSource.url;
    const type = activeSource.type;

    const bumpToPlaying = () => {
      clearTimers();
      setPhase("playing");
      reportPlaybackResult(channel.id, true, channel.name);
    };

    const onLoadedData = () => bumpToPlaying();
    const onPlaying = () => bumpToPlaying();
    const onWaiting = () => setPhase((p) => (p === "playing" ? "buffering" : p));
    const onError = () => handleSourceFailure("video error event");
    const onPause = () =>
      setPhase((p) => (p === "playing" || p === "buffering" ? "paused" : p));
    const onPlay = () =>
      setPhase((p) => (p === "paused" || p === "loading" ? "playing" : p));

    video.addEventListener("loadeddata", onLoadedData);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("error", onError);
    video.addEventListener("pause", onPause);
    video.addEventListener("play", onPlay);

    loadTimeoutRef.current = setTimeout(() => {
      handleSourceFailure("load timeout");
    }, LOAD_TIMEOUT_MS);

    const useNativeHls =
      type === "hls" &&
      !Hls.isSupported() &&
      video.canPlayType("application/vnd.apple.mpegurl");

    if (type === "hls" && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 30,
        startLevel: -1,
      });
      hlsRef.current = hls;
      try {
        hls.loadSource(url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          const lv = hls.levels
            .map((l, i) => ({ index: i, height: l.height || 0, bitrate: l.bitrate || 0 }))
            .filter((l) => l.height > 0)
            .sort((a, b) => b.height - a.height || b.bitrate - a.bitrate);
          setLevels(lv.length > 1 ? lv : []);
          setLevelState(-1);
          applyCap(hls);
          if (autoplay) {
            attemptAutoplay(video);
          }
        });

        hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
          const tracks = hls.audioTracks.map((t, i) => ({
            id: i,
            name: t.name || t.lang || `Track ${i + 1}`,
            lang: t.lang || null,
          }));
          setAudioTracks(tracks.length > 1 ? tracks : []);
          setAudioTrackState(hls.audioTrack);
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          const code = (data as { response?: { code?: number } }).response?.code;
          if (typeof code === "number" && code >= 400) lastStatusRef.current = code;
          if (data.fatal) {
            handleSourceFailure(`hls fatal: ${data.type}`);
          }
        });
      } catch {
        handleSourceFailure("hls setup threw");
      }
    } else if (useNativeHls || type === "progressive" || type === "unknown" || type === "mpegts") {
      // Native path — mpegts won't actually play in browsers, but let native try
      try {
        video.src = url;
        video.load();
        if (autoplay) {
          attemptAutoplay(video);
        }
      } catch {
        handleSourceFailure("native src threw");
      }
    } else if (type === "dash") {
      // Dash not supported without extra lib — fail fast to advance
      handleSourceFailure("dash not supported");
    }

    return () => {
      clearTimers();
      teardownHls();
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("error", onError);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("play", onPlay);
      try {
        video.pause();
        video.removeAttribute("src");
        video.load();
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel?.id, activeSource?.url, activeSource?.type, reloadNonce]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearTimers();
      teardownHls();
    };
  }, [clearTimers, teardownHls]);

  const play = useCallback(() => {
    videoRef.current?.play().catch(() => {});
  }, []);

  const pause = useCallback(() => {
    videoRef.current?.pause();
  }, []);

  const retry = useCallback(() => {
    attemptsRef.current = 0;
    setPhase("loading");
    setErrorMessage(null);
    refusedCountRef.current = 0;
    setSourceIndex(0);
    setReloadNonce((n) => n + 1);
  }, []);

  const tryNextSource = useCallback(() => {
    advanceSource();
  }, [advanceSource]);

  const setSource = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= sources.length) return;
      attemptsRef.current = 0;
      setErrorMessage(null);
      setPhase("loading");
      setSourceIndex(idx);
    },
    [sources.length]
  );

  function applyCap(hls: Hls) {
    const cap = maxAutoHeightRef.current;
    if (!cap) {
      hls.autoLevelCapping = -1;
      return;
    }
    let best = -1;
    hls.levels.forEach((l, i) => {
      if (l.height && l.height <= cap && (best < 0 || l.height > hls.levels[best].height)) best = i;
    });
    hls.autoLevelCapping = best;
  }

  useEffect(() => {
    if (hlsRef.current) applyCap(hlsRef.current);
  }, [maxAutoHeight]);

  const setLevel = useCallback((index: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.currentLevel = index; // -1 = auto
    setLevelState(index);
  }, []);

  const setAudioTrack = useCallback((id: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.audioTrack = id;
    setAudioTrackState(id);
  }, []);

  return {
    levels,
    level,
    setLevel,
    audioTracks,
    audioTrack,
    setAudioTrack,
    videoRef,
    phase,
    activeSource,
    sources,
    sourceIndex,
    setSource,
    totalSources: sources.length,
    isYouTube,
    youtubeEmbedUrl,
    play,
    pause,
    retry,
    tryNextSource,
    errorMessage,
  };
}
