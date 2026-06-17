import { describe, it, expect, vi, beforeEach } from "vitest";
import { TutorService } from "../tutor/tutor-service";
import type { AIProvider } from "../providers/base";

function createMockProvider(): AIProvider {
  return {
    name: "mock",
    modelId: "mock-model",
    complete: vi.fn().mockResolvedValue({
      content: JSON.stringify({
        response: "That is a great question! Let me explain this concept step by step.",
        concepts: ["linear_equations", "variables"],
        hints: ["Think about what happens when you isolate x"],
      }),
      usage: { inputTokens: 50, outputTokens: 100, totalTokens: 150 },
      model: "mock-model",
      finishReason: "complete",
    }),
    stream: vi.fn(),
    isAvailable: vi.fn().mockResolvedValue(true),
  };
}

describe("TutorService", () => {
  let tutorService: TutorService;
  let mockProvider: AIProvider;

  beforeEach(() => {
    mockProvider = createMockProvider();
    tutorService = new TutorService(mockProvider);
  });

  describe("startSession", () => {
    it("should create a new tutor session", () => {
      const session = tutorService.startSession({
        studentId: "student_1",
        subject: "Mathematics",
        topic: "Linear Equations",
        language: "en",
        difficulty: "medium",
        teachingStyle: "socratic",
      });

      expect(session.sessionId).toBeDefined();
      expect(session.config.studentId).toBe("student_1");
      expect(session.config.subject).toBe("Mathematics");
      expect(session.config.language).toBe("en");
      expect(session.config.teachingStyle).toBe("socratic");
      expect(session.status).toBe("active");
      expect(session.messages).toHaveLength(0);
    });

    it("should support Hindi language sessions", () => {
      const session = tutorService.startSession({
        studentId: "student_2",
        subject: "Science",
        topic: "Photosynthesis",
        language: "hi",
        difficulty: "easy",
        teachingStyle: "direct",
      });

      expect(session.config.language).toBe("hi");
      expect(session.config.teachingStyle).toBe("direct");
    });

    it("should support Tamil language sessions", () => {
      const session = tutorService.startSession({
        studentId: "student_3",
        subject: "Mathematics",
        topic: "Fractions",
        language: "ta",
        difficulty: "easy",
        teachingStyle: "scaffolded",
      });

      expect(session.config.language).toBe("ta");
    });
  });

  describe("sendMessage", () => {
    it("should send a message and get a tutor response", async () => {
      const session = tutorService.startSession({
        studentId: "student_1",
        subject: "Mathematics",
        topic: "Linear Equations",
        language: "en",
        difficulty: "medium",
        teachingStyle: "socratic",
      });

      const result = await tutorService.sendMessage(
        session.sessionId,
        "How do I solve 2x + 3 = 7?"
      );

      expect(result.response).toBeDefined();
      expect(result.response.role).toBe("tutor");
      expect(result.response.content).toContain("great question");
      expect(result.response.language).toBe("en");
      expect(result.session.messages).toHaveLength(2); // student + tutor
    });

    it("should maintain conversation context across messages", async () => {
      const session = tutorService.startSession({
        studentId: "student_1",
        subject: "Mathematics",
        topic: "Algebra",
        language: "en",
        difficulty: "medium",
        teachingStyle: "direct",
      });

      await tutorService.sendMessage(session.sessionId, "What is algebra?");
      const result = await tutorService.sendMessage(
        session.sessionId,
        "Can you give an example?"
      );

      expect(result.session.messages).toHaveLength(4); // 2 student + 2 tutor
    });

    it("should track concepts covered in the session", async () => {
      const session = tutorService.startSession({
        studentId: "student_1",
        subject: "Mathematics",
        topic: "Linear Equations",
        language: "en",
        difficulty: "medium",
        teachingStyle: "socratic",
      });

      await tutorService.sendMessage(session.sessionId, "Explain variables");

      const updatedSession = tutorService.getSession(session.sessionId);
      expect(updatedSession.conceptsCovered).toContain("linear_equations");
      expect(updatedSession.conceptsCovered).toContain("variables");
    });

    it("should throw error for inactive session", async () => {
      const session = tutorService.startSession({
        studentId: "student_1",
        subject: "Math",
        topic: "Algebra",
        language: "en",
        difficulty: "medium",
        teachingStyle: "socratic",
      });

      tutorService.endSession(session.sessionId);

      await expect(
        tutorService.sendMessage(session.sessionId, "Hello?")
      ).rejects.toThrow("not active");
    });

    it("should throw error for non-existent session", async () => {
      await expect(
        tutorService.sendMessage("nonexistent_id", "Hello?")
      ).rejects.toThrow("not found");
    });

    it("should handle AI provider failure gracefully", async () => {
      (mockProvider.complete as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Provider unavailable")
      );

      const session = tutorService.startSession({
        studentId: "student_1",
        subject: "Math",
        topic: "Algebra",
        language: "en",
        difficulty: "medium",
        teachingStyle: "socratic",
      });

      const result = await tutorService.sendMessage(
        session.sessionId,
        "Help me"
      );

      // Should return a fallback response
      expect(result.response.role).toBe("tutor");
      expect(result.response.content.length).toBeGreaterThan(0);
      expect(result.response.metadata?.confidence).toBe(0);
    });
  });

  describe("endSession", () => {
    it("should mark session as completed", () => {
      const session = tutorService.startSession({
        studentId: "student_1",
        subject: "Math",
        topic: "Algebra",
        language: "en",
        difficulty: "medium",
        teachingStyle: "socratic",
      });

      const ended = tutorService.endSession(session.sessionId);

      expect(ended.status).toBe("completed");
    });
  });

  describe("getSessionSummary", () => {
    it("should provide session summary", async () => {
      const session = tutorService.startSession({
        studentId: "student_1",
        subject: "Math",
        topic: "Algebra",
        language: "en",
        difficulty: "medium",
        teachingStyle: "socratic",
      });

      await tutorService.sendMessage(session.sessionId, "What is x?");

      const summary = tutorService.getSessionSummary(session.sessionId);

      expect(summary.messageCount).toBe(2);
      expect(summary.language).toBe("en");
      expect(summary.conceptsCovered).toBeDefined();
      expect(summary.comprehensionScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe("multi-language support", () => {
    it("should handle Telugu language", () => {
      const session = tutorService.startSession({
        studentId: "student_te",
        subject: "Science",
        topic: "Photosynthesis",
        language: "te",
        difficulty: "easy",
        teachingStyle: "direct",
      });

      expect(session.config.language).toBe("te");
    });

    it("should handle Bengali language", () => {
      const session = tutorService.startSession({
        studentId: "student_bn",
        subject: "History",
        topic: "Independence",
        language: "bn",
        difficulty: "medium",
        teachingStyle: "exploratory",
      });

      expect(session.config.language).toBe("bn");
    });
  });
});
