import { test, expect } from "@playwright/test";

test.describe("Products page", () => {
  test("renders product grid or empty state", async ({ page }) => {
    await page.goto("/products");
    // Either products render, or a clear empty/loading state is shown.
    const indicator = page.locator("article, [data-testid=product-card], text=/جاري|لا يوجد|المنتجات/");
    await expect(indicator.first()).toBeVisible({ timeout: 15_000 });
  });
});
