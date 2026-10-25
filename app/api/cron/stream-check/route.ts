import { NextResponse } from "next/server";
import { getDb, STREAM_HEALTH_COLLECTION } from "@/lib/db/mongo";
import { getSlimCatalog } from "@/lib/server/catalog";
import {
  classify,
  probeUrl,
  CRON_STATE_COLLECTION,
  STREAM_PROBE_COLLECTION,
  type ProbeDoc,
  type ProbeOutcome,
} from "@/lib/server/streamProbe";
import { recordSeenChannels } from "@/lib/server/insights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH = 250; // channels per run
const CONCURRENCY = 25;
const STREAMS_PER_CHANNEL = 3;
const BUDGET_MS = 50_000;

/**
 * Scheduled health check (Vercel Cron, see vercel.json). Each run probes a
 * batch of channels: first the ones viewers reported failing, then the next
 * slice of the catalog in rotation. A channel is "dead" only if every stream
 * fails; after FAILS_TO_HIDE dead runs in a row it is hidden from the app,
 * and one good check brings it back.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const db = await getDb();
  if (!db) return NextResponse.json({ ok: false, error: "no_db" }, { status: 503 });

  const started = Date.now();
  const catalog = await getSlimCatalog();
  const urlsByChannel = new Map<string, string[]>();
  for (const s of catalog.streams as Array<{ channel: string | null; url?: string }>) {
    if (!s.channel || !s.url) continue;
    const list = urlsByChannel.get(s.channel) ?? [];
    if (list.length < STREAMS_PER_CHANNEL) list.push(s.url);
    urlsByChannel.set(s.channel, list);
  }
  const allIds = [...urlsByChannel.keys()].sort();
  let newlyAdded = 0;
  try {
    newlyAdded = await recordSeenChannels(db, allIds);
  } catch {
    // not critical
  }

  // Viewer-reported suspects first, then previously failing ones, then rotation.
  const suspects = await db
    .collection(STREAM_HEALTH_COLLECTION)
    .find({ $expr: { $gt: ["$failures", "$successes"] } }, { projection: { _id: 1 } })
    .sort({ updatedAt: -1 })
    .limit(80)
    .toArray();
  const failing = await db
    .collection<ProbeDoc>(STREAM_PROBE_COLLECTION)
    .find({ consecutiveFailures: { $gte: 1 } }, { projection: { _id: 1 } })
    .sort({ lastCheckedAt: 1 })
    .limit(80)
    .toArray();
  const state = await db.collection<{ _id: string; cursor: number }>(CRON_STATE_COLLECTION).findOne({ _id: "stream-check" });
  let cursor = state?.cursor ?? 0;

  const queue: string[] = [];
  const seen = new Set<string>();
  const add = (id: string) => {
    if (!seen.has(id) && urlsByChannel.has(id) && queue.length < BATCH) {
      seen.add(id);
      queue.push(id);
    }
  };
  suspects.forEach((d) => add(String(d._id)));
  failing.forEach((d) => add(String(d._id)));
  while (queue.length < BATCH && allIds.length > 0 && seen.size < allIds.length) {
    add(allIds[cursor % allIds.length]);
    cursor = (cursor + 1) % allIds.length;
  }

  const results: Record<ProbeOutcome, number> = { ok: 0, dead: 0, unknown: 0 };
  const now = Date.now();
  const coll = db.collection<ProbeDoc>(STREAM_PROBE_COLLECTION);

  async function checkChannel(id: string) {
    let outcome: ProbeOutcome = "dead";
    let lastStatus: number | string = "none";
    for (const url of urlsByChannel.get(id) ?? []) {
      const status = await probeUrl(url);
      lastStatus = status;
      const c = classify(status);
      if (c === "ok") {
        outcome = "ok";
        break;
      }
      if (c === "unknown") outcome = "unknown";
    }
    results[outcome]++;
    if (outcome === "ok") {
      await coll.updateOne(
        { _id: id },
        { $set: { consecutiveFailures: 0, lastCheckedAt: now, lastOkAt: now, lastStatus } },
        { upsert: true }
      );
    } else if (outcome === "dead") {
      await coll.updateOne(
        { _id: id },
        { $inc: { consecutiveFailures: 1 }, $set: { lastCheckedAt: now, lastStatus }, $setOnInsert: { lastOkAt: null } },
        { upsert: true }
      );
    } else {
      await coll.updateOne({ _id: id }, { $set: { lastCheckedAt: now, lastStatus } }, { upsert: false });
    }
  }

  let i = 0;
  let checked = 0;
  async function worker() {
    while (i < queue.length && Date.now() - started < BUDGET_MS) {
      const id = queue[i++];
      try {
        await checkChannel(id);
        checked++;
      } catch {
        // keep going
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  await db
    .collection<{ _id: string; cursor: number; lastRunAt?: number }>(CRON_STATE_COLLECTION)
    .updateOne({ _id: "stream-check" }, { $set: { cursor, lastRunAt: now } }, { upsert: true });

  return NextResponse.json({ ok: true, checked, queued: queue.length, results, newlyAdded, ms: Date.now() - started });
}
