import { profileKey } from "@/lib/profiles";

const KEY = "alltvlive-watchtime";
const KEEP_DAYS = 35;

/** { "2026-10-25": { channelId: seconds } } */
export type WatchTime = Record<string, Record<string, number>>;

export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function loadWatchTime(): WatchTime {
  if (typeof window === "undefined") return {};
  try {
    const v = JSON.parse(localStorage.getItem(profileKey(KEY)) || "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

export function addWatchSeconds(channelId: string, seconds: number, now = new Date()) {
  const data = loadWatchTime();
  const k = dayKey(now);
  data[k] = data[k] || {};
  data[k][channelId] = (data[k][channelId] || 0) + seconds;
  const cutoff = dayKey(new Date(now.getTime() - KEEP_DAYS * 86400000));
  for (const d of Object.keys(data)) if (d < cutoff) delete data[d];
  try {
    localStorage.setItem(profileKey(KEY), JSON.stringify(data));
  } catch {
    // ignore
  }
}

export interface WatchStats {
  days: Array<{ day: string; seconds: number }>;
  totalSeconds: number;
  top: Array<{ channelId: string; seconds: number }>;
  streakDays: number;
}

/** Last 7 days (oldest first), totals and top channels. */
export function computeStats(data: WatchTime, now = new Date()): WatchStats {
  const days: Array<{ day: string; seconds: number }> = [];
  const perChannel: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const k = dayKey(new Date(now.getTime() - i * 86400000));
    const entry = data[k] || {};
    let sum = 0;
    for (const [id, s] of Object.entries(entry)) {
      sum += s;
      perChannel[id] = (perChannel[id] || 0) + s;
    }
    days.push({ day: k, seconds: sum });
  }
  let streak = 0;
  for (let i = 0; i < KEEP_DAYS; i++) {
    const k = dayKey(new Date(now.getTime() - i * 86400000));
    const total = Object.values(data[k] || {}).reduce((a, b) => a + b, 0);
    if (total >= 60) streak++;
    else if (i > 0) break;
  }
  const top = Object.entries(perChannel)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([channelId, seconds]) => ({ channelId, seconds }));
  return { days, totalSeconds: days.reduce((a, d) => a + d.seconds, 0), top, streakDays: streak };
}
