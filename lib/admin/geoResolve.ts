import { getDb, IP_GEO_COLLECTION, RETENTION } from "@/lib/db/mongo";

interface IpGeoDoc {
  _id: string;
  country: string | null;
  countryCode: string | null;
  city: string | null;
  region: string | null;
  fetchedAt: number;
  failedAttempts?: number;
}

interface ResolvedGeo {
  country: string | null;
  countryCode: string | null;
  city: string | null;
  region: string | null;
}

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const FAIL_BACKOFF_MS = 24 * 60 * 60 * 1000; // don't retry failures for a day
const FETCH_TIMEOUT_MS = 3000;

function isPrivateIp(ip: string): boolean {
  if (!ip || ip === "unknown") return true;
  if (ip.startsWith("127.") || ip === "::1") return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  if (ip.startsWith("fc") || ip.startsWith("fd")) return true;
  return false;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// HTTPS lookup first (ipwho.is); ip-api.com's free tier is HTTP-only, so it is
// only a fallback. The IP passed in is already shortened (see anonymizeIp).
async function fetchGeo(ip: string): Promise<ResolvedGeo | null> {
  const a = await fetchJson<{
    success?: boolean;
    country?: string;
    country_code?: string;
    region?: string;
    city?: string;
  }>(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country,country_code,region,city`);
  if (a?.success) {
    return {
      country: a.country || null,
      countryCode: a.country_code || null,
      region: a.region || null,
      city: a.city || null,
    };
  }
  const b = await fetchJson<{
    status?: string;
    country?: string;
    countryCode?: string;
    region?: string;
    city?: string;
  }>(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,region,city`);
  if (b?.status !== "success") return null;
  return {
    country: b.country || null,
    countryCode: b.countryCode || null,
    region: b.region || null,
    city: b.city || null,
  };
}

export async function resolveIp(ip: string): Promise<ResolvedGeo> {
  const empty: ResolvedGeo = { country: null, countryCode: null, city: null, region: null };
  if (isPrivateIp(ip)) return empty;

  const db = await getDb();
  if (!db) return empty;

  const col = db.collection<IpGeoDoc>(IP_GEO_COLLECTION);
  const now = Date.now();
  const cached = await col.findOne({ _id: ip });

  if (cached) {
    const isFresh = cached.fetchedAt + CACHE_TTL_MS > now;
    const inBackoff =
      cached.failedAttempts && cached.fetchedAt + FAIL_BACKOFF_MS > now;
    if (isFresh || inBackoff) {
      return {
        country: cached.country,
        countryCode: cached.countryCode,
        city: cached.city,
        region: cached.region,
      };
    }
  }

  const fetched = await fetchGeo(ip);
  if (!fetched) {
    await col.updateOne(
      { _id: ip },
      {
        $set: { fetchedAt: now, expireAt: new Date(now + RETENTION.ipGeo), country: null, countryCode: null, city: null, region: null },
        $inc: { failedAttempts: 1 },
      },
      { upsert: true }
    );
    return empty;
  }

  await col.updateOne(
    { _id: ip },
    {
      $set: {
        country: fetched.country,
        countryCode: fetched.countryCode,
        city: fetched.city,
        region: fetched.region,
        fetchedAt: now,
        expireAt: new Date(now + RETENTION.ipGeo),
        failedAttempts: 0,
      },
    },
    { upsert: true }
  );
  return fetched;
}

export async function resolveIpsBulk(ips: string[]): Promise<Map<string, ResolvedGeo>> {
  const uniq = Array.from(new Set(ips));
  const results = await Promise.all(uniq.map((ip) => resolveIp(ip).then((g) => [ip, g] as const)));
  return new Map(results);
}
