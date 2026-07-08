"use client";

import { motion } from "framer-motion";
import {
  Newspaper,
  Trophy,
  Film,
  Music2,
  Baby,
  BookOpen,
  CloudSun,
  Rocket,
  Sparkles,
} from "lucide-react";
import type { ChannelWithMeta } from "@/lib/types";
import { useAppStore } from "@/lib/store";

interface Props {
  allChannels: ChannelWithMeta[];
}

interface TileDef {
  id: string;
  label: string;
  match: (cat: string[]) => boolean;
  gradient: string;
  glow: string;
  icon: React.ReactNode;
  filterId: string;
}

const TILES: TileDef[] = [
  {
    id: "news",
    label: "News",
    filterId: "news",
    match: (cats) => cats.some((c) => c.toLowerCase().includes("news")),
    gradient: "from-red-500/25 via-red-500/5 to-transparent",
    glow: "hover:shadow-[0_0_30px_rgba(239,68,68,0.35)]",
    icon: <Newspaper className="h-5 w-5" />,
  },
  {
    id: "sports",
    label: "Sports",
    filterId: "sports",
    match: (cats) => cats.some((c) => c.toLowerCase().includes("sport")),
    gradient: "from-emerald-500/25 via-emerald-500/5 to-transparent",
    glow: "hover:shadow-[0_0_30px_rgba(16,185,129,0.35)]",
    icon: <Trophy className="h-5 w-5" />,
  },
  {
    id: "movies",
    label: "Movies",
    filterId: "movies",
    match: (cats) =>
      cats.some((c) => {
        const l = c.toLowerCase();
        return l.includes("movie") || l.includes("film");
      }),
    gradient: "from-fuchsia-500/25 via-fuchsia-500/5 to-transparent",
    glow: "hover:shadow-[0_0_30px_rgba(217,70,239,0.35)]",
    icon: <Film className="h-5 w-5" />,
  },
  {
    id: "music",
    label: "Music",
    filterId: "music",
    match: (cats) => cats.some((c) => c.toLowerCase().includes("music")),
    gradient: "from-blue-500/25 via-blue-500/5 to-transparent",
    glow: "hover:shadow-[0_0_30px_rgba(59,130,246,0.35)]",
    icon: <Music2 className="h-5 w-5" />,
  },
  {
    id: "kids",
    label: "Kids",
    filterId: "kids",
    match: (cats) => cats.some((c) => {
      const l = c.toLowerCase();
      return l.includes("kids") || l.includes("family");
    }),
    gradient: "from-orange-500/25 via-orange-500/5 to-transparent",
    glow: "hover:shadow-[0_0_30px_rgba(249,115,22,0.35)]",
    icon: <Baby className="h-5 w-5" />,
  },
  {
    id: "documentary",
    label: "Docs",
    filterId: "documentary",
    match: (cats) =>
      cats.some((c) => {
        const l = c.toLowerCase();
        return l.includes("documentary") || l.includes("education");
      }),
    gradient: "from-amber-500/25 via-amber-500/5 to-transparent",
    glow: "hover:shadow-[0_0_30px_rgba(245,158,11,0.35)]",
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    id: "weather",
    label: "Weather",
    filterId: "weather",
    match: (cats) => cats.some((c) => c.toLowerCase().includes("weather")),
    gradient: "from-sky-500/25 via-sky-500/5 to-transparent",
    glow: "hover:shadow-[0_0_30px_rgba(14,165,233,0.35)]",
    icon: <CloudSun className="h-5 w-5" />,
  },
  {
    id: "space",
    label: "Science",
    filterId: "science",
    match: (cats) =>
      cats.some((c) => {
        const l = c.toLowerCase();
        return l.includes("science") || l.includes("technology");
      }),
    gradient: "from-violet-500/25 via-violet-500/5 to-transparent",
    glow: "hover:shadow-[0_0_30px_rgba(139,92,246,0.35)]",
    icon: <Rocket className="h-5 w-5" />,
  },
];

export function DiscoverCategoryTiles({ allChannels }: Props) {
  const setCategoryFilter = useAppStore((s) => s.setCategoryFilter);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const filters = useAppStore((s) => s.filters);

  // Count matches for each tile — done cheaply on a slice of channels
  const counts = new Map<string, number>();
  for (const ch of allChannels) {
    const cats = ch.categories || [];
    for (const tile of TILES) {
      if (tile.match(cats)) {
        counts.set(tile.id, (counts.get(tile.id) || 0) + 1);
      }
    }
  }

  const handleClick = (tile: TileDef) => {
    const isActive = filters.categories.includes(tile.filterId);
    setCategoryFilter(isActive ? [] : [tile.filterId]);
    if (!isActive) setActiveView("categories");
  };

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-neon" />
        <h2 className="text-sm sm:text-base font-bold tracking-tight">
          Discover by mood
        </h2>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground hidden sm:inline">
          One tap to a whole genre
        </span>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-2 sm:gap-3">
        {TILES.map((tile, i) => {
          const count = counts.get(tile.id) || 0;
          const isActive = filters.categories.includes(tile.filterId);
          return (
            <motion.button
              key={tile.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.35 }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleClick(tile)}
              disabled={count === 0}
              className={`group relative overflow-hidden rounded-xl border transition-all text-left p-2.5 sm:p-3 ${
                isActive
                  ? "border-neon/60 bg-neon/[0.08] shadow-[0_0_25px_rgba(0,255,157,0.25)]"
                  : `border-border/40 bg-card/40 ${tile.glow} disabled:opacity-40 disabled:hover:shadow-none`
              }`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${tile.gradient} opacity-70 group-hover:opacity-100 transition-opacity motion-reduce:transition-none`}
              />
              <div className="relative flex flex-col items-start gap-1.5 sm:gap-2">
                <div
                  className={`inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-black/40 border border-white/10 ${
                    isActive ? "text-neon" : "text-white"
                  }`}
                >
                  {tile.icon}
                </div>
                <div>
                  <p className="text-[11px] sm:text-xs font-bold leading-none">
                    {tile.label}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">
                    {count > 0 ? `${count.toLocaleString()} live` : "—"}
                  </p>
                </div>
              </div>
              {isActive && (
                <span className="absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-neon text-black">
                  ON
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
