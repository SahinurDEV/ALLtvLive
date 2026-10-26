/**
 * Backup of everything ALLtvLive keeps in this browser, for every profile.
 * Version 2 includes profile keys (key@profileId), the profile list and the
 * shared parental lock. Version 1 files (default profile only) still import.
 */
export const BACKUP_PREFIX = "alltvlive-";
/** Keys that are device state, not user data. */
const SKIP = new Set(["alltvlive-pin-fails", "alltvlive-install-dismissed"]);
export const PARENTAL_KEY = "alltvlive-parental";

export interface Backup {
  app: "alltvlive";
  version: 1 | 2;
  exportedAt: string;
  data: Record<string, unknown>;
}

interface KV {
  keys(): string[];
  get(k: string): string | null;
  set(k: string, v: string): void;
}

export function collectBackup(store: KV, now = new Date()): Backup {
  const data: Record<string, unknown> = {};
  for (const k of store.keys()) {
    if (!k.startsWith(BACKUP_PREFIX) || SKIP.has(k)) continue;
    const raw = store.get(k);
    if (raw == null) continue;
    try {
      data[k] = JSON.parse(raw);
    } catch {
      data[k] = raw;
    }
  }
  return { app: "alltvlive", version: 2, exportedAt: now.toISOString(), data };
}

function parse(raw: string | null): Record<string, unknown> | null {
  try {
    const v = JSON.parse(raw || "null");
    return v && typeof v === "object" ? v : null;
  } catch {
    return null;
  }
}

/**
 * Write a backup into the store. A backup never removes a PIN lock that is set
 * on this device, and never switches off kids mode on a profile that has it on.
 * Returns the number of keys written.
 */
export function applyBackup(store: KV, backup: unknown): number {
  const b = backup as Partial<Backup>;
  if (!b || b.app !== "alltvlive" || !b.data || typeof b.data !== "object") throw new Error("not a backup");
  const currentLock = parse(store.get(PARENTAL_KEY));
  const deviceLocked = !!(currentLock && (currentLock.parentalPin || currentLock.kidsPin));
  let n = 0;
  for (const [k, value] of Object.entries(b.data)) {
    if (!k.startsWith(BACKUP_PREFIX) || SKIP.has(k)) continue;
    if (k === PARENTAL_KEY && deviceLocked) continue;
    let v = value;
    if (k.startsWith("alltvlive-settings")) {
      const cur = parse(store.get(k));
      if (cur?.kidsMode && v && typeof v === "object") v = { ...(v as object), kidsMode: true };
      if (deviceLocked && v && typeof v === "object") {
        // Old (v1) backups kept PINs inside settings; ignore them when locked.
        const o = { ...(v as Record<string, unknown>) };
        delete o.parentalPin;
        delete o.kidsPin;
        delete o.lockedCategories;
        v = o;
      }
    }
    store.set(k, typeof v === "string" ? v : JSON.stringify(v));
    n++;
  }
  return n;
}

export function browserKV(): KV {
  return {
    keys: () => Object.keys(localStorage),
    get: (k) => localStorage.getItem(k),
    set: (k, v) => localStorage.setItem(k, v),
  };
}
