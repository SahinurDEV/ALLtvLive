import { test, expect } from "@playwright/test";

test("channel pages have a generated Open Graph card", async ({ request }) => {
  const logos = (await (await request.get("/api/catalog/logos")).json()) as Array<{ channel: string }>;
  const id = logos[0].channel;
  const html = await (await request.get(`/${encodeURIComponent(id)}`)).text();
  expect(html).toContain(`/og/${encodeURIComponent(id)}`);
  expect(html).toContain('summary_large_image');
  const img = await request.get(`/og/${encodeURIComponent(id)}`);
  expect(img.status()).toBe(200);
  expect(img.headers()["content-type"]).toContain("image/png");
});
