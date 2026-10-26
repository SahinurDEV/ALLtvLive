"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { useT } from "@/lib/i18n";

/** Route-level error boundary: one bad response can't blank the whole site. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4" role="alert">
      <div className="max-w-md text-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-yellow-500 mx-auto" aria-hidden />
        <h1 className="text-2xl font-bold">{t("err.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("err.body")}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="min-h-11 rounded-lg bg-neon text-black font-semibold text-sm px-4">
            {t("err.retry")}
          </button>
          <Link href="/watch" className="min-h-11 inline-flex items-center rounded-lg border border-border text-sm px-4">
            {t("nf.browse")}
          </Link>
        </div>
      </div>
    </div>
  );
}
