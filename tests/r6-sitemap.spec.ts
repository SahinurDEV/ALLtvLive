import { test, expect } from "@playwright/test";

test("sitemap.xml is an index of small cached sitemap files", async ({ request }) => {
  const idx = await request.get("/sitemap.xml");
  expect(idx.ok()).toBe(true);
  const body = await idx.text();
  expect(body).toContain("<sitemapindex");
  expect(body).toContain("/sitemap/0.xml");
  const first = await request.get("/sitemap/0.xml");
  expect(first.ok()).toBe(true);
  const xml = await first.text();
  expect(xml).toContain("<urlset");
  expect(xml.length).toBeLessThan(700_000);
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("/sitemap.xml");
});
