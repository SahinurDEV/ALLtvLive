import { test } from "node:test";
import assert from "node:assert/strict";
import { dueReminders } from "../lib/reminders";

test("reminders fire within a minute of the start and not long after", () => {
  const now = 1_000_000_000;
  const mk = (start: number, fired = false) => ({ id: String(start), channelId: "a", channelName: "A", title: "T", start, fired });
  const due = dueReminders([mk(now + 30_000), mk(now + 5 * 60_000), mk(now - 60 * 60_000), mk(now, true)], now);
  assert.deepEqual(due.map((r) => r.start), [now + 30_000]);
});
