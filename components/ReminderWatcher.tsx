"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { dueReminders, loadReminders, saveReminders } from "@/lib/reminders";
import { useT } from "@/lib/i18n";

/** Fires program reminders as a local notification (if allowed) and an in-app toast. */
export function ReminderWatcher() {
  const t = useT();
  const openPlayer = useAppStore((s) => s.openPlayer);
  const allChannels = useAppStore((s) => s.allChannels);

  useEffect(() => {
    const check = () => {
      const list = loadReminders();
      const due = dueReminders(list, Date.now());
      if (due.length === 0) return;
      for (const r of due) {
        const watch = () => {
          const ch = allChannels.find((c) => c.id === r.channelId);
          if (ch) openPlayer(ch);
          else window.location.href = `/${encodeURIComponent(r.channelId)}`;
        };
        const body = t("remind.startingBody", { title: r.title, channel: r.channelName });
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          try {
            const n = new Notification(t("remind.startingTitle"), { body, tag: r.id, icon: "/icon-192.png" });
            n.onclick = () => {
              window.focus();
              watch();
            };
          } catch {
            // some mobile browsers only allow notifications from a service worker
          }
        }
        toast(body, { duration: 15000, action: { label: t("remind.watch"), onClick: watch } });
      }
      const ids = new Set(due.map((d) => d.id));
      saveReminders(list.map((r) => (ids.has(r.id) ? { ...r, fired: true } : r)));
    };
    check();
    const iv = setInterval(check, 30_000);
    return () => clearInterval(iv);
  }, [allChannels, openPlayer, t]);

  return null;
}
