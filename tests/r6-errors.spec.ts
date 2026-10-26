import { test, expect } from "@playwright/test";

test("a player crash stays inside the player and can be retried", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("alltvlive-settings", JSON.stringify({ autoplay: false }));
    if (!sessionStorage.getItem("seeded")) {
      sessionStorage.setItem("seeded", "1");
      sessionStorage.setItem("atl-test-crash-player", "1");
    }
  });
  await page.goto("/watch");
  const box = page.getByTestId("player-error-boundary");
  await expect(box).toBeVisible({ timeout: 30_000 });
  await expect(page.getByLabel(/search channels/i).first()).toBeVisible();
  await box.getByRole("button", { name: "Reload player" }).click();
  await expect(box).toHaveCount(0);
});
