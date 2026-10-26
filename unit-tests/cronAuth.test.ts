import { test } from "node:test";
import assert from "node:assert/strict";
import { cronAuth } from "../lib/server/cronAuth";

const h = (o: Record<string, string>) => new Headers(o);

test("with a secret only the bearer token works", () => {
  assert.equal(cronAuth(h({ authorization: "Bearer s3" }), "s3"), "secret");
  assert.equal(cronAuth(h({ authorization: "Bearer no" }), "s3"), "denied");
  assert.equal(cronAuth(h({ "user-agent": "vercel-cron/1.0" }), "s3"), "denied");
});

test("without a secret Vercel Cron gets the once-a-day fallback", () => {
  assert.equal(cronAuth(h({ "user-agent": "vercel-cron/1.0" }), undefined), "fallback");
  assert.equal(cronAuth(h({ "user-agent": "curl/8" }), undefined), "denied");
  assert.equal(cronAuth(h({}), ""), "denied");
});
