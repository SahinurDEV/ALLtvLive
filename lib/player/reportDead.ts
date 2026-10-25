"use client";

const REPORTED_KEY = "alltvlive-reported-dead";
const TTL_MS = 24 * 60 * 60 * 1000;

function load(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(REPORTED_KEY) || "{}");
  } catch {
    return {};
  }
}

/** True if this browser already reported the channel in the last 24h. */
export function wasReportedRecently(channelId: string): boolean {
  if (typeof window === "undefined") return false;
  const at = load()[channelId];
  return !!at && Date.now() - at < TTL_MS;
}

export type ReportResult = "ok" | "rate_limited" | "failed";

/** One-tap "dead channel" report, using the same /api/reports endpoint as the report dialog. */
export async function reportDeadChannel(channelId: string, channelName: string): Promise<ReportResult> {
  try {
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channelId, channelName, reason: "broken", note: "One-tap report from the player" }),
    });
    if (res.status === 429) return "rate_limited";
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) return "failed";
    const all = load();
    const now = Date.now();
    for (const [k, v] of Object.entries(all)) if (now - v > TTL_MS) delete all[k];
    all[channelId] = now;
    try {
      localStorage.setItem(REPORTED_KEY, JSON.stringify(all));
    } catch {
      // ignore
    }
    return "ok";
  } catch {
    return "failed";
  }
}
