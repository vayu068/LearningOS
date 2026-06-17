import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdaptiveLearningEngine } from "../engine/adaptive-learning";
import type { AIProvider } from "../providers/base";
import type {
  StudentProfile,
  KnowledgeGraph,
  StudentPerformance,
  LearningPath,
  CompetencyLevel,
  BloomsTaxonomyLevel,
} from "../types";

function createMockProvider(): AIProvider {
  return {
    name: "mock",
    modelId: "mock-model",
    complete: vi.fn().mockResolvedValue({
      content: JSON.stringify({
        description: "AI-generated personalized learning path",
      }),
      usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
      model: "mock-model",
      finishReason: "complete",
    }),
    stream: vi.fn(),
    isAvailable: vi.fn().mockResolvedValue(true),
  };
}

function createStudentProfile(overrides?: Partial<StudentProfile>): StudentProfile {
  return {
    studentId: "student_1",
    currentLevel: "intermediate" as CompetencyLevel,
    strengths: ["algebra", "geometry"],
    weaknesses: ["trigonometry"],
    learningStyle: "visual",
    preferredLanguage: "en",
    averageSessionMinutes: 30,
    performanceHistory: [],
    ...overrides,
  };
}

function createKnowledgeGraph(): KnowledgeGraph {
  return {
    id: "kg_math_1",
    subject: "Mathematics",
    nodes: [
      {
        id: "node_1",
        label: "Basic Algebra",
        subject: "Mathematics",
        topic: "Algebra",
        description: "Fundamental algebraic concepts",
        bloomsLevel: "understand" as BloomsTaxonomyLevel,
        competencyLevel: "beginner" as CompetencyLevel,
        prerequisites: [],
        relatedNodes: ["node_2"],
      },
      {
        id: "node_2",
        label: "Linear Equations",
        subject: "Mathematics",
        topic: "Algebra",
        description: "Solving linear equations",
        bloomsLevel: "apply" as BloomsTaxonomyLevel,
        competencyLevel: "intermediate" as CompetencyLevel,
        prerequisites: ["node_1"],
        relatedNodes: ["node_3"],
      },
      {
        id: "node_3",
        label: "Quadratic Equations",
        subject: "Mathematics",
        topic: "Algebra",
        description: "Solving quadratic equations",
        bloomsLevel: "analyze" as BloomsTaxonomyLevel,
        competencyLevel: "proficient" as CompetencyLevel,
        prerequisites: ["node_2"],
        relatedNodes: [],
      },
    ],
    edges: [
      { source: "node_1", target: "node_2", relationship: "prerequisite", weight: 1 },
      { source: "node_2", target: "node_3", relationship: "prerequisite", weight: 1 },
      { source: "node_1", target: "node_2", relationship: "related", weight: 0.8 },
    ],
    version: "1.0",
    updatedAt: new Date().toISOString(),
  };
}

