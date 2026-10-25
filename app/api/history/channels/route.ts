import { NextResponse } from "next/server";
import { getDb, HISTORY_COLLECTION, REPORTS_COLLECTION } from "@/lib/db/mongo";
import { isAuthenticated } from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_RANGE_MS = 7 * 24 * 60 * 60 * 1000;
const LIMIT = 15;

/** Admin: most-played channels and most-reported channels in a time range. */
export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const rangeRaw = new URL(req.url).searchParams.get("rangeMs");
  const rangeMs = rangeRaw && /^\d+$/.test(rangeRaw) ? Number(rangeRaw) : DEFAULT_RANGE_MS;
  const since = Date.now() - rangeMs;
  try {
    const db = await getDb();
    if (!db) return NextResponse.json({ plays: [], reports: [], totalPlays: 0, source: "fallback" });
    const [plays, reports, total] = await Promise.all([
      db.collection(HISTORY_COLLECTION).aggregate([
        { $match: { playedAt: { $gte: since } } },
        { $group: { _id: "$channelId", name: { $last: "$channelName" }, plays: { $sum: 1 }, viewers: { $addToSet: "$ip" } } },
        { $project: { _id: 0, channelId: "$_id", name: 1, plays: 1, viewers: { $size: "$viewers" } } },
        { $sort: { plays: -1 } },
        { $limit: LIMIT },
      ]).toArray(),
      db.collection(REPORTS_COLLECTION).aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: {
          _id: "$channelId", name: { $last: "$channelName" }, reports: { $sum: 1 },
          open: { $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] } },
        } },
        { $project: { _id: 0, channelId: "$_id", name: 1, reports: 1, open: 1 } },
        { $sort: { reports: -1 } },
        { $limit: LIMIT },
      ]).toArray(),
      db.collection(HISTORY_COLLECTION).countDocuments({ playedAt: { $gte: since } }),
    ]);
    return NextResponse.json({ plays, reports, totalPlays: total, source: "db" });
  } catch {
    return NextResponse.json({ ok: false, error: "db_read_failed" }, { status: 500 });
  }
}
