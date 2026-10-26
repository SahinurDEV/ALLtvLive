import { test, expect } from "@playwright/test";

test("voice search fills the search box when speech recognition exists", async ({ page }) => {
  await page.addInitScript(() => {
    class FakeRecognition {
      lang = "";
      interimResults = false;
      maxAlternatives = 1;
      onresult: ((e: unknown) => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        setTimeout(() => {
          this.onresult?.({ results: [[{ transcript: "news" }]] });
          this.onend?.();
        }, 50);
      }
      stop() {
        this.onend?.();
      }
    }
    const w = window as unknown as { webkitSpeechRecognition: unknown; SpeechRecognition: unknown };
    w.webkitSpeechRecognition = FakeRecognition;
    w.SpeechRecognition = FakeRecognition;
  });
  await page.goto("/watch");
  const mic = page.locator("[data-testid=voice-search]:visible").first();
  await expect(mic).toBeVisible({ timeout: 20_000 });
  await mic.click();
  await expect(page.getByText(/Results for "news"/).first()).toBeVisible({ timeout: 10_000 });
});

test("voice search is hidden without speech recognition", async ({ page }) => {
  await page.addInitScript(() => {
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
  });
  await page.goto("/watch");
  await expect(page.getByLabel(/search channels/i).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("voice-search")).toHaveCount(0);
});
