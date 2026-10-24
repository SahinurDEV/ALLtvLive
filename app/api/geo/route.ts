import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Visitor country from the hosting platform's edge headers (Vercel or
 * Cloudflare). No third-party lookup and no IP leaves the server.
 */
export async function GET(req: Request) {
  const raw =
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("cf-ipcountry") ||
    "";
  const code = raw.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code) || code === "XX" || code === "T1") {
    return NextResponse.json({ ok: false }, { headers: { "cache-control": "private, no-store" } });
  }
  let name = code;
  try {
    name = new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code;
  } catch {
    // keep the code
  }
  return NextResponse.json(
    { ok: true, code, name },
    { headers: { "cache-control": "private, no-store" } }
  );
}
