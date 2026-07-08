import { NextResponse } from "next/server";
import { getDb, RATINGS_COLLECTION } from "@/lib/db/mongo";
import { isAuthenticated } from "@/lib/admin/auth";
import { extractIp } from "@/lib/admin/ipUtils";
import { checkRateLimit } from "@/lib/admin/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RatingDoc {
  _id: string;
  ip: string;
  channelId: string;
  channelName: string;
  vote: "up" | "down";
  at: number;
}

const MAX_TEXT_LEN = 200;

function clip(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  return s.slice(0, max);
}

export async function POST(req: Request) {
  const ip = extractIp(req);
  const rl = await checkRateLimit(`ratings:${ip}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "retry-after": Math.ceil(rl.retryAfter / 1000).toString() } }
    );
  }

  let body: {
    channelId?: unknown;
    channelName?: unknown;
    vote?: unknown;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const channelId = clip(body.channelId, MAX_TEXT_LEN);
  const channelName = clip(body.channelName, MAX_TEXT_LEN);
  const vote = body.vote === "up" || body.vote === "down" ? body.vote : null;
  if (!channelId || !channelName || !vote) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  try {
    const db = await getDb();
    if (!db) return NextResponse.json({ ok: false, error: "db_unavailable" }, { status: 503 });
    const col = db.collection<RatingDoc>(RATINGS_COLLECTION);
    const id = `${channelId}::${ip}`;
    await col.updateOne(
      { _id: id },
      {
        $set: {
          ip,
          channelId,
          channelName,
          vote,
          at: Date.now(),
        },
      },
      { upsert: true }
    );

    // Return the aggregated counts for this channel
    const agg = await col
      .aggregate([
        { $match: { channelId } },
        { $group: { _id: "$vote", count: { $sum: 1 } } },
      ])
      .toArray();
    let up = 0;
    let down = 0;
    for (const row of agg) {
      if (row._id === "up") up = Number(row.count) || 0;
      if (row._id === "down") down = Number(row.count) || 0;
    }
    return NextResponse.json({ ok: true, up, down, myVote: vote });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[api/ratings POST]", err);
    return NextResponse.json({ ok: false, error: "db_write_failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const ip = extractIp(req);
  const url = new URL(req.url);
  const channelId = clip(url.searchParams.get("channelId"), MAX_TEXT_LEN);
  if (!channelId) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }
  try {
    const db = await getDb();
    if (!db) return NextResponse.json({ ok: false, error: "db_unavailable" }, { status: 503 });
    const col = db.collection<RatingDoc>(RATINGS_COLLECTION);
    await col.deleteOne({ _id: `${channelId}::${ip}` });
    return NextResponse.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[api/ratings DELETE]", err);
    return NextResponse.json({ ok: false, error: "db_write_failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const channelId = clip(url.searchParams.get("channelId"), MAX_TEXT_LEN);
  const admin = url.searchParams.get("admin") === "1";

  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ channels: [], up: 0, down: 0, source: "fallback" });
    }
    const col = db.collection<RatingDoc>(RATINGS_COLLECTION);

    if (channelId) {
      const ip = extractIp(req);
      const [agg, mine] = await Promise.all([
        col
          .aggregate([
            { $match: { channelId } },
            { $group: { _id: "$vote", count: { $sum: 1 } } },
          ])
          .toArray(),
        col.findOne({ _id: `${channelId}::${ip}` }),
      ]);
      let up = 0;
      let down = 0;
      for (const row of agg) {
        if (row._id === "up") up = Number(row.count) || 0;
        if (row._id === "down") down = Number(row.count) || 0;
      }
      return NextResponse.json({
        channelId,
        up,
        down,
        myVote: mine?.vote ?? null,
        source: "db",
      });
    }

    if (admin) {
      if (!(await isAuthenticated())) {
        return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
      }
      const top = await col
        .aggregate([
          {
            $group: {
              _id: "$channelId",
              channelName: { $last: "$channelName" },
              up: { $sum: { $cond: [{ $eq: ["$vote", "up"] }, 1, 0] } },
              down: { $sum: { $cond: [{ $eq: ["$vote", "down"] }, 1, 0] } },
              total: { $sum: 1 },
            },
          },
          { $sort: { total: -1 } },
          { $limit: 200 },
        ])
        .toArray();
      return NextResponse.json({
        channels: top.map((c) => ({
          channelId: String(c._id),
          channelName: String(c.channelName || c._id),
          up: Number(c.up) || 0,
          down: Number(c.down) || 0,
          total: Number(c.total) || 0,
          score: (Number(c.up) || 0) - (Number(c.down) || 0),
        })),
        source: "db",
      });
    }

    return NextResponse.json({ ok: false, error: "missing_query" }, { status: 400 });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[api/ratings GET]", err);
    return NextResponse.json({ source: "fallback", error: "db_read_failed" });
  }
}
