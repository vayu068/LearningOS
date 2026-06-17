import { describe, it, expect, vi, beforeEach } from "vitest";
import { TeacherCopilot } from "../teacher-copilot/copilot";
import { ClassroomAnalyticsService } from "../teacher-copilot/analytics";
import type { AIProvider } from "../providers/base";
import type { StudentEngagement, StudentPerformance, BloomsTaxonomyLevel } from "../types";

function createMockProvider(): AIProvider {
  return {
    name: "mock",
    modelId: "mock-model",
    complete: vi.fn().mockResolvedValue({
      content: JSON.stringify({
        title: "Introduction to Fractions",
        warmUp: {
          title: "Pizza Fractions",
          description: "Use pizza slices to introduce fractions",
          durationMinutes: 5,
          type: "activity",
          instructions: ["Show pizza diagram", "Ask students to identify fractions"],
        },
        mainActivities: [
          {
            title: "Guided Practice",
            description: "Work through fraction problems together",
            durationMinutes: 20,
            type: "practice",
            instructions: ["Distribute worksheets", "Model first problem"],
          },
        ],
        assessment: {
          title: "Exit Ticket",
          description: "Quick check for understanding",
          durationMinutes: 5,
          type: "assessment",
          instructions: ["Students complete 3 problems independently"],
        },
        closure: {
          title: "Review",
          description: "Summarize key points",
          durationMinutes: 5,
          type: "discussion",
          instructions: ["Ask students what they learned"],
        },
        differentiation: {
          advanced: ["Challenge problems with mixed numbers"],
          onLevel: ["Standard fraction problems"],
          struggling: ["Visual fraction strips"],
          ell: ["Bilingual vocabulary cards"],
        },
        resources: ["Fraction strips", "Worksheets"],
        questions: [
          {
            id: "q1",
            type: "mcq",
            question: "What is 1/2 + 1/4?",
            options: ["1/4", "2/4", "3/4", "1/2"],
            correctAnswer: "3/4",
            explanation: "Convert to common denominator",
            points: 1,
          },
        ],
      }),
      usage: { inputTokens: 50, outputTokens: 300, totalTokens: 350 },
      model: "mock-model",
      finishReason: "complete",
    }),
    stream: vi.fn(),
    isAvailable: vi.fn().mockResolvedValue(true),
  };
}

