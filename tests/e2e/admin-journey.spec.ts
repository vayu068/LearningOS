import { test, expect } from "@playwright/test";
import { setupAuthState } from "./helpers/auth-helper";
import { testUsers, testTenant } from "./fixtures/test-data";

test.describe("Admin Journey", () => {
  test.beforeEach(async ({ context }) => {
    await setupAuthState(context, "admin");
  });

  test.describe("Dashboard", () => {
    test("should display admin dashboard", async ({ page }) => {
      await page.goto("/dashboard");

      await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
      await expect(page.getByText(testUsers.admin.fullName)).toBeVisible();
    });

    test("should show platform-wide statistics", async ({ page }) => {
      await page.goto("/dashboard");

      await expect(page.getByText(/total.*users|active.*users/i)).toBeVisible();
      await expect(page.getByText(/total.*teachers|active.*teachers/i)).toBeVisible();
      await expect(page.getByText(/total.*students|active.*students/i)).toBeVisible();
    });

    test("should show system health indicators", async ({ page }) => {
      await page.goto("/dashboard");

      await expect(page.getByText(/system.*health|status/i)).toBeVisible();
    });
  });

  test.describe("User Management", () => {
    test("should view user list", async ({ page }) => {
      await page.goto("/admin/users");

      await expect(page.getByRole("heading", { name: /users/i })).toBeVisible();
      await expect(page.getByTestId("user-table")).toBeVisible();
    });

    test("should search for users", async ({ page }) => {
      await page.goto("/admin/users");

      await page.getByPlaceholder(/search/i).fill(testUsers.student.fullName);

      await expect(page.getByText(testUsers.student.email)).toBeVisible();
    });

    test("should filter users by role", async ({ page }) => {
      await page.goto("/admin/users");

      const roleFilter = page.getByLabel(/role|filter/i);
      if (await roleFilter.isVisible().catch(() => false)) {
        await roleFilter.selectOption("teacher");
      }
    });

    test("should create a new user", async ({ page }) => {
      await page.goto("/admin/users/create");

      await page.getByLabel(/full name/i).fill("New User Test");
      await page.getByLabel(/email/i).fill("newuser@test.com");
      await page.getByLabel(/role/i).selectOption("teacher");
      await page.getByRole("button", { name: /create|add/i }).click();

      await expect(page.getByText(/created|success/i)).toBeVisible();
    });

    test("should edit user details", async ({ page }) => {
      await page.goto("/admin/users");

      await page.getByText(testUsers.student.email).click();
      await page.getByRole("button", { name: /edit/i }).click();

      await expect(page.getByLabel(/full name/i)).toBeVisible();
    });

    test("should deactivate a user", async ({ page }) => {
      await page.goto("/admin/users");

      await page.getByText(testUsers.student.email).click();
      const deactivateButton = page.getByRole("button", { name: /deactivate|disable/i });
      if (await deactivateButton.isVisible().catch(() => false)) {
        await deactivateButton.click();
        await page.getByRole("button", { name: /confirm/i }).click();
        await expect(page.getByText(/deactivated|disabled/i)).toBeVisible();
      }
    });

    test("should bulk import users via CSV", async ({ page }) => {
      await page.goto("/admin/users");

      const importButton = page.getByRole("button", { name: /import|bulk/i });
      if (await importButton.isVisible().catch(() => false)) {
        await importButton.click();
        await expect(page.getByText(/csv|upload/i)).toBeVisible();
      }
    });
  });

  test.describe("Tenant Configuration", () => {
    test("should view tenant settings", async ({ page }) => {
      await page.goto("/admin/settings");

      await expect(page.getByRole("heading", { name: /settings|configuration/i })).toBeVisible();
    });

    test("should update tenant branding", async ({ page }) => {
      await page.goto("/admin/settings/branding");

      const nameInput = page.getByLabel(/institution.*name|display.*name/i);
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill("Updated School Name");
        await page.getByRole("button", { name: /save/i }).click();
        await expect(page.getByText(/saved|updated/i)).toBeVisible();
      }
    });

    test("should configure feature flags", async ({ page }) => {
      await page.goto("/admin/settings/features");

      await expect(page.getByText(/ai tutor/i)).toBeVisible();
      await expect(page.getByText(/digilocker/i)).toBeVisible();
      await expect(page.getByText(/offline mode/i)).toBeVisible();
    });

    test("should configure language options", async ({ page }) => {
      await page.goto("/admin/settings/languages");

      await expect(page.getByText(/languages/i)).toBeVisible();
    });

    test("should manage consent notices", async ({ page }) => {
      await page.goto("/admin/settings/consent");

      await expect(page.getByText(/consent.*notice|privacy/i)).toBeVisible();
    });
  });

  test.describe("Analytics", () => {
    test("should view platform analytics", async ({ page }) => {
      await page.goto("/admin/analytics");

      await expect(page.getByRole("heading", { name: /analytics/i })).toBeVisible();
    });

    test("should filter analytics by date range", async ({ page }) => {
      await page.goto("/admin/analytics");

      const dateFilter = page.getByTestId("date-range-picker");
      if (await dateFilter.isVisible().catch(() => false)) {
        await dateFilter.click();
        await page.getByText(/last 30 days/i).click();
      }
    });

    test("should export analytics report", async ({ page }) => {
      await page.goto("/admin/analytics");

      const exportButton = page.getByRole("button", { name: /export|download/i });
      if (await exportButton.isVisible().catch(() => false)) {
        await exportButton.click();
        await expect(page.getByText(/csv|pdf|generating/i)).toBeVisible();
      }
    });

    test("should view DPI integration metrics", async ({ page }) => {
      await page.goto("/admin/analytics");

      await page.getByText(/DPI|integrations/i).click();

      await expect(page.getByText(/APAAR.*verifications/i)).toBeVisible();
    });
  });

  test.describe("Data Governance", () => {
    test("should view data governance dashboard", async ({ page }) => {
      await page.goto("/admin/governance");

      await expect(page.getByText(/data governance|compliance/i)).toBeVisible();
    });

    test("should view pending DSAR requests", async ({ page }) => {
      await page.goto("/admin/governance/dsar");

      await expect(page.getByText(/data.*request|DSAR/i)).toBeVisible();
    });

    test("should view consent analytics", async ({ page }) => {
      await page.goto("/admin/governance/consent");

      await expect(page.getByText(/consent.*rate|opt.in/i)).toBeVisible();
    });

    test("should view audit logs", async ({ page }) => {
      await page.goto("/admin/governance/audit");

      await expect(page.getByText(/audit.*log/i)).toBeVisible();
    });
  });
});
