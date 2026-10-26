import { test, expect } from "@playwright/test";

test("country landing page lists crawlable channel links", async ({ page }) => {
  const res = await page.goto("/country/bd");
  expect(res?.status()).toBe(200);
  await expect(page.locator("h1")).toContainText("BD");
  expect(await page.locator('main a[href^="/"]').count()).toBeGreaterThan(3);
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(ld.some((t) => t.includes("ItemList"))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test("category landing page shows Bangla heading", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("alltvlive-lang", "bn"));
  await page.goto("/category/news");
  await expect(page.locator("h1")).toContainText("লাইভ টিভি চ্যানেল");
});

test("unknown landing pages are 404", async ({ page }) => {
  const res = await page.goto("/country/zz-not-real");
  expect(res?.status()).toBe(404);
});
