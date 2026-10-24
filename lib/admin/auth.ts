import crypto from "crypto";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db/mongo";

const SESSIONS_COLLECTION = "adminSessions";

const COOKIE_NAME = "alltvlive_admin";
const MAX_AGE_SECONDS = 60 * 60 * 24; // 1 day

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET is not set. Add a strong random value to .env.local."
    );
  }
  return secret;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function timingSafeEq(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

// Token: `<issuedAt>.<sessionId>.<hmac>`. With MongoDB configured, each
// session id must also exist in `adminSessions`, so logout really revokes it.
function buildToken(sid: string): string {
  const issuedAt = Date.now().toString();
  return `${issuedAt}.${sid}.${sign(`${issuedAt}.${sid}`)}`;
}

function parseToken(token: string | undefined): { sid: string } | null {
  if (!token) return null;
  const [issuedAt, sid, sig] = token.split(".");
  if (!issuedAt || !sid || !sig) return null;
  if (!timingSafeEq(sig, sign(`${issuedAt}.${sid}`))) return null;
  const ageMs = Date.now() - Number(issuedAt);
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > MAX_AGE_SECONDS * 1000) return null;
  return { sid };
}

type SessionDoc = { _id: string; createdAt: Date; expireAt: Date };

async function sessions() {
  const db = await getDb().catch(() => null);
  if (!db) return null;
  const col = db.collection<SessionDoc>(SESSIONS_COLLECTION);
  void col.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {});
  return col;
}

// ---- optional TOTP second factor (RFC 6238, 30 s, 6 digits) ----

function base32Decode(input: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | alphabet.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function totpAt(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac("sha1", secret).update(buf).digest();
  const off = h[h.length - 1] & 0xf;
  const code = (h.readUInt32BE(off) & 0x7fffffff) % 1_000_000;
  return code.toString().padStart(6, "0");
}

/** True when ADMIN_TOTP_SECRET is set, i.e. a 6-digit code is required. */
export function totpRequired(): boolean {
  return !!process.env.ADMIN_TOTP_SECRET;
}

export function checkTotp(code: unknown): boolean {
  const secretB32 = process.env.ADMIN_TOTP_SECRET;
  if (!secretB32) return true;
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) return false;
  const secret = base32Decode(secretB32);
  const step = Math.floor(Date.now() / 30_000);
  return [-1, 0, 1].some((d) => timingSafeEq(totpAt(secret, step + d), code));
}

export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  if (input.length !== expected.length) return false;
  return timingSafeEq(input, expected);
}

export async function issueSessionCookie(): Promise<void> {
  const sid = crypto.randomBytes(16).toString("hex");
  const col = await sessions();
  if (col) {
    const now = Date.now();
    await col.insertOne({
      _id: sid,
      createdAt: new Date(now),
      expireAt: new Date(now + MAX_AGE_SECONDS * 1000),
    });
  }
  const jar = await cookies();
  jar.set(COOKIE_NAME, buildToken(sid), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  const parsed = parseToken(jar.get(COOKIE_NAME)?.value);
  if (parsed) {
    const col = await sessions();
    await col?.deleteOne({ _id: parsed.sid }).catch(() => {});
  }
  jar.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function isAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  const parsed = parseToken(jar.get(COOKIE_NAME)?.value);
  if (!parsed) return false;
  const col = await sessions();
  if (!col) return true; // no DB: signed token only
  const doc = await col.findOne({ _id: parsed.sid }).catch(() => null);
  return !!doc && doc.expireAt.getTime() > Date.now();
}
