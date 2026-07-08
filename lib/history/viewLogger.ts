"use client";

const sentThisSession = new Set<string>();

interface LogViewInput {
  channelId: string;
  channelName: string;
  country?: string | null;
  category?: string | null;
}

export function logViewEvent(input: LogViewInput) {
  if (typeof window === "undefined") return;
  const key = input.channelId;
  if (sentThisSession.has(key)) return;
  sentThisSession.add(key);

  const body = JSON.stringify({
    channelId: input.channelId,
    channelName: input.channelName,
    country: input.country ?? null,
    category: input.category ?? null,
  });

  try {
    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      const ok = navigator.sendBeacon("/api/history", blob);
      if (ok) return;
    }
  } catch {
    // fall through to fetch
  }

  fetch("/api/history", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    sentThisSession.delete(key);
  });
}
