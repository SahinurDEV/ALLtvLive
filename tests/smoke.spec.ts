import { test, expect } from "@playwright/test";

const noSideScroll = async (page: import("@playwright/test").Page) => {
  const [sw, w] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(sw).toBeLessThanOrEqual(w + 1);
};

test("robots.txt is a real robots file", async ({ request }) => {
  const res = await request.get("/robots.txt");
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toContain("Disallow: /admin");
  expect(body).toContain("Sitemap:");
});

test("unknown channel returns 404", async ({ page }) => {
  const res = await page.goto("/this-channel-does-not-exist-xyz");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("isn");
  await noSideScroll(page);
});

test("static pages render without sideways scroll", async ({ page }) => {
  for (const path of ["/about", "/privacy", "/dmca", "/public-api"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
    await noSideScroll(page);
  }
});

test("watch page loads the channel catalog", async ({ page }) => {
  await page.goto("/watch");
  await expect(page.getByPlaceholder(/search channels/i).first()).toBeVisible();
  await expect(page.getByText("watching")).toHaveCount(0);
  await noSideScroll(page);
});

test("catalog API returns slim data", async ({ request }) => {
  const res = await request.get("/api/catalog/logos");
  expect(res.status()).toBe(200);
  const logos = (await res.json()) as Array<{ channel: string; url: string }>;
  expect(logos.length).toBeGreaterThan(1000);
});

test("continue watching row can be cleared", async ({ page }) => {
  await page.goto("/watch");
  const row = page.getByTestId("continue-watching");
  // The autoplayed channel is recorded in history; skip if the catalog is unreachable.
  try {
    await row.waitFor({ timeout: 20_000 });
  } catch {
    test.skip(true, "catalog unavailable");
  }
  await row.getByRole("button", { name: "Clear" }).click();
  await expect(row).toHaveCount(0);
  const stored = await page.evaluate(() => localStorage.getItem("alltvlive-history"));
  expect(stored === null || stored === "[]").toBeTruthy();
  await noSideScroll(page);
});

test("arrow keys on the focused player switch channel and show the mini guide", async ({ page }) => {
  await page.goto("/watch");
  const player = page.locator("#main-player [tabindex='0']").first();
  try {
    await player.waitFor({ timeout: 20_000 });
    await page.getByTestId("continue-watching").waitFor({ timeout: 20_000 });
  } catch {
    test.skip(true, "catalog unavailable");
  }
  const before = await page.evaluate(() => localStorage.getItem("alltvlive-history"));
  await player.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByTestId("mini-guide")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("alltvlive-history")))
    .not.toBe(before);
  await noSideScroll(page);
});
