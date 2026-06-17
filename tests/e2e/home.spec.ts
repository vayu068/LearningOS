import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("should display the landing page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/LearningOS/);
  });

  test("should display the main heading", async ({ page }) => {
    await page.goto("/");
    const heading = page.getByRole("heading", { name: /LearningOS/ });
    await expect(heading).toBeVisible();
  });

  test("should mention DPI integration", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Digital Public Infrastructure/)).toBeVisible();
  });
});
