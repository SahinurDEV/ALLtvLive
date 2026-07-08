"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Loader2,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface HealthChannel {
  channelId: string;
  channelName: string;
  successes: number;
  failures: number;
  failureRate: number;
  status: "healthy" | "degraded" | "failing";
  lastSuccessAt: number | null;
  lastFailureAt: number | null;
  updatedAt: number;
}

interface HealthResponse {
  channels: HealthChannel[];
  summary: { healthy: number; degraded: number; failing: number };
  source: "db" | "fallback";
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "failing", label: "Failing" },
  { id: "degraded", label: "Degraded+" },
] as const;

function formatRelative(ts: number | null): string {
  if (!ts) return "never";
  const diff = Date.now() - ts;
  if (diff < 60_000) return `${Math.max(1, Math.floor(diff / 1000))}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export function AdminHealthPanel() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("failing");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/health?filter=${filter}`);
      setData(res.ok ? await res.json() : null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
    const iv = setInterval(load, 15_000);
    return () => clearInterval(iv);
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neon/10 border border-neon/30 flex items-center justify-center">
            <Activity className="h-4 w-4 text-neon" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Stream health</h3>
            <p className="text-[11px] text-muted-foreground">
              Aggregated across all clients — refreshes every 15s
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

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <SummaryCard
            label="Healthy"
            value={data?.summary.healthy ?? 0}
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
            tone="emerald"
          />
          <SummaryCard
            label="Degraded"
            value={data?.summary.degraded ?? 0}
            icon={<AlertTriangle className="h-4 w-4 text-yellow-400" />}
            tone="yellow"
          />
          <SummaryCard
            label="Failing"
            value={data?.summary.failing ?? 0}
            icon={<XCircle className="h-4 w-4 text-red-400" />}
            tone="red"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition-colors ${
              filter === f.id
                ? "bg-neon/15 text-neon border-neon/40"
                : "bg-secondary/40 text-muted-foreground border-border/60 hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Channels */}
      <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
          <Radio className="h-4 w-4 text-neon" />
          <h4 className="font-semibold text-sm">Channels</h4>
          <span className="ml-auto text-[10px] text-muted-foreground">
            {data?.channels.length ?? 0} shown
          </span>
        </div>
        {loading && !data ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : data && data.channels.length > 0 ? (
          <ul>
            {data.channels.map((c) => (
              <li
                key={c.channelId}
                className="flex items-center gap-3 px-4 py-2.5 border-b border-border/30 last:border-b-0 hover:bg-secondary/30"
              >
                <StatusDot status={c.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{c.channelName}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    ok {formatRelative(c.lastSuccessAt)} · fail {formatRelative(c.lastFailureAt)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] font-mono text-foreground">
                    {(c.failureRate * 100).toFixed(0)}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {c.successes} ok · {c.failures} fail
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-10 text-center text-xs text-muted-foreground">
            {filter === "failing" ? "No failing streams." : "No health data yet."}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: HealthChannel["status"] }) {
  const cls =
    status === "healthy"
      ? "bg-emerald-500"
      : status === "degraded"
        ? "bg-yellow-400"
        : "bg-red-500";
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      {status !== "healthy" && (
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cls} opacity-60`} />
      )}
      <span className={`relative inline-flex rounded-full h-2 w-2 ${cls}`} />
    </span>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "emerald" | "yellow" | "red";
}) {
  const border =
    tone === "emerald"
      ? "border-emerald-500/30"
      : tone === "yellow"
        ? "border-yellow-500/30"
        : "border-red-500/30";
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
