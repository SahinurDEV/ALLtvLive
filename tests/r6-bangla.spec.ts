import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("alltvlive-lang", "bn");
    localStorage.setItem("alltvlive-settings", JSON.stringify({ autoplay: false }));
  });
});

test("landing page is in Bangla", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("সারা বিশ্বের");
  await expect(page.getByText("ফ্রি দেখা শুরু করুন").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test("404 page is in Bangla", async ({ page }) => {
  await page.goto("/zz-not-a-channel-xyz");
  await expect(page.locator("h1")).toHaveText("এই পেজ বা চ্যানেলটি নেই");
});

test("watch hero bar uses Bangla text and digits", async ({ page }) => {
  await page.goto("/watch");
  await expect(page.getByText("এখন লাইভ").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("চ্যানেল", { exact: true }).first()).toBeVisible();
  // Channel count shown with Bangla digits once the catalog loads
  await expect(page.locator("text=/[০-৯]{1,2},?[০-৯]{3}/").first()).toBeVisible({ timeout: 30_000 });
});
