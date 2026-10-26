import { test, expect } from "@playwright/test";

test("search placeholder fits at 375px and is full on desktop", async ({ page }) => {
  await page.goto("/watch");
  const box = page.getByLabel(/search channels/i).first();
  await expect(box).toBeVisible({ timeout: 20_000 });
  const ph = await box.getAttribute("placeholder");
  if (page.viewportSize()!.width < 640) expect(ph).toBe("Search");
  else expect(ph).toContain("Search channels");
});

test("Bangla short placeholder on phones", async ({ page }) => {
  test.skip(page.viewportSize()!.width >= 640, "phone only");
  await page.addInitScript(() => localStorage.setItem("alltvlive-lang", "bn"));
  await page.goto("/watch");
  await expect(page.getByLabel("চ্যানেল খুঁজুন").first()).toHaveAttribute("placeholder", "খুঁজুন", { timeout: 20_000 });
});

test("landing page: carousel dots are big enough to tap and there is no button inside the link", async ({ page }) => {
  await page.goto("/");
  const dot = page.getByRole("button", { name: "Show channel 1" });
  const box = await dot.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(24);
  expect(box!.width).toBeGreaterThanOrEqual(24);
  expect(await page.locator('a[href="/watch"] button').count()).toBe(0);
});

test("no page scrolls sideways at 375px", async ({ page }) => {
  test.skip(page.viewportSize()!.width >= 640, "phone only");
  for (const path of ["/", "/watch", "/sports", "/multiview", "/about", "/country/bd"]) {
    await page.goto(path);
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(375);
  }
});
