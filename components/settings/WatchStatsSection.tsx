"use client";

import { useEffect, useState } from "react";
import { BarChart3, Flame } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { computeStats, loadWatchTime, type WatchStats } from "@/lib/history/watchTime";
import { useLang, useT } from "@/lib/i18n";

function fmt(sec: number, t: ReturnType<typeof useT>) {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h > 0 ? t("stats.hm", { h, m }) : t("stats.m", { m });
}

/** This week's watch time, a daily bar chart, streak and top channels. */
export function WatchStatsSection() {
  const t = useT();
  const lang = useLang();
  const allChannels = useAppStore((s) => s.allChannels);
  const [stats, setStats] = useState<WatchStats | null>(null);

  useEffect(() => {
    setStats(computeStats(loadWatchTime()));
  }, []);

  if (!stats) return null;
  const max = Math.max(60, ...stats.days.map((d) => d.seconds));
  const name = (id: string) => allChannels.find((c) => c.id === id)?.name ?? id;
  const dayLabel = (k: string) =>
    new Date(`${k}T12:00:00`).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", { weekday: "short" });

  return (
    <section data-testid="watch-stats">
      <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-neon" />
        {t("stats.title")}
      </h3>
      <div className="px-3 py-3 rounded-lg border border-border/50 space-y-3">
        {stats.totalSeconds < 60 ? (
          <p className="text-xs text-muted-foreground">{t("stats.empty")}</p>
        ) : (
          <>
            <div className="flex items-end justify-between gap-2">
              <div>
                <div className="text-2xl font-bold text-neon">{fmt(stats.totalSeconds, t)}</div>
                <div className="text-xs text-muted-foreground">{t("stats.thisWeek")}</div>
              </div>
              {stats.streakDays > 1 && (
                <div className="flex items-center gap-1 text-xs text-orange-400">
                  <Flame className="h-3.5 w-3.5" />
                  {t("stats.streak", { n: stats.streakDays })}
                </div>
              )}
            </div>
            <div className="flex items-end gap-1.5 h-20" role="img" aria-label={t("stats.chart")}>
              {stats.days.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <div
                    className="w-full rounded-t bg-neon/70"
                    style={{ height: `${Math.max(2, (d.seconds / max) * 64)}px` }}
                    title={fmt(d.seconds, t)}
                  />
                  <span className="text-[9px] text-muted-foreground truncate max-w-full">{dayLabel(d.day)}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="text-[11px] font-medium mb-1">{t("stats.top")}</div>
              <ol className="space-y-1">
                {stats.top.map((c, i) => (
                  <li key={c.channelId} className="flex items-center justify-between text-xs gap-2">
                    <span className="truncate">
                      {i + 1}. {name(c.channelId)}
                    </span>
                    <span className="text-muted-foreground shrink-0">{fmt(c.seconds, t)}</span>
                  </li>
                ))}
              </ol>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
