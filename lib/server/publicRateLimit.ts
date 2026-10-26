import { NextResponse } from "next/server";
import { extractIp } from "@/lib/admin/ipUtils";
import { memoryRateLimit } from "@/lib/admin/rateLimit";

/** Per-IP limits for public read APIs (per instance, in memory: no DB cost). */
export const PUBLIC_LIMITS = {
  epg: 120,
  sports: 60,
  foryou: 60,
  top: 60,
  insights: 60,
} as const;

/** Returns a 429 response when this IP is over the limit, otherwise null. */
export function publicRateLimit(req: Request, name: keyof typeof PUBLIC_LIMITS, windowMs = 60_000): NextResponse | null {
  const rl = memoryRateLimit(`pub:${name}:${extractIp(req)}`, PUBLIC_LIMITS[name], windowMs);
  if (rl.allowed) return null;
  return NextResponse.json(
    { ok: false, error: "rate_limited" },
    { status: 429, headers: { "retry-after": Math.ceil(rl.retryAfter / 1000).toString(), "cache-control": "no-store" } }
  );
}
