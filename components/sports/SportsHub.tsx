"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Trophy, ArrowLeft, Radio, Loader2 } from "lucide-react";
import { ReminderBell } from "@/components/ReminderBell";
import { useLang, useT } from "@/lib/i18n";
import { getPlaceholderLogo } from "@/lib/utils";
import type { SportsListing } from "@/lib/server/epg";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

/** Today's sports: live now first, then later today, with reminders. */
export function SportsHub() {
  const t = useT();
  const lang = useLang();
  const [country, setCountry] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/geo")
      .then((r) => r.json())
      .then((g) => setCountry(typeof g?.code === "string" ? g.code.slice(0, 2) : ""))
      .catch(() => setCountry(""));
  }, []);
  const { data, isLoading } = useSWR<{ ok: boolean; listings: SportsListing[] }>(
    country === null ? null : `/api/sports?country=${country}`,
    fetcher,
    { revalidateOnFocus: false }
  );
  const now = Date.now();
  const listings = data?.listings ?? [];
  const live = listings.filter((l) => l.start <= now && l.stop > now);
  const later = listings.filter((l) => l.start > now);
  const time = (ms: number) =>
    new Date(ms).toLocaleTimeString(lang === "bn" ? "bn-BD" : [], { hour: "2-digit", minute: "2-digit" });

  const row = (l: SportsListing, isLive: boolean) => (
    <li key={`${l.channelId}-${l.start}`} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/40 bg-card">
      <Link href={`/${encodeURIComponent(l.channelId)}`} className="flex items-center gap-3 min-w-0 flex-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={l.logo || getPlaceholderLogo(l.channelName)} alt="" className="w-10 h-10 rounded bg-secondary object-contain p-0.5 shrink-0" loading="lazy" />
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{l.title}</div>
          <div className="text-xs text-muted-foreground truncate">
            {isLive ? (
              <span className="text-red-400 font-semibold inline-flex items-center gap-1">
                <Radio className="h-3 w-3" /> {t("sports.liveNow")}
              </span>
            ) : (
              `${time(l.start)}–${time(l.stop)}`
            )}{" "}
            · {l.channelName}
          </div>
        </div>
      </Link>
      {!isLive && <ReminderBell channelId={l.channelId} channelName={l.channelName} title={l.title} start={l.start} />}
    </li>
  );

  return (
    <main className="min-h-screen max-w-3xl mx-auto px-3 sm:px-6 py-4 pb-16">
      <Link href="/watch" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="h-4 w-4" /> {t("sports.back")}
      </Link>
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Trophy className="h-6 w-6 text-neon" /> {t("sports.title")}
      </h1>
      <p className="text-sm text-muted-foreground mb-5">{t("sports.subtitle")}</p>
      {(isLoading || country === null) && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("sports.loading")}
        </p>
      )}
      {data && listings.length === 0 && <p className="text-sm text-muted-foreground">{t("sports.empty")}</p>}
      {live.length > 0 && (
        <section className="mb-6" data-testid="sports-live">
          <h2 className="font-semibold mb-2">{t("sports.liveNow")}</h2>
          <ul className="space-y-2">{live.map((l) => row(l, true))}</ul>
        </section>
      )}
      {later.length > 0 && (
        <section data-testid="sports-later">
          <h2 className="font-semibold mb-2">{t("sports.later")}</h2>
          <ul className="space-y-2">{later.map((l) => row(l, false))}</ul>
        </section>
      )}
    </main>
  );
}
