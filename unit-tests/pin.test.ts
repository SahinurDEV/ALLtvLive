import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPin, pinMatches, tryPin, MAX_PIN_TRIES, PIN_COOLDOWN_MS } from "../lib/pin";

const mem = new Map<string, string>();
(globalThis as unknown as { window: object }).window = globalThis;
(globalThis as unknown as { localStorage: object }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
};


test("PIN is stored hashed and still matches", () => {
  const h = hashPin("1234");
  assert.ok(h.startsWith("h1:"));
  assert.ok(!h.includes("1234"));
  assert.equal(pinMatches(h, "1234"), true);
  assert.equal(pinMatches(h, "4321"), false);
});

test("legacy plain PIN still matches", () => {
  assert.equal(pinMatches("1234", "1234"), true);
  assert.equal(pinMatches(null, "1234"), false);
});

test("too many wrong tries start a cooldown", () => {
  const h = hashPin("1111");
  const now = 5_000_000;
  for (let i = 0; i < MAX_PIN_TRIES; i++) assert.equal(tryPin(h, "0000", now), "wrong");
  assert.equal(tryPin(h, "1111", now + 1000), "cooldown");
  assert.equal(tryPin(h, "1111", now + PIN_COOLDOWN_MS + 1), "ok");
});
