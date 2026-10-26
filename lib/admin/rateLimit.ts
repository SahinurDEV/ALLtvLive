import { getDb, RATE_LIMIT_COLLECTION } from "@/lib/db/mongo";

interface RateLimitDoc {
  _id: string;
  count: number;
  windowStart: number;
  expiresAt: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const db = await getDb().catch(() => null);
  if (!db) return memoryRateLimit(key, limit, windowMs);

  const now = Date.now();
  const col = db.collection<RateLimitDoc>(RATE_LIMIT_COLLECTION);
  // One atomic update: start a new window or add 1, so parallel requests
  // can never all read the same old count and slip past the limit.
  const doc = await col.findOneAndUpdate({ _id: key }, rateLimitPipeline(now, windowMs), {
    upsert: true,
    returnDocument: "after",
  });
  return decideRateLimit(doc, limit, now, windowMs);
}

/** Aggregation-pipeline update used by checkRateLimit (exported for tests). */
export function rateLimitPipeline(now: number, windowMs: number) {
  const reset = { $or: [{ $not: ["$windowStart"] }, { $lt: ["$windowStart", now - windowMs] }] };
  return [
    {
      $set: {
        count: { $cond: [reset, 1, { $add: ["$count", 1] }] },
        expiresAt: { $cond: [reset, now + windowMs, "$expiresAt"] },
        windowStart: { $cond: [reset, now, "$windowStart"] },
      },
    },
  ];
}

export function decideRateLimit(
  doc: Pick<RateLimitDoc, "count" | "windowStart"> | null,
  limit: number,
  now: number,
  windowMs: number
): RateLimitResult {
  const count = doc?.count ?? 1;
  const windowStart = doc?.windowStart ?? now;
  if (count > limit) {
    return { allowed: false, remaining: 0, retryAfter: Math.max(0, windowStart + windowMs - now) };
  }
  return { allowed: true, remaining: limit - count, retryAfter: 0 };
}

// Fallback when MongoDB is not configured or unreachable: a per-instance
// in-memory window, so limits never silently switch off.
const memory = new Map<string, { count: number; windowStart: number }>();

export function memoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  if (memory.size > 10_000) {
    for (const [k, v] of memory) if (v.windowStart + windowMs < now) memory.delete(k);
  }
  const entry = memory.get(key);
  if (!entry || entry.windowStart + windowMs < now) {
    memory.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }
  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, retryAfter: entry.windowStart + windowMs - now };
  }
  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count, retryAfter: 0 };
}
