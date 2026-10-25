import { test, expect } from "@playwright/test";

test("locked category asks for the parental PIN", async ({ page, request }) => {
  const channels = (await (await request.get("/api/catalog/channels")).json()) as Array<{ id: string; categories: string[] }>;
  const target = channels.find((c) => c.categories?.includes("news"));
  test.skip(!target, "no news channel in catalog");
  await page.addInitScript(() => {
    localStorage.setItem(
      "alltvlive-settings",
      JSON.stringify({ autoplay: false, parentalPin: "1234", lockedCategories: ["news"] })
    );
  });
  await page.goto(`/${encodeURIComponent(target!.id)}`);
  const gate = page.getByTestId("pin-gate");
  await expect(gate).toBeVisible({ timeout: 20_000 });
  await gate.getByLabel("PIN").fill("9999");
  await gate.getByRole("button", { name: "Unlock" }).click();
  await expect(gate.getByText("Wrong PIN")).toBeVisible();
  await gate.getByLabel("PIN").fill("1234");
  await gate.getByRole("button", { name: "Unlock" }).click();
  await expect(gate).toHaveCount(0);
  await expect(page.locator("#main-player")).toBeVisible();
});
