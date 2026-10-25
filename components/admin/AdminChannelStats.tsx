"use client";

import { useEffect, useState } from "react";
import { Flag, Tv } from "lucide-react";

interface PlayRow { channelId: string; name: string; plays: number; viewers: number }
interface ReportRow { channelId: string; name: string; reports: number; open: number }
interface Resp { plays: PlayRow[]; reports: ReportRow[]; totalPlays: number }

/** Admin: top channels by plays and channels with the most problem reports. */
export function AdminChannelStats({ rangeMs, reloadKey }: { rangeMs: number; reloadKey: number }) {
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`/api/history/channels?rangeMs=${rangeMs}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setData(d))
      .catch(() => alive && setData(null));
    return () => { alive = false; };
  }, [rangeMs, reloadKey]);

  const maxPlays = data?.plays[0]?.plays || 1;
  const maxReports = data?.reports[0]?.reports || 1;

  return (
    <div className="grid gap-4 md:grid-cols-2" data-testid="admin-channel-stats">
      <div className="rounded-2xl border border-border/60 bg-card/60 p-5 min-w-0">
        <div className="flex items-center gap-2 mb-3">
          <Tv className="h-4 w-4 text-neon" />
          <h3 className="font-bold text-sm">Top channels by plays</h3>
          <span className="ml-auto font-mono text-xs text-muted-foreground">{data?.totalPlays ?? 0} plays</span>
        </div>
        {!data?.plays.length ? (
          <p className="text-xs text-muted-foreground">No plays in this range.</p>
        ) : (
          <ol className="space-y-2">
            {data.plays.map((p, i) => (
              <li key={p.channelId} className="text-xs">
                <div className="flex gap-2 min-w-0">
                  <span className="w-5 text-muted-foreground">{i + 1}.</span>
                  <span className="truncate flex-1">{p.name}</span>
                  <span className="font-mono">{p.plays}</span>
                  <span className="font-mono text-muted-foreground w-20 whitespace-nowrap text-right">{p.viewers} viewers</span>
                </div>
                <div className="h-1 mt-1 rounded bg-secondary/50">
                  <div className="h-1 rounded bg-neon" style={{ width: `${(p.plays / maxPlays) * 100}%` }} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
      <div className="rounded-2xl border border-border/60 bg-card/60 p-5 min-w-0">
        <div className="flex items-center gap-2 mb-3">
          <Flag className="h-4 w-4 text-red-400" />
          <h3 className="font-bold text-sm">Most reported channels</h3>
        </div>
        {!data?.reports.length ? (
          <p className="text-xs text-muted-foreground">No reports in this range.</p>
        ) : (
          <ol className="space-y-2">
            {data.reports.map((r, i) => (
              <li key={r.channelId} className="text-xs">
                <div className="flex gap-2 min-w-0">
                  <span className="w-5 text-muted-foreground">{i + 1}.</span>
                  <span className="truncate flex-1">{r.name}</span>
                  <span className="font-mono">{r.reports}</span>
                  <span className="font-mono text-amber-400 w-16 whitespace-nowrap text-right">{r.open} open</span>
                </div>
                <div className="h-1 mt-1 rounded bg-secondary/50">
                  <div className="h-1 rounded bg-red-400" style={{ width: `${(r.reports / maxReports) * 100}%` }} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
