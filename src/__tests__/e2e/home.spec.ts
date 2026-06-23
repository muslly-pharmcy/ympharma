import { test, expect } from "@playwright/test";

test.describe("Home page", () => {
  test("loads successfully with Arabic title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/صيدلية|المصلي|ALMOSLY|Almosly/i);
  });

  test("renders main landmark", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("main, [role=main]").first()).toBeVisible();
  });

  test("navigation to products works", async ({ page }) => {
    await page.goto("/");
    const link = page.locator('a[href*="/products"]').first();
    if (await link.count()) {
      await link.click();
      await expect(page).toHaveURL(/products/);
    }
  });
});
