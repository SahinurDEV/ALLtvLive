"use client";

import { useState } from "react";
import useSWR from "swr";
import { CalendarClock, ChevronDown } from "lucide-react";
import type { ChannelWithMeta } from "@/lib/types";
import { useT } from "@/lib/i18n";

interface Programme {
  title: string;
  start: number;
  stop: number;
  desc: string | null;
}

// Countries epg.pw publishes a free XMLTV file for (see lib/server/epg.ts).
const SUPPORTED = new Set([
  "AU", "BR", "CA", "CN", "DE", "FR", "GB", "HK", "ID", "IN",
  "JP", "MY", "NZ", "PH", "RU", "SG", "TW", "US", "VN", "ZA",
]);

const fmt = (t: number) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/** Now / next programme from free guide data; renders nothing when missing. */
export function NowNext({ channel }: { channel: ChannelWithMeta }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  // iptv-org uses "UK" where XMLTV/ISO uses "GB".
  const raw = (channel.country || "").toUpperCase();
  const country = raw === "UK" ? "GB" : raw;
  const names = [channel.name, ...(channel.alt_names || [])].filter(Boolean).slice(0, 4);
  const key =
    SUPPORTED.has(country) && !channel.id.startsWith("custom-")
      ? `/api/epg?country=${country}&${names.map((n) => `name=${encodeURIComponent(n)}`).join("&")}`
      : null;
  const { data } = useSWR<{ ok: boolean; programmes: Programme[] }>(
    key,
    (u: string) => fetch(u).then((r) => r.json()),
    { revalidateOnFocus: false, dedupingInterval: 10 * 60_000 }
  );
  const list = data?.ok ? data.programmes : [];
  if (list.length === 0) return null;

  const now = Date.now();
  const current = list.find((p) => p.start <= now && p.stop > now);
  const upcoming = list.filter((p) => p.start > now);
  const pct = current ? Math.min(100, Math.max(0, ((now - current.start) / (current.stop - current.start)) * 100)) : 0;

  return (
    <div className="mt-2 rounded-lg border border-border/60 bg-background/40 p-2.5 text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-2 text-left"
        aria-expanded={open}
      >
        <CalendarClock className="h-3.5 w-3.5 text-neon shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          {current && (
            <p className="truncate">
              <span className="text-neon font-semibold">{t("guide.now")}</span>{" "}
              <span className="text-foreground">{current.title}</span>{" "}
              <span className="text-muted-foreground">{fmt(current.start)}–{fmt(current.stop)}</span>
            </p>
          )}
          {current && (
            <div className="h-0.5 rounded bg-border mt-1 overflow-hidden">
              <div className="h-full bg-neon" style={{ width: `${pct}%` }} />
            </div>
          )}
          {upcoming[0] && (
            <p className="truncate mt-1 text-muted-foreground">
              <span className="font-semibold">{t("guide.next")}</span> {fmt(upcoming[0].start)} {upcoming[0].title}
            </p>
          )}
        </div>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="mt-2 space-y-1.5 border-t border-border/50 pt-2">
          {list.map((p) => (
            <li key={p.start} className="flex gap-2">
              <span className="text-muted-foreground font-mono shrink-0">{fmt(p.start)}</span>
              <span className="min-w-0">
                <span className="text-foreground">{p.title}</span>
                {p.desc && <span className="block text-muted-foreground line-clamp-2">{p.desc}</span>}
              </span>
            </li>
          ))}
          <li className="text-[10px] text-muted-foreground pt-1">Guide data: epg.pw (free XMLTV), matched by channel name</li>
        </ul>
      )}
    </div>
  );
}
