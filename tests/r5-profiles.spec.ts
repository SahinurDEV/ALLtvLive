import { test, expect } from "@playwright/test";

test("a Kids profile keeps its own data and turns kids mode on", async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("alltvlive-favorites", JSON.stringify(["x.bd"]));
      sessionStorage.setItem("seeded", "1");
    }
  });
  await page.goto("/watch");
  await page.getByRole("button", { name: "Open settings" }).first().click();
  await page.getByTestId("add-kids-profile").click();
  await page.waitForLoadState("load");
  await page.waitForFunction(() => !!localStorage.getItem("alltvlive-active-profile"));
  const state = await page.evaluate(() => {
    const id = localStorage.getItem("alltvlive-active-profile")!;
    return {
      kids: JSON.parse(localStorage.getItem(`alltvlive-settings@${id}`) || "{}").kidsMode,
      defaultFavs: localStorage.getItem("alltvlive-favorites"),
      profileFavs: localStorage.getItem(`alltvlive-favorites@${id}`),
    };
  });
  expect(state.kids).toBe(true);
  expect(state.defaultFavs).toBe('["x.bd"]');
  expect(state.profileFavs).toBeNull();
});
