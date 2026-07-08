import { NextResponse } from "next/server";
import { getDb, HISTORY_COLLECTION } from "@/lib/db/mongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_RANGE_MS = 24 * 60 * 60 * 1000;
const MAX_LIMIT = 100;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const rangeRaw = url.searchParams.get("rangeMs");
  const limitRaw = url.searchParams.get("limit");
  const rangeMs =
    rangeRaw && /^\d+$/.test(rangeRaw)
      ? Math.max(60_000, Math.min(30 * 24 * 60 * 60 * 1000, Number(rangeRaw)))
      : DEFAULT_RANGE_MS;
  const limit = Math.max(
    1,
    Math.min(MAX_LIMIT, limitRaw && /^\d+$/.test(limitRaw) ? Number(limitRaw) : 20)
  );

  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json(
        { channels: [], rangeMs, source: "fallback" },
        { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } }
      );
    }
    const col = db.collection(HISTORY_COLLECTION);
    const since = Date.now() - rangeMs;
    const results = await col
      .aggregate([
        { $match: { playedAt: { $gte: since } } },
        {
          $group: {
            _id: "$channelId",
            channelName: { $last: "$channelName" },
            plays: { $sum: 1 },
            uniqueIps: { $addToSet: "$ip" },
            lastPlayedAt: { $max: "$playedAt" },
          },
        },
        {
          $project: {
            channelName: 1,
            plays: 1,
            lastPlayedAt: 1,
            uniqueIps: { $size: "$uniqueIps" },
          },
        },
        { $sort: { plays: -1 } },
        { $limit: limit },
      ])
      .toArray();

    return NextResponse.json(
      {
        channels: results.map((r) => ({
          channelId: String(r._id),
          channelName: String(r.channelName || r._id),
          plays: Number(r.plays) || 0,
          uniqueIps: Number(r.uniqueIps) || 0,
          lastPlayedAt: Number(r.lastPlayedAt) || 0,
        })),
        rangeMs,
        source: "db",
      },
      { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[api/public/top]", err);
    return NextResponse.json({ channels: [], rangeMs, source: "fallback" });
  }
}
