/**
 * Classroom Analytics Service
 *
 * Provides student engagement scoring, learning pattern detection,
 * at-risk student identification, and recommendation generation.
 */

import type { AIProvider } from "../providers/base";
import type {
  StudentEngagement,
  ClassroomInsight,
  ClassroomAnalytics,
  StudentPerformance,
} from "../types";

export interface AnalyticsConfig {
  engagementThreshold: number;
  atRiskThreshold: number;
  trendWindowDays: number;
  minDataPointsForTrend: number;
}

const DEFAULT_ANALYTICS_CONFIG: AnalyticsConfig = {
  engagementThreshold: 0.6,
  atRiskThreshold: 0.4,
  trendWindowDays: 14,
  minDataPointsForTrend: 3,
};

export interface StudentActivityData {
  studentId: string;
  loginFrequency: number;
  assignmentsCompleted: number;
  assignmentsTotal: number;
  averageScore: number;
  averageTimeOnTask: number;
  participationEvents: number;
  lastActiveDate: string;
}

/**
 * Classroom analytics service for teacher insights.
 */
export class ClassroomAnalyticsService {
  private provider: AIProvider;
  private config: AnalyticsConfig;

  constructor(provider: AIProvider, config?: Partial<AnalyticsConfig>) {
    this.provider = provider;
    this.config = { ...DEFAULT_ANALYTICS_CONFIG, ...config };
  }