describe("TeacherCopilot", () => {
  let copilot: TeacherCopilot;
  let mockProvider: AIProvider;

  beforeEach(() => {
    mockProvider = createMockProvider();
    copilot = new TeacherCopilot(mockProvider);
  });

  describe("generateLessonPlan", () => {
    it("should generate a complete lesson plan", async () => {
      const plan = await copilot.generateLessonPlan({
        subject: "Mathematics",
        topic: "Fractions",
        grade: 5,
        duration: 45,
        objectives: ["Understand fractions", "Add simple fractions"],
      });

      expect(plan).toBeDefined();
      expect(plan.subject).toBe("Mathematics");
      expect(plan.grade).toBe(5);
      expect(plan.duration).toBe(45);
      expect(plan.objectives).toHaveLength(2);
      expect(plan.warmUp).toBeDefined();
      expect(plan.mainActivities.length).toBeGreaterThan(0);
      expect(plan.assessment).toBeDefined();
      expect(plan.closure).toBeDefined();
    });

    it("should include differentiation strategies", async () => {
      const plan = await copilot.generateLessonPlan({
        subject: "Mathematics",
        topic: "Fractions",
        grade: 5,
        duration: 45,
        objectives: ["Add fractions"],
        includeDifferentiation: true,
      });

      expect(plan.differentiation).toBeDefined();
      expect(plan.differentiation.advanced.length).toBeGreaterThan(0);
      expect(plan.differentiation.struggling.length).toBeGreaterThan(0);
      expect(plan.differentiation.ell.length).toBeGreaterThan(0);
    });

    it("should handle AI failure and return a default plan", async () => {
      (mockProvider.complete as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Provider unavailable")
      );

      const plan = await copilot.generateLessonPlan({
        subject: "Science",
        topic: "Gravity",
        grade: 7,
        duration: 40,
        objectives: ["Understand gravitational force"],
      });

      expect(plan).toBeDefined();
      expect(plan.subject).toBe("Science");
      expect(plan.warmUp).toBeDefined();
      expect(plan.mainActivities.length).toBeGreaterThan(0);
    });
  });

  describe("generateAssessment", () => {
    it("should generate assessment questions", async () => {
      const questions = await copilot.generateAssessment({
        subject: "Mathematics",
        topic: "Fractions",
        grade: 5,
        questionCount: 5,
        bloomsLevels: ["apply"],
        difficulty: "medium",
        questionTypes: ["mcq"],
      });

      expect(questions).toBeDefined();
      expect(questions.length).toBeGreaterThan(0);
      expect(questions[0].type).toBe("mcq");
      expect(questions[0].subject).toBe("Mathematics");
    });

    it("should respect maximum question count", async () => {
      const questions = await copilot.generateAssessment({
        subject: "Science",
        topic: "Cells",
        grade: 8,
        questionCount: 50,
        bloomsLevels: ["remember", "understand"],
        difficulty: "easy",
        questionTypes: ["mcq", "true_false"],
      });

      expect(questions.length).toBeLessThanOrEqual(25);
    });
  });

  describe("gradeAssignment", () => {
    it("should grade MCQ answers correctly", async () => {
      const questions = [
        {
          id: "q1",
          type: "mcq" as const,
          bloomsLevel: "apply" as BloomsTaxonomyLevel,
          difficulty: "medium" as const,
          subject: "Math",
          topic: "Fractions",
          question: "What is 1/2 + 1/4?",
          options: ["1/4", "2/4", "3/4", "1/2"],
          correctAnswer: "3/4",
          explanation: "Convert to common denominator",
          points: 1,
        },
        {
          id: "q2",
          type: "mcq" as const,
          bloomsLevel: "remember" as BloomsTaxonomyLevel,
          difficulty: "easy" as const,
          subject: "Math",
          topic: "Fractions",
          question: "What is the numerator of 3/5?",
          options: ["3", "5", "8", "2"],
          correctAnswer: "3",
          explanation: "The numerator is the top number",
          points: 1,
        },
      ];

      const answers = [
        { questionId: "q1", answer: "3/4" },
        { questionId: "q2", answer: "5" },
      ];

      const result = await copilot.gradeAssignment("student_1", "assign_1", questions, answers);

      expect(result.studentId).toBe("student_1");
      expect(result.assignmentId).toBe("assign_1");
      expect(result.totalScore).toBe(1);
      expect(result.maxScore).toBe(2);
      expect(result.percentage).toBe(50);
      expect(result.questionResults).toHaveLength(2);
      expect(result.questionResults[0].score).toBe(1);
      expect(result.questionResults[1].score).toBe(0);
    });

    it("should provide overall feedback", async () => {
      const questions = [
        {
          id: "q1",
          type: "mcq" as const,
          bloomsLevel: "apply" as BloomsTaxonomyLevel,
          difficulty: "medium" as const,
          subject: "Math",
          topic: "Algebra",
          question: "Solve x + 2 = 5",
          options: ["1", "2", "3", "4"],
          correctAnswer: "3",
          explanation: "Subtract 2 from both sides",
          points: 1,
        },
      ];

      const answers = [{ questionId: "q1", answer: "3" }];

      const result = await copilot.gradeAssignment("student_1", "assign_1", questions, answers);

      expect(result.feedback).toBeDefined();
      expect(result.feedback.length).toBeGreaterThan(0);
      expect(result.percentage).toBe(100);
    });
  });

  describe("suggestActivities", () => {
    it("should suggest activities for a topic", async () => {
      const activities = await copilot.suggestActivities({
        subject: "Science",
        topic: "Ecosystems",
        grade: 7,
        duration: 30,
      });

      expect(activities).toBeDefined();
      expect(activities.length).toBeGreaterThan(0);
      expect(activities[0].title).toBeDefined();
      expect(activities[0].durationMinutes).toBeGreaterThan(0);
    });
  });
});

