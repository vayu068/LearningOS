/**
 * Content Generator - AI-powered educational content generation.
 * Generates quizzes, summaries, explanations, and learning materials.
 */

export interface ContentGenerator {
  /**
   * Generate educational content based on request parameters.
   */
  generate(request: ContentRequest): Promise<GeneratedContent>;

  /**
   * Generate a quiz from source material.
   */
  generateQuiz(params: QuizGenerationParams): Promise<GeneratedContent>;

  /**
   * Generate a summary of learning material.
   */
  summarize(content: string, targetLevel: string, language: string): Promise<GeneratedContent>;
}

export interface ContentRequest {
  type: ContentType;
  subject: string;
  topic: string;
  targetLevel: string;
  language: string;
  constraints?: ContentConstraints;
}

export type ContentType =
  | "quiz"
  | "summary"
  | "explanation"
  | "flashcards"
  | "practice_problems"
  | "study_notes"
  | "concept_map";

export interface ContentConstraints {
  maxLength?: number;
  difficulty?: "easy" | "medium" | "hard";
  format?: "markdown" | "html" | "plain";
  includeExamples?: boolean;
  includeVisuals?: boolean;
}

export interface GeneratedContent {
  id: string;
  type: ContentType;
  title: string;
  content: string;
  metadata: ContentMetadata;
  generatedAt: string;
}

export interface ContentMetadata {
  subject: string;
  topic: string;
  level: string;
  language: string;
  wordCount: number;
  estimatedReadTime: number;
  aiModel: string;
  confidence: number;
}

export interface QuizGenerationParams {
  sourceContent: string;
  questionCount: number;
  questionTypes: QuizQuestionType[];
  difficulty: "easy" | "medium" | "hard";
  language: string;
}

export type QuizQuestionType =
  | "multiple_choice"
  | "true_false"
  | "fill_in_blank"
  | "short_answer"
  | "matching";
