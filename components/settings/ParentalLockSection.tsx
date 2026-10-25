"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { useT } from "@/lib/i18n";

export const LOCKABLE_CATEGORIES = [
  "movies",
  "series",
  "entertainment",
  "news",
  "sports",
  "music",
  "religious",
  "comedy",
  "documentary",
  "lifestyle",
  "general",
  "shop",
];

/** Lock chosen categories behind a 4-digit PIN (stored only on this device). */
export function ParentalLockSection() {
  const t = useT();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [pin, setPin] = useState("");
  const [editing, setEditing] = useState(!settings.parentalPin);
  const clean = (v: string) => v.replace(/\D/g, "").slice(0, 4);

  const unlockEditing = () => {
    if (pin !== settings.parentalPin) {
      toast.error(t("lock.wrong"));
      return;
    }
    setEditing(true);
    setPin("");
  };

  const savePin = () => {
    if (pin.length !== 4) {
      toast.error(t("lock.pinLength"));
      return;
    }
    updateSettings({ parentalPin: pin });
    setPin("");
    toast.success(t("lock.pinSaved"));
  };

  const removeLock = () => {
    updateSettings({ parentalPin: null, lockedCategories: [] });
    toast.success(t("lock.removed"));
  };

  const toggle = (cat: string) => {
    const cur = settings.lockedCategories;
    updateSettings({ lockedCategories: cur.includes(cat) ? cur.filter((c) => c !== cat) : [...cur, cat] });
  };

  const locked = !!settings.parentalPin && !editing;

  return (
    <section data-testid="parental-lock">
      <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
        <Lock className="h-4 w-4 text-neon" />
        {t("lock.section")}
      </h3>
      <div className="px-3 py-2.5 rounded-lg border border-border/50 space-y-2">
        <p className="text-xs text-muted-foreground">{t("lock.hint")}</p>
        {locked ? (
          <div className="flex flex-wrap gap-2">
            <Input
              value={pin}
              onChange={(e) => setPin(clean(e.target.value))}
              inputMode="numeric"
              type="password"
              placeholder="PIN"
              aria-label={t("lock.pin")}
              className="flex-1 min-w-0 basis-28"
            />
            <Button type="button" variant="outline" onClick={unlockEditing}>
              {t("lock.change")}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Input
                value={pin}
                onChange={(e) => setPin(clean(e.target.value))}
                inputMode="numeric"
                type="password"
                placeholder={settings.parentalPin ? t("lock.newPin") : t("lock.setPin")}
                aria-label={t("lock.setPin")}
                className="flex-1 min-w-0 basis-28"
              />
              <Button type="button" variant="neon" onClick={savePin}>
                {t("lock.save")}
              </Button>
            </div>
            {settings.parentalPin && (
              <>
                <p className="text-[11px] font-medium pt-1">{t("lock.categories")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {LOCKABLE_CATEGORIES.map((c) => {
                    const on = settings.lockedCategories.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggle(c)}
                        className={`px-2.5 h-7 rounded-full text-[11px] border capitalize ${
                          on ? "bg-neon/20 border-neon/60 text-neon" : "border-border/50 text-muted-foreground"
                        }`}
                      >
                        {on ? "🔒 " : ""}
                        {c}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
                    {t("lock.done")}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="text-red-400" onClick={removeLock}>
                    {t("lock.remove")}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
