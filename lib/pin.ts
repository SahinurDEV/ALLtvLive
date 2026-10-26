/**
 * Local PIN helpers. PINs are stored as a salted hash (never the plain digits)
 * and wrong guesses trigger a short cooldown. This is a soft, on-device lock.
 */
const FAILS_KEY = "alltvlive-pin-fails";
export const MAX_PIN_TRIES = 5;
export const PIN_COOLDOWN_MS = 60_000;

function fnv(str: string): string {
  // Two rounds of FNV-1a 32-bit, iterated to slow down guessing a little.
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let r = 0; r < 500; r++) {
    for (let i = 0; i < str.length; i++) {
      h1 = Math.imul(h1 ^ str.charCodeAt(i), 0x01000193) >>> 0;
      h2 = Math.imul(h2 ^ (str.charCodeAt(i) + r), 0x811c9dc5) >>> 0;
    }
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}

export function hashPin(pin: string, salt?: string): string {
  const s = salt ?? Math.random().toString(36).slice(2, 10);
  return `h1:${s}:${fnv(`${s}:${pin}`)}`;
}

export function isHashedPin(stored: string | null | undefined): boolean {
  return typeof stored === "string" && stored.startsWith("h1:");
}

/** Compare an entered PIN with a stored one (hashed, or legacy plain digits). */
export function pinMatches(stored: string | null | undefined, input: string): boolean {
  if (!stored) return false;
  if (!isHashedPin(stored)) return stored === input;
  const [, salt] = stored.split(":");
  return hashPin(input, salt) === stored;
}

interface Fails { count: number; until: number }
function readFails(): Fails {
  try {
    const v = JSON.parse(localStorage.getItem(FAILS_KEY) || "{}");
    return { count: Number(v.count) || 0, until: Number(v.until) || 0 };
  } catch {
    return { count: 0, until: 0 };
  }
}

/** Milliseconds left before another PIN try is allowed (0 = allowed). */
export function pinCooldownLeft(now = Date.now()): number {
  if (typeof window === "undefined") return 0;
  return Math.max(0, readFails().until - now);
}

/**
 * Check a PIN with cooldown: returns "ok", "wrong" or "cooldown".
 */
export function tryPin(stored: string | null | undefined, input: string, now = Date.now()): "ok" | "wrong" | "cooldown" {
  if (pinCooldownLeft(now) > 0) return "cooldown";
  const ok = pinMatches(stored, input);
  try {
    if (ok) localStorage.removeItem(FAILS_KEY);
    else {
      const f = readFails();
      const count = f.count + 1;
      localStorage.setItem(
        FAILS_KEY,
        JSON.stringify(count >= MAX_PIN_TRIES ? { count: 0, until: now + PIN_COOLDOWN_MS } : { count, until: 0 })
      );
    }
  } catch {
    // ignore
  }
  return ok ? "ok" : "wrong";
}
