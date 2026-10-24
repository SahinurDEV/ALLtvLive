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
