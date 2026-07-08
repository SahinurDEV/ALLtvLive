"use client";

import { useCallback, useEffect, useState } from "react";
import { ScrollText, Loader2, RefreshCw, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuditEntry {
  action: string;
  actorIp: string;
  actorUa: string | null;
  meta: Record<string, unknown> | null;
  at: number;
}

interface AuditResponse {
  entries: AuditEntry[];
  total: number;
  byAction: Array<{ action: string; count: number }>;
  source: "db" | "fallback";
}

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function toneForAction(action: string): string {
  if (action.endsWith(".fail")) return "text-red-400";
  if (action.startsWith("admin.login")) return "text-sky-400";
  if (action.startsWith("featured")) return "text-neon";
  if (action.startsWith("broadcast")) return "text-yellow-400";
  if (action.startsWith("history")) return "text-purple-400";
  if (action.startsWith("report")) return "text-orange-400";
  return "text-foreground";
}

export function AdminAuditPanel() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionFilter, setActionFilter] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter) params.set("action", actionFilter);
      params.set("limit", "200");
      const res = await fetch(`/api/audit?${params.toString()}`);
      setData(res.ok ? await res.json() : null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [actionFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neon/10 border border-neon/30 flex items-center justify-center">
            <ScrollText className="h-4 w-4 text-neon" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Audit log</h3>
            <p className="text-[11px] text-muted-foreground">
              Every admin mutation is tracked — {data?.total ?? 0} records.
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

        <div className="mt-4 flex flex-wrap gap-1.5">
          <button
            onClick={() => setActionFilter(null)}
            className={`text-[11px] px-2 py-1 rounded-lg border transition-colors ${
              actionFilter === null
                ? "bg-neon/15 text-neon border-neon/40"
                : "bg-secondary/40 text-muted-foreground border-border/60 hover:text-foreground"
            }`}
          >
            All
          </button>
          {data?.byAction.slice(0, 12).map((b) => (
            <button
              key={b.action}
              onClick={() => setActionFilter(b.action)}
              className={`text-[10px] px-2 py-1 rounded-lg border transition-colors flex items-center gap-1.5 ${
                actionFilter === b.action
                  ? "bg-neon/15 text-neon border-neon/40"
                  : "bg-secondary/40 text-muted-foreground border-border/60 hover:text-foreground"
              }`}
            >
              <span>{b.action}</span>
              <span className="text-[9px] font-mono bg-secondary/70 rounded px-1">
                {b.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
        {loading && !data ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : data && data.entries.length > 0 ? (
          <ul className="divide-y divide-border/30">
            {data.entries.map((e, i) => (
              <li key={i} className="px-4 py-2.5 hover:bg-secondary/30 text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground font-mono w-32 shrink-0">
                    {formatDateTime(e.at)}
                  </span>
                  <span className={`font-semibold ${toneForAction(e.action)}`}>
                    {e.action}
                  </span>
                  <span className="ml-auto flex items-center gap-1 text-muted-foreground font-mono text-[11px]">
                    <Globe className="h-3 w-3" />
                    {e.actorIp}
                  </span>
                </div>
                {e.meta && Object.keys(e.meta).length > 0 && (
                  <pre className="mt-1 pl-32 text-[10px] text-muted-foreground/80 font-mono whitespace-pre-wrap break-words">
                    {JSON.stringify(e.meta)}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-10 text-center text-xs text-muted-foreground">
            No audit entries yet.
          </div>
        )}
      </div>
    </div>
  );
}
