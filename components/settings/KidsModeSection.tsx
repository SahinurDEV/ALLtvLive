"use client";

import { useState } from "react";
import { Baby } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";

/** Kids mode toggle with an optional 4-digit PIN to turn it off. */
export function KidsModeSection() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [pin, setPin] = useState("");
  const [asking, setAsking] = useState(false);

  const clean = (v: string) => v.replace(/\D/g, "").slice(0, 4);

  const turnOn = () => {
    if (pin && pin.length !== 4) {
      toast.error("PIN must be 4 digits, or leave it empty");
      return;
    }
    updateSettings({ kidsMode: true, kidsPin: pin || null });
    setPin("");
    toast.success(pin ? "Kids mode on, locked with your PIN" : "Kids mode on");
  };

  const turnOff = () => {
    if (settings.kidsPin && pin !== settings.kidsPin) {
      toast.error("Wrong PIN");
      return;
    }
    updateSettings({ kidsMode: false, kidsPin: null });
    setPin("");
    setAsking(false);
    toast.success("Kids mode off");
  };

  return (
    <section>
      <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
        <Baby className="h-4 w-4 text-neon" />
        Kids mode
      </h3>
      <div className="px-3 py-2.5 rounded-lg border border-border/50 space-y-2">
        <p className="text-xs text-muted-foreground">
          Shows only Kids, Animation, Family and Education channels and hides your
          custom channels. The PIN is stored only on this device, so it is a simple
          lock, not a security control.
        </p>
        {!settings.kidsMode ? (
          <div className="flex flex-wrap gap-2">
            <Input
              value={pin}
              onChange={(e) => setPin(clean(e.target.value))}
              inputMode="numeric"
              placeholder="Optional 4-digit PIN"
              className="flex-1 min-w-0 basis-36"
              aria-label="Kids mode PIN"
            />
            <Button type="button" variant="neon" onClick={turnOn}>
              Turn on
            </Button>
          </div>
        ) : settings.kidsPin && !asking ? (
          <Button type="button" variant="outline" className="w-full" onClick={() => setAsking(true)}>
            Kids mode is on: enter PIN to turn off
          </Button>
        ) : (
          <div className="flex flex-wrap gap-2">
            {settings.kidsPin && (
              <Input
                value={pin}
                onChange={(e) => setPin(clean(e.target.value))}
                inputMode="numeric"
                type="password"
                placeholder="PIN"
                className="flex-1 min-w-0 basis-28"
                aria-label="Enter PIN"
              />
            )}
            <Button type="button" variant="outline" onClick={turnOff}>
              Turn off kids mode
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
