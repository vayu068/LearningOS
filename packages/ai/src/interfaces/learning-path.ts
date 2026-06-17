/**
 * Learning Path Engine - AI-powered personalized learning path generation.
 * Adapts paths based on student performance, preferences, and goals.
 */

export interface LearningPathEngine {
  /**
   * Generate a personalized learning path for a student.
   */
  generatePath(params: LearningPathParams): Promise<LearningPath>;

  /**
   * Adapt an existing path based on new performance data.
   */
  adaptPath(pathId: string, performanceData: PerformanceData): Promise<LearningPath>;

  /**
   * Get recommendations for next learning activities.
   */
  getRecommendations(studentId: string, count: number): Promise<LearningNode[]>;
}

export interface LearningPathParams {
  studentId: string;
  subjectId: string;
  targetLevel: string;
  currentLevel: string;
  learningStyle?: LearningStyle;
  timeConstraints?: TimeConstraints;
}

export interface LearningPath {
  pathId: string;
  studentId: string;
  nodes: LearningNode[];
  estimatedDuration: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  createdAt: string;
  updatedAt: string;
}

export interface LearningNode {
  nodeId: string;
  title: string;
  description: string;
  contentType: "video" | "reading" | "quiz" | "assignment" | "project" | "discussion";
  estimatedMinutes: number;
  prerequisites: string[];
  status: "locked" | "available" | "in_progress" | "completed";
  masteryScore?: number;
}

export interface PerformanceData {
  nodeId: string;
  score: number;
  timeSpent: number;
  attempts: number;
  completedAt: string;
}

export type LearningStyle = "visual" | "auditory" | "reading" | "kinesthetic";

export interface TimeConstraints {
  dailyMinutes: number;
  targetCompletionDate?: string;
}
