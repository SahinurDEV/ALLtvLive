import { NextResponse } from "next/server";
import {
  getDb,
  BROADCAST_COLLECTION,
  BROADCAST_DOC_ID,
} from "@/lib/db/mongo";
import { isAuthenticated } from "@/lib/admin/auth";
import { logAudit } from "@/lib/admin/audit";
import type { BroadcastChannel } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface BroadcastDoc {
  _id: string;
  channels: BroadcastChannel[];
  updatedAt: number;
}

const MAX_CHANNELS = 200;
const MAX_URL_LEN = 2048;
const MAX_TEXT_LEN = 200;

function sanitize(raw: unknown): BroadcastChannel | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const name = typeof r.name === "string" ? r.name.trim() : "";
  const url = typeof r.url === "string" ? r.url.trim() : "";
  if (!name || !url) return null;
  if (name.length > MAX_TEXT_LEN || url.length > MAX_URL_LEN) return null;

  const id =
    typeof r.id === "string" && r.id.trim()
      ? r.id.trim().slice(0, 100)
      : `bc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const logoStr = typeof r.logo === "string" ? r.logo.trim() : "";
  const catStr = typeof r.category === "string" ? r.category.trim() : "";
  const countryStr = typeof r.country === "string" ? r.country.trim() : "";
  const descStr =
    typeof r.description === "string" ? r.description.trim() : "";

  const addedAt =
    typeof r.addedAt === "number" && Number.isFinite(r.addedAt)
      ? r.addedAt
      : Date.now();

  return {
    id,
    name: name.slice(0, MAX_TEXT_LEN),
    url,
    logo: logoStr ? logoStr.slice(0, MAX_URL_LEN) : null,
    category: catStr ? catStr.slice(0, 60) : null,
    country: countryStr ? countryStr.slice(0, 8).toUpperCase() : null,
    description: descStr ? descStr.slice(0, 500) : null,
    addedAt,
  };
}

export async function GET() {
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ channels: [], source: "fallback" });
    }
    const col = db.collection<BroadcastDoc>(BROADCAST_COLLECTION);
    const doc = await col.findOne({ _id: BROADCAST_DOC_ID });
    if (!doc) {
      return NextResponse.json({ channels: [], source: "db" });
    }
    return NextResponse.json({
      channels: doc.channels || [],
      updatedAt: doc.updatedAt,
      source: "db",
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[api/broadcast-channels GET]", err);
    return NextResponse.json({
      channels: [],
      source: "fallback",
      error: "db_unavailable",
    });
  }
}

export async function PUT(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  let body: { channels?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_body" },
      { status: 400 }
    );
  }

  if (!Array.isArray(body.channels)) {
    return NextResponse.json(
      { ok: false, error: "channels must be an array" },
      { status: 400 }
    );
  }

  const cleaned = (body.channels as unknown[])
    .map(sanitize)
    .filter((c): c is BroadcastChannel => c !== null)
    .slice(0, MAX_CHANNELS);

  // Dedupe by id (keep first occurrence)
  const seen = new Set<string>();
  const deduped: BroadcastChannel[] = [];
  for (const c of cleaned) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    deduped.push(c);
  }

  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json(
        { ok: false, error: "database_unavailable" },
        { status: 503 }
      );
    }
    const col = db.collection<BroadcastDoc>(BROADCAST_COLLECTION);
    await col.updateOne(
      { _id: BROADCAST_DOC_ID },
      { $set: { channels: deduped, updatedAt: Date.now() } },
      { upsert: true }
    );
    await logAudit(req, "broadcast.update", { count: deduped.length });
    return NextResponse.json({ ok: true, count: deduped.length });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[api/broadcast-channels PUT]", err);
    return NextResponse.json(
      { ok: false, error: "db_write_failed" },
      { status: 500 }
    );
  }
}
