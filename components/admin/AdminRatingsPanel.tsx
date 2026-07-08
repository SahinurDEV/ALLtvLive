"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ThumbsUp, ThumbsDown, Loader2, RefreshCw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChannelRating {
  channelId: string;
  channelName: string;
  up: number;
  down: number;
  total: number;
  score: number;
}

interface RatingsResponse {
  channels: ChannelRating[];
  source: "db" | "fallback";
}

type Sort = "score" | "total" | "up" | "down";

const SORT_OPTIONS: Array<{ id: Sort; label: string }> = [
  { id: "score", label: "Score (up − down)" },
  { id: "total", label: "Most-rated" },
  { id: "up", label: "Most up-votes" },
  { id: "down", label: "Most down-votes" },
];

export function AdminRatingsPanel() {
  const [data, setData] = useState<RatingsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<Sort>("score");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ratings?admin=1");
      setData(res.ok ? await res.json() : null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data.channels].sort((a, b) => (b[sort] || 0) - (a[sort] || 0));
  }, [data, sort]);

  const totalUp = data?.channels.reduce((s, c) => s + c.up, 0) ?? 0;
  const totalDown = data?.channels.reduce((s, c) => s + c.down, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neon/10 border border-neon/30 flex items-center justify-center">
            <Trophy className="h-4 w-4 text-neon" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Channel ratings</h3>
            <p className="text-[11px] text-muted-foreground">
              Aggregated up/down votes across all viewers · one vote per IP per channel
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={load}
            disabled={loading}
            className="ml-auto gap-1.5"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-5">
          <StatCard
            label="Channels rated"
            value={data?.channels.length ?? 0}
            tone="neutral"
          />
          <StatCard
            label="Total up-votes"
            value={totalUp}
            tone="neon"
            icon={<ThumbsUp className="h-4 w-4 text-neon" />}
          />
          <StatCard
            label="Total down-votes"
            value={totalDown}
            tone="red"
            icon={<ThumbsDown className="h-4 w-4 text-red-400" />}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {SORT_OPTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSort(s.id)}
            className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition-colors ${
              sort === s.id
                ? "bg-neon/15 text-neon border-neon/40"
                : "bg-secondary/40 text-muted-foreground border-border/60 hover:text-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
        {loading && !data ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : sorted.length > 0 ? (
          <ul className="divide-y divide-border/30">
            {sorted.map((c) => {
              const ratio = c.total > 0 ? c.up / c.total : 0;
              return (
                <li
                  key={c.channelId}
                  className="px-4 py-2.5 hover:bg-secondary/30 flex items-center gap-3 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground truncate">{c.channelName}</p>
                    <code className="text-[10px] text-muted-foreground truncate">
                      {c.channelId}
                    </code>
                  </div>
                  <div className="w-24 h-1.5 rounded-full bg-red-500/40 overflow-hidden shrink-0">
                    <div
                      className="h-full bg-neon"
                      style={{ width: `${Math.round(ratio * 100)}%` }}
                    />
                  </div>
                  <div className="shrink-0 flex items-center gap-3 text-[11px] font-mono">
                    <span className="inline-flex items-center gap-1 text-neon">
                      <ThumbsUp className="h-3 w-3" />
                      {c.up}
                    </span>
                    <span className="inline-flex items-center gap-1 text-red-400">
                      <ThumbsDown className="h-3 w-3" />
                      {c.down}
                    </span>
                    <span
                      className={`w-10 text-right ${
                        c.score >= 0 ? "text-foreground" : "text-red-400"
                      }`}
                    >
                      {c.score >= 0 ? "+" : ""}
                      {c.score}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="py-10 text-center text-xs text-muted-foreground">
            No ratings yet.
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: "neon" | "red" | "neutral";
  icon?: React.ReactNode;
}) {
  const border =
    tone === "neon"
      ? "border-neon/30"
      : tone === "red"
        ? "border-red-500/30"
        : "border-border/60";
  return (
    <div className={`rounded-xl border ${border} bg-background/40 p-3`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-lg font-bold text-foreground">{value}</div>
    </div>
  );
}
