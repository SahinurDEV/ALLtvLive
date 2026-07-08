import { NextResponse } from "next/server";
import { getDb, STREAM_HEALTH_COLLECTION } from "@/lib/db/mongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ channels: [], source: "fallback" });
    }
    const col = db.collection(STREAM_HEALTH_COLLECTION);
    const rows = await col
      .find({}, { projection: { _id: 1, channelName: 1, successes: 1, failures: 1, lastSuccessAt: 1, lastFailureAt: 1, updatedAt: 1 } })
      .toArray();

    const channels = rows.map((c) => {
      const successes = Number(c.successes) || 0;
      const failures = Number(c.failures) || 0;
      const total = successes + failures;
      const failureRate = total > 0 ? failures / total : 0;
      let status: "healthy" | "degraded" | "failing" = "healthy";
      if (failureRate >= 0.5) status = "failing";
      else if (failureRate >= 0.15) status = "degraded";
      return {
        channelId: String(c._id),
        channelName: c.channelName || String(c._id),
        status,
        failureRate: Number(failureRate.toFixed(3)),
        successes,
        failures,
        lastSuccessAt: c.lastSuccessAt ?? null,
        lastFailureAt: c.lastFailureAt ?? null,
      };
    });

    return NextResponse.json(
      { channels, source: "db" },
      { headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=120" } }
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[api/public/health]", err);
    return NextResponse.json({ channels: [], source: "fallback" });
  }
}
