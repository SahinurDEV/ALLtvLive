"use client";

import { useState } from "react";
import { Baby } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { hashPin, tryPin, pinCooldownLeft } from "@/lib/pin";

/** Kids mode toggle with an optional 4-digit PIN to turn it off. */
export function KidsModeSection() {
  const t = useT();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [pin, setPin] = useState("");
  const [asking, setAsking] = useState(false);
  // The kids PIN, or the parental PIN when only that one is set.
  const guardPin = settings.kidsPin || settings.parentalPin;

  const clean = (v: string) => v.replace(/\D/g, "").slice(0, 4);

  const turnOn = () => {
    if (pin && pin.length !== 4) {
      toast.error(t("kids.pinLength"));
      return;
    }
    updateSettings({ kidsMode: true, kidsPin: pin ? hashPin(pin) : settings.kidsPin });
    setPin("");
    toast.success(pin ? t("kids.onLocked") : t("kids.on"));
  };

  const turnOff = () => {
    if (guardPin) {
      const r = tryPin(guardPin, pin);
      if (r === "cooldown") {
        toast.error(t("pin.cooldown", { s: Math.ceil(pinCooldownLeft() / 1000) }));
        return;
      }
      if (r === "wrong") {
        toast.error(t("pin.wrong"));
        return;
      }
    }
    updateSettings({ kidsMode: false });
    setPin("");
    setAsking(false);
    toast.success(t("kids.off"));
  };

  return (
    <section>
      <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
        <Baby className="h-4 w-4 text-neon" />
        {t("kids.title")}
      </h3>
      <div className="px-3 py-2.5 rounded-lg border border-border/50 space-y-2">
        <p className="text-xs text-muted-foreground">{t("kids.hint")}</p>
        {!settings.kidsMode ? (
          <div className="flex flex-wrap gap-2">
            <Input
              value={pin}
              onChange={(e) => setPin(clean(e.target.value))}
              inputMode="numeric"
              placeholder={t("kids.optionalPin")}
              className="flex-1 min-w-0 basis-36"
              aria-label={t("kids.pinLabel")}
            />
            <Button type="button" variant="neon" onClick={turnOn}>
              {t("kids.turnOn")}
            </Button>
          </div>
        ) : guardPin && !asking ? (
          <Button type="button" variant="outline" className="w-full h-auto min-h-10 whitespace-normal" onClick={() => setAsking(true)}>
            {t("kids.askOff")}
          </Button>
        ) : (
          <div className="flex flex-wrap gap-2">
            {guardPin && (
              <Input
                value={pin}
                onChange={(e) => setPin(clean(e.target.value))}
                inputMode="numeric"
                type="password"
                placeholder="PIN"
                className="flex-1 min-w-0 basis-28"
                aria-label={t("pin.enter")}
              />
            )}
            <Button type="button" variant="outline" onClick={turnOff}>
              {t("kids.turnOff")}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
