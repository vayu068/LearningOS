/**
 * Curriculum Mapping Service
 *
 * Maps content to NEP 2020 competency frameworks, NCERT/state board standards,
 * and grade-appropriate difficulty levels.
 */

import type { AIProvider } from "../providers/base";
import type {
  CurriculumStandard,
  CurriculumMapping,
  BloomsTaxonomyLevel,
  ContentDifficulty,
} from "../types";

export interface CurriculumMapperConfig {
  minimumAlignmentScore: number;
  supportedFrameworks: CurriculumStandard["framework"][];
}

const DEFAULT_MAPPER_CONFIG: CurriculumMapperConfig = {
  minimumAlignmentScore: 0.6,
  supportedFrameworks: ["NEP2020", "NCERT", "CBSE", "ICSE", "STATE_BOARD"],
};

export interface MappingResult {
  contentId: string;
  mappings: CurriculumMapping[];
  overallCoverage: number;
  gaps: string[];
  suggestions: string[];
}

/**
 * Curriculum mapping service that aligns content to educational standards.
 */
export class CurriculumMapper {
  private provider: AIProvider;
  private config: CurriculumMapperConfig;
  private standards: Map<string, CurriculumStandard> = new Map();

  constructor(provider: AIProvider, config?: Partial<CurriculumMapperConfig>) {
    this.provider = provider;
    this.config = { ...DEFAULT_MAPPER_CONFIG, ...config };
  }

  /**
   * Register curriculum standards for mapping.
   */
  registerStandards(standards: CurriculumStandard[]): void {
    for (const standard of standards) {
      this.standards.set(standard.id, standard);
    }
  }

  /**
   * Map content to curriculum standards.
   */
  async mapContent(
    contentId: string,
    content: string,
    subject: string,
    grade: number
  ): Promise<MappingResult> {
    // Filter standards relevant to this subject and grade
    const relevantStandards = this.getRelevantStandards(subject, grade);

    if (relevantStandards.length === 0) {
      return {
        contentId,
        mappings: [],
        overallCoverage: 0,
        gaps: ["No curriculum standards registered for this subject and grade"],
        suggestions: ["Register appropriate curriculum standards before mapping"],
      };
    }

    // Use AI to analyze alignment
    const mappings = await this.analyzeAlignment(contentId, content, relevantStandards);

    // Calculate overall coverage
    const coveredStandards = mappings.filter(
      (m) => m.alignmentScore >= this.config.minimumAlignmentScore
    );
    const overallCoverage =
      relevantStandards.length > 0
        ? coveredStandards.length / relevantStandards.length
        : 0;

    // Identify gaps
    const coveredIds = new Set(coveredStandards.map((m) => m.standardId));
    const gaps = relevantStandards
      .filter((s) => !coveredIds.has(s.id))
      .map((s) => `${s.competencyCode}: ${s.description}`);

    // Generate suggestions
    const suggestions = this.generateSuggestions(mappings, gaps, relevantStandards);

    return {
      contentId,
      mappings,
      overallCoverage,
      gaps,
      suggestions,
    };
  }

  /**
   * Get recommended difficulty for a grade and framework.
   */
  getGradeAppropriateSettings(
    grade: number,
    framework: CurriculumStandard["framework"]
  ): { difficulty: ContentDifficulty; bloomsLevel: BloomsTaxonomyLevel } {
    // NEP 2020 stage-based recommendations
    if (framework === "NEP2020") {
      if (grade <= 2) {
        return { difficulty: "easy", bloomsLevel: "remember" };
      }
      if (grade <= 5) {
        return { difficulty: "easy", bloomsLevel: "understand" };
      }
      if (grade <= 8) {
        return { difficulty: "medium", bloomsLevel: "apply" };
      }
      if (grade <= 10) {
        return { difficulty: "medium", bloomsLevel: "analyze" };
      }
      return { difficulty: "hard", bloomsLevel: "evaluate" };
    }

    // General grade-based mapping
    if (grade <= 4) {
      return { difficulty: "easy", bloomsLevel: "understand" };
    }
    if (grade <= 7) {
      return { difficulty: "medium", bloomsLevel: "apply" };
    }
    if (grade <= 10) {
      return { difficulty: "hard", bloomsLevel: "analyze" };
    }
    return { difficulty: "advanced", bloomsLevel: "evaluate" };
  }

