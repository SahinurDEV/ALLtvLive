import { getDb, AUDIT_LOG_COLLECTION } from "@/lib/db/mongo";
import { extractIp } from "./ipUtils";

interface AuditEntry {
  action: string;
  actorIp: string;
  actorUa: string | null;
  meta?: Record<string, unknown> | null;
  at: number;
}

const MAX_META_JSON = 4000;

function safeMeta(meta: Record<string, unknown> | undefined): Record<string, unknown> | null {
  if (!meta) return null;
  try {
    const json = JSON.stringify(meta);
    if (json.length > MAX_META_JSON) {
      return { note: "meta_truncated", size: json.length };
    }
    return meta;
  } catch {
    return { note: "meta_unserializable" };
  }
}

export async function logAudit(
  req: Request,
  action: string,
  meta?: Record<string, unknown>
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    const entry: AuditEntry = {
      action,
      actorIp: extractIp(req),
      actorUa: req.headers.get("user-agent")?.slice(0, 300) || null,
      meta: safeMeta(meta),
      at: Date.now(),
    };
    await db.collection<AuditEntry>(AUDIT_LOG_COLLECTION).insertOne(entry);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[audit] failed to write entry", err);
  }
}
