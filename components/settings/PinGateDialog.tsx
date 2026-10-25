"use client";

import { useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import { useT } from "@/lib/i18n";

/** Asks for the parental PIN before a channel in a locked category plays. */
export function PinGateDialog() {
  const t = useT();
  const channel = useAppStore((s) => s.pinGateChannel);
  const unlock = useAppStore((s) => s.unlockParental);
  const cancel = useAppStore((s) => s.cancelPinGate);
  const [pin, setPin] = useState("");
  const [wrong, setWrong] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPin("");
    setWrong(false);
    if (channel) setTimeout(() => inputRef.current?.focus(), 50);
  }, [channel]);

  if (!channel) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlock(pin)) {
      setWrong(true);
      setPin("");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={cancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-gate-title"
      data-testid="pin-gate"
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xs rounded-xl bg-card border border-border/60 p-4 space-y-3"
      >
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-neon" />
          <h2 id="pin-gate-title" className="font-semibold text-sm">
            {t("lock.title")}
          </h2>
        </div>
        <p className="text-xs text-muted-foreground">{t("lock.body", { name: channel.name })}</p>
        <Input
          ref={inputRef}
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, "").slice(0, 4));
            setWrong(false);
          }}
          inputMode="numeric"
          type="password"
          autoComplete="off"
          placeholder="PIN"
          aria-label={t("lock.pin")}
          aria-invalid={wrong}
        />
        {wrong && <p className="text-xs text-red-400">{t("lock.wrong")}</p>}
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="ghost" onClick={cancel}>
            {t("lock.cancel")}
          </Button>
          <Button type="submit" variant="neon" disabled={pin.length !== 4}>
            {t("lock.unlock")}
          </Button>
        </div>
      </form>
    </div>
  );
}
