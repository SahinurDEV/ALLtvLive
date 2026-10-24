"use client";

import { Languages } from "lucide-react";
import { LANGS, setLang, useLang, useT } from "@/lib/i18n";

export function LanguagePicker() {
  const lang = useLang();
  const t = useT();
  return (
    <section>
      <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
        <Languages className="h-4 w-4 text-neon" />
        {t("settings.language")}
      </h3>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("settings.language")}>
        {LANGS.map((l) => (
          <button
            key={l.code}
            type="button"
            role="radio"
            aria-checked={lang === l.code}
            onClick={() => setLang(l.code)}
            className={`px-3 py-2.5 rounded-lg border text-sm transition-colors ${
              lang === l.code
                ? "border-neon/50 bg-neon/10 text-neon"
                : "border-border/50 text-muted-foreground hover:bg-secondary/50"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
    </section>
  );
}
