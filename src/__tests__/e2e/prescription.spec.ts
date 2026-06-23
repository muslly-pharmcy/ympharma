import { test, expect } from "@playwright/test";

test.describe("Prescription upload flow", () => {
  test("upload page is reachable (auth-protected redirects to /auth)", async ({ page }) => {
    const res = await page.goto("/upload-prescription");
    // Either the upload UI is visible, or the auth gate redirected us.
    const url = page.url();
    expect(res?.ok() || /auth|login|sign-in/i.test(url)).toBeTruthy();
  });
});