  /**
   * Calculate student engagement score.
   */
  calculateEngagement(activityData: StudentActivityData): StudentEngagement {
    const completionRate =
      activityData.assignmentsTotal > 0
        ? activityData.assignmentsCompleted / activityData.assignmentsTotal
        : 0;

    const participationRate = Math.min(1, activityData.participationEvents / 10);

    // Weighted engagement score
    const engagementScore =
      completionRate * 0.4 +
      participationRate * 0.3 +
      Math.min(1, activityData.loginFrequency / 5) * 0.2 +
      Math.min(1, activityData.averageScore) * 0.1;

    // Determine trend based on recent activity
    const daysSinceActive = this.daysSince(activityData.lastActiveDate);
    let trend: StudentEngagement["trend"] = "stable";
    if (daysSinceActive > 7) trend = "declining";
    else if (completionRate > 0.8 && participationRate > 0.7) trend = "improving";

    return {
      studentId: activityData.studentId,
      engagementScore: Math.round(engagementScore * 100) / 100,
      participationRate: Math.round(participationRate * 100) / 100,
      assignmentCompletionRate: Math.round(completionRate * 100) / 100,
      averageTimeOnTask: activityData.averageTimeOnTask,
      trend,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Identify at-risk students from engagement data.
   */
  identifyAtRiskStudents(engagements: StudentEngagement[]): string[] {
    return engagements
      .filter(
        (e) =>
          e.engagementScore < this.config.atRiskThreshold ||
          e.trend === "declining" ||
          e.assignmentCompletionRate < 0.3
      )
      .map((e) => e.studentId);
  }

  /**
   * Generate classroom insights from student data.
   */
  async generateInsights(
    engagements: StudentEngagement[],
    performances: StudentPerformance[]
  ): Promise<ClassroomInsight[]> {
    const insights: ClassroomInsight[] = [];

    // At-risk detection
    const atRisk = this.identifyAtRiskStudents(engagements);
    if (atRisk.length > 0) {
      insights.push({
        type: "at_risk",
        severity: atRisk.length > engagements.length * 0.3 ? "critical" : "high",
        description: `${atRisk.length} student(s) showing signs of disengagement`,
        affectedStudents: atRisk,
        suggestedActions: [
          "Schedule one-on-one check-ins with at-risk students",
          "Consider adjusting difficulty or providing additional support",
          "Review if content is accessible and engaging",
        ],
        dataPoints: {
          atRiskCount: atRisk.length,
          totalStudents: engagements.length,
          percentage: Math.round((atRisk.length / engagements.length) * 100),
        },
      });
    }

    // Engagement drop detection
    const declining = engagements.filter((e) => e.trend === "declining");
    if (declining.length > 0) {
      insights.push({
        type: "engagement_drop",
        severity: declining.length > 5 ? "high" : "medium",
        description: `${declining.length} student(s) showing declining engagement`,
        affectedStudents: declining.map((e) => e.studentId),
        suggestedActions: [
          "Introduce more interactive activities",
          "Check for external factors affecting participation",
          "Consider varying teaching methods",
        ],
        dataPoints: {
          decliningCount: declining.length,
          averageEngagement:
            declining.reduce((sum, e) => sum + e.engagementScore, 0) / declining.length,
        },
      });
    }

    // High performer recognition
    const highPerformers = engagements.filter(
      (e) => e.engagementScore > 0.85 && e.trend === "improving"
    );
    if (highPerformers.length > 0) {
      insights.push({
        type: "high_performer",
        severity: "low",
        description: `${highPerformers.length} student(s) showing exceptional engagement`,
        affectedStudents: highPerformers.map((e) => e.studentId),
        suggestedActions: [
          "Provide enrichment activities",
          "Consider peer tutoring opportunities",
          "Acknowledge and encourage their progress",
        ],
        dataPoints: {
          highPerformerCount: highPerformers.length,
        },
      });
    }

    // Concept gap detection from performance data
    const conceptGaps = this.detectConceptGaps(performances);
    if (conceptGaps.length > 0) {
      const affectedStudents = new Set<string>();
      for (const gap of conceptGaps) {
        const struggling = performances
          .filter((p) => p.nodeId === gap.concept && p.score < 0.5)
          .map((p) => p.studentId);
        struggling.forEach((s) => affectedStudents.add(s));
      }

      insights.push({
        type: "concept_gap",
        severity: conceptGaps.length > 3 ? "high" : "medium",
        description: `${conceptGaps.length} concept(s) where multiple students are struggling`,
        affectedStudents: Array.from(affectedStudents),
        suggestedActions: [
          "Re-teach concepts with alternative approaches",
          "Provide additional practice materials",
          "Consider prerequisite gaps",
        ],
        dataPoints: {
          gapCount: conceptGaps.length,
          affectedStudentCount: affectedStudents.size,
        },
      });
    }

    return insights;
  }

  /**
   * Generate complete classroom analytics report.
   */
  async generateReport(
    classId: string,
    engagements: StudentEngagement[],
    performances: StudentPerformance[]
  ): Promise<ClassroomAnalytics> {
    const insights = await this.generateInsights(engagements, performances);
    const atRiskStudents = this.identifyAtRiskStudents(engagements);
    const topPerformers = engagements
      .filter((e) => e.engagementScore > 0.85)
      .map((e) => e.studentId);

    const avgEngagement =
      engagements.length > 0
        ? engagements.reduce((sum, e) => sum + e.engagementScore, 0) / engagements.length
        : 0;

    const avgPerformance =
      performances.length > 0
        ? performances.reduce((sum, p) => sum + p.score, 0) / performances.length
        : 0;

    const conceptGaps = this.detectConceptGaps(performances);

    return {
      classId,
      totalStudents: engagements.length,
      averageEngagement: Math.round(avgEngagement * 100) / 100,
      averagePerformance: Math.round(avgPerformance * 100) / 100,
      insights,
      atRiskStudents,
      topPerformers,
      conceptGaps,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Detect concepts where multiple students are struggling.
   */
  detectConceptGaps(
    performances: StudentPerformance[]
  ): Array<{ concept: string; studentCount: number }> {
    const conceptScores = new Map<string, { total: number; count: number; struggling: number }>();

    for (const perf of performances) {
      const existing = conceptScores.get(perf.nodeId) || {
        total: 0,
        count: 0,
        struggling: 0,
      };
      existing.total += perf.score;
      existing.count += 1;
      if (perf.score < 0.5) existing.struggling += 1;
      conceptScores.set(perf.nodeId, existing);
    }

    const gaps: Array<{ concept: string; studentCount: number }> = [];

    for (const [concept, data] of conceptScores.entries()) {
      // Consider it a gap if more than 30% of students are struggling
      if (data.count >= 2 && data.struggling / data.count > 0.3) {
        gaps.push({ concept, studentCount: data.struggling });
      }
    }

    return gaps.sort((a, b) => b.studentCount - a.studentCount);
  }

  // ==================== Private Methods ====================

  private daysSince(dateStr: string): number {
    const date = new Date(dateStr);
    const now = new Date();
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  }
}
