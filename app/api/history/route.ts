import { NextResponse } from "next/server";
import { getDb, HISTORY_COLLECTION } from "@/lib/db/mongo";
import { isAuthenticated } from "@/lib/admin/auth";
import { extractIp } from "@/lib/admin/ipUtils";
import { checkRateLimit } from "@/lib/admin/rateLimit";
import { logAudit } from "@/lib/admin/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface HistoryDoc {
  ip: string;
  channelId: string;
  channelName: string;
  country: string | null;
  category: string | null;
  userAgent: string | null;
  referrer: string | null;
  playedAt: number;
}

const MAX_TEXT_LEN = 200;
const MAX_UA_LEN = 400;

function clip(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  return s.slice(0, max);
}

export async function POST(req: Request) {
  const ip = extractIp(req);
  const rl = await checkRateLimit(`history:${ip}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      {
        status: 429,
        headers: { "retry-after": Math.ceil(rl.retryAfter / 1000).toString() },
      }
    );
  }

  let body: {
    channelId?: unknown;
    channelName?: unknown;
    country?: unknown;
    category?: unknown;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const channelId = clip(body.channelId, MAX_TEXT_LEN);
  const channelName = clip(body.channelName, MAX_TEXT_LEN);
  if (!channelId || !channelName) {
    return NextResponse.json(
      { ok: false, error: "channelId_and_channelName_required" },
      { status: 400 }
    );
  }

  const doc: HistoryDoc = {
    ip,
    channelId,
    channelName,
    country: clip(body.country, MAX_TEXT_LEN),
    category: clip(body.category, MAX_TEXT_LEN),
    userAgent: clip(req.headers.get("user-agent"), MAX_UA_LEN),
    referrer: clip(req.headers.get("referer"), MAX_TEXT_LEN),
    playedAt: Date.now(),
  };

  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ ok: false, error: "db_unavailable" }, { status: 503 });
    }
    await db.collection<HistoryDoc>(HISTORY_COLLECTION).insertOne(doc);
    return NextResponse.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[api/history POST]", err);
    return NextResponse.json({ ok: false, error: "db_write_failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const ip = clip(url.searchParams.get("ip"), MAX_TEXT_LEN);
  const channelId = clip(url.searchParams.get("channelId"), MAX_TEXT_LEN);
  const sinceRaw = url.searchParams.get("since");
  const since = sinceRaw && /^\d+$/.test(sinceRaw) ? Number(sinceRaw) : null;
  const limitRaw = url.searchParams.get("limit");
  const limit = Math.max(
    1,
    Math.min(500, limitRaw && /^\d+$/.test(limitRaw) ? Number(limitRaw) : 100)
  );
  const cursorRaw = url.searchParams.get("cursor");
  const cursor = cursorRaw && /^\d+$/.test(cursorRaw) ? Number(cursorRaw) : null;

  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({
        entries: [],
        total: 0,
        uniqueIps: 0,
        uniqueChannels: 0,
        topChannels: [],
        topIps: [],
        source: "fallback",
      });
    }
    const col = db.collection<HistoryDoc>(HISTORY_COLLECTION);
    const query: Record<string, unknown> = {};
    if (ip) query.ip = ip;
    if (channelId) query.channelId = channelId;
    if (since) query.playedAt = { $gte: since };
    if (cursor) {
      const existing = (query.playedAt as { $gte?: number } | undefined) || {};
      query.playedAt = { ...existing, $lt: cursor };
    }

    const entries = await col
      .find(query)
      .project({ _id: 0 })
      .sort({ playedAt: -1 })
      .limit(limit)
      .toArray();

    const [total, uniqueIps, uniqueChannels, topChannelsAgg, topIpsAgg] =
      await Promise.all([
        col.countDocuments(query),
        col.distinct("ip", query).then((v) => v.length),
        col.distinct("channelId", query).then((v) => v.length),
        col
          .aggregate([
            { $match: query },
            {
              $group: {
                _id: "$channelId",
                name: { $last: "$channelName" },
                count: { $sum: 1 },
                lastPlayedAt: { $max: "$playedAt" },
              },
            },
            { $sort: { count: -1 } },
            { $limit: 10 },
          ])
          .toArray(),
        col
          .aggregate([
            { $match: query },
            {
              $group: {
                _id: "$ip",
                count: { $sum: 1 },
                lastSeenAt: { $max: "$playedAt" },
                channels: { $addToSet: "$channelId" },
              },
            },
            {
              $project: {
                _id: 1,
                count: 1,
                lastSeenAt: 1,
                distinctChannels: { $size: "$channels" },
              },
            },
            { $sort: { count: -1 } },
            { $limit: 10 },
          ])
          .toArray(),
      ]);

    const topChannels = topChannelsAgg.map((c) => ({
      channelId: String(c._id),
      channelName: String(c.name || c._id),
      count: Number(c.count) || 0,
      lastPlayedAt: Number(c.lastPlayedAt) || 0,
    }));
    const topIps = topIpsAgg.map((c) => ({
      ip: String(c._id),
      count: Number(c.count) || 0,
      lastSeenAt: Number(c.lastSeenAt) || 0,
      distinctChannels: Number(c.distinctChannels) || 0,
    }));

    return NextResponse.json({
      entries,
      total,
      uniqueIps,
      uniqueChannels,
      topChannels,
      topIps,
      source: "db",
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[api/history GET]", err);
    return NextResponse.json({
      entries: [],
      total: 0,
      uniqueIps: 0,
      uniqueChannels: 0,
      topChannels: [],
      topIps: [],
      source: "fallback",
      error: "db_read_failed",
    });
  }
}

export async function DELETE(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const ip = clip(url.searchParams.get("ip"), MAX_TEXT_LEN);
  const olderThanRaw = url.searchParams.get("olderThan");
  const olderThan =
    olderThanRaw && /^\d+$/.test(olderThanRaw) ? Number(olderThanRaw) : null;

  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ ok: false, error: "db_unavailable" }, { status: 503 });
    }
    const col = db.collection<HistoryDoc>(HISTORY_COLLECTION);
    const query: Record<string, unknown> = {};
    if (ip) query.ip = ip;
    if (olderThan) query.playedAt = { $lt: olderThan };
    if (Object.keys(query).length === 0) {
      return NextResponse.json(
        { ok: false, error: "specify_ip_or_olderThan" },
        { status: 400 }
      );
    }
    const result = await col.deleteMany(query);
    await logAudit(req, "history.delete", { query, deleted: result.deletedCount });
    return NextResponse.json({ ok: true, deleted: result.deletedCount });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[api/history DELETE]", err);
    return NextResponse.json({ ok: false, error: "db_delete_failed" }, { status: 500 });
  }
}
