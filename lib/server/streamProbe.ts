import type { Db } from "mongodb";

export const STREAM_PROBE_COLLECTION = "streamProbe";
export const CRON_STATE_COLLECTION = "cronState";

/** A channel is hidden after this many failed checks in a row. */
export const FAILS_TO_HIDE = 3;

export interface ProbeDoc {
  _id: string; // channel id
  consecutiveFailures: number;
  lastCheckedAt: number;
  lastOkAt: number | null;
  lastStatus: number | string;
}

export type ProbeOutcome = "ok" | "dead" | "unknown";

/**
 * Classify a probe result. Geo-blocks and auth refusals (401/403/451) and
 * rate limits are "unknown": the stream may work for viewers elsewhere, so
 * they never count towards hiding a channel.
 */
export function classify(status: number | "timeout" | "network"): ProbeOutcome {
  if (status === "timeout" || status === "network") return "dead";
  if (status >= 200 && status < 400) return "ok";
  if (status === 401 || status === 403 || status === 429 || status === 451) return "unknown";
  return "dead";
}

export async function probeUrl(url: string, timeoutMs = 6000): Promise<number | "timeout" | "network"> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (ALLtvLive stream check)", range: "bytes=0-2047" },
      cache: "no-store",
    });
    try {
      await res.body?.cancel();
    } catch {
      // ignore
    }
    return res.status;
  } catch (err) {
    return (err as Error)?.name === "AbortError" ? "timeout" : "network";
  } finally {
    clearTimeout(timer);
  }
}

/** Channel ids hidden because they keep failing. */
export async function getHiddenChannelIds(db: Db): Promise<string[]> {
  const docs = await db
    .collection<ProbeDoc>(STREAM_PROBE_COLLECTION)
    .find({ consecutiveFailures: { $gte: FAILS_TO_HIDE } }, { projection: { _id: 1 } })
    .toArray();
  return docs.map((d) => d._id);
}
