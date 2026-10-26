import { test, expect } from "@playwright/test";

test("hidden channels stay out of results until shown again", async ({ page, request }) => {
  const channels = (await (await request.get("/api/catalog/channels")).json()) as Array<{ id: string; name: string }>;
  const target = channels.find((c) => c.id === "ATNBangla.bd") ?? channels[100];
  await page.addInitScript((id) => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("alltvlive-hidden-channels", JSON.stringify([id]));
      localStorage.setItem("alltvlive-settings", JSON.stringify({ autoplay: false }));
      sessionStorage.setItem("seeded", "1");
    }
  }, target.id);
  await page.goto("/watch");
  const box = page.getByLabel(/search channels/i).first();
  await expect(box).toBeVisible({ timeout: 20_000 });
  await box.fill(target.name);
  await expect(page.getByText(/Results for/).first()).toBeVisible();
  await expect(page.locator(`[aria-label="Play ${target.name}"]`)).toHaveCount(0);

  await page.getByRole("button", { name: "Open settings" }).first().click();
  await page.getByTestId("unhide-all").click();
  await page.keyboard.press("Escape");
  await expect(page.locator(`[aria-label="Play ${target.name}"]`).first()).toBeAttached({ timeout: 10_000 });
});
