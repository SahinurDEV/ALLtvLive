import type { Db } from "mongodb";
import { RATINGS_COLLECTION, STREAM_HEALTH_COLLECTION } from "@/lib/db/mongo";
import { STREAM_PROBE_COLLECTION, type ProbeDoc } from "./streamProbe";

export const CHANNEL_SEEN_COLLECTION = "channelSeen";
export const NEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export type Reliability = "good" | "poor";

export interface ChannelInsights {
  reliability: Record<string, Reliability>;
  /** % of thumbs-up, only for channels with at least 3 votes */
  rating: Record<string, number>;
  /** channels first seen in the catalog in the last 14 days, newest first */
  newIds: string[];
}

/** Reliability from viewer playback reports, overridden by the daily probe. */
export function reliabilityFrom(
  health: Array<{ _id: string; successes: number; failures: number }>,
  probes: Array<Pick<ProbeDoc, "_id" | "consecutiveFailures" | "lastOkAt">>
): Record<string, Reliability> {
  const out: Record<string, Reliability> = {};
  for (const h of health) {
    const total = (h.successes || 0) + (h.failures || 0);
    if (total < 5) continue;
    const rate = (h.successes || 0) / total;
    if (rate >= 0.8) out[h._id] = "good";
    else if (rate <= 0.4) out[h._id] = "poor";
  }
  for (const p of probes) {
    if (p.consecutiveFailures >= 1) out[p._id] = "poor";
    else if (p.lastOkAt && out[p._id] !== "poor") out[p._id] = "good";
  }
  return out;
}

export async function getInsights(db: Db): Promise<ChannelInsights> {
  const [health, probes, votes, seen] = await Promise.all([
    db
      .collection<{ _id: string; successes: number; failures: number }>(STREAM_HEALTH_COLLECTION)
      .find({}, { projection: { successes: 1, failures: 1 } })
      .toArray(),
    db
      .collection<ProbeDoc>(STREAM_PROBE_COLLECTION)
      .find({}, { projection: { consecutiveFailures: 1, lastOkAt: 1 } })
      .toArray(),
    db
      .collection(RATINGS_COLLECTION)
      .aggregate<{ _id: string; up: number; total: number }>([
        {
          $group: {
            _id: "$channelId",
            up: { $sum: { $cond: [{ $eq: ["$vote", "up"] }, 1, 0] } },
            total: { $sum: 1 },
          },
        },
        { $match: { total: { $gte: 3 } } },
      ])
      .toArray(),
    db
      .collection<{ _id: string; firstSeen: number }>(CHANNEL_SEEN_COLLECTION)
      .find({ firstSeen: { $gte: Date.now() - NEW_WINDOW_MS } })
      .sort({ firstSeen: -1 })
      .limit(60)
      .toArray(),
  ]);
  const rating: Record<string, number> = {};
  for (const v of votes) rating[v._id] = Math.round((v.up / v.total) * 100);
  return { reliability: reliabilityFrom(health, probes), rating, newIds: seen.map((s) => s._id) };
}

/**
 * Record catalog ids we haven't seen before. The very first run stores every
 * id with firstSeen 0 (a baseline), so only later additions count as new.
 */
export async function recordSeenChannels(db: Db, ids: string[]): Promise<number> {
  const coll = db.collection<{ _id: string; firstSeen: number }>(CHANNEL_SEEN_COLLECTION);
  const known = new Set((await coll.find({}, { projection: { _id: 1 } }).toArray()).map((d) => d._id));
  const baseline = known.size === 0;
  const now = Date.now();
  const fresh = ids.filter((id) => !known.has(id));
  if (fresh.length === 0) return 0;
  await coll.insertMany(
    fresh.map((id) => ({ _id: id, firstSeen: baseline ? 0 : now })),
    { ordered: false }
  );
  return baseline ? 0 : fresh.length;
}
