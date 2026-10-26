import { test, expect } from "@playwright/test";

const infiniteNonCss = () =>
  document
    .getAnimations()
    .filter((a) => a.effect?.getTiming().iterations === Infinity && !(a instanceof CSSAnimation)).length;

test("landing page loops run as CSS, not JS animation", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(2500);
  expect(await page.evaluate(infiniteNonCss)).toBe(0);
  expect(await page.locator(".atl-marquee").count()).toBe(1);
});

test("channel cards do not run endless animations", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("alltvlive-settings", JSON.stringify({ autoplay: false })));
  await page.goto("/watch");
  await expect(page.locator(".atl-card-in").first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1500);
  const running = await page.evaluate(
    () => document.getAnimations().filter((a) => (a.effect as KeyframeEffect | null)?.target?.closest?.(".atl-card-in") && a.effect?.getTiming().iterations === Infinity).length
  );
  expect(running).toBe(0);
});

test("hls.js is not in the landing page bundle", async ({ page }) => {
  const scripts: string[] = [];
  page.on("response", async (r) => {
    if (r.url().includes("/_next/static/chunks/") && r.url().endsWith(".js")) scripts.push(await r.text().catch(() => ""));
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(scripts.some((s) => s.includes("hls.js") && s.includes("MANIFEST_PARSED"))).toBe(false);
});
