"use client";

import { useT } from "@/lib/i18n";

/** Heading and intro for country/category pages, in the viewer's language. */
export function LandingHeading({ kind, name, count }: { kind: "country" | "category"; name: string; count: number }) {
  const t = useT();
  return (
    <header className="space-y-2">
      <h1 className="text-2xl sm:text-3xl font-bold break-words">
        {t(kind === "country" ? "landing.countryTitle" : "landing.categoryTitle", { name })}
      </h1>
      <p className="text-sm text-muted-foreground">{t("landing.intro", { count, name })}</p>
    </header>
  );
}
