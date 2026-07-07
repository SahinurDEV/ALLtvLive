"use client";

const HISTORY_KEY = "alltvlive-history";
const POPULAR_KEY = "alltvlive-popular";
const HISTORY_LIMIT = 12;

interface HistoryEntry {
  channelId: string;
  watchedAt: number;
}

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

export function recordWatch(channelId: string) {
  const now = Date.now();
  const existing = loadHistory().filter((e) => e.channelId !== channelId);
  const updated = [{ channelId, watchedAt: now }, ...existing].slice(0, HISTORY_LIMIT);
  saveHistory(updated);
  bumpPopular(channelId);
}

export function clearHistory() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(POPULAR_KEY);
  } catch {
    // ignore
  }
}

function loadPopular(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(POPULAR_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function bumpPopular(channelId: string) {
  const store = loadPopular();
  store[channelId] = (store[channelId] || 0) + 1;
  try {
    localStorage.setItem(POPULAR_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

export function getPopularChannelIds(limit = 12): string[] {
  const store = loadPopular();
  return Object.entries(store)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
}
