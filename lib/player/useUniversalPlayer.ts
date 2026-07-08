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
}

const LOAD_TIMEOUT_MS = 8000;
const MAX_RETRIES_PER_SOURCE = 1;

export function useUniversalPlayer({
  channel,
  autoplay = true,
  onFatalError,
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
  const [phase, setPhase] = useState<PlayerPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      setPhase(channel ? "loading" : "idle");
      setErrorMessage(null);
    }
  }, [channel]);

  const advanceSource = useCallback(() => {
    attemptsRef.current = 0;
    setSourceIndex((idx) => {
      const next = idx + 1;
      if (next >= sources.length) {
        setPhase("error");
        setErrorMessage("No working streams available for this channel.");
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
      if (attemptsRef.current < MAX_RETRIES_PER_SOURCE) {
        attemptsRef.current += 1;
        const backoff = attemptsRef.current === 1 ? 1000 : 3000;
        retryTimeoutRef.current = setTimeout(() => {
          setPhase("loading");
          // re-run the load effect by nudging state — force reload same source
          setSourceIndex((i) => i);
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
          if (autoplay) {
            video.play().catch(() => {
              // Autoplay might be blocked; UI will show paused
              setPhase("paused");
            });
          }
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
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
          video.play().catch(() => setPhase("paused"));
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
  }, [channel?.id, activeSource?.url, activeSource?.type]);

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
    setSourceIndex(0);
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

  return {
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
