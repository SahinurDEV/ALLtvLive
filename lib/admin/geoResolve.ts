import { getDb, IP_GEO_COLLECTION } from "@/lib/db/mongo";

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

async function fetchGeo(ip: string): Promise<ResolvedGeo | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,region,city`,
      { signal: controller.signal, cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status?: string;
      country?: string;
      countryCode?: string;
      region?: string;
      city?: string;
    };
    if (data.status !== "success") return null;
    return {
      country: data.country || null,
      countryCode: data.countryCode || null,
      region: data.region || null,
      city: data.city || null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
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
        $set: { fetchedAt: now, country: null, countryCode: null, city: null, region: null },
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
