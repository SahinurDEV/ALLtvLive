import { test, expect } from "@playwright/test";

test("a Kids profile with a PIN cannot switch profiles without it", async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.setItem("alltvlive-profiles", JSON.stringify([
      { id: "default", name: "Me", kids: false, emoji: "🙂" },
      { id: "pkid", name: "Kid", kids: true, emoji: "🧸" },
    ]));
    localStorage.setItem("alltvlive-active-profile", "pkid");
    localStorage.setItem("alltvlive-settings@pkid", JSON.stringify({ kidsMode: true, autoplay: false }));
    localStorage.setItem("alltvlive-parental", JSON.stringify({ kidsPin: "1234", parentalPin: null, lockedCategories: [] }));
  });
  await page.goto("/watch");
  await page.getByRole("button", { name: /settings/i }).first().click();
  const section = page.getByTestId("profiles");
  await expect(section.getByTestId("profiles-pin")).toBeVisible();
  await expect(section.getByRole("button", { name: /Me/ })).toBeDisabled();
  await section.getByLabel("Enter PIN").fill("9999");
  await section.getByRole("button", { name: "Unlock" }).click();
  await expect(section.getByTestId("profiles-pin")).toBeVisible();
  await section.getByLabel("Enter PIN").fill("1234");
  await section.getByRole("button", { name: "Unlock" }).click();
  await expect(section.getByTestId("profiles-pin")).toHaveCount(0);
  await expect(section.getByRole("button", { name: /Me/ })).toBeEnabled();
});

test("the parental PIN is shared by every profile", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("alltvlive-active-profile", "pother");
    localStorage.setItem("alltvlive-profiles", JSON.stringify([{ id: "pother", name: "Other", kids: false, emoji: "📺" }]));
    localStorage.setItem("alltvlive-parental", JSON.stringify({ parentalPin: "1234", kidsPin: null, lockedCategories: ["news"] }));
  });
  await page.goto("/watch");
  const s = await page.evaluate(() => localStorage.getItem("alltvlive-settings@pother"));
  expect(s ?? "").not.toContain("parentalPin");
});

test("multi-view search hides PIN-locked categories", async ({ page, request }) => {
  const channels = (await (await request.get("/api/catalog/channels")).json()) as Array<{ id: string; name: string; categories: string[] }>;
  const target = channels.find((c) => c.categories?.length === 1 && c.categories[0] === "news" && c.name.length > 5);
  test.skip(!target, "no news channel");
  await page.addInitScript(() => {
    localStorage.setItem("alltvlive-parental", JSON.stringify({ parentalPin: "1234", kidsPin: null, lockedCategories: ["news"] }));
  });
  await page.goto("/multiview");
  const box = page.getByRole("textbox").first();
  await page.waitForTimeout(4000);
  await box.fill(target!.name);
  await page.waitForTimeout(800);
  await expect(page.getByRole("button", { name: new RegExp(`^${target!.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) })).toHaveCount(0);
});

test("multi-view respects kids mode", async ({ page, request }) => {
  const channels = (await (await request.get("/api/catalog/channels")).json()) as Array<{ id: string; name: string; categories: string[] }>;
  const target = channels.find((c) => c.categories?.length === 1 && c.categories[0] === "news" && c.name.length > 5);
  test.skip(!target, "no news channel");
  await page.addInitScript(() => localStorage.setItem("alltvlive-settings", JSON.stringify({ kidsMode: true })));
  await page.goto("/multiview");
  await page.waitForTimeout(4000);
  await page.getByRole("textbox").first().fill(target!.name);
  await page.waitForTimeout(800);
  await expect(page.getByRole("button", { name: new RegExp(`^${target!.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) })).toHaveCount(0);
});
