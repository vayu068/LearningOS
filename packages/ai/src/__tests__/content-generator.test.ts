import { describe, it, expect, vi, beforeEach } from "vitest";
import { ContentGeneratorService } from "../content/generator";
import { CurriculumMapper } from "../content/curriculum-mapper";
import type { AIProvider } from "../providers/base";
import type { CurriculumStandard } from "../types";

function createMockProvider(): AIProvider {
  return {
    name: "mock",
    modelId: "mock-model",
    complete: vi.fn().mockResolvedValue({
      content: JSON.stringify({
        title: "Introduction to Photosynthesis",
        content:
          "# Photosynthesis\n\nPhotosynthesis is the process by which plants convert sunlight into energy. The equation is: 6CO2 + 6H2O + light energy -> C6H12O6 + 6O2\n\n## Key Concepts\n\n1. Light reactions\n2. Calvin cycle\n3. Chloroplast structure",
        structuredContent: {
          sections: ["introduction", "key_concepts", "summary"],
        },
      }),
      usage: { inputTokens: 50, outputTokens: 200, totalTokens: 250 },
      model: "mock-model",
      finishReason: "complete",
    }),
    stream: vi.fn(),
    isAvailable: vi.fn().mockResolvedValue(true),
  };
}

describe("ContentGeneratorService", () => {
  let generator: ContentGeneratorService;
  let mockProvider: AIProvider;

  beforeEach(() => {
    mockProvider = createMockProvider();
    generator = new ContentGeneratorService(mockProvider);
  });

  describe("generate", () => {
    it("should generate content based on parameters", async () => {
      const result = await generator.generate({
        type: "explanation",
        subject: "Biology",
        topic: "Photosynthesis",
        grade: 8,
        difficulty: "medium",
        bloomsLevel: "understand",
        language: "en",
      });

      expect(result).toBeDefined();
      expect(result.title).toBe("Introduction to Photosynthesis");
      expect(result.content).toContain("Photosynthesis");
      expect(result.type).toBe("explanation");
      expect(result.metadata.subject).toBe("Biology");
      expect(result.metadata.topic).toBe("Photosynthesis");
      expect(result.metadata.difficulty).toBe("medium");
      expect(result.metadata.language).toBe("en");
    });

    it("should include word count and read time in metadata", async () => {
      const result = await generator.generate({
        type: "explanation",
        subject: "Biology",
        topic: "Photosynthesis",
        grade: 8,
        difficulty: "medium",
        bloomsLevel: "understand",
        language: "en",
      });

      expect(result.metadata.wordCount).toBeGreaterThan(0);
      expect(result.metadata.estimatedReadTime).toBeGreaterThan(0);
    });

    it("should include aligned standards when provided", async () => {
      const standards: CurriculumStandard[] = [
        {
          id: "std_1",
          framework: "NCERT",
          grade: 8,
          subject: "Biology",
          chapter: "Plant Processes",
          competencyCode: "BIO-8-PP-01",
          description: "Understand photosynthesis process",
          learningOutcomes: ["Explain the role of chlorophyll"],
        },
      ];

      const result = await generator.generate({
        type: "explanation",
        subject: "Biology",
        topic: "Photosynthesis",
        grade: 8,
        difficulty: "medium",
        bloomsLevel: "understand",
        language: "en",
        standards,
      });

      expect(result.metadata.alignedStandards).toContain("std_1");
    });

    it("should handle AI failure gracefully with plain content", async () => {
      (mockProvider.complete as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        content: "This is plain text about photosynthesis and how it works.",
        usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
        model: "mock-model",
        finishReason: "complete",
      });

      const result = await generator.generate({
        type: "summary",
        subject: "Biology",
        topic: "Photosynthesis",
        grade: 8,
        difficulty: "easy",
        bloomsLevel: "remember",
        language: "en",
      });

      expect(result).toBeDefined();
      expect(result.content).toContain("photosynthesis");
    });
  });

  describe("generateLessonPlan", () => {
    it("should generate a lesson plan", async () => {
      const result = await generator.generateLessonPlan({
        subject: "Mathematics",
        topic: "Fractions",
        grade: 5,
        duration: 45,
        objectives: ["Add fractions", "Subtract fractions"],
      });

      expect(result).toBeDefined();
      expect(result.type).toBe("lesson_plan");
      expect(result.metadata.subject).toBe("Mathematics");
    });
  });

  describe("generateQuiz", () => {
    it("should generate a quiz", async () => {
      const result = await generator.generateQuiz({
        subject: "Science",
        topic: "Solar System",
        questionCount: 5,
        difficulty: "easy",
        questionTypes: ["multiple_choice"],
      });

      expect(result).toBeDefined();
      expect(result.type).toBe("quiz");
    });
  });

  describe("generateSummary", () => {
    it("should generate a summary", async () => {
      const result = await generator.generateSummary({
        subject: "History",
        topic: "Indian Independence",
        maxWords: 200,
      });

      expect(result).toBeDefined();
      expect(result.type).toBe("summary");
    });
  });

  describe("generatePracticeProblems", () => {
    it("should generate practice problems", async () => {
      const result = await generator.generatePracticeProblems({
        subject: "Mathematics",
        topic: "Quadratic Equations",
        count: 5,
        difficulty: "hard",
        bloomsLevel: "apply",
      });

      expect(result).toBeDefined();
      expect(result.type).toBe("practice_problems");
      expect(result.metadata.difficulty).toBe("hard");
      expect(result.metadata.bloomsLevel).toBe("apply");
    });
  });
});

