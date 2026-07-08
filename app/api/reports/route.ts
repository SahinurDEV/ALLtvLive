import { NextResponse } from "next/server";
import { getDb, REPORTS_COLLECTION } from "@/lib/db/mongo";
import { isAuthenticated } from "@/lib/admin/auth";
import { extractIp } from "@/lib/admin/ipUtils";
import { checkRateLimit } from "@/lib/admin/rateLimit";
import { logAudit } from "@/lib/admin/audit";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ReportDoc {
  _id?: ObjectId;
  ip: string;
  channelId: string;
  channelName: string;
  reason: string;
  note: string | null;
  status: "open" | "resolved" | "dismissed";
  createdAt: number;
  resolvedAt?: number | null;
}

const MAX_TEXT_LEN = 200;
const MAX_NOTE_LEN = 500;

const ALLOWED_REASONS = new Set([
  "broken",
  "wrong_content",
  "inappropriate",
  "buffering",
  "other",
]);

function clip(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  return s.slice(0, max);
}

export async function POST(req: Request) {
  const ip = extractIp(req);
  const rl = await checkRateLimit(`reports:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "retry-after": Math.ceil(rl.retryAfter / 1000).toString() } }
    );
  }

  let body: {
    channelId?: unknown;
    channelName?: unknown;
    reason?: unknown;
    note?: unknown;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const channelId = clip(body.channelId, MAX_TEXT_LEN);
  const channelName = clip(body.channelName, MAX_TEXT_LEN);
  const reason =
    typeof body.reason === "string" && ALLOWED_REASONS.has(body.reason)
      ? (body.reason as string)
      : null;
  if (!channelId || !channelName || !reason) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }
  const note = clip(body.note, MAX_NOTE_LEN);

  try {
    const db = await getDb();
    if (!db) return NextResponse.json({ ok: false, error: "db_unavailable" }, { status: 503 });
    const col = db.collection<ReportDoc>(REPORTS_COLLECTION);
    await col.insertOne({
      ip,
      channelId,
      channelName,
      reason,
      note: note || null,
      status: "open",
      createdAt: Date.now(),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[api/reports POST]", err);
    return NextResponse.json({ ok: false, error: "db_write_failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const limitRaw = url.searchParams.get("limit");
  const limit = Math.max(
    1,
    Math.min(500, limitRaw && /^\d+$/.test(limitRaw) ? Number(limitRaw) : 100)
  );

  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({
        entries: [],
        byChannel: [],
        counts: { open: 0, resolved: 0, dismissed: 0 },
        source: "fallback",
      });
    }
    const col = db.collection<ReportDoc>(REPORTS_COLLECTION);
    const query: Record<string, unknown> = {};
    if (status === "open" || status === "resolved" || status === "dismissed") {
      query.status = status;
    }

    const [rawEntries, byChannelAgg, byStatus] = await Promise.all([
      col.find(query).sort({ createdAt: -1 }).limit(limit).toArray(),
      col
        .aggregate([
          { $match: { status: "open" } },
          {
            $group: {
              _id: "$channelId",
              channelName: { $last: "$channelName" },
              count: { $sum: 1 },
              lastReportedAt: { $max: "$createdAt" },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 30 },
        ])
        .toArray(),
      col
        .aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }])
        .toArray(),
    ]);

    const counts = { open: 0, resolved: 0, dismissed: 0 };
    for (const row of byStatus) {
      const key = String(row._id) as keyof typeof counts;
      if (key in counts) counts[key] = Number(row.count) || 0;
    }

    const entries = rawEntries.map((e) => ({
      id: e._id?.toString() || "",
      ip: e.ip,
      channelId: e.channelId,
      channelName: e.channelName,
      reason: e.reason,
      note: e.note,
      status: e.status,
      createdAt: e.createdAt,
      resolvedAt: e.resolvedAt ?? null,
    }));

    return NextResponse.json({
      entries,
      byChannel: byChannelAgg.map((b) => ({
        channelId: String(b._id),
        channelName: String(b.channelName || b._id),
        count: Number(b.count) || 0,
        lastReportedAt: Number(b.lastReportedAt) || 0,
      })),
      counts,
      source: "db",
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[api/reports GET]", err);
    return NextResponse.json({
      entries: [],
      byChannel: [],
      counts: { open: 0, resolved: 0, dismissed: 0 },
      source: "fallback",
      error: "db_read_failed",
    });
  }
}

export async function PATCH(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: { id?: unknown; status?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : null;
  const nextStatus =
    body.status === "resolved" || body.status === "dismissed" || body.status === "open"
      ? (body.status as ReportDoc["status"])
      : null;
  if (!id || !nextStatus) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  try {
    const db = await getDb();
    if (!db) return NextResponse.json({ ok: false, error: "db_unavailable" }, { status: 503 });
    const col = db.collection<ReportDoc>(REPORTS_COLLECTION);
    await col.updateOne(
      { _id: oid },
      {
        $set: {
          status: nextStatus,
          resolvedAt: nextStatus === "open" ? null : Date.now(),
        },
      }
    );
    await logAudit(req, "report.update", { id, status: nextStatus });
    return NextResponse.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[api/reports PATCH]", err);
    return NextResponse.json({ ok: false, error: "db_write_failed" }, { status: 500 });
  }
}
