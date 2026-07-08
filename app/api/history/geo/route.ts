import { NextResponse } from "next/server";
import { getDb, HISTORY_COLLECTION, IP_GEO_COLLECTION } from "@/lib/db/mongo";
import { isAuthenticated } from "@/lib/admin/auth";
import { resolveIpsBulk } from "@/lib/admin/geoResolve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_RANGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_IPS_TO_RESOLVE = 60;

export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const rangeRaw = url.searchParams.get("rangeMs");
  const rangeMs =
    rangeRaw && /^\d+$/.test(rangeRaw) ? Number(rangeRaw) : DEFAULT_RANGE_MS;

  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({
        countries: [],
        cities: [],
        totalPlays: 0,
        unresolvedIps: 0,
        source: "fallback",
      });
    }

    const historyCol = db.collection(HISTORY_COLLECTION);
    const since = Date.now() - rangeMs;

    const ipAgg = await historyCol
      .aggregate([
        { $match: { playedAt: { $gte: since } } },
        { $group: { _id: "$ip", plays: { $sum: 1 } } },
        { $sort: { plays: -1 } },
      ])
      .toArray();

    const totalPlays = ipAgg.reduce((sum, e) => sum + Number(e.plays || 0), 0);

    // Pull cached geo for all IPs; resolve missing ones (bounded)
    interface IpGeoDoc {
      _id: string;
      country: string | null;
      countryCode: string | null;
      city: string | null;
      region: string | null;
    }
    const geoCol = db.collection<IpGeoDoc>(IP_GEO_COLLECTION);
    const ips = ipAgg.map((e) => String(e._id));
    const cached = await geoCol.find({ _id: { $in: ips } }).toArray();
    const cachedMap = new Map<string, IpGeoDoc>(cached.map((c) => [c._id, c]));

    const unresolvedIps = ips.filter((ip) => !cachedMap.has(ip));
    const toResolve = unresolvedIps.slice(0, MAX_IPS_TO_RESOLVE);
    if (toResolve.length > 0) {
      const resolved = await resolveIpsBulk(toResolve);
      for (const [ip, geo] of resolved) {
        cachedMap.set(ip, {
          _id: ip,
          country: geo.country,
          countryCode: geo.countryCode,
          city: geo.city,
          region: geo.region,
        });
      }
    }

    const countryMap = new Map<
      string,
      { country: string; countryCode: string | null; plays: number; ips: number }
    >();
    const cityMap = new Map<
      string,
      { city: string; country: string; countryCode: string | null; plays: number; ips: number }
    >();

    for (const entry of ipAgg) {
      const ip = String(entry._id);
      const plays = Number(entry.plays) || 0;
      const geo = cachedMap.get(ip);
      const country = geo?.country || "Unknown";
      const countryCode = geo?.countryCode || null;
      const city = geo?.city || null;

      const cKey = country;
      const c = countryMap.get(cKey);
      if (c) {
        c.plays += plays;
        c.ips += 1;
      } else {
        countryMap.set(cKey, { country, countryCode, plays, ips: 1 });
      }

      if (city && country !== "Unknown") {
        const key = `${country}|${city}`;
        const existing = cityMap.get(key);
        if (existing) {
          existing.plays += plays;
          existing.ips += 1;
        } else {
          cityMap.set(key, { city, country, countryCode, plays, ips: 1 });
        }
      }
    }

    const countries = Array.from(countryMap.values()).sort((a, b) => b.plays - a.plays);
    const cities = Array.from(cityMap.values()).sort((a, b) => b.plays - a.plays).slice(0, 30);

    return NextResponse.json({
      countries,
      cities,
      totalPlays,
      unresolvedIps: Math.max(0, unresolvedIps.length - toResolve.length),
      source: "db",
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[api/history/geo]", err);
    return NextResponse.json({
      countries: [],
      cities: [],
      totalPlays: 0,
      unresolvedIps: 0,
      source: "fallback",
      error: "db_read_failed",
    });
  }
}
