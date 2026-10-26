import { test, expect } from "@playwright/test";

test("offline, /watch still opens with the channel list from the cache", async ({ page, context }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => localStorage.setItem("alltvlive-settings", JSON.stringify({ autoplay: false })));
  await page.goto("/watch");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // Second visit goes through the worker, which saves the page, assets and catalog.
  await page.reload();
  await expect(page.locator(".atl-card-in").first()).toBeVisible({ timeout: 40_000 });
  await page.waitForTimeout(3000);
  const names = await page.evaluate(async () => (await caches.keys()).filter((k) => k.startsWith("atl-")));
  expect(names).toContain("atl-data");
  expect(names.filter((n) => n !== "atl-data")).toHaveLength(1);
  expect(names.some((n) => n === "atl-v1")).toBe(false);

  await context.setOffline(true);
  await page.goto("/watch");
  await expect(page.locator(".atl-card-in").first()).toBeVisible({ timeout: 30_000 });
  await context.setOffline(false);
});

test("offline, an unknown page shows the offline page", async ({ page, context }) => {
  await page.goto("/about");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForTimeout(1500);
  await context.setOffline(true);
  await page.goto("/privacy").catch(() => {});
  await expect(page.locator("body")).toContainText("You're offline");
  await context.setOffline(false);
});
