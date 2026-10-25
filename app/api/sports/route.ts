import { NextResponse } from "next/server";
import { getSlimCatalog } from "@/lib/server/catalog";
import { EPG_COUNTRIES, sportsToday } from "@/lib/server/epg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULTS = ["GB", "US", "IN"];

/** GET /api/sports?country=BD -> today's sports listings from the free guide. */
export async function GET(req: Request) {
  const want = (new URL(req.url).searchParams.get("country") || "").slice(0, 2).toUpperCase();
  const countries = Array.from(new Set([...(EPG_COUNTRIES.has(want) ? [want] : []), ...DEFAULTS])).slice(0, 3);
  try {
    const cat = await getSlimCatalog();
    const logos = new Map(cat.logos.map((l) => [l.channel, l.url]));
    const sports = cat.channels
      .filter((c) => (c.categories || []).includes("sports") && countries.includes(c.country === "UK" ? "GB" : c.country))
      .map((c) => ({ id: c.id, name: c.name, alt_names: (c as { alt_names?: string[] }).alt_names, country: c.country, logo: logos.get(c.id) || null }));
    const listings = await sportsToday(countries, sports);
    return NextResponse.json(
      { ok: true, countries, listings },
      { headers: { "vercel-cdn-cache-control": "max-age=1800, stale-while-revalidate=3600", "cdn-cache-control": "max-age=1800" } }
    );
  } catch {
    return NextResponse.json({ ok: false, countries, listings: [] }, { headers: { "cache-control": "no-store" } });
  }
}
