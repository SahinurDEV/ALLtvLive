"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Hls from "hls.js";
import Fuse from "fuse.js";
import { Plus, Tv, Volume2, VolumeX, X, Loader2, AlertTriangle } from "lucide-react";
import { useChannels } from "@/hooks/useChannels";
import { buildSourceList } from "@/lib/player/detectStreamType";
import type { ChannelWithMeta } from "@/lib/types";
import { useT } from "@/lib/i18n";

const KEY = "alltvlive-multiview";
const MAX = 4;

function Tile({
  channel,
  audible,
  onSelect,
  onRemove,
}: {
  channel: ChannelWithMeta;
  audible: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const sources = useMemo(
    () => buildSourceList(channel.streams).filter((s) => s.type === "hls" || s.type === "progressive"),
    [channel]
  );
  const [idx, setIdx] = useState(0);
  const [state, setState] = useState<"loading" | "playing" | "error">("loading");

  useEffect(() => {
    const video = videoRef.current;
    const src = sources[idx];
    if (!video) return;
    if (!src) {
      setState("error");
      return;
    }
    setState("loading");
    let hls: Hls | null = null;
    const next = () => setIdx((i) => i + 1);
    const timer = setTimeout(next, 12_000); // dead stream: skip to next source
    const onPlaying = () => {
      clearTimeout(timer);
      setState("playing");
    };
    video.addEventListener("playing", onPlaying);
    video.addEventListener("error", next);
    if (src.type === "hls" && Hls.isSupported()) {
      hls = new Hls({ lowLatencyMode: false, capLevelToPlayerSize: true, maxBufferLength: 15 });
      hls.on(Hls.Events.ERROR, (_e, d) => {
        if (d.fatal) next();
      });
      hls.loadSource(src.url);
      hls.attachMedia(video);
    } else {
      video.src = src.url;
    }
    video.play().catch(() => {});
    return () => {
      clearTimeout(timer);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("error", next);
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [sources, idx]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = !audible;
  }, [audible]);

  return (
    <div
      className={`relative bg-black rounded-lg overflow-hidden aspect-video border ${
        audible ? "border-neon" : "border-border/60"
      }`}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        muted
        autoPlay
        onClick={onSelect}
      />
      {state !== "playing" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs text-gray-300 pointer-events-none">
          {state === "loading" ? (
            <Loader2 className="h-5 w-5 animate-spin text-neon" />
          ) : (
            <>
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              {t("player.unavailable")}
            </>
          )}
        </div>
      )}
      <div className="absolute top-0 inset-x-0 flex items-center gap-2 p-1.5 bg-gradient-to-b from-black/80 to-transparent">
        <button
          type="button"
          onClick={onSelect}
          className="text-white"
          aria-label={audible ? "Playing sound" : "Play sound from this tile"}
        >
          {audible ? <Volume2 className="h-4 w-4 text-neon" /> : <VolumeX className="h-4 w-4" />}
        </button>
        <span className="text-white text-xs font-medium truncate flex-1">{channel.name}</span>
        <button type="button" onClick={onRemove} className="text-white/80 hover:text-white" aria-label={t("multi.remove")}>
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function MultiView() {
  const t = useT();
  const { allChannels, isLoading } = useChannels();
  const [ids, setIds] = useState<string[]>([]);
  const [audible, setAudible] = useState(0);
  const [query, setQuery] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (Array.isArray(saved)) setIds(saved.filter((x) => typeof x === "string").slice(0, MAX));
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated) localStorage.setItem(KEY, JSON.stringify(ids));
  }, [ids, hydrated]);

  const byId = useMemo(() => new Map(allChannels.map((c) => [c.id, c])), [allChannels]);
  const chosen = ids.map((id) => byId.get(id)).filter((c): c is ChannelWithMeta => !!c);
  const fuse = useMemo(() => new Fuse(allChannels, { keys: ["name", "alt_names"], threshold: 0.3 }), [allChannels]);
  const results = query.trim().length >= 2 ? fuse.search(query.trim(), { limit: 8 }).map((r) => r.item) : [];

  const add = (c: ChannelWithMeta) => {
    if (ids.includes(c.id) || ids.length >= MAX) return;
    setIds([...ids, c.id]);
    setQuery("");
  };
  const remove = (i: number) => {
    setIds(ids.filter((_, k) => k !== i));
    setAudible(0);
  };

  const cols = chosen.length <= 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/watch" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-neon">
            <Tv className="h-4 w-4" />
            ALLtvLive
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold">{t("multi.title")}</h1>
          <span className="text-xs text-muted-foreground">{chosen.length}/{MAX}</span>
        </div>

        {ids.length < MAX && (
          <div className="relative max-w-md">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3">
              <Plus className="h-4 w-4 text-neon shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isLoading ? "…" : t("multi.add")}
                className="w-full bg-transparent py-2.5 text-sm focus:outline-none"
                aria-label={t("multi.add")}
              />
            </div>
            {results.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card shadow-lg max-h-72 overflow-y-auto">
                {results.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => add(c)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-secondary flex items-center gap-2"
                    >
                      <span className="truncate flex-1">{c.name}</span>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {c.countryInfo?.flag} {c.country}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {chosen.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">{t("multi.empty")}</p>
        ) : (
          <>
            <div className={`grid ${cols} gap-2 sm:gap-3`}>
              {chosen.map((c, i) => (
                <Tile
                  key={c.id}
                  channel={c}
                  audible={audible === i}
                  onSelect={() => setAudible(i)}
                  onRemove={() => remove(i)}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{t("multi.muteHint")}</p>
          </>
        )}
      </div>
    </div>
  );
}
