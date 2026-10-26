import { test, expect } from "@playwright/test";

test("canonical links and the sitemap use one domain", async ({ page, request }) => {
  const channels = (await (await request.get("/api/catalog/channels")).json()) as Array<{ id: string }>;
  await page.goto(`/${encodeURIComponent(channels[0].id)}`);
  const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
  const expected = process.env.NEXT_PUBLIC_SITE_URL || "https://livetv.sahinur.dev";
  expect(canonical?.startsWith(expected)).toBe(true);
  const idx = await (await request.get("/sitemap.xml")).text();
  expect(idx).toContain(`${expected}/sitemap/0.xml`);
});

test("every page has WebSite structured data", async ({ page }) => {
  await page.goto("/");
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(ld.some((t) => t.includes('"WebSite"') && t.includes("SearchAction"))).toBe(true);
});

test("/watch?q= opens with that search", async ({ page }) => {
  await page.goto("/watch?q=news");
  await expect(page.getByPlaceholder(/search/i).first()).toHaveValue("news", { timeout: 20_000 });
});
