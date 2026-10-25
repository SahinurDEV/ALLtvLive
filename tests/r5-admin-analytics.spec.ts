import { test, expect } from "@playwright/test";

test("channel analytics API needs an admin session", async ({ request }) => {
  const res = await request.get("/api/history/channels");
  expect(res.status()).toBe(401);
});
