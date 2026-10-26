import { test, expect } from "@playwright/test";

test("security headers include a CSP and allow the microphone for voice search", async ({ request }) => {
  const res = await request.get("/watch");
  const h = res.headers();
  expect(h["content-security-policy-report-only"]).toContain("object-src 'none'");
  expect(h["content-security-policy-report-only"]).toContain("frame-ancestors 'self'");
  expect(h["permissions-policy"]).toContain("microphone=(self)");
  expect(h["x-content-type-options"]).toBe("nosniff");
});