describe("ClassroomAnalyticsService", () => {
  let analytics: ClassroomAnalyticsService;
  let mockProvider: AIProvider;

  beforeEach(() => {
    mockProvider = createMockProvider();
    analytics = new ClassroomAnalyticsService(mockProvider);
  });

  describe("calculateEngagement", () => {
    it("should calculate engagement score from activity data", () => {
      const engagement = analytics.calculateEngagement({
        studentId: "student_1",
        loginFrequency: 5,
        assignmentsCompleted: 8,
        assignmentsTotal: 10,
        averageScore: 0.85,
        averageTimeOnTask: 25,
        participationEvents: 12,
        lastActiveDate: new Date().toISOString(),
      });

      expect(engagement.studentId).toBe("student_1");
      expect(engagement.engagementScore).toBeGreaterThan(0.5);
      expect(engagement.engagementScore).toBeLessThanOrEqual(1);
      expect(engagement.assignmentCompletionRate).toBe(0.8);
      expect(engagement.participationRate).toBeGreaterThan(0);
    });

    it("should detect declining trend for inactive students", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      const engagement = analytics.calculateEngagement({
        studentId: "student_2",
        loginFrequency: 1,
        assignmentsCompleted: 2,
        assignmentsTotal: 10,
        averageScore: 0.4,
        averageTimeOnTask: 10,
        participationEvents: 1,
        lastActiveDate: pastDate.toISOString(),
      });

      expect(engagement.trend).toBe("declining");
    });

    it("should handle zero assignments gracefully", () => {
      const engagement = analytics.calculateEngagement({
        studentId: "student_3",
        loginFrequency: 3,
        assignmentsCompleted: 0,
        assignmentsTotal: 0,
        averageScore: 0,
        averageTimeOnTask: 0,
        participationEvents: 5,
        lastActiveDate: new Date().toISOString(),
      });

      expect(engagement.assignmentCompletionRate).toBe(0);
      expect(engagement.engagementScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe("identifyAtRiskStudents", () => {
    it("should identify students with low engagement", () => {
      const engagements: StudentEngagement[] = [
        {
          studentId: "student_1",
          engagementScore: 0.2,
          participationRate: 0.1,
          assignmentCompletionRate: 0.2,
          averageTimeOnTask: 5,
          trend: "declining",
          lastUpdated: new Date().toISOString(),
        },
        {
          studentId: "student_2",
          engagementScore: 0.85,
          participationRate: 0.9,
          assignmentCompletionRate: 0.9,
          averageTimeOnTask: 30,
          trend: "improving",
          lastUpdated: new Date().toISOString(),
        },
      ];

      const atRisk = analytics.identifyAtRiskStudents(engagements);

      expect(atRisk).toContain("student_1");
      expect(atRisk).not.toContain("student_2");
    });
  });

  describe("generateInsights", () => {
    it("should generate at-risk insight when students are struggling", async () => {
      const engagements: StudentEngagement[] = [
        {
          studentId: "s1",
          engagementScore: 0.2,
          participationRate: 0.1,
          assignmentCompletionRate: 0.1,
          averageTimeOnTask: 5,
          trend: "declining",
          lastUpdated: new Date().toISOString(),
        },
        {
          studentId: "s2",
          engagementScore: 0.8,
          participationRate: 0.8,
          assignmentCompletionRate: 0.9,
          averageTimeOnTask: 30,
          trend: "stable",
          lastUpdated: new Date().toISOString(),
        },
      ];

      const insights = await analytics.generateInsights(engagements, []);

      const atRiskInsight = insights.find((i) => i.type === "at_risk");
      expect(atRiskInsight).toBeDefined();
      expect(atRiskInsight!.affectedStudents).toContain("s1");
    });

    it("should detect concept gaps from performance data", async () => {
      const engagements: StudentEngagement[] = [
        {
          studentId: "s1",
          engagementScore: 0.7,
          participationRate: 0.7,
          assignmentCompletionRate: 0.7,
          averageTimeOnTask: 20,
          trend: "stable",
          lastUpdated: new Date().toISOString(),
        },
        {
          studentId: "s2",
          engagementScore: 0.7,
          participationRate: 0.7,
          assignmentCompletionRate: 0.7,
          averageTimeOnTask: 20,
          trend: "stable",
          lastUpdated: new Date().toISOString(),
        },
      ];

      const performances: StudentPerformance[] = [
        {
          studentId: "s1",
          nodeId: "fractions",
          score: 0.3,
          timeSpentMinutes: 30,
          attempts: 3,
          completedAt: new Date().toISOString(),
          bloomsLevelAchieved: "remember",
          errors: [],
        },
        {
          studentId: "s2",
          nodeId: "fractions",
          score: 0.2,
          timeSpentMinutes: 25,
          attempts: 2,
          completedAt: new Date().toISOString(),
          bloomsLevelAchieved: "remember",
          errors: [],
        },
      ];

      const insights = await analytics.generateInsights(engagements, performances);

      const conceptGapInsight = insights.find((i) => i.type === "concept_gap");
      expect(conceptGapInsight).toBeDefined();
    });
  });

  describe("generateReport", () => {
    it("should generate a complete analytics report", async () => {
      const engagements: StudentEngagement[] = [
        {
          studentId: "s1",
          engagementScore: 0.8,
          participationRate: 0.7,
          assignmentCompletionRate: 0.9,
          averageTimeOnTask: 25,
          trend: "stable",
          lastUpdated: new Date().toISOString(),
        },
      ];

      const report = await analytics.generateReport("class_1", engagements, []);

      expect(report.classId).toBe("class_1");
      expect(report.totalStudents).toBe(1);
      expect(report.averageEngagement).toBeGreaterThan(0);
      expect(report.insights).toBeDefined();
      expect(report.updatedAt).toBeDefined();
    });
  });

  describe("detectConceptGaps", () => {
    it("should identify concepts where multiple students struggle", () => {
      const performances: StudentPerformance[] = [
        {
          studentId: "s1",
          nodeId: "algebra_basics",
          score: 0.3,
          timeSpentMinutes: 20,
          attempts: 2,
          completedAt: new Date().toISOString(),
          bloomsLevelAchieved: "remember",
          errors: [],
        },
        {
          studentId: "s2",
          nodeId: "algebra_basics",
          score: 0.4,
          timeSpentMinutes: 25,
          attempts: 3,
          completedAt: new Date().toISOString(),
          bloomsLevelAchieved: "remember",
          errors: [],
        },
        {
          studentId: "s1",
          nodeId: "geometry",
          score: 0.9,
          timeSpentMinutes: 15,
          attempts: 1,
          completedAt: new Date().toISOString(),
          bloomsLevelAchieved: "apply",
          errors: [],
        },
      ];

      const gaps = analytics.detectConceptGaps(performances);

      expect(gaps.length).toBeGreaterThan(0);
      const algebraGap = gaps.find((g) => g.concept === "algebra_basics");
      expect(algebraGap).toBeDefined();
      expect(algebraGap!.studentCount).toBe(2);
    });
  });
});
