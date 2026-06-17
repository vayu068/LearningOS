import { test, expect } from "@playwright/test";
import { loginAs, setupAuthState } from "./helpers/auth-helper";
import { testUsers, testContent, testLearningSession } from "./fixtures/test-data";

test.describe("Student Journey", () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAuthState(context, "student");
  });

  test.describe("Dashboard", () => {
    test("should display student dashboard after login", async ({ page }) => {
      await page.goto("/dashboard");

      await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
      await expect(page.getByText(testUsers.student.fullName)).toBeVisible();
    });

    test("should show learning progress overview", async ({ page }) => {
      await page.goto("/dashboard");

      await expect(page.getByText(/progress|completion/i)).toBeVisible();
      await expect(page.getByTestId("progress-chart")).toBeVisible();
    });

    test("should display upcoming assessments", async ({ page }) => {
      await page.goto("/dashboard");

      await expect(page.getByText(/upcoming|assessments/i)).toBeVisible();
    });

    test("should show recent activity feed", async ({ page }) => {
      await page.goto("/dashboard");

      await expect(page.getByText(/recent|activity/i)).toBeVisible();
    });

    test("should display subject cards", async ({ page }) => {
      await page.goto("/dashboard");

      for (const subject of testContent.subjects) {
        await expect(page.getByText(subject.name)).toBeVisible();
      }
    });
  });

  test.describe("AI Tutor", () => {
    test("should start a new AI tutor session", async ({ page }) => {
      await page.goto("/dashboard");
      await page.getByText(/ai tutor|start learning/i).click();

      await expect(page.getByTestId("tutor-chat")).toBeVisible();
    });

    test("should select a subject and topic", async ({ page }) => {
      await page.goto("/learn");

      // Select subject
      await page.getByText("Mathematics").click();

      // Select topic
      await page.getByText("Quadratic Equations").click();

      await expect(page.getByTestId("tutor-chat")).toBeVisible();
    });

    test("should send a message to the AI tutor", async ({ page }) => {
      await page.goto("/learn/session/new?subject=math-10&topic=topic-quadratic");

      const chatInput = page.getByPlaceholder(/type.*message|ask.*question/i);
      await expect(chatInput).toBeVisible();

      await chatInput.fill("Explain quadratic equations with an example");
      await page.getByRole("button", { name: /send/i }).click();

      // Wait for AI response
      await expect(page.getByTestId("message-assistant")).toBeVisible({ timeout: 15000 });
    });

    test("should display typing indicator while AI responds", async ({ page }) => {
      await page.goto("/learn/session/new?subject=math-10&topic=topic-quadratic");

      const chatInput = page.getByPlaceholder(/type.*message|ask.*question/i);
      await chatInput.fill("What is the quadratic formula?");
      await page.getByRole("button", { name: /send/i }).click();

      await expect(page.getByTestId("typing-indicator")).toBeVisible();
    });

    test("should show suggested follow-up questions", async ({ page }) => {
      await page.goto("/learn/session/new?subject=math-10&topic=topic-quadratic");

      const chatInput = page.getByPlaceholder(/type.*message|ask.*question/i);
      await chatInput.fill("What is a quadratic equation?");
      await page.getByRole("button", { name: /send/i }).click();

      await expect(page.getByTestId("suggestions")).toBeVisible({ timeout: 15000 });
    });

    test("should support language switching in tutor", async ({ page }) => {
      await page.goto("/learn");

      const languageSelector = page.getByTestId("language-selector");
      if (await languageSelector.isVisible().catch(() => false)) {
        await languageSelector.selectOption("hi");
        await expect(page.getByText(/हिन्दी|हिंदी/)).toBeVisible();
      }
    });
  });

  test.describe("Assessment", () => {
    test("should view available assessments", async ({ page }) => {
      await page.goto("/assessments");

      await expect(page.getByRole("heading", { name: /assessment/i })).toBeVisible();
    });

    test("should start a quiz assessment", async ({ page }) => {
      await page.goto("/assessments");

      await page.getByText("Quadratic Equations Quiz").click();
      await page.getByRole("button", { name: /start|begin/i }).click();

      await expect(page.getByTestId("assessment-question")).toBeVisible();
    });

    test("should navigate between questions", async ({ page }) => {
      await page.goto("/assessments/assessment-001/take");

      // Answer first question
      await expect(page.getByText(/question 1/i)).toBeVisible();

      await page.getByRole("button", { name: /next/i }).click();

      await expect(page.getByText(/question 2/i)).toBeVisible();
    });

    test("should submit assessment and view results", async ({ page }) => {
      await page.goto("/assessments/assessment-001/take");

      // Fill answer
      const answerInput = page.getByTestId("answer-input");
      if (await answerInput.isVisible().catch(() => false)) {
        await answerInput.fill("x = 2, x = 3");
      }

      await page.getByRole("button", { name: /submit|finish/i }).click();

      // Confirm submission
      await page.getByRole("button", { name: /confirm|yes/i }).click();

      // View results
      await expect(page.getByText(/score|result|marks/i)).toBeVisible();
    });

    test("should show timer during timed assessment", async ({ page }) => {
      await page.goto("/assessments/assessment-001/take");

      await expect(page.getByTestId("assessment-timer")).toBeVisible();
    });
  });

  test.describe("DPI Integration", () => {
    test("should view APAAR profile in settings", async ({ page }) => {
      await page.goto("/settings/dpi");

      await expect(page.getByText(/APAAR/i)).toBeVisible();
      await expect(page.getByText(testUsers.student.apaarId)).toBeVisible();
    });

    test("should link DigiLocker account", async ({ page }) => {
      await page.goto("/settings/dpi");

      const linkButton = page.getByRole("button", { name: /link.*digilocker/i });
      await expect(linkButton).toBeVisible();
    });

    test("should view ABC credit balance", async ({ page }) => {
      await page.goto("/settings/dpi");

      await expect(page.getByText(/academic bank|credits/i)).toBeVisible();
    });
  });

  test.describe("Profile", () => {
    test("should view user profile", async ({ page }) => {
      await page.goto("/profile");

      await expect(page.getByText(testUsers.student.fullName)).toBeVisible();
      await expect(page.getByText(testUsers.student.email)).toBeVisible();
    });

    test("should update preferred language", async ({ page }) => {
      await page.goto("/profile/settings");

      const languageSelect = page.getByLabel(/language|preferred language/i);
      if (await languageSelect.isVisible().catch(() => false)) {
        await languageSelect.selectOption("hi");
        await page.getByRole("button", { name: /save/i }).click();
        await expect(page.getByText(/saved|updated/i)).toBeVisible();
      }
    });
  });
});