describe("AdaptiveLearningEngine", () => {
  let engine: AdaptiveLearningEngine;
  let mockProvider: AIProvider;

  beforeEach(() => {
    mockProvider = createMockProvider();
    engine = new AdaptiveLearningEngine(mockProvider);
  });

  describe("generateLearningPath", () => {
    it("should generate a learning path from knowledge graph", async () => {
      const profile = createStudentProfile();
      const graph = createKnowledgeGraph();

      const path = await engine.generateLearningPath(profile, graph, []);

      expect(path).toBeDefined();
      expect(path.studentId).toBe("student_1");
      expect(path.subject).toBe("Mathematics");
      expect(path.nodes.length).toBeGreaterThan(0);
      expect(path.completionPercentage).toBe(0);
      expect(path.currentNodeIndex).toBe(0);
    });

    it("should respect prerequisites in path ordering", async () => {
      const profile = createStudentProfile();
      const graph = createKnowledgeGraph();

      const path = await engine.generateLearningPath(profile, graph, []);

      // node_1 should come before node_2, which should come before node_3
      const nodeIds = path.nodes.map((n) => n.id);
      if (nodeIds.includes("node_1") && nodeIds.includes("node_2")) {
        const idx1 = nodeIds.indexOf("node_1");
        const idx2 = nodeIds.indexOf("node_2");
        expect(idx1).toBeLessThan(idx2);
      }
    });

    it("should set first node as available and rest as locked", async () => {
      const profile = createStudentProfile();
      const graph = createKnowledgeGraph();

      const path = await engine.generateLearningPath(profile, graph, []);

      if (path.nodes.length > 0) {
        expect(path.nodes[0].status).toBe("available");
      }
      if (path.nodes.length > 1) {
        expect(path.nodes[1].status).toBe("locked");
      }
    });

    it("should include adaptive rules for each node", async () => {
      const profile = createStudentProfile();
      const graph = createKnowledgeGraph();

      const path = await engine.generateLearningPath(profile, graph, []);

      for (const node of path.nodes) {
        expect(node.adaptiveRules).toBeDefined();
        expect(node.adaptiveRules.length).toBeGreaterThan(0);
      }
    });

    it("should skip mastered nodes for students with performance history", async () => {
      const profile = createStudentProfile({
        performanceHistory: [
          {
            studentId: "student_1",
            nodeId: "node_1",
            score: 0.95,
            timeSpentMinutes: 20,
            attempts: 1,
            completedAt: new Date().toISOString(),
            bloomsLevelAchieved: "understand" as BloomsTaxonomyLevel,
            errors: [],
          },
        ],
      });
      const graph = createKnowledgeGraph();

      const path = await engine.generateLearningPath(profile, graph, []);

      // node_1 should not be in the path since it's mastered
      const nodeIds = path.nodes.map((n) => n.id);
      expect(nodeIds).not.toContain("node_1");
    });
  });

  describe("adaptPath", () => {
    it("should mark node as completed when score meets mastery", async () => {
      const profile = createStudentProfile();
      const currentPath: LearningPath = {
        id: "path_1",
        studentId: "student_1",
        subject: "Math",
        title: "Test Path",
        description: "Test",
        nodes: [
          {
            id: "node_1",
            title: "Node 1",
            description: "First node",
            objectiveIds: ["obj_1"],
            contentType: "lesson",
            estimatedMinutes: 20,
            difficulty: "medium",
            prerequisites: [],
            status: "in_progress",
            adaptiveRules: [],
          },
          {
            id: "node_2",
            title: "Node 2",
            description: "Second node",
            objectiveIds: ["obj_2"],
            contentType: "quiz",
            estimatedMinutes: 15,
            difficulty: "medium",
            prerequisites: ["node_1"],
            status: "locked",
            adaptiveRules: [],
          },
        ],
        currentNodeIndex: 0,
        completionPercentage: 0,
        estimatedTotalMinutes: 35,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const performance: StudentPerformance = {
        studentId: "student_1",
        nodeId: "node_1",
        score: 0.85,
        timeSpentMinutes: 18,
        attempts: 1,
        completedAt: new Date().toISOString(),
        bloomsLevelAchieved: "understand" as BloomsTaxonomyLevel,
        errors: [],
      };

      const adapted = await engine.adaptPath(currentPath, performance, profile);

      expect(adapted.nodes[0].status).toBe("completed");
      expect(adapted.nodes[0].masteryScore).toBe(0.85);
      expect(adapted.completionPercentage).toBe(50);
    });

    it("should keep node in progress when score is below mastery", async () => {
      const profile = createStudentProfile();
      const currentPath: LearningPath = {
        id: "path_1",
        studentId: "student_1",
        subject: "Math",
        title: "Test Path",
        description: "Test",
        nodes: [
          {
            id: "node_1",
            title: "Node 1",
            description: "First node",
            objectiveIds: ["obj_1"],
            contentType: "lesson",
            estimatedMinutes: 20,
            difficulty: "medium",
            prerequisites: [],
            status: "in_progress",
            adaptiveRules: [
              {
                id: "rule_1",
                condition: { type: "score_below", threshold: 0.7 },
                action: {
                  type: "add_remediation",
                  parameters: { difficulty: "easy" },
                },
                priority: 1,
              },
            ],
          },
        ],
        currentNodeIndex: 0,
        completionPercentage: 0,
        estimatedTotalMinutes: 20,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const performance: StudentPerformance = {
        studentId: "student_1",
        nodeId: "node_1",
        score: 0.4,
        timeSpentMinutes: 25,
        attempts: 2,
        completedAt: new Date().toISOString(),
        bloomsLevelAchieved: "remember" as BloomsTaxonomyLevel,
        errors: [],
      };

      const adapted = await engine.adaptPath(currentPath, performance, profile);

      expect(adapted.nodes[0].status).toBe("in_progress");
      expect(adapted.nodes[0].masteryScore).toBe(0.4);
    });
  });

  describe("calculateRecommendedDifficulty", () => {
    it("should recommend based on competency level when no history", () => {
      const profile = createStudentProfile({
        currentLevel: "beginner" as CompetencyLevel,
        performanceHistory: [],
      });

      const difficulty = engine.calculateRecommendedDifficulty(profile);
      expect(difficulty).toBe("easy");
    });

    it("should recommend higher difficulty for high-performing students", () => {
      const profile = createStudentProfile({
        performanceHistory: Array(10).fill({
          studentId: "student_1",
          nodeId: "node_x",
          score: 0.95,
          timeSpentMinutes: 15,
          attempts: 1,
          completedAt: new Date().toISOString(),
          bloomsLevelAchieved: "apply" as BloomsTaxonomyLevel,
          errors: [],
        }),
      });

      const difficulty = engine.calculateRecommendedDifficulty(profile);
      expect(difficulty).toBe("advanced");
    });

    it("should recommend lower difficulty for struggling students", () => {
      const profile = createStudentProfile({
        performanceHistory: Array(10).fill({
          studentId: "student_1",
          nodeId: "node_x",
          score: 0.3,
          timeSpentMinutes: 45,
          attempts: 3,
          completedAt: new Date().toISOString(),
          bloomsLevelAchieved: "remember" as BloomsTaxonomyLevel,
          errors: [],
        }),
      });

      const difficulty = engine.calculateRecommendedDifficulty(profile);
      expect(difficulty).toBe("easy");
    });
  });

  describe("getNextBloomsLevel", () => {
    it("should advance when student demonstrates mastery", () => {
      const performances: StudentPerformance[] = [
        {
          studentId: "student_1",
          nodeId: "n1",
          score: 0.9,
          timeSpentMinutes: 10,
          attempts: 1,
          completedAt: new Date().toISOString(),
          bloomsLevelAchieved: "understand" as BloomsTaxonomyLevel,
          errors: [],
        },
        {
          studentId: "student_1",
          nodeId: "n2",
          score: 0.85,
          timeSpentMinutes: 12,
          attempts: 1,
          completedAt: new Date().toISOString(),
          bloomsLevelAchieved: "understand" as BloomsTaxonomyLevel,
          errors: [],
        },
        {
          studentId: "student_1",
          nodeId: "n3",
          score: 0.8,
          timeSpentMinutes: 15,
          attempts: 1,
          completedAt: new Date().toISOString(),
          bloomsLevelAchieved: "understand" as BloomsTaxonomyLevel,
          errors: [],
        },
      ];

      const nextLevel = engine.getNextBloomsLevel("understand", performances);
      expect(nextLevel).toBe("apply");
    });

    it("should not advance without sufficient mastery demonstrations", () => {
      const performances: StudentPerformance[] = [
        {
          studentId: "student_1",
          nodeId: "n1",
          score: 0.9,
          timeSpentMinutes: 10,
          attempts: 1,
          completedAt: new Date().toISOString(),
          bloomsLevelAchieved: "understand" as BloomsTaxonomyLevel,
          errors: [],
        },
      ];

      const nextLevel = engine.getNextBloomsLevel("understand", performances);
      expect(nextLevel).toBe("understand");
    });

    it("should return same level if already at highest", () => {
      const performances: StudentPerformance[] = Array(5).fill({
        studentId: "student_1",
        nodeId: "n1",
        score: 0.95,
        timeSpentMinutes: 10,
        attempts: 1,
        completedAt: new Date().toISOString(),
        bloomsLevelAchieved: "create" as BloomsTaxonomyLevel,
        errors: [],
      });

      const nextLevel = engine.getNextBloomsLevel("create", performances);
      expect(nextLevel).toBe("create");
    });
  });
});
