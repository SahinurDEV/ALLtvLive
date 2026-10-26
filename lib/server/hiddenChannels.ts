import { getDb } from "@/lib/db/mongo";
import { getHiddenChannelIds } from "@/lib/server/streamProbe";

const TTL_MS = 10 * 60_000;
let cache: { at: number; ids: Promise<Set<string>> } | null = null;

/** Channels the daily health check hides as dead (cached per instance for 10 minutes). */
export function getHiddenSet(): Promise<Set<string>> {
  if (!cache || Date.now() - cache.at > TTL_MS) {
    const ids = (async () => {
      try {
        const db = await getDb();
        return new Set(db ? await getHiddenChannelIds(db) : []);
      } catch {
        return new Set<string>();
      }
    })();
    cache = { at: Date.now(), ids };
  }
  return cache.ids;
}
