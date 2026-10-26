"use client";

import Link from "next/link";
import { Tv } from "lucide-react";
import { useT } from "@/lib/i18n";

export function NotFoundBody() {
  const t = useT();
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-neon/10 flex items-center justify-center">
          <Tv className="h-7 w-7 text-neon" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold">{t("nf.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("nf.body")}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/watch" className="rounded-lg bg-neon text-black font-semibold text-sm px-4 py-2.5 hover:opacity-90 transition-opacity">
            {t("nf.browse")}
          </Link>
          <Link href="/" className="rounded-lg border border-border text-sm px-4 py-2.5 hover:bg-secondary transition-colors">
            {t("nf.home")}
          </Link>
        </div>
      </div>
    </div>
  );
}
