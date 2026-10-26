import { test } from "node:test";
import assert from "node:assert/strict";
import { decideRateLimit, memoryRateLimit, rateLimitPipeline } from "../lib/admin/rateLimit";

test("the count after the atomic update decides the result", () => {
  const now = 1_000_000;
  assert.equal(decideRateLimit({ count: 8, windowStart: now }, 8, now, 60_000).allowed, true);
  const r = decideRateLimit({ count: 9, windowStart: now - 10_000 }, 8, now, 60_000);
  assert.equal(r.allowed, false);
  assert.equal(r.retryAfter, 50_000);
});

test("the update is a single pipeline that resets old windows", () => {
  const p = rateLimitPipeline(100, 10);
  assert.equal(p.length, 1);
  assert.ok(JSON.stringify(p).includes("$add"));
});

test("memory fallback blocks after the limit", () => {
  const key = `t${Math.random()}`;
  const results = Array.from({ length: 5 }, () => memoryRateLimit(key, 3, 60_000).allowed);
  assert.deepEqual(results, [true, true, true, false, false]);
});
