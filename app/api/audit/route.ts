import { NextResponse } from "next/server";
import { getDb, AUDIT_LOG_COLLECTION } from "@/lib/db/mongo";
import { isAuthenticated } from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const limitRaw = url.searchParams.get("limit");
  const limit = Math.max(
    1,
    Math.min(500, limitRaw && /^\d+$/.test(limitRaw) ? Number(limitRaw) : 100)
  );

  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ entries: [], total: 0, source: "fallback" });
    }
    const col = db.collection(AUDIT_LOG_COLLECTION);
    const query: Record<string, unknown> = {};
    if (action) query.action = action;

    const [entries, total, byAction] = await Promise.all([
      col
        .find(query)
        .project({ _id: 0 })
        .sort({ at: -1 })
        .limit(limit)
        .toArray(),
      col.countDocuments(query),
      col
        .aggregate([
          { $match: query },
          { $group: { _id: "$action", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 20 },
        ])
        .toArray(),
    ]);

    return NextResponse.json({
      entries,
      total,
      byAction: byAction.map((b) => ({ action: String(b._id), count: Number(b.count) })),
      source: "db",
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[api/audit GET]", err);
    return NextResponse.json({
      entries: [],
      total: 0,
      byAction: [],
      source: "fallback",
      error: "db_read_failed",
    });
  }
}
