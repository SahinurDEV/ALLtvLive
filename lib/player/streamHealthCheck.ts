"use client";

export type HealthStatus = "online" | "offline" | "unknown";

interface HealthEntry {
  status: HealthStatus;
  checkedAt: number;
}

const STORAGE_KEY = "alltvlive-stream-health";
const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function readStore(): Record<string, HealthEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, HealthEntry>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // storage full / disabled — silently ignore
  }
}

export function getCachedHealth(channelId: string): HealthStatus {
  const store = readStore();
  const entry = store[channelId];
  if (!entry) return "unknown";
  if (Date.now() - entry.checkedAt > TTL_MS) return "unknown";
  return entry.status;
}

export function setHealth(channelId: string, status: HealthStatus) {
  const store = readStore();
  store[channelId] = { status, checkedAt: Date.now() };
  writeStore(store);
}

const sentServer = new Map<string, number>();
const SERVER_DEDUP_MS = 30_000;

function reportToServer(channelId: string, channelName: string, ok: boolean) {
  if (typeof window === "undefined") return;
  const key = `${channelId}:${ok ? "s" : "f"}`;
  const last = sentServer.get(key) || 0;
  if (Date.now() - last < SERVER_DEDUP_MS) return;
  sentServer.set(key, Date.now());

  const body = JSON.stringify({
    channelId,
    channelName,
    result: ok ? "success" : "failure",
  });
  try {
    if (typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon("/api/health", new Blob([body], { type: "application/json" }));
      return;
    }
  } catch {
    // fall through
  }
  fetch("/api/health", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

/**
 * Report the outcome of the last playback attempt. Playing = online.
 * A final failure across all sources = offline. Anything else stays unknown.
 */
export function reportPlaybackResult(channelId: string, ok: boolean, channelName?: string) {
  setHealth(channelId, ok ? "online" : "offline");
  if (channelName) reportToServer(channelId, channelName, ok);
}

export function getAllOfflineIds(): string[] {
  const store = readStore();
  const now = Date.now();
  const ids: string[] = [];
  for (const [id, entry] of Object.entries(store)) {
    if (entry.status === "offline" && now - entry.checkedAt <= TTL_MS) {
      ids.push(id);
    }
  }
  return ids;
}

export function clearHealthCache() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
