import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "livetv";

if (!uri && process.env.NODE_ENV !== "production") {
  // eslint-disable-next-line no-console
  console.warn(
    "[mongo] MONGODB_URI not set — featured channel persistence disabled."
  );
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function connect(): Promise<MongoClient> | null {
  if (!uri) return null;
  // Reuse one client per server instance (dev and prod). Creating a new
  // MongoClient per request leaks connections on serverless platforms.
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri).connect();
  }
  return global._mongoClientPromise;
}

const DAY = 24 * 60 * 60 * 1000;

/** How long personal-ish data is kept before MongoDB deletes it (TTL). */
export const RETENTION = {
  history: 90 * DAY,
  reports: 180 * DAY,
  audit: 180 * DAY,
  ipGeo: 30 * DAY,
} as const;

let indexesReady: Promise<void> | null = null;

function ensureIndexes(db: Db): Promise<void> {
  if (!indexesReady) {
    const ttl = { expireAfterSeconds: 0 };
    indexesReady = Promise.all(
      [HISTORY_COLLECTION, REPORTS_COLLECTION, AUDIT_LOG_COLLECTION, IP_GEO_COLLECTION].map((c) =>
        db.collection(c).createIndex({ expireAt: 1 }, ttl)
      )
    )
      .then(() => undefined)
      .catch((err) => {
        indexesReady = null;
        // eslint-disable-next-line no-console
        console.warn("[mongo] could not create TTL indexes", err);
      });
  }
  return indexesReady;
}

export async function getDb(): Promise<Db | null> {
  const promise = connect();
  if (!promise) return null;
  const client = await promise;
  const db = client.db(dbName);
  void ensureIndexes(db);
  return db;
}

export const FEATURED_COLLECTION = "featuredChannels";
export const FEATURED_DOC_ID = "current";

export const BROADCAST_COLLECTION = "broadcastChannels";
export const BROADCAST_DOC_ID = "current";

export const HISTORY_COLLECTION = "viewHistory";
export const IP_GEO_COLLECTION = "ipGeo";
export const STREAM_HEALTH_COLLECTION = "streamHealth";
export const AUDIT_LOG_COLLECTION = "auditLog";
export const RATINGS_COLLECTION = "ratings";
export const REPORTS_COLLECTION = "reports";
export const RATE_LIMIT_COLLECTION = "rateLimits";
