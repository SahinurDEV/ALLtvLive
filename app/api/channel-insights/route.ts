import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongo";
import { getInsights, type ChannelInsights } from "@/lib/server/insights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reliability badges, ratings and newly added channels for the whole catalog. */
export async function GET() {
  let body: ChannelInsights = { reliability: {}, rating: {}, newIds: [] };
  try {
    const db = await getDb();
    if (db) body = await getInsights(db);
  } catch {
    // fall back to empty insights
  }
  return NextResponse.json(body, {
    headers: {
      "cache-control": "public, max-age=900",
      "cdn-cache-control": "max-age=3600, stale-while-revalidate=86400",
      "vercel-cdn-cache-control": "max-age=3600, stale-while-revalidate=86400",
    },
  });
}
