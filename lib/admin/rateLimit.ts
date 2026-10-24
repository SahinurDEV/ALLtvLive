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
  const doc = await col.findOne({ _id: key });

  if (!doc || doc.windowStart + windowMs < now) {
    await col.updateOne(
      { _id: key },
      {
        $set: {
          count: 1,
          windowStart: now,
          expiresAt: now + windowMs,
        },
      },
      { upsert: true }
    );
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }

  if (doc.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(0, doc.windowStart + windowMs - now),
    };
  }

  await col.updateOne({ _id: key }, { $inc: { count: 1 } });
  return {
    allowed: true,
    remaining: limit - doc.count - 1,
    retryAfter: 0,
  };
}

// Fallback when MongoDB is not configured or unreachable: a per-instance
// in-memory window, so limits never silently switch off.
const memory = new Map<string, { count: number; windowStart: number }>();

function memoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
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
