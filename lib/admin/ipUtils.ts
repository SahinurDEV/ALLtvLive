import crypto from "crypto";

function firstOf(list: string | null): string | null {
  if (!list) return null;
  const first = list.split(",")[0]?.trim();
  return first || null;
}

function lastOf(list: string | null): string | null {
  if (!list) return null;
  const parts = list.split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : null;
}

/**
 * Best-effort client IP.
 *
 * On Vercel, `x-vercel-forwarded-for` and `x-real-ip` are set by the platform
 * and cannot be spoofed by the client, so they win. Elsewhere we fall back to
 * the right-most `x-forwarded-for` hop (the one added by the nearest proxy)
 * instead of the left-most value, which any client can forge.
 */
export function extractIp(req: Request): string {
  const h = req.headers;
  return (
    firstOf(h.get("x-vercel-forwarded-for")) ||
    h.get("x-real-ip")?.trim() ||
    lastOf(h.get("x-forwarded-for")) ||
    "unknown"
  );
}

/**
 * Drop the host part of an IP before storing it: IPv4 keeps /24
 * (1.2.3.4 -> 1.2.3.0), IPv6 keeps /48. Still good enough for
 * country/city analytics, but no longer identifies a single household.
 */
export function anonymizeIp(ip: string): string {
  if (!ip || ip === "unknown") return "unknown";
  if (ip === "::1" || ip === "127.0.0.1") return ip;
  if (ip.includes(".") && !ip.includes(":")) {
    const p = ip.split(".");
    if (p.length === 4) return `${p[0]}.${p[1]}.${p[2]}.0`;
    return "unknown";
  }
  if (ip.includes(":")) {
    const v4 = ip.match(/(\d+\.\d+\.\d+)\.\d+$/);
    if (v4) return `${v4[1]}.0`;
    const groups = ip.split(":").filter((g) => g !== "");
    return `${groups.slice(0, 3).join(":")}::`;
  }
  return "unknown";
}

/** One-way, salted hash of the full IP, for "one vote per visitor" keys. */
export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT || process.env.SESSION_SECRET || "alltvlive";
  return crypto.createHmac("sha256", salt).update(ip).digest("hex").slice(0, 32);
}
