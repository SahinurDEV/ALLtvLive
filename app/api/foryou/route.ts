import { NextResponse } from "next/server";
import { getDb, HISTORY_COLLECTION } from "@/lib/db/mongo";
import { extractIp } from "@/lib/admin/ipUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const ip = extractIp(req);
  if (ip === "unknown") {
    return NextResponse.json({ channelIds: [], source: "no_ip" });
  }

  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ channelIds: [], source: "fallback" });
    }
    const col = db.collection(HISTORY_COLLECTION);
    const since = Date.now() - LOOKBACK_MS;
    const results = await col
      .aggregate([
        { $match: { ip, playedAt: { $gte: since } } },
        {
          $group: {
            _id: "$channelId",
            count: { $sum: 1 },
            lastPlayedAt: { $max: "$playedAt" },
          },
        },
        { $sort: { count: -1, lastPlayedAt: -1 } },
        { $limit: 20 },
      ])
      .toArray();

    return NextResponse.json({
      channelIds: results.map((r) => String(r._id)),
      details: results.map((r) => ({
        channelId: String(r._id),
        count: Number(r.count) || 0,
        lastPlayedAt: Number(r.lastPlayedAt) || 0,
      })),
      source: "db",
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[api/foryou]", err);
    return NextResponse.json({ channelIds: [], source: "fallback", error: "db_read_failed" });
  }
}
