import { NextResponse } from "next/server";
import { getDb, HISTORY_COLLECTION } from "@/lib/db/mongo";
import { isAuthenticated } from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface HistoryDoc {
  playedAt: number;
}

const DEFAULT_RANGE_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const rangeRaw = url.searchParams.get("rangeMs");
  const rangeMs =
    rangeRaw && /^\d+$/.test(rangeRaw) ? Number(rangeRaw) : DEFAULT_RANGE_MS;

  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({
        grid: emptyGrid(),
        total: 0,
        source: "fallback",
      });
    }

    const col = db.collection<HistoryDoc>(HISTORY_COLLECTION);
    const since = Date.now() - rangeMs;
    const cursor = col.find(
      { playedAt: { $gte: since } },
      { projection: { _id: 0, playedAt: 1 } }
    );

    const grid = emptyGrid();
    let total = 0;
    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      if (!doc) break;
      const d = new Date(doc.playedAt);
      const dow = d.getUTCDay();
      const hour = d.getUTCHours();
      grid[dow][hour] += 1;
      total += 1;
    }

    // Peak cell
    let peakDow = 0;
    let peakHour = 0;
    let peakValue = 0;
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        if (grid[d][h] > peakValue) {
          peakValue = grid[d][h];
          peakDow = d;
          peakHour = h;
        }
      }
    }

    return NextResponse.json({
      grid,
      total,
      rangeMs,
      peak: { dow: peakDow, hour: peakHour, value: peakValue },
      source: "db",
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[api/history/heatmap]", err);
    return NextResponse.json({
      grid: emptyGrid(),
      total: 0,
      source: "fallback",
      error: "db_read_failed",
    });
  }
}

function emptyGrid(): number[][] {
  return Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
}
