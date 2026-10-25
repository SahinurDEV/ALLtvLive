import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongo";
import { getHiddenChannelIds } from "@/lib/server/streamProbe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Channels the scheduled health check found dead several runs in a row. */
export async function GET() {
  let ids: string[] = [];
  try {
    const db = await getDb();
    if (db) ids = await getHiddenChannelIds(db);
  } catch {
    ids = [];
  }
  return NextResponse.json(ids, {
    headers: {
      "cache-control": "public, max-age=600",
      "cdn-cache-control": "max-age=3600, stale-while-revalidate=86400",
      "vercel-cdn-cache-control": "max-age=3600, stale-while-revalidate=86400",
    },
  });
}
