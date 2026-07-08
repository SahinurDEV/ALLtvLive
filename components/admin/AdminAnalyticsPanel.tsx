"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Globe,
  Loader2,
  RefreshCw,
  Calendar,
  MapPin,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeatmapResponse {
  grid: number[][];
  total: number;
  rangeMs?: number;
  peak?: { dow: number; hour: number; value: number };
  source: "db" | "fallback";
}

interface CountryRow {
  country: string;
  countryCode: string | null;
  plays: number;
  ips: number;
}
interface CityRow {
  city: string;
  country: string;
  countryCode: string | null;
  plays: number;
  ips: number;
}
interface GeoResponse {
  countries: CountryRow[];
  cities: CityRow[];
  totalPlays: number;
  unresolvedIps: number;
  source: "db" | "fallback";
}

const RANGE_OPTIONS = [
  { label: "24h", ms: 24 * 60 * 60 * 1000 },
  { label: "7d", ms: 7 * 24 * 60 * 60 * 1000 },
  { label: "30d", ms: 30 * 24 * 60 * 60 * 1000 },
  { label: "90d", ms: 90 * 24 * 60 * 60 * 1000 },
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function AdminAnalyticsPanel() {
  const [heatmap, setHeatmap] = useState<HeatmapResponse | null>(null);
  const [geo, setGeo] = useState<GeoResponse | null>(null);
  const [rangeMs, setRangeMs] = useState(7 * 24 * 60 * 60 * 1000);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [hRes, gRes] = await Promise.all([
        fetch(`/api/history/heatmap?rangeMs=${rangeMs}`),
        fetch(`/api/history/geo?rangeMs=${rangeMs}`),
      ]);
      setHeatmap(hRes.ok ? await hRes.json() : null);
      setGeo(gRes.ok ? await gRes.json() : null);
    } catch {
      setHeatmap(null);
      setGeo(null);
    } finally {
      setLoading(false);
    }
  }, [rangeMs]);

  useEffect(() => {
    load();
  }, [load]);

  const maxCell = useMemo(() => {
    if (!heatmap) return 0;
    let max = 0;
    for (const row of heatmap.grid) for (const v of row) if (v > max) max = v;
    return max;
  }, [heatmap]);

  const peakCountry = geo?.countries?.[0];
  const peakLabel = heatmap?.peak
    ? `${DAY_LABELS[heatmap.peak.dow]} · ${String(heatmap.peak.hour).padStart(2, "0")}:00 UTC · ${heatmap.peak.value} plays`
    : "—";

  return (
    <div className="space-y-6">
      {/* Range switcher */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Range</span>
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

      {/* Peak-time heatmap */}
      <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-neon/10 border border-neon/30 flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-neon" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Peak-time heatmap</h3>
            <p className="text-[11px] text-muted-foreground">
              Plays bucketed by day-of-week × hour (UTC). Peak: {peakLabel}
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Total
            </p>
            <p className="font-mono text-sm text-foreground">{heatmap?.total ?? 0}</p>
          </div>
        </div>

        {loading && !heatmap ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="text-[10px] border-separate border-spacing-[2px]">
              <thead>
                <tr>
                  <th></th>
                  {Array.from({ length: 24 }, (_, h) => (
                    <th
                      key={h}
                      className="text-muted-foreground font-normal w-6 text-center"
                    >
                      {h % 3 === 0 ? h : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(heatmap?.grid || Array.from({ length: 7 }, () => new Array(24).fill(0))).map(
                  (row, dow) => (
                    <tr key={dow}>
                      <td className="text-muted-foreground pr-2 font-medium">
                        {DAY_LABELS[dow]}
                      </td>
                      {row.map((val, h) => {
                        const intensity = maxCell > 0 ? val / maxCell : 0;
                        const bg =
                          val === 0
                            ? "rgba(255,255,255,0.03)"
                            : `rgba(0, 255, 157, ${0.15 + intensity * 0.75})`;
                        return (
                          <td
                            key={h}
                            title={`${DAY_LABELS[dow]} ${String(h).padStart(2, "0")}:00 UTC — ${val} plays`}
                            className="w-6 h-6 rounded"
                            style={{ background: bg }}
                          />
                        );
                      })}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Geo dashboard */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center">
              <Globe className="h-4 w-4 text-sky-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Countries</h3>
              <p className="text-[11px] text-muted-foreground">
                Plays by resolved IP country · {geo?.totalPlays ?? 0} total
              </p>
            </div>
          </div>
          {loading && !geo ? (
            <div className="py-6 flex justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : geo && geo.countries.length > 0 ? (
            <>
              <ul className="space-y-1.5">
                {geo.countries.slice(0, 12).map((c) => {
                  const pct =
                    geo.totalPlays > 0 ? Math.min(100, (c.plays / geo.totalPlays) * 100) : 0;
                  return (
                    <li key={c.country} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-16 truncate">
                          {c.countryCode ? `${c.countryCode} ` : ""}
                          {c.country}
                        </span>
                        <div className="flex-1 h-2 bg-secondary/50 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="font-mono text-muted-foreground text-[10px] w-10 text-right">
                          {c.plays}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground w-8 text-right">
                          {c.ips} ip
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {peakCountry && (
                <div className="mt-4 pt-3 border-t border-border/40 text-[11px] text-muted-foreground">
                  Top viewer country: <span className="text-foreground font-semibold">{peakCountry.country}</span>
                  {geo.unresolvedIps > 0 && (
                    <span className="ml-2 text-yellow-400/80">
                      · {geo.unresolvedIps} IPs pending resolution
                    </span>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No geo data yet. Plays are resolved gradually — refresh in a minute.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Cities</h3>
              <p className="text-[11px] text-muted-foreground">
                Where your viewers are located, top 30
              </p>
            </div>
          </div>
          {geo && geo.cities.length > 0 ? (
            <ul className="space-y-1 max-h-72 overflow-y-auto pr-1">
              {geo.cities.map((c) => (
                <li
                  key={`${c.country}-${c.city}`}
                  className="text-xs flex items-center gap-2 py-1 border-b border-border/30 last:border-0"
                >
                  <MapPin className="h-3 w-3 text-purple-400/60 shrink-0" />
                  <span className="text-foreground truncate">{c.city}</span>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {c.country}
                  </span>
                  <span className="ml-auto font-mono text-[10px] text-purple-300">
                    {c.plays}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Users className="h-2.5 w-2.5" />
                    {c.ips}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No city data yet.
            </p>
          )}
        </div>
      </div>

      <div className="text-[10px] text-muted-foreground flex items-center gap-2">
        <Calendar className="h-3 w-3" />
        Data source: {heatmap?.source === "db" && geo?.source === "db" ? "MongoDB live" : "Fallback"}
      </div>
    </div>
  );
}
