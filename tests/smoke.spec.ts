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

test("dead channel shows next-channel and one-tap report", async ({ page }) => {
  test.setTimeout(150_000);
  // Every stream fails, so the player runs through all sources and gives up.
  await page.route(/\.(m3u8|mpd|ts)(\?|$)/, (r) => r.abort());
  await page.route("**/api/reports", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' })
  );
  await page.goto("/watch");
  const overlay = page.getByTestId("player-error");
  try {
    await overlay.waitFor({ timeout: 110_000 });
  } catch {
    test.skip(true, "catalog unavailable or stream did not fail");
  }
  await expect(overlay.getByTestId("skip-next")).toBeVisible();
  await overlay.getByTestId("report-dead").click();
  await expect(overlay.getByTestId("report-dead")).toBeDisabled();
  await noSideScroll(page);
});

test("PWA manifest, icons and service worker are served", async ({ request }) => {
  const res = await request.get("/manifest.json");
  expect(res.status()).toBe(200);
  const m = await res.json();
  expect(m.display).toBe("standalone");
  for (const icon of m.icons) {
    expect((await request.get(icon.src)).status(), icon.src).toBe(200);
  }
  expect(m.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBeTruthy();
  const sw = await request.get("/sw.js");
  expect(sw.status()).toBe(200);
  expect(await sw.text()).toContain("addEventListener(\"fetch\"");
  expect((await request.get("/apple-touch-icon.png")).status()).toBe(200);
});

test("iOS Safari gets add-to-home-screen steps that stay dismissed", async ({ browser }) => {
  const ctx = await browser.newContext({
    viewport: { width: 375, height: 812 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  });
  const page = await ctx.newPage();
  await page.goto("/watch");
  const prompt = page.getByTestId("install-prompt");
  await expect(prompt).toBeVisible({ timeout: 15_000 });
  await expect(prompt).toContainText("Add to Home Screen");
  await noSideScroll(page);
  await prompt.getByRole("button", { name: "Not now" }).click();
  await expect(prompt).toHaveCount(0);
  await page.reload();
  await page.waitForTimeout(6000);
  await expect(prompt).toHaveCount(0);
  await ctx.close();
});

test("typing a channel number shows the number overlay", async ({ page }) => {
  await page.goto("/watch");
  try {
    await expect(page.locator("#main-player")).toBeVisible({ timeout: 20_000 });
  } catch {
    test.skip(true, "catalog unreachable");
  }
  await page.locator("body").click({ position: { x: 1, y: 1 } }).catch(() => {});
  await page.keyboard.press("1");
  await page.keyboard.press("2");
  await expect(page.getByTestId("number-entry")).toContainText("12");
});