  /**
   * Find standards covering a specific topic.
   */
  findStandardsForTopic(
    topic: string,
    subject: string,
    framework?: CurriculumStandard["framework"]
  ): CurriculumStandard[] {
    const results: CurriculumStandard[] = [];
    const topicLower = topic.toLowerCase();
    const subjectLower = subject.toLowerCase();

    for (const standard of this.standards.values()) {
      if (framework && standard.framework !== framework) continue;
      if (standard.subject.toLowerCase() !== subjectLower) continue;

      // Check if the standard relates to the topic
      const matchesDescription = standard.description.toLowerCase().includes(topicLower);
      const matchesChapter = standard.chapter.toLowerCase().includes(topicLower);
      const matchesOutcomes = standard.learningOutcomes.some((o) =>
        o.toLowerCase().includes(topicLower)
      );

      if (matchesDescription || matchesChapter || matchesOutcomes) {
        results.push(standard);
      }
    }

    return results;
  }

  /**
   * Get all registered standards for a subject and grade.
   */
  getRelevantStandards(subject: string, grade: number): CurriculumStandard[] {
    const results: CurriculumStandard[] = [];
    const subjectLower = subject.toLowerCase();

    for (const standard of this.standards.values()) {
      if (
        standard.subject.toLowerCase() === subjectLower &&
        standard.grade === grade
      ) {
        results.push(standard);
      }
    }

    return results;
  }

  // ==================== Private Methods ====================

  private async analyzeAlignment(
    contentId: string,
    content: string,
    standards: CurriculumStandard[]
  ): Promise<CurriculumMapping[]> {
    const prompt = {
      system:
        'You are a curriculum alignment expert. Analyze how well the given content aligns with each curriculum standard. Return valid JSON with a "mappings" array. Each mapping has: standardId, alignmentScore (0-1), coveredOutcomes (array of outcome strings from the standard that are covered), gaps (array of outcome strings not covered).',
      messages: [
        {
          role: "user" as const,
          content: JSON.stringify({
            contentId,
            contentExcerpt: content.substring(0, 2000),
            standards: standards.map((s) => ({
              id: s.id,
              competencyCode: s.competencyCode,
              description: s.description,
              learningOutcomes: s.learningOutcomes,
            })),
          }),
        },
      ],
    };

    try {
      const response = await this.provider.complete(prompt);
      const parsed = JSON.parse(response.content);
      const rawMappings = (parsed.mappings || []) as Array<Record<string, unknown>>;

      return rawMappings.map((m) => ({
        standardId: (m.standardId as string) || "",
        contentId,
        alignmentScore: Math.min(1, Math.max(0, (m.alignmentScore as number) || 0)),
        coveredOutcomes: (m.coveredOutcomes as string[]) || [],
        gaps: (m.gaps as string[]) || [],
      }));
    } catch {
      // Fallback: return basic mappings with neutral scores
      return standards.map((s) => ({
        standardId: s.id,
        contentId,
        alignmentScore: 0.5,
        coveredOutcomes: [],
        gaps: s.learningOutcomes,
      }));
    }
  }

  private generateSuggestions(
    mappings: CurriculumMapping[],
    gaps: string[],
    _standards: CurriculumStandard[]
  ): string[] {
    const suggestions: string[] = [];

    // Suggest addressing high-priority gaps
    if (gaps.length > 0) {
      suggestions.push(`Add content covering: ${gaps.slice(0, 3).join("; ")}`);
    }

    // Suggest improving weak alignments
    const weakMappings = mappings.filter(
      (m) => m.alignmentScore > 0 && m.alignmentScore < this.config.minimumAlignmentScore
    );
    if (weakMappings.length > 0) {
      suggestions.push(
        `Strengthen alignment with ${weakMappings.length} partially-covered standards`
      );
    }

    // General suggestions based on coverage
    const avgScore =
      mappings.length > 0
        ? mappings.reduce((sum, m) => sum + m.alignmentScore, 0) / mappings.length
        : 0;

    if (avgScore < 0.5) {
      suggestions.push("Consider restructuring content to better align with curriculum standards");
    }

    return suggestions;
  }
}
