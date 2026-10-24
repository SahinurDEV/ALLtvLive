import { NextResponse } from "next/server";
import { lookupGuide } from "@/lib/server/epg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const CACHE = { "vercel-cdn-cache-control": "max-age=900, stale-while-revalidate=3600", "cdn-cache-control": "max-age=900" };

/** GET /api/epg?country=GB&name=BBC%20News[&name=alt] -> { programmes } */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const country = (url.searchParams.get("country") || "").slice(0, 2);
  const names = url.searchParams.getAll("name").map((n) => n.slice(0, 120)).slice(0, 5);
  if (!country || names.length === 0) {
    return NextResponse.json({ ok: false, programmes: [] }, { status: 400 });
  }
  try {
    const programmes = await lookupGuide(country, names);
    return NextResponse.json(
      { ok: !!programmes, source: "epg.pw", programmes: programmes || [] },
      { headers: CACHE }
    );
  } catch {
    return NextResponse.json({ ok: false, programmes: [] }, { headers: { "cache-control": "no-store" } });
  }
}
