import { test } from "node:test";
import assert from "node:assert/strict";
import { applyBackup, collectBackup } from "../lib/backup";

function kv(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init));
  return { m, keys: () => [...m.keys()], get: (k: string) => m.get(k) ?? null, set: (k: string, v: string) => void m.set(k, v) };
}

test("export includes every profile and the shared lock", () => {
  const s = kv({
    "alltvlive-favorites": '["a"]',
    "alltvlive-favorites@p1": '["b"]',
    "alltvlive-profiles": '[{"id":"p1"}]',
    "alltvlive-parental": '{"parentalPin":"h1:x:y"}',
    "alltvlive-pin-fails": '{"count":3}',
    "other-app": "1",
  });
  const b = collectBackup(s);
  assert.equal(b.version, 2);
  assert.deepEqual(Object.keys(b.data).sort(), ["alltvlive-favorites", "alltvlive-favorites@p1", "alltvlive-parental", "alltvlive-profiles"]);
});

test("round trip restores profile data", () => {
  const b = collectBackup(kv({ "alltvlive-history@p1": '[{"id":"x"}]', "alltvlive-profiles": '[{"id":"p1"}]' }));
  const target = kv();
  applyBackup(target, JSON.parse(JSON.stringify(b)));
  assert.equal(target.get("alltvlive-history@p1"), '[{"id":"x"}]');
  assert.equal(target.get("alltvlive-profiles"), '[{"id":"p1"}]');
});

test("import never removes this device's lock or kids mode", () => {
  const target = kv({
    "alltvlive-parental": '{"parentalPin":"h1:a:b"}',
    "alltvlive-settings@kid": '{"kidsMode":true}',
  });
  applyBackup(target, {
    app: "alltvlive",
    version: 1,
    data: { "alltvlive-parental": { parentalPin: null }, "alltvlive-settings@kid": { kidsMode: false, parentalPin: "0000" } },
  });
  assert.equal(target.get("alltvlive-parental"), '{"parentalPin":"h1:a:b"}');
  const s = JSON.parse(target.get("alltvlive-settings@kid")!);
  assert.equal(s.kidsMode, true);
  assert.equal(s.parentalPin, undefined);
});

test("rejects files that are not backups", () => {
  assert.throws(() => applyBackup(kv(), { app: "x" }));
});
