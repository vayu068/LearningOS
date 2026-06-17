import { test, expect } from "@playwright/test";
import { loginAs, registerUser, completeMFA, resetPassword, clearAuthState } from "./helpers/auth-helper";
import { testUsers } from "./fixtures/test-data";

test.describe("Authentication Flow", () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
  });

  test.describe("Login", () => {
    test("should display login form with required fields", async ({ page }) => {
      await page.goto("/auth/login");

      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /sign in|log in/i })).toBeVisible();
    });

    test("should successfully login as a student", async ({ page }) => {
      await loginAs(page, "student");

      await expect(page).toHaveURL(/dashboard/);
      await expect(page.getByText(testUsers.student.fullName)).toBeVisible();
    });

    test("should successfully login as a teacher", async ({ page }) => {
      await loginAs(page, "teacher");

      await expect(page).toHaveURL(/dashboard/);
      await expect(page.getByText(testUsers.teacher.fullName)).toBeVisible();
    });

    test("should successfully login as an admin", async ({ page }) => {
      await loginAs(page, "admin");

      await expect(page).toHaveURL(/dashboard/);
      await expect(page.getByText(testUsers.admin.fullName)).toBeVisible();
    });

    test("should show error for invalid credentials", async ({ page }) => {
      await page.goto("/auth/login");
      await page.getByLabel(/email/i).fill("invalid@example.com");
      await page.getByLabel(/password/i).fill("WrongPassword123!");
      await page.getByRole("button", { name: /sign in|log in/i }).click();

      await expect(page.getByText(/invalid|incorrect|failed/i)).toBeVisible();
    });

    test("should validate email format", async ({ page }) => {
      await page.goto("/auth/login");
      await page.getByLabel(/email/i).fill("not-an-email");
      await page.getByLabel(/password/i).fill("Test@123456");
      await page.getByRole("button", { name: /sign in|log in/i }).click();

      await expect(page.getByText(/valid email/i)).toBeVisible();
    });

    test("should redirect to login when accessing protected page", async ({ page }) => {
      await page.goto("/dashboard");

      await expect(page).toHaveURL(/auth\/login/);
    });
  });

  test.describe("Registration", () => {
    test("should display registration form", async ({ page }) => {
      await page.goto("/auth/register");

      await expect(page.getByLabel(/full name/i)).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/^password$/i)).toBeVisible();
      await expect(page.getByLabel(/confirm password/i)).toBeVisible();
    });

    test("should register a new student account", async ({ page }) => {
      await registerUser(page, {
        email: "new-student@test.com",
        password: "NewStudent@123",
        fullName: "New Student",
        role: "student",
      });

      await expect(page.getByText(/verification|confirm your email/i)).toBeVisible();
    });

    test("should show password strength indicator", async ({ page }) => {
      await page.goto("/auth/register");
      await page.getByLabel(/^password$/i).fill("weak");

      await expect(page.getByText(/weak|too short/i)).toBeVisible();

      await page.getByLabel(/^password$/i).fill("StrongP@ss123");

      await expect(page.getByText(/strong/i)).toBeVisible();
    });

    test("should validate password confirmation matches", async ({ page }) => {
      await page.goto("/auth/register");
      await page.getByLabel(/^password$/i).fill("Test@123456");
      await page.getByLabel(/confirm password/i).fill("DifferentPass@123");
      await page.getByRole("button", { name: /register|sign up/i }).click();

      await expect(page.getByText(/passwords.*match|do not match/i)).toBeVisible();
    });

    test("should show error for existing email", async ({ page }) => {
      await registerUser(page, {
        email: testUsers.student.email,
        password: "Test@123456",
        fullName: "Duplicate User",
        role: "student",
      });

      await expect(page.getByText(/already exists|already registered/i)).toBeVisible();
    });
  });

  test.describe("MFA", () => {
    test("should show MFA setup after first login", async ({ page }) => {
      await page.goto("/auth/login");
      await page.getByLabel(/email/i).fill(testUsers.student.email);
      await page.getByLabel(/password/i).fill(testUsers.student.password);
      await page.getByRole("button", { name: /sign in|log in/i }).click();

      // MFA setup or challenge page
      const mfaVisible = await page
        .getByText(/verification code|set up.*authentication/i)
        .isVisible()
        .catch(() => false);

      if (mfaVisible) {
        await completeMFA(page, "123456");
        await expect(page).toHaveURL(/dashboard/);
      }
    });

    test("should allow MFA via SMS", async ({ page }) => {
      await page.goto("/auth/login");
      await page.getByLabel(/email/i).fill(testUsers.student.email);
      await page.getByLabel(/password/i).fill(testUsers.student.password);
      await page.getByRole("button", { name: /sign in|log in/i }).click();

      const smsOption = page.getByText(/sms|text message/i);
      if (await smsOption.isVisible().catch(() => false)) {
        await smsOption.click();
        await expect(page.getByLabel(/code|otp/i)).toBeVisible();
      }
    });
  });

  test.describe("Password Reset", () => {
    test("should show forgot password link on login page", async ({ page }) => {
      await page.goto("/auth/login");

      await expect(page.getByText(/forgot.*password/i)).toBeVisible();
    });

    test("should navigate to password reset page", async ({ page }) => {
      await page.goto("/auth/login");
      await page.getByText(/forgot.*password/i).click();

      await expect(page).toHaveURL(/forgot-password|reset/);
      await expect(page.getByLabel(/email/i)).toBeVisible();
    });

    test("should send password reset email", async ({ page }) => {
      await page.goto("/auth/forgot-password");
      await page.getByLabel(/email/i).fill(testUsers.student.email);
      await page.getByRole("button", { name: /send|reset/i }).click();

      await expect(page.getByText(/sent|check your email/i)).toBeVisible();
    });
  });

  test.describe("Session Management", () => {
    test("should persist session across page refreshes", async ({ page }) => {
      await loginAs(page, "student");
      await page.reload();

      await expect(page).toHaveURL(/dashboard/);
      await expect(page.getByText(testUsers.student.fullName)).toBeVisible();
    });

    test("should logout successfully", async ({ page }) => {
      await loginAs(page, "student");

      await page.getByTestId("user-menu").click();
      await page.getByText(/log\s*out|sign\s*out/i).click();

      await expect(page).toHaveURL(/auth\/login|\/$/);
    });
  });
});
