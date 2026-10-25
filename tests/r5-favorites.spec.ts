import { test, expect } from "@playwright/test";

test("favorites can be grouped and reordered", async ({ page, request }) => {
  const logos = (await (await request.get("/api/catalog/logos")).json()) as Array<{ channel: string }>;
  const ids = logos.slice(0, 3).map((l) => l.channel);
  await page.addInitScript((favs) => {
    if (!localStorage.getItem("alltvlive-favorites")) localStorage.setItem("alltvlive-favorites", JSON.stringify(favs));
  }, ids);
  await page.goto("/watch");
  await page.locator("button:visible", { hasText: /Favorites/ }).first().dispatchEvent("click");
  const view = page.getByTestId("favorites-view");
  await expect(view).toBeVisible({ timeout: 20_000 });

  await view.getByPlaceholder("New group").fill("News");
  await view.getByRole("button", { name: "Add group" }).click();
  await expect(view.getByRole("tab", { name: "News" })).toHaveAttribute("aria-selected", "true");

  await view.getByTestId("fav-arrange").click();
  await view.getByRole("button", { name: "Move down" }).first().click();
  const order = await page.evaluate(() => JSON.parse(localStorage.getItem("alltvlive-favorites") || "[]"));
  expect(order).toEqual([ids[1], ids[0], ids[2]]);

  await view.getByRole("button", { name: "+ News" }).first().click();
  await view.getByTestId("fav-arrange").click();
  const groups = await page.evaluate(() => JSON.parse(localStorage.getItem("alltvlive-fav-groups") || "[]"));
  expect(groups[0].channelIds).toEqual([ids[1]]);
});
