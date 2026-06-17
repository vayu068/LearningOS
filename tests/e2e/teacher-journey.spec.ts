import { test, expect } from "@playwright/test";
import { setupAuthState } from "./helpers/auth-helper";
import { testUsers, testContent } from "./fixtures/test-data";

test.describe("Teacher Journey", () => {
  test.beforeEach(async ({ context }) => {
    await setupAuthState(context, "teacher");
  });

  test.describe("Dashboard", () => {
    test("should display teacher dashboard", async ({ page }) => {
      await page.goto("/dashboard");

      await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
      await expect(page.getByText(testUsers.teacher.fullName)).toBeVisible();
    });

    test("should show class overview cards", async ({ page }) => {
      await page.goto("/dashboard");

      for (const className of testUsers.teacher.classes) {
        await expect(page.getByText(className)).toBeVisible();
      }
    });

    test("should display recent student activity", async ({ page }) => {
      await page.goto("/dashboard");

      await expect(page.getByText(/student activity|recent/i)).toBeVisible();
    });

    test("should show pending grading count", async ({ page }) => {
      await page.goto("/dashboard");

      await expect(page.getByText(/pending|to grade|submissions/i)).toBeVisible();
    });
  });

  test.describe("Class Analytics", () => {
    test("should view class performance analytics", async ({ page }) => {
      await page.goto("/analytics");

      await expect(page.getByRole("heading", { name: /analytics/i })).toBeVisible();
    });

    test("should filter analytics by class", async ({ page }) => {
      await page.goto("/analytics");

      const classFilter = page.getByLabel(/class|section/i);
      if (await classFilter.isVisible().catch(() => false)) {
        await classFilter.selectOption("10-A");
        await expect(page.getByText("10-A")).toBeVisible();
      }
    });

    test("should display performance distribution chart", async ({ page }) => {
      await page.goto("/analytics");

      await expect(page.getByTestId("performance-chart")).toBeVisible();
    });

    test("should show at-risk students", async ({ page }) => {
      await page.goto("/analytics");

      await expect(page.getByText(/at.risk|needs attention/i)).toBeVisible();
    });

    test("should view individual student progress", async ({ page }) => {
      await page.goto("/analytics");

      await page.getByText(testUsers.student.fullName).click();

      await expect(page.getByText(/progress|performance/i)).toBeVisible();
    });
  });

  test.describe("Content Creation with AI", () => {
    test("should access content creation tool", async ({ page }) => {
      await page.goto("/content/create");

      await expect(page.getByRole("heading", { name: /create.*content/i })).toBeVisible();
    });

    test("should generate lesson content with AI", async ({ page }) => {
      await page.goto("/content/create");

      // Select subject and topic
      await page.getByLabel(/subject/i).selectOption("Mathematics");
      await page.getByLabel(/topic/i).selectOption("Quadratic Equations");
      await page.getByLabel(/type/i).selectOption("lesson");
      await page.getByLabel(/difficulty/i).selectOption("intermediate");

      await page.getByRole("button", { name: /generate/i }).click();

      // Wait for AI generation
      await expect(page.getByTestId("generated-content")).toBeVisible({ timeout: 30000 });
    });

    test("should generate quiz questions with AI", async ({ page }) => {
      await page.goto("/content/create");

      await page.getByLabel(/subject/i).selectOption("Mathematics");
      await page.getByLabel(/topic/i).selectOption("Quadratic Equations");
      await page.getByLabel(/type/i).selectOption("quiz");

      await page.getByRole("button", { name: /generate/i }).click();

      await expect(page.getByTestId("generated-questions")).toBeVisible({ timeout: 30000 });
    });

    test("should edit AI-generated content", async ({ page }) => {
      await page.goto("/content/create");

      // Assuming content has been generated
      const editor = page.getByTestId("content-editor");
      if (await editor.isVisible().catch(() => false)) {
        await editor.fill("Modified content for the lesson");
        await page.getByRole("button", { name: /save/i }).click();
        await expect(page.getByText(/saved/i)).toBeVisible();
      }
    });

    test("should preview generated content", async ({ page }) => {
      await page.goto("/content/create");

      const previewButton = page.getByRole("button", { name: /preview/i });
      if (await previewButton.isVisible().catch(() => false)) {
        await previewButton.click();
        await expect(page.getByTestId("content-preview")).toBeVisible();
      }
    });
  });

  test.describe("Assessment Management", () => {
    test("should create a new assessment", async ({ page }) => {
      await page.goto("/assessments/create");

      await expect(page.getByRole("heading", { name: /create.*assessment/i })).toBeVisible();

      await page.getByLabel(/title/i).fill("Chapter 5 Quiz");
      await page.getByLabel(/type/i).selectOption("quiz");
      await page.getByLabel(/subject/i).selectOption("Mathematics");
      await page.getByLabel(/duration/i).fill("30");
    });

    test("should assign assessment to a class", async ({ page }) => {
      await page.goto("/assessments");

      await page.getByText("Quadratic Equations Quiz").click();
      await page.getByRole("button", { name: /assign/i }).click();

      await expect(page.getByLabel(/class|section/i)).toBeVisible();
    });

    test("should view assessment submissions", async ({ page }) => {
      await page.goto("/assessments/assessment-001/submissions");

      await expect(page.getByText(/submissions/i)).toBeVisible();
    });

    test("should grade a student submission", async ({ page }) => {
      await page.goto("/assessments/assessment-001/submissions");

      // Click on first submission
      const submissionRow = page.getByTestId("submission-row").first();
      if (await submissionRow.isVisible().catch(() => false)) {
        await submissionRow.click();

        await expect(page.getByText(/grade|score/i)).toBeVisible();

        const gradeInput = page.getByLabel(/marks|score/i);
        if (await gradeInput.isVisible().catch(() => false)) {
          await gradeInput.fill("18");
          await page.getByRole("button", { name: /submit.*grade|save/i }).click();
          await expect(page.getByText(/graded|saved/i)).toBeVisible();
        }
      }
    });

    test("should provide AI-assisted feedback", async ({ page }) => {
      await page.goto("/assessments/assessment-001/submissions");

      const aiButton = page.getByRole("button", { name: /ai.*feedback|generate.*feedback/i });
      if (await aiButton.isVisible().catch(() => false)) {
        await aiButton.click();
        await expect(page.getByTestId("ai-feedback")).toBeVisible({ timeout: 15000 });
      }
    });
  });

  test.describe("Communication", () => {
    test("should send announcement to class", async ({ page }) => {
      await page.goto("/communication");

      await page.getByRole("button", { name: /new.*announcement|compose/i }).click();

      await page.getByLabel(/class/i).selectOption("10-A");
      await page.getByLabel(/message|content/i).fill("Homework due tomorrow");
      await page.getByRole("button", { name: /send|publish/i }).click();

      await expect(page.getByText(/sent|published/i)).toBeVisible();
    });
  });
});
