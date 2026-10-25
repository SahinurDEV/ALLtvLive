import { profileKey } from "./profiles";

export interface Reminder {
  id: string; // channelId::start
  channelId: string;
  channelName: string;
  title: string;
  start: number;
  fired?: boolean;
}

const KEY = "alltvlive-reminders";
export const REMINDERS_EVENT = "alltvlive-reminders-changed";

export function loadReminders(): Reminder[] {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(localStorage.getItem(profileKey(KEY)) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function saveReminders(list: Reminder[]) {
  try {
    const cutoff = Date.now() - 6 * 60 * 60 * 1000;
    localStorage.setItem(profileKey(KEY), JSON.stringify(list.filter((r) => r.start > cutoff).slice(-100)));
    window.dispatchEvent(new Event(REMINDERS_EVENT));
  } catch {
    // ignore
  }
}

export const reminderId = (channelId: string, start: number) => `${channelId}::${start}`;

export function hasReminder(channelId: string, start: number): boolean {
  return loadReminders().some((r) => r.id === reminderId(channelId, start));
}

/** Toggle a reminder; returns true when it is now set. Asks for notification permission once. */
export function toggleReminder(r: Omit<Reminder, "id" | "fired">): boolean {
  const id = reminderId(r.channelId, r.start);
  const list = loadReminders();
  if (list.some((x) => x.id === id)) {
    saveReminders(list.filter((x) => x.id !== id));
    return false;
  }
  saveReminders([...list, { ...r, id }]);
  if (typeof Notification !== "undefined" && Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
  return true;
}

/** Reminders due now (starting within the next minute) that haven't fired yet. */
export function dueReminders(list: Reminder[], now: number): Reminder[] {
  return list.filter((r) => !r.fired && r.start - now <= 60_000 && now - r.start < 30 * 60_000);
}
