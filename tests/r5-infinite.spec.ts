import { test, expect } from "@playwright/test";

test("the All Channels grid loads more as you scroll", async ({ page }) => {
  await page.goto("/watch");
  const sentinel = page.getByTestId("grid-sentinel").last();
  await expect(sentinel).toBeAttached({ timeout: 20_000 });
  const before = await page.locator("[aria-label^='Play ']").count();
  await sentinel.scrollIntoViewIfNeeded();
  await expect.poll(async () => page.locator("[aria-label^='Play ']").count(), { timeout: 10_000 }).toBeGreaterThan(before);
});
