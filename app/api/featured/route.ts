import { NextResponse } from "next/server";
import { getDb, FEATURED_COLLECTION, FEATURED_DOC_ID } from "@/lib/db/mongo";
import { isAuthenticated } from "@/lib/admin/auth";
import { logAudit } from "@/lib/admin/audit";
import {
  FEATURED_CHANNEL_IDS,
  PRIMARY_CHANNEL_ID,
} from "@/lib/featured/featured";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface FeaturedDoc {
  _id: string;
  ids: string[];
  primary: string | null;
  updatedAt: number;
}

export async function GET() {
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({
        ids: FEATURED_CHANNEL_IDS,
        primary: PRIMARY_CHANNEL_ID,
        source: "fallback",
      });
    }
    const col = db.collection<FeaturedDoc>(FEATURED_COLLECTION);
    const doc = await col.findOne({ _id: FEATURED_DOC_ID });
    if (!doc) {
      return NextResponse.json({
        ids: FEATURED_CHANNEL_IDS,
        primary: PRIMARY_CHANNEL_ID,
        source: "fallback",
      });
    }
    return NextResponse.json({
      ids: doc.ids || [],
      primary: doc.primary ?? null,
      updatedAt: doc.updatedAt,
      source: "db",
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[api/featured GET]", err);
    return NextResponse.json({
      ids: FEATURED_CHANNEL_IDS,
      primary: PRIMARY_CHANNEL_ID,
      source: "fallback",
      error: "db_unavailable",
    });
  }
}

export async function PUT(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: { ids?: unknown; primary?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  if (!Array.isArray(body.ids) || !body.ids.every((v) => typeof v === "string")) {
    return NextResponse.json(
      { ok: false, error: "ids must be a string array" },
      { status: 400 }
    );
  }

  const cleaned = Array.from(
    new Set(body.ids.map((s) => (s as string).trim()).filter(Boolean))
  ).slice(0, 500);

  let primary: string | null = null;
  if (typeof body.primary === "string" && body.primary.trim()) {
    primary = body.primary.trim();
  } else if (body.primary === null) {
    primary = null;
  }

  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json(
        { ok: false, error: "database_unavailable" },
        { status: 503 }
      );
    }
    const col = db.collection<FeaturedDoc>(FEATURED_COLLECTION);
    await col.updateOne(
      { _id: FEATURED_DOC_ID },
      { $set: { ids: cleaned, primary, updatedAt: Date.now() } },
      { upsert: true }
    );
    await logAudit(req, "featured.update", { count: cleaned.length, primary });
    return NextResponse.json({ ok: true, count: cleaned.length, primary });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[api/featured PUT]", err);
    return NextResponse.json(
      { ok: false, error: "db_write_failed" },
      { status: 500 }
    );
  }
}
