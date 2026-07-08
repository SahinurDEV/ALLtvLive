import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "alltvlive_admin";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

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

function buildToken(): string {
  const issuedAt = Date.now().toString();
  const sig = sign(issuedAt);
  return `${issuedAt}.${sig}`;
}

function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const [issuedAt, sig] = token.split(".");
  if (!issuedAt || !sig) return false;
  const expected = sign(issuedAt);
  if (!timingSafeEq(sig, expected)) return false;
  const ageMs = Date.now() - Number(issuedAt);
  if (!Number.isFinite(ageMs) || ageMs < 0) return false;
  return ageMs <= MAX_AGE_SECONDS * 1000;
}

export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  if (input.length !== expected.length) return false;
  return timingSafeEq(input, expected);
}

export async function issueSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, buildToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
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
  const token = jar.get(COOKIE_NAME)?.value;
  return verifyToken(token);
}
