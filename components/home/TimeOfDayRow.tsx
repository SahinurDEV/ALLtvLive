"use client";

import { useEffect, useMemo, useState } from "react";
import { Sunrise, Sun, Sunset, Moon } from "lucide-react";
import { ChannelScrollRow } from "./ChannelScrollRow";
import { useAppStore } from "@/lib/store";
import { loadPopular } from "@/lib/history/watchHistory";
import { buildTaste, dayPart, timeOfDaySuggestions, type DayPart } from "@/lib/recommend";
import { useT, type MessageKey } from "@/lib/i18n";
import type { ChannelWithMeta } from "@/lib/types";

const ICONS: Record<DayPart, React.ReactNode> = {
  morning: <Sunrise className="h-5 w-5 text-amber-400" />,
  afternoon: <Sun className="h-5 w-5 text-yellow-400" />,
  evening: <Sunset className="h-5 w-5 text-orange-400" />,
  night: <Moon className="h-5 w-5 text-purple-400" />,
};

/** "Good morning: news to start your day" and similar, by local time. */
export function TimeOfDayRow({ allChannels }: { allChannels: ChannelWithMeta[] }) {
  const t = useT();
  const userCountry = useAppStore((s) => s.userCountry);
  const favorites = useAppStore((s) => s.favorites);
  const [hour, setHour] = useState<number | null>(null);

  useEffect(() => {
    setHour(new Date().getHours());
    const iv = setInterval(() => setHour(new Date().getHours()), 10 * 60_000);
    return () => clearInterval(iv);
  }, []);

  const channels = useMemo(() => {
    if (hour === null) return [];
    const taste = buildTaste(allChannels, loadPopular(), favorites);
    return timeOfDaySuggestions(allChannels, hour, { country: userCountry, taste, limit: 16 });
  }, [allChannels, hour, userCountry, favorites]);

  if (hour === null || channels.length < 3) return null;
  const part = dayPart(hour);

  return (
    <div data-testid="time-of-day-row">
      <ChannelScrollRow
        channels={channels}
        title={t(`home.daypart.${part}` as MessageKey)}
        icon={ICONS[part]}
      />
    </div>
  );
}
