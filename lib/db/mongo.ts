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
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = new MongoClient(uri).connect();
    }
    return global._mongoClientPromise;
  }
  return new MongoClient(uri).connect();
}

export async function getDb(): Promise<Db | null> {
  const promise = connect();
  if (!promise) return null;
  const client = await promise;
  return client.db(dbName);
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
