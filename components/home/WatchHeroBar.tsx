"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, Globe2, Tv2, Users, Sparkles, Clock } from "lucide-react";
import type { ChannelWithMeta } from "@/lib/types";

interface Props {
  totalChannels: number;
  totalCountries: number;
  userCountryName?: string | null;
  userCountryFlag?: string | null;
  currentChannel: ChannelWithMeta | null;
  primaryChannel?: ChannelWithMeta | null;
  featuredCount: number;
}

const TICKER_MESSAGES = [
  "Live global TV — no signups, no subscriptions.",
  "Press ? in the player to see keyboard shortcuts.",
  "Tap the Sparkles icon to enter theater mode.",
  "Try the Sleep timer inside the player · goodnight.",
  "Screenshots save the current frame as a PNG.",
  "Ctrl+K works too — search across every stream.",
];

function greeting(hour: number): string {
  if (hour < 5) return "Late-night viewing";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Late-night viewing";
}

export function WatchHeroBar({
  totalChannels,
  totalCountries,
  userCountryName,
  userCountryFlag,
  currentChannel,
  primaryChannel,
  featuredCount,
}: Props) {
  const [now, setNow] = useState<Date | null>(null);
  const [tickerIdx, setTickerIdx] = useState(0);

  useEffect(() => {
    setNow(new Date());
    const timeIv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timeIv);
  }, []);

  useEffect(() => {
    const iv = setInterval(
      () => setTickerIdx((i) => (i + 1) % TICKER_MESSAGES.length),
      4500
    );
    return () => clearInterval(iv);
  }, []);

  const hour = now?.getHours() ?? 12;
  const timeLabel = useMemo(() => {
    if (!now) return "--:--";
    return now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }, [now]);
  const dateLabel = useMemo(() => {
    if (!now) return "";
    return now.toLocaleDateString([], {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }, [now]);

  const primaryLabel = primaryChannel
    ? `Featured pick: ${primaryChannel.name}`
    : featuredCount > 0
      ? `${featuredCount} curated featured channel${featuredCount === 1 ? "" : "s"}`
      : null;

  return (
    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-neon/25 bg-gradient-to-br from-neon/[0.06] via-background/60 to-fuchsia-500/[0.05] backdrop-blur">
      {/* Animated backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-neon/10 blur-3xl motion-reduce:hidden animate-pulse" />
        <div className="absolute -bottom-20 right-1/4 w-72 h-72 rounded-full bg-fuchsia-500/10 blur-3xl motion-reduce:hidden animate-pulse [animation-delay:1.5s]" />
      </div>

      <div className="relative flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3">
        {/* Left: greeting + status */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="hidden sm:flex flex-col items-center justify-center w-11 h-11 rounded-xl bg-black/40 border border-neon/25 shrink-0">
            <Clock className="h-3 w-3 text-neon/70" />
            <span className="font-mono text-[10px] leading-none mt-0.5 text-neon">
              {timeLabel}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-70 motion-reduce:hidden" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <span className="text-[10px] uppercase tracking-widest font-bold text-red-400">
                Live now
              </span>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                · {dateLabel}
              </span>
            </div>
            <p className="text-sm sm:text-base font-semibold truncate">
              {greeting(hour)}
              {userCountryFlag ? ` ${userCountryFlag}` : ""}
              {userCountryName ? ` — streaming from ${userCountryName}` : ""}
            </p>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
              {currentChannel
                ? `Now playing · ${currentChannel.name}`
                : "Choose a channel below to start watching."}
            </p>
          </div>
        </div>

        {/* Center: stats */}
        <div className="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-hidden sm:justify-center">
          <StatPill
            icon={<Tv2 className="h-3 w-3 text-neon" />}
            value={totalChannels.toLocaleString()}
            label="channels"
          />
          <StatPill
            icon={<Globe2 className="h-3 w-3 text-neon" />}
            value={totalCountries.toLocaleString()}
            label="countries"
          />
          <StatPill
            icon={<Users className="h-3 w-3 text-neon" />}
            value="24/7"
            label="live feeds"
          />
          {primaryLabel && (
            <StatPill
              icon={<Sparkles className="h-3 w-3 text-yellow-400" />}
              value=""
              label={primaryLabel}
              tone="yellow"
            />
          )}
        </div>

        {/* Right: ticker */}
        <div className="hidden md:flex items-center gap-2 min-w-[240px] max-w-[320px] px-3 py-1.5 rounded-full bg-background/60 border border-border/50">
          <Radio className="h-3 w-3 text-neon shrink-0" />
          <div className="relative flex-1 h-4 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.span
                key={tickerIdx}
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -12, opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 text-[10px] text-muted-foreground truncate leading-4"
              >
                {TICKER_MESSAGES[tickerIdx]}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatPill({
  icon,
  value,
  label,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  tone?: "neutral" | "yellow";
}) {
  const cls =
    tone === "yellow"
      ? "border-yellow-500/40 bg-yellow-500/[0.06]"
      : "border-border/50 bg-background/50";
  return (
    <div
      className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${cls}`}
    >
      {icon}
      {value && (
        <span className="text-xs font-mono font-bold tabular-nums">{value}</span>
      )}
      <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">
        {label}
      </span>
    </div>
  );
}
