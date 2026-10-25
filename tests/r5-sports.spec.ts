import { test, expect } from "@playwright/test";

test("sports hub renders and works at phone width", async ({ page }) => {
  const res = await page.goto("/sports");
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Sports hub");
  const [sw, w] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(sw).toBeLessThanOrEqual(w + 1);
});
