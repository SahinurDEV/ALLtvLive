"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Database,
  RefreshCw,
  Search,
  Trash2,
  Globe,
  Radio,
  Filter,
  Loader2,
  X,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface HistoryEntry {
  ip: string;
  channelId: string;
  channelName: string;
  country: string | null;
  category: string | null;
  userAgent: string | null;
  referrer: string | null;
  playedAt: number;
}

interface TopChannel {
  channelId: string;
  channelName: string;
  count: number;
  lastPlayedAt: number;
}

interface TopIp {
  ip: string;
  count: number;
  lastSeenAt: number;
  distinctChannels: number;
}

interface HistoryResponse {
  entries: HistoryEntry[];
  total: number;
  uniqueIps: number;
  uniqueChannels: number;
  topChannels: TopChannel[];
  topIps: TopIp[];
  source: "db" | "fallback";
  error?: string;
}

const RANGE_OPTIONS = [
  { label: "1 hour", ms: 60 * 60 * 1000 },
  { label: "24 hours", ms: 24 * 60 * 60 * 1000 },
  { label: "7 days", ms: 7 * 24 * 60 * 60 * 1000 },
  { label: "30 days", ms: 30 * 24 * 60 * 60 * 1000 },
  { label: "All time", ms: 0 },
];

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return `${Math.max(1, Math.floor(diff / 1000))}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function formatDateTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseUA(ua: string | null): string {
  if (!ua) return "Unknown";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Mac OS X/i.test(ua)) return "macOS";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Linux/i.test(ua)) return "Linux";
  return "Other";
}

export function AdminHistoryPanel() {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [ipFilter, setIpFilter] = useState("");
  const [ipFilterInput, setIpFilterInput] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [rangeMs, setRangeMs] = useState<number>(24 * 60 * 60 * 1000);
  const [limit, setLimit] = useState(100);
  const [purging, setPurging] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (ipFilter) params.set("ip", ipFilter);
    if (channelFilter) params.set("channelId", channelFilter);
    if (rangeMs > 0) params.set("since", String(Date.now() - rangeMs));
    params.set("limit", String(limit));
    try {
      const res = await fetch(`/api/history?${params.toString()}`);
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as HistoryResponse;
      setData(json);
    } catch {
      toast.error("Couldn't load history — check the API/database.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [ipFilter, channelFilter, rangeMs, limit]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredEntries = useMemo(() => data?.entries || [], [data]);

  const purgeOld = useCallback(
    async (daysOld: number) => {
      if (!confirm(`Delete all history older than ${daysOld} days? This cannot be undone.`)) {
        return;
      }
      setPurging(true);
      try {
        const olderThan = Date.now() - daysOld * 86_400_000;
        const res = await fetch(`/api/history?olderThan=${olderThan}`, {
          method: "DELETE",
        });
        const json = await res.json();
        if (json.ok) {
          toast.success(`Deleted ${json.deleted} old records`);
          load();
        } else {
          toast.error(json.error || "Delete failed");
        }
      } catch {
        toast.error("Network error");
      } finally {
        setPurging(false);
      }
    },
    [load]
  );

  const purgeIp = useCallback(
    async (ip: string) => {
      if (!confirm(`Delete all history for IP ${ip}? This cannot be undone.`)) return;
      setPurging(true);
      try {
        const res = await fetch(`/api/history?ip=${encodeURIComponent(ip)}`, {
          method: "DELETE",
        });
        const json = await res.json();
        if (json.ok) {
          toast.success(`Deleted ${json.deleted} records for ${ip}`);
          load();
        } else {
          toast.error(json.error || "Delete failed");
        }
      } catch {
        toast.error("Network error");
      } finally {
        setPurging(false);
      }
    },
    [load]
  );

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-neon/10 border border-neon/30 flex items-center justify-center">
              <Activity className="h-5 w-5 text-neon" />
            </div>
            <div>
              <h2 className="font-bold">Viewing history</h2>
              <p className="text-[11px] text-muted-foreground">
                Server-recorded plays with IP, channel, and timestamp.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full border ${
                data?.source === "db"
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                  : "bg-yellow-500/10 text-yellow-300 border-yellow-500/30"
              }`}
            >
              <Database className="h-3 w-3" />
              {data?.source === "db" ? "MongoDB live" : "Fallback"}
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={load}
              disabled={loading}
              className="gap-1.5"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <StatMini
            label="Records"
            value={data?.total ?? 0}
            icon={<Activity className="h-3.5 w-3.5 text-neon" />}
          />
          <StatMini
            label="Unique IPs"
            value={data?.uniqueIps ?? 0}
            icon={<Globe className="h-3.5 w-3.5 text-sky-400" />}
          />
          <StatMini
            label="Unique channels"
            value={data?.uniqueChannels ?? 0}
            icon={<Radio className="h-3.5 w-3.5 text-yellow-400" />}
          />
          <StatMini
            label="Time range"
            value={
              RANGE_OPTIONS.find((r) => r.ms === rangeMs)?.label || "custom"
            }
            icon={<Filter className="h-3.5 w-3.5 text-purple-400" />}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-border/60 bg-card/40 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={ipFilterInput}
              onChange={(e) => setIpFilterInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setIpFilter(ipFilterInput.trim());
              }}
              placeholder="Filter by IP (press Enter)"
              className="w-full h-9 pl-9 pr-8 text-xs rounded-lg bg-background border border-border/60 focus:border-neon/60 focus:outline-none"
            />
            {ipFilterInput && (
              <button
                onClick={() => {
                  setIpFilterInput("");
                  setIpFilter("");
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear IP filter"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            {RANGE_OPTIONS.map((r) => (
              <button
                key={r.label}
                onClick={() => setRangeMs(r.ms)}
                className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition-colors ${
                  rangeMs === r.ms
                    ? "bg-neon/15 text-neon border-neon/40"
                    : "bg-secondary/40 text-muted-foreground border-border/60 hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="h-9 px-2 text-xs rounded-lg bg-background border border-border/60 focus:border-neon/60 focus:outline-none"
          >
            {[50, 100, 200, 500].map((n) => (
              <option key={n} value={n}>
                {n} rows
              </option>
            ))}
          </select>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => purgeOld(30)}
            disabled={purging}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Purge {"> "}30 days
          </Button>
        </div>

        {channelFilter && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Channel filter:
            </span>
            <span className="text-xs text-neon">{channelFilter}</span>
            <button
              onClick={() => setChannelFilter("")}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Clear channel filter"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Top channels + Top IPs */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Radio className="h-4 w-4 text-yellow-400" />
            <h3 className="font-semibold text-sm">Top channels</h3>
            <span className="ml-auto text-[10px] text-muted-foreground">
              in range
            </span>
          </div>
          {loading ? (
            <div className="py-6 flex justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : data && data.topChannels.length > 0 ? (
            <ul className="space-y-1.5">
              {data.topChannels.map((c) => (
                <li
                  key={c.channelId}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary/40 group"
                >
                  <button
                    onClick={() => setChannelFilter(c.channelId)}
                    className="flex-1 flex items-center gap-2 min-w-0 text-left"
                    title="Filter table by this channel"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
                    <span className="text-xs text-foreground truncate">
                      {c.channelName}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatRelative(c.lastPlayedAt)}
                    </span>
                  </button>
                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-300 shrink-0">
                    {c.count}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No plays recorded in this range yet.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-4 w-4 text-sky-400" />
            <h3 className="font-semibold text-sm">Top viewers by IP</h3>
            <span className="ml-auto text-[10px] text-muted-foreground">
              in range
            </span>
          </div>
          {loading ? (
            <div className="py-6 flex justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : data && data.topIps.length > 0 ? (
            <ul className="space-y-1.5">
              {data.topIps.map((ip) => (
                <li
                  key={ip.ip}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary/40"
                >
                  <button
                    onClick={() => {
                      setIpFilter(ip.ip);
                      setIpFilterInput(ip.ip);
                    }}
                    className="flex-1 flex items-center gap-2 min-w-0 text-left"
                    title="Filter table by this IP"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                    <span className="text-xs font-mono text-foreground truncate">
                      {ip.ip}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {ip.distinctChannels} ch · {formatRelative(ip.lastSeenAt)}
                    </span>
                  </button>
                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 shrink-0">
                    {ip.count}
                  </span>
                  <button
                    onClick={() => purgeIp(ip.ip)}
                    disabled={purging}
                    className="text-muted-foreground hover:text-red-400 shrink-0"
                    aria-label={`Purge history for ${ip.ip}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No IP activity recorded in this range yet.
            </p>
          )}
        </div>
      </div>

      {/* Entries table */}
      <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
          <User className="h-4 w-4 text-neon" />
          <h3 className="font-semibold text-sm">Recent plays</h3>
          <span className="ml-auto text-[10px] text-muted-foreground">
            {filteredEntries.length} shown · newest first
          </span>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEntries.length > 0 ? (
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">When</th>
                  <th className="text-left px-3 py-2 font-semibold">IP</th>
                  <th className="text-left px-3 py-2 font-semibold">Channel</th>
                  <th className="text-left px-3 py-2 font-semibold hidden sm:table-cell">
                    Country
                  </th>
                  <th className="text-left px-3 py-2 font-semibold hidden md:table-cell">
                    Device
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((e, i) => (
                  <tr
                    key={`${e.ip}-${e.channelId}-${e.playedAt}-${i}`}
                    className="border-b border-border/30 hover:bg-secondary/30"
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-foreground">
                        {formatDateTime(e.playedAt)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {formatRelative(e.playedAt)}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setIpFilter(e.ip);
                          setIpFilterInput(e.ip);
                        }}
                        className="font-mono text-foreground hover:text-neon"
                        title="Filter by this IP"
                      >
                        {e.ip}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => setChannelFilter(e.channelId)}
                        className="text-foreground hover:text-neon text-left"
                        title="Filter by this channel"
                      >
                        {e.channelName}
                      </button>
                      {e.category && (
                        <div className="text-[10px] text-muted-foreground">
                          {e.category}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap hidden sm:table-cell text-muted-foreground">
                      {e.country || "—"}
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                        {parseUA(e.userAgent)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-10 text-center text-xs text-muted-foreground">
              No history recorded yet.
              {data?.source === "fallback" &&
                " Check MONGODB_URI is set."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatMini({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-lg font-bold text-foreground">{value}</div>
    </div>
  );
}
