import { test } from "node:test";
import assert from "node:assert/strict";
import { publicRateLimit, PUBLIC_LIMITS } from "../lib/server/publicRateLimit";

test("public APIs return 429 after the per-IP limit", () => {
  const req = new Request("http://x/api/sports", { headers: { "x-real-ip": `10.0.0.${Math.floor(Math.random() * 250)}` } });
  for (let i = 0; i < PUBLIC_LIMITS.sports; i++) assert.equal(publicRateLimit(req, "sports"), null);
  const r = publicRateLimit(req, "sports");
  assert.equal(r?.status, 429);
  assert.ok(Number(r?.headers.get("retry-after")) > 0);
});

test("limits are per endpoint", () => {
  const req = new Request("http://x/api/epg", { headers: { "x-real-ip": "10.9.9.9" } });
  assert.equal(publicRateLimit(req, "epg"), null);
  assert.equal(publicRateLimit(req, "top"), null);
});
