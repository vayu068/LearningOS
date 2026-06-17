/**
 * AI Content Generator
 *
 * Creates lesson plans, quizzes, explanations, summaries from curriculum standards.
 * Supports multiple content formats (text, structured, interactive).
 */

import type { AIProvider } from "../providers/base";
import type {
  ContentTemplate,
  ContentTemplateType,
  ContentDifficulty,
  BloomsTaxonomyLevel,
  SupportedLanguage,
  CurriculumStandard,
} from "../types";

export interface ContentGeneratorConfig {
  maxOutputTokens: number;
  defaultLanguage: SupportedLanguage;
  enableCurriculumAlignment: boolean;
}

const DEFAULT_CONFIG: ContentGeneratorConfig = {
  maxOutputTokens: 4096,
  defaultLanguage: "en",
  enableCurriculumAlignment: true,
};

export interface GenerateContentParams {
  type: ContentTemplateType;
  subject: string;
  topic: string;
  grade: number;
  difficulty: ContentDifficulty;
  bloomsLevel: BloomsTaxonomyLevel;
  language: SupportedLanguage;
  standards?: CurriculumStandard[];
  template?: ContentTemplate;
  additionalInstructions?: string;
}

export interface GeneratedContentResult {
  id: string;
  type: ContentTemplateType;
  title: string;
  content: string;
  structuredContent?: Record<string, unknown>;
  metadata: {
    subject: string;
    topic: string;
    grade: number;
    difficulty: ContentDifficulty;
    bloomsLevel: BloomsTaxonomyLevel;
    language: SupportedLanguage;
    wordCount: number;
    estimatedReadTime: number;
    alignedStandards: string[];
    generatedAt: string;
    model: string;
  };
}

/**
 * AI-powered content generation service.
 */
export class ContentGeneratorService {
  private provider: AIProvider;
  private config: ContentGeneratorConfig;

  constructor(provider: AIProvider, config?: Partial<ContentGeneratorConfig>) {
    this.provider = provider;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate educational content based on parameters.
   */
  async generate(params: GenerateContentParams): Promise<GeneratedContentResult> {
    const prompt = this.buildGenerationPrompt(params);

    const response = await this.provider.complete(prompt);

    try {
      const parsed = JSON.parse(response.content);
      return this.buildResult(parsed, params, response.model);
    } catch {
      // Fallback: use response as plain content
      return this.buildResult(
        { title: `${params.topic} - ${params.type}`, content: response.content },
        params,
        response.model
      );
    }
  }

  /**
   * Generate a lesson plan.
   */
  async generateLessonPlan(params: {
    subject: string;
    topic: string;
    grade: number;
    duration: number;
    objectives: string[];
    language?: SupportedLanguage;
  }): Promise<GeneratedContentResult> {
    return this.generate({
      type: "lesson_plan",
      subject: params.subject,
      topic: params.topic,
      grade: params.grade,
      difficulty: "medium",
      bloomsLevel: "apply",
      language: params.language || this.config.defaultLanguage,
      additionalInstructions: `Duration: ${params.duration} minutes. Objectives: ${params.objectives.join(", ")}`,
    });
  }

  /**
   * Generate a quiz from a topic.
   */
  async generateQuiz(params: {
    subject: string;
    topic: string;
    questionCount: number;
    difficulty: ContentDifficulty;
    questionTypes: string[];
    language?: SupportedLanguage;
  }): Promise<GeneratedContentResult> {
    return this.generate({
      type: "quiz",
      subject: params.subject,
      topic: params.topic,
      grade: 0,
      difficulty: params.difficulty,
      bloomsLevel: "apply",
      language: params.language || this.config.defaultLanguage,
      additionalInstructions: `Generate ${params.questionCount} questions. Types: ${params.questionTypes.join(", ")}`,
    });
  }

  /**
   * Generate a summary of a topic.
   */
  async generateSummary(params: {
    subject: string;
    topic: string;
    sourceContent?: string;
    maxWords?: number;
    language?: SupportedLanguage;
  }): Promise<GeneratedContentResult> {
    return this.generate({
      type: "summary",
      subject: params.subject,
      topic: params.topic,
      grade: 0,
      difficulty: "medium",
      bloomsLevel: "understand",
      language: params.language || this.config.defaultLanguage,
      additionalInstructions: [
        params.sourceContent ? `Source: ${params.sourceContent}` : "",
        params.maxWords ? `Maximum ${params.maxWords} words` : "",
      ]
        .filter(Boolean)
        .join(". "),
    });
  }

  /**
   * Generate practice problems.
   */
  async generatePracticeProblems(params: {
    subject: string;
    topic: string;
    count: number;
    difficulty: ContentDifficulty;
    bloomsLevel: BloomsTaxonomyLevel;
    language?: SupportedLanguage;
  }): Promise<GeneratedContentResult> {
    return this.generate({
      type: "practice_problems",
      subject: params.subject,
      topic: params.topic,
      grade: 0,
      difficulty: params.difficulty,
      bloomsLevel: params.bloomsLevel,
      language: params.language || this.config.defaultLanguage,
      additionalInstructions: `Generate ${params.count} practice problems with step-by-step solutions.`,
    });
  }

  // ==================== Private Methods ====================

  private buildGenerationPrompt(params: GenerateContentParams) {
    const templateInstructions = params.template
      ? `Follow this template structure: ${JSON.stringify(params.template.structure)}`
      : "";

    const standardsContext =
      params.standards && params.standards.length > 0
        ? `Align with curriculum standards: ${params.standards.map((s) => `${s.framework} - ${s.competencyCode}: ${s.description}`).join("; ")}`
        : "";

    const system = [
      `You are an expert educational content creator.`,
      `Generate ${params.type} content for ${params.subject} on the topic "${params.topic}".`,
      `Grade level: ${params.grade > 0 ? params.grade : "general"}.`,
      `Difficulty: ${params.difficulty}. Bloom's level: ${params.bloomsLevel}.`,
      `Language: ${params.language}.`,
      templateInstructions,
      standardsContext,
      params.additionalInstructions || "",
      `Return valid JSON with fields: "title" (string), "content" (string - main content in markdown), "structuredContent" (optional object with structured data like questions array for quizzes).`,
    ]
      .filter(Boolean)
      .join("\n");

    return {
      system,
      messages: [
        {
          role: "user" as const,
          content: `Generate ${params.type} content now.`,
        },
      ],
      maxTokens: this.config.maxOutputTokens,
    };
  }

  private buildResult(
    parsed: Record<string, unknown>,
    params: GenerateContentParams,
    model: string
  ): GeneratedContentResult {
    const content = (parsed.content as string) || "";
    const wordCount = content.split(/\s+/).filter(Boolean).length;

    return {
      id: `content_${Date.now()}_${params.type}`,
      type: params.type,
      title: (parsed.title as string) || `${params.topic} - ${params.type}`,
      content,
      structuredContent: parsed.structuredContent as Record<string, unknown> | undefined,
      metadata: {
        subject: params.subject,
        topic: params.topic,
        grade: params.grade,
        difficulty: params.difficulty,
        bloomsLevel: params.bloomsLevel,
        language: params.language,
        wordCount,
        estimatedReadTime: Math.ceil(wordCount / 200),
        alignedStandards: params.standards?.map((s) => s.id) || [],
        generatedAt: new Date().toISOString(),
        model,
      },
    };
  }
}
