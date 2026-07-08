import { NextResponse } from "next/server";
import { getDb, STREAM_HEALTH_COLLECTION } from "@/lib/db/mongo";
import { isAuthenticated } from "@/lib/admin/auth";
import { extractIp } from "@/lib/admin/ipUtils";
import { checkRateLimit } from "@/lib/admin/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface StreamHealthDoc {
  _id: string;
  channelName: string;
  successes: number;
  failures: number;
  lastSuccessAt: number | null;
  lastFailureAt: number | null;
  lastReporterIp: string | null;
  updatedAt: number;
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
  const rl = await checkRateLimit(`health:${ip}`, 120, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "retry-after": Math.ceil(rl.retryAfter / 1000).toString() } }
    );
  }

  let body: {
    channelId?: unknown;
    channelName?: unknown;
    result?: unknown;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const channelId = clip(body.channelId, MAX_TEXT_LEN);
  const channelName = clip(body.channelName, MAX_TEXT_LEN);
  const result = body.result === "success" ? "success" : body.result === "failure" ? "failure" : null;
  if (!channelId || !channelName || !result) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ ok: false, error: "db_unavailable" }, { status: 503 });
    }
    const col = db.collection<StreamHealthDoc>(STREAM_HEALTH_COLLECTION);
    const now = Date.now();
    const inc = result === "success" ? { successes: 1 } : { failures: 1 };
    const timestamp = result === "success"
      ? { lastSuccessAt: now }
      : { lastFailureAt: now };

    await col.updateOne(
      { _id: channelId },
      {
        $set: {
          channelName,
          ...timestamp,
          lastReporterIp: ip,
          updatedAt: now,
        },
        $inc: inc,
      },
      { upsert: true }
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[api/health POST]", err);
    return NextResponse.json({ ok: false, error: "db_write_failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const filter = url.searchParams.get("filter"); // failing | all
  const limitRaw = url.searchParams.get("limit");
  const limit = Math.max(
    1,
    Math.min(500, limitRaw && /^\d+$/.test(limitRaw) ? Number(limitRaw) : 100)
  );

  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({
        channels: [],
        summary: { healthy: 0, degraded: 0, failing: 0 },
        source: "fallback",
      });
    }
    const col = db.collection<StreamHealthDoc>(STREAM_HEALTH_COLLECTION);
    const all = await col
      .find({})
      .project({ _id: 0, channelId: "$_id", channelName: 1, successes: 1, failures: 1, lastSuccessAt: 1, lastFailureAt: 1, updatedAt: 1 })
      .toArray();

    const enriched = all.map((c) => {
      const total = (c.successes || 0) + (c.failures || 0);
      const failureRate = total > 0 ? (c.failures || 0) / total : 0;
      let status: "healthy" | "degraded" | "failing" = "healthy";
      if (failureRate >= 0.5) status = "failing";
      else if (failureRate >= 0.15) status = "degraded";
      const lastFail = c.lastFailureAt || 0;
      const lastOk = c.lastSuccessAt || 0;
      if (lastFail > lastOk && lastFail > Date.now() - 60_000) {
        status = "failing";
      }
      return { ...c, failureRate, status };
    });

    const filtered =
      filter === "failing"
        ? enriched.filter((c) => c.status === "failing")
        : filter === "degraded"
          ? enriched.filter((c) => c.status !== "healthy")
          : enriched;

    const sorted = filtered
      .sort((a, b) => {
        const rank = (s: string) => (s === "failing" ? 0 : s === "degraded" ? 1 : 2);
        const r = rank(a.status) - rank(b.status);
        if (r !== 0) return r;
        return b.failureRate - a.failureRate;
      })
      .slice(0, limit);

    const summary = {
      healthy: enriched.filter((c) => c.status === "healthy").length,
      degraded: enriched.filter((c) => c.status === "degraded").length,
      failing: enriched.filter((c) => c.status === "failing").length,
    };

    return NextResponse.json({
      channels: sorted,
      summary,
      source: "db",
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[api/health GET]", err);
    return NextResponse.json({
      channels: [],
      summary: { healthy: 0, degraded: 0, failing: 0 },
      source: "fallback",
      error: "db_read_failed",
    });
  }
}