describe("CurriculumMapper", () => {
  let mapper: CurriculumMapper;
  let mockProvider: AIProvider;

  beforeEach(() => {
    mockProvider = {
      name: "mock",
      modelId: "mock-model",
      complete: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          mappings: [
            {
              standardId: "std_1",
              alignmentScore: 0.85,
              coveredOutcomes: ["Explain photosynthesis"],
              gaps: ["Describe chloroplast structure"],
            },
          ],
        }),
        usage: { inputTokens: 50, outputTokens: 100, totalTokens: 150 },
        model: "mock-model",
        finishReason: "complete",
      }),
      stream: vi.fn(),
      isAvailable: vi.fn().mockResolvedValue(true),
    };
    mapper = new CurriculumMapper(mockProvider);
  });

  describe("registerStandards", () => {
    it("should register curriculum standards", () => {
      const standards: CurriculumStandard[] = [
        {
          id: "std_1",
          framework: "NCERT",
          grade: 8,
          subject: "Science",
          chapter: "Photosynthesis",
          competencyCode: "SCI-8-01",
          description: "Understand photosynthesis",
          learningOutcomes: ["Explain photosynthesis", "Describe chloroplast structure"],
        },
      ];

      mapper.registerStandards(standards);
      const relevant = mapper.getRelevantStandards("Science", 8);
      expect(relevant).toHaveLength(1);
      expect(relevant[0].id).toBe("std_1");
    });
  });

  describe("mapContent", () => {
    it("should map content to curriculum standards", async () => {
      const standards: CurriculumStandard[] = [
        {
          id: "std_1",
          framework: "NCERT",
          grade: 8,
          subject: "Science",
          chapter: "Photosynthesis",
          competencyCode: "SCI-8-01",
          description: "Understand photosynthesis",
          learningOutcomes: ["Explain photosynthesis", "Describe chloroplast structure"],
        },
      ];

      mapper.registerStandards(standards);

      const result = await mapper.mapContent(
        "content_1",
        "Photosynthesis is the process by which plants make food...",
        "Science",
        8
      );

      expect(result.contentId).toBe("content_1");
      expect(result.mappings).toHaveLength(1);
      expect(result.mappings[0].alignmentScore).toBe(0.85);
      expect(result.overallCoverage).toBeGreaterThan(0);
    });

    it("should identify gaps when no standards registered", async () => {
      const result = await mapper.mapContent(
        "content_1",
        "Some content about biology",
        "Biology",
        9
      );

      expect(result.gaps.length).toBeGreaterThan(0);
      expect(result.overallCoverage).toBe(0);
    });
  });

  describe("getGradeAppropriateSettings", () => {
    it("should return easy difficulty for early grades (NEP2020)", () => {
      const settings = mapper.getGradeAppropriateSettings(3, "NEP2020");
      expect(settings.difficulty).toBe("easy");
      expect(settings.bloomsLevel).toBe("understand");
    });

    it("should return medium difficulty for middle grades (NEP2020)", () => {
      const settings = mapper.getGradeAppropriateSettings(7, "NEP2020");
      expect(settings.difficulty).toBe("medium");
      expect(settings.bloomsLevel).toBe("apply");
    });

    it("should return hard difficulty for senior grades (NEP2020)", () => {
      const settings = mapper.getGradeAppropriateSettings(11, "NEP2020");
      expect(settings.difficulty).toBe("hard");
      expect(settings.bloomsLevel).toBe("evaluate");
    });
  });

  describe("findStandardsForTopic", () => {
    it("should find standards matching a topic", () => {
      const standards: CurriculumStandard[] = [
        {
          id: "std_1",
          framework: "NCERT",
          grade: 8,
          subject: "Science",
          chapter: "Photosynthesis",
          competencyCode: "SCI-8-01",
          description: "Understand photosynthesis process",
          learningOutcomes: ["Explain the role of sunlight"],
        },
        {
          id: "std_2",
          framework: "NCERT",
          grade: 8,
          subject: "Science",
          chapter: "Respiration",
          competencyCode: "SCI-8-02",
          description: "Understand cellular respiration",
          learningOutcomes: ["Describe aerobic respiration"],
        },
      ];

      mapper.registerStandards(standards);

      const found = mapper.findStandardsForTopic("photosynthesis", "Science");
      expect(found).toHaveLength(1);
      expect(found[0].id).toBe("std_1");
    });
  });
});
