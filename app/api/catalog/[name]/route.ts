import { NextResponse } from "next/server";
import { getSlimCatalog } from "@/lib/server/catalog";

export const runtime = "nodejs";

const NAMES = new Set(["channels", "streams", "logos"]);

/**
 * Slimmed copies of the iptv-org catalog files, same JSON shape as the
 * originals but only playable, non-blocked channels and one logo each.
 * About 7 MB instead of 17 MB, and cached on the CDN for an hour.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!NAMES.has(name)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  try {
    const cat = await getSlimCatalog();
    const body = name === "channels" ? cat.channels : name === "streams" ? cat.streams : cat.logos;
    return NextResponse.json(body, {
      headers: { "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch {
    return NextResponse.json({ error: "upstream_unavailable" }, { status: 502 });
  }
}
