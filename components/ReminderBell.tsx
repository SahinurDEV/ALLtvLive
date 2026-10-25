"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { toast } from "sonner";
import { hasReminder, toggleReminder, REMINDERS_EVENT } from "@/lib/reminders";
import { useT } from "@/lib/i18n";

/** Bell toggle for an upcoming programme. */
export function ReminderBell(props: { channelId: string; channelName: string; title: string; start: number }) {
  const t = useT();
  const [on, setOn] = useState(false);
  useEffect(() => {
    const sync = () => setOn(hasReminder(props.channelId, props.start));
    sync();
    window.addEventListener(REMINDERS_EVENT, sync);
    return () => window.removeEventListener(REMINDERS_EVENT, sync);
  }, [props.channelId, props.start]);
  if (props.start <= Date.now()) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        const set = toggleReminder(props);
        setOn(set);
        toast.success(set ? t("remind.set", { title: props.title }) : t("remind.removed"));
      }}
      aria-pressed={on}
      aria-label={on ? t("remind.cancel") : t("remind.me")}
      title={on ? t("remind.cancel") : t("remind.me")}
      className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${on ? "text-neon bg-neon/10" : "text-muted-foreground hover:text-foreground"}`}
      data-testid="reminder-bell"
    >
      {on ? <BellRing className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
    </button>
  );
}
