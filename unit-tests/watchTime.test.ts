import { test } from "node:test";
import assert from "node:assert/strict";
import { computeStats, dayKey } from "../lib/history/watchTime";

test("stats sum the last 7 days and rank channels", () => {
  const now = new Date(2026, 9, 25, 12);
  const d = (n: number) => dayKey(new Date(now.getTime() - n * 86400000));
  const s = computeStats({ [d(0)]: { a: 600, b: 60 }, [d(1)]: { a: 120 }, [d(9)]: { c: 9999 } }, now);
  assert.equal(s.days.length, 7);
  assert.equal(s.totalSeconds, 780);
  assert.deepEqual(s.top.map((t) => t.channelId), ["a", "b"]);
  assert.equal(s.streakDays, 2);
});
