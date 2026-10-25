import { test } from "node:test";
import assert from "node:assert/strict";
import { reliabilityFrom } from "../lib/server/insights";

test("reliability needs enough reports and the probe wins", () => {
  const r = reliabilityFrom(
    [
      { _id: "a", successes: 9, failures: 1 },
      { _id: "b", successes: 1, failures: 4 },
      { _id: "c", successes: 2, failures: 0 },
      { _id: "d", successes: 10, failures: 0 },
    ],
    [{ _id: "d", consecutiveFailures: 2, lastOkAt: null }, { _id: "e", consecutiveFailures: 0, lastOkAt: 1 }]
  );
  assert.deepEqual(r, { a: "good", b: "poor", d: "poor", e: "good" });
});
