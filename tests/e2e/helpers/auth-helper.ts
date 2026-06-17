/**
 * Authentication helpers for E2E tests.
 * Manages login state, token storage, and tenant context setup.
 */

import { type Page, type BrowserContext } from "@playwright/test";
import { testUsers } from "../fixtures/test-data";

type UserRole = keyof typeof testUsers;

/**
 * Authenticates a user by filling the login form.
 */
export async function loginAs(page: Page, role: UserRole): Promise<void> {
  const user = testUsers[role];

  await page.goto("/auth/login");
  await page.waitForLoadState("networkidle");

  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();

  // Wait for redirect to dashboard
  await page.waitForURL("**/dashboard**", { timeout: 10000 });
}

/**
 * Registers a new user account.
 */
export async function registerUser(
  page: Page,
  data: {
    email: string;
    password: string;
    fullName: string;
    role: string;
  }
): Promise<void> {
  await page.goto("/auth/register");
  await page.waitForLoadState("networkidle");

  await page.getByLabel(/full name/i).fill(data.fullName);
  await page.getByLabel(/email/i).fill(data.email);
  await page.getByLabel(/^password$/i).fill(data.password);
  await page.getByLabel(/confirm password/i).fill(data.password);
  await page.getByLabel(/role/i).selectOption(data.role);
  await page.getByRole("button", { name: /register|sign up/i }).click();
}

/**
 * Sets up authenticated state by storing auth tokens in browser context.
 * Useful for skipping login flow in tests that focus on other features.
 */
export async function setupAuthState(
  context: BrowserContext,
  role: UserRole
): Promise<void> {
  const user = testUsers[role];

  // Set mock auth tokens in local storage
  await context.addInitScript((userData) => {
    window.localStorage.setItem(
      "auth_state",
      JSON.stringify({
        accessToken: `mock-access-token-${userData.role}`,
        refreshToken: `mock-refresh-token-${userData.role}`,
        user: {
          id: `user-${userData.role}-001`,
          email: userData.email,
          fullName: userData.fullName,
          role: userData.role,
          tenantId: userData.tenantId,
        },
        expiresAt: Date.now() + 3600 * 1000, // 1 hour from now
      })
    );
  }, user);
}

/**
 * Clears authentication state (logout).
 */
export async function clearAuthState(page: Page): Promise<void> {
  // Navigate to a valid page first if on about:blank to enable localStorage access
  const currentUrl = page.url();
  if (currentUrl === "about:blank" || currentUrl === "") {
    await page.goto("/", { waitUntil: "domcontentloaded" });
  }
  await page.evaluate(() => {
    window.localStorage.removeItem("auth_state");
    window.localStorage.removeItem("tenant_context");
  });
}

/**
 * Sets the tenant context for multi-tenant testing.
 */
export async function setTenantContext(
  context: BrowserContext,
  tenantId: string,
  subdomain: string
): Promise<void> {
  await context.addInitScript(
    ({ tenantId, subdomain }) => {
      window.localStorage.setItem(
        "tenant_context",
        JSON.stringify({ tenantId, subdomain })
      );
    },
    { tenantId, subdomain }
  );
}

/**
 * Waits for the user to be fully authenticated and dashboard loaded.
 */
export async function waitForAuthenticated(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="user-menu"], [data-testid="dashboard"]', {
    timeout: 10000,
  });
}

/**
 * Performs MFA verification during login.
 */
export async function completeMFA(page: Page, code: string): Promise<void> {
  await page.getByLabel(/verification code|otp/i).fill(code);
  await page.getByRole("button", { name: /verify|confirm/i }).click();
  await page.waitForURL("**/dashboard**", { timeout: 10000 });
}

/**
 * Handles password reset flow.
 */
export async function resetPassword(
  page: Page,
  email: string,
  newPassword: string,
  resetCode: string
): Promise<void> {
  await page.goto("/auth/forgot-password");
  await page.getByLabel(/email/i).fill(email);
  await page.getByRole("button", { name: /send|reset/i }).click();

  // Wait for code input
  await page.waitForSelector('[data-testid="reset-code-input"]');
  await page.getByLabel(/code|otp/i).fill(resetCode);
  await page.getByLabel(/new password/i).fill(newPassword);
  await page.getByLabel(/confirm/i).fill(newPassword);
  await page.getByRole("button", { name: /reset|update/i }).click();
}
