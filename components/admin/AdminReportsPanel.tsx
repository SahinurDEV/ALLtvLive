"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Flag,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Undo2,
  Globe,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ReportEntry {
  id: string;
  ip: string;
  channelId: string;
  channelName: string;
  reason: string;
  note: string | null;
  status: "open" | "resolved" | "dismissed";
  createdAt: number;
  resolvedAt: number | null;
}

interface ChannelAgg {
  channelId: string;
  channelName: string;
  count: number;
  lastReportedAt: number;
}

interface ReportsResponse {
  entries: ReportEntry[];
  byChannel: ChannelAgg[];
  counts: { open: number; resolved: number; dismissed: number };
  source: "db" | "fallback";
}

const REASON_LABEL: Record<string, string> = {
  broken: "Broken stream",
  wrong_content: "Wrong content",
  inappropriate: "Inappropriate",
  buffering: "Buffering",
  other: "Other",
};

const STATUS_TABS: Array<{ id: "open" | "resolved" | "dismissed"; label: string }> = [
  { id: "open", label: "Open" },
  { id: "resolved", label: "Resolved" },
  { id: "dismissed", label: "Dismissed" },
];

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminReportsPanel() {
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [status, setStatus] = useState<"open" | "resolved" | "dismissed">("open");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?status=${status}`);
      setData(res.ok ? await res.json() : null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = async (id: string, next: "resolved" | "dismissed" | "open") => {
    setBusyId(id);
    try {
      const res = await fetch("/api/reports", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status: next }),
      });
      if (!res.ok) throw new Error("failed");
      toast.success(
        next === "resolved"
          ? "Marked resolved"
          : next === "dismissed"
            ? "Dismissed"
            : "Reopened"
      );
      await load();
    } catch {
      toast.error("Update failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
            <Flag className="h-4 w-4 text-orange-400" />
          </div>
          <div>
            <h3 className="font-bold text-sm">User reports</h3>
            <p className="text-[11px] text-muted-foreground">
              Streams flagged by viewers · resolve or dismiss to keep the queue clean
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
          <CountCard
            label="Open"
            value={data?.counts.open ?? 0}
            tone="orange"
            icon={<Flag className="h-4 w-4 text-orange-400" />}
          />
          <CountCard
            label="Resolved"
            value={data?.counts.resolved ?? 0}
            tone="emerald"
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
          />
          <CountCard
            label="Dismissed"
            value={data?.counts.dismissed ?? 0}
            tone="muted"
            icon={<XCircle className="h-4 w-4 text-muted-foreground" />}
          />
        </div>
      </div>

      {status === "open" && data?.byChannel && data.byChannel.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">
            Most-reported channels
          </p>
          <div className="flex flex-wrap gap-1.5">
            {data.byChannel.slice(0, 12).map((c) => (
              <span
                key={c.channelId}
                className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-300"
                title={`${c.count} open reports · last ${formatDateTime(c.lastReportedAt)}`}
              >
                <span className="truncate max-w-[160px]">{c.channelName}</span>
                <span className="text-[9px] font-mono bg-orange-500/20 rounded px-1">
                  {c.count}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setStatus(t.id)}
            className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition-colors ${
              status === t.id
                ? "bg-neon/15 text-neon border-neon/40"
                : "bg-secondary/40 text-muted-foreground border-border/60 hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
        <span className="text-[10px] text-muted-foreground ml-auto">
          {data?.entries.length ?? 0} shown
        </span>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
        {loading && !data ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : data && data.entries.length > 0 ? (
          <ul className="divide-y divide-border/30">
            {data.entries.map((r) => (
              <li key={r.id} className="p-4 hover:bg-secondary/20">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm truncate">
                        {r.channelName}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-300 border border-orange-500/30">
                        {REASON_LABEL[r.reason] || r.reason}
                      </span>
                      <code className="text-[10px] text-muted-foreground truncate max-w-[160px]">
                        {r.channelId}
                      </code>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1">
                      <span>{formatDateTime(r.createdAt)}</span>
                      <span className="inline-flex items-center gap-1">
                        <Globe className="h-2.5 w-2.5" /> {r.ip}
                      </span>
                    </div>
                    {r.note && (
                      <div className="mt-2 rounded-lg bg-background/60 border border-border/40 px-3 py-2 text-xs text-foreground/90 flex items-start gap-2">
                        <MessageSquare className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                        <span className="whitespace-pre-wrap break-words">{r.note}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {r.status !== "resolved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => patch(r.id, "resolved")}
                        disabled={busyId === r.id}
                        className="gap-1 h-7 text-[11px]"
                      >
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        Resolve
                      </Button>
                    )}
                    {r.status !== "dismissed" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => patch(r.id, "dismissed")}
                        disabled={busyId === r.id}
                        className="gap-1 h-7 text-[11px]"
                      >
                        <XCircle className="h-3 w-3" />
                        Dismiss
                      </Button>
                    )}
                    {r.status !== "open" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => patch(r.id, "open")}
                        disabled={busyId === r.id}
                        className="gap-1 h-7 text-[11px]"
                      >
                        <Undo2 className="h-3 w-3" />
                        Reopen
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-10 text-center text-xs text-muted-foreground">
            No {status} reports.
          </div>
        )}
      </div>
    </div>
  );
}

function CountCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: "orange" | "emerald" | "muted";
  icon: React.ReactNode;
}) {
  const border =
    tone === "orange"
      ? "border-orange-500/30"
      : tone === "emerald"
        ? "border-emerald-500/30"
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
