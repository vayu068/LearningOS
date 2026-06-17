/**
 * AI Assessment Engine
 *
 * Generates questions at appropriate difficulty levels, evaluates responses
 * (MCQ + subjective), provides detailed feedback, and tracks competency progression.
 */

import type { AIProvider } from "../providers/base";
import type {
  AssessmentQuestion,
  AssessmentResult,
  BloomsTaxonomyLevel,
  ContentDifficulty,
  AssessmentRubric,
} from "../types";

export interface AssessmentConfig {
  defaultQuestionCount: number;
  defaultTimeLimit: number;
  passingScore: number;
  feedbackDetail: "brief" | "detailed" | "comprehensive";
}

const DEFAULT_ASSESSMENT_CONFIG: AssessmentConfig = {
  defaultQuestionCount: 10,
  defaultTimeLimit: 60,
  passingScore: 0.7,
  feedbackDetail: "detailed",
};

export interface GenerateQuestionsParams {
  subject: string;
  topic: string;
  bloomsLevel: BloomsTaxonomyLevel;
  difficulty: ContentDifficulty;
  questionCount: number;
  questionTypes: AssessmentQuestion["type"][];
  language?: string;
}

export interface EvaluateAnswerParams {
  question: AssessmentQuestion;
  studentAnswer: string;
  timeSpentSeconds: number;
}

/**
 * AI-powered assessment engine for generating and evaluating assessments.
 */
export class AssessmentEngine {
  private provider: AIProvider;
  private config: AssessmentConfig;

  constructor(provider: AIProvider, config?: Partial<AssessmentConfig>) {
    this.provider = provider;
    this.config = { ...DEFAULT_ASSESSMENT_CONFIG, ...config };
  }

  /**
   * Generate assessment questions at specified Bloom's taxonomy levels.
   */
  async generateQuestions(params: GenerateQuestionsParams): Promise<AssessmentQuestion[]> {
    const prompt = this.buildQuestionGenerationPrompt(params);

    const response = await this.provider.complete(prompt);

    try {
      const parsed = JSON.parse(response.content);
      const questions: AssessmentQuestion[] = (parsed.questions || []).map(
        (q: Record<string, unknown>, index: number) =>
          this.validateAndNormalizeQuestion(q, params, index)
      );
      return questions;
    } catch {
      // Fallback: generate template questions
      return this.generateTemplateQuestions(params);
    }
  }

  /**
   * Evaluate a student's answer to a question.
   */
  async evaluateAnswer(params: EvaluateAnswerParams): Promise<AssessmentResult> {
    const { question, studentAnswer, timeSpentSeconds } = params;

    // For objective questions, evaluate locally
    if (question.type === "mcq" || question.type === "true_false") {
      return this.evaluateObjectiveAnswer(question, studentAnswer, timeSpentSeconds);
    }

    // For subjective questions, use AI evaluation
    return this.evaluateSubjectiveAnswer(question, studentAnswer, timeSpentSeconds);
  }

  /**
   * Generate feedback for an assessment result.
   */
  async generateFeedback(
    question: AssessmentQuestion,
    result: AssessmentResult
  ): Promise<string> {
    const prompt = {
      system:
        "You are an educational assessment expert. Provide constructive feedback to help the student understand their performance. Be encouraging but honest. Respond with a plain text feedback message.",
      messages: [
        {
          role: "user" as const,
          content: JSON.stringify({
            question: question.question,
            correctAnswer: question.correctAnswer,
            studentAnswer: result.studentAnswer,
            isCorrect: result.isCorrect,
            score: result.score,
            explanation: question.explanation,
          }),
        },
      ],
    };

    try {
      const response = await this.provider.complete(prompt);
      return response.content;
    } catch {
      return result.isCorrect
        ? "Great job! You demonstrated good understanding of this concept."
        : `The correct answer is: ${question.correctAnswer}. ${question.explanation}`;
    }
  }

  /**
   * Determine the Bloom's level demonstrated by the student's answer.
   */
  determineBloomsLevel(
    question: AssessmentQuestion,
    result: AssessmentResult
  ): BloomsTaxonomyLevel {
    if (!result.isCorrect) {
      // Even incorrect answers can show some level of understanding
      if (result.score >= 0.5) {
        return this.lowerBloomsLevel(question.bloomsLevel);
      }
      return "remember";
    }

    return question.bloomsLevel;
  }

  /**
   * Calculate overall competency from a set of assessment results.
   */
  calculateCompetency(results: AssessmentResult[]): {
    overallScore: number;
    passed: boolean;
    bloomsDistribution: Record<BloomsTaxonomyLevel, number>;
    strengths: string[];
    weaknesses: string[];
  } {
    if (results.length === 0) {
      return {
        overallScore: 0,
        passed: false,
        bloomsDistribution: this.emptyBloomsDistribution(),
        strengths: [],
        weaknesses: [],
      };
    }

    const totalScore = results.reduce((sum, r) => sum + r.score, 0);
    const maxScore = results.reduce((sum, r) => sum + r.maxScore, 0);
    const overallScore = maxScore > 0 ? totalScore / maxScore : 0;

    // Count Bloom's levels demonstrated
    const bloomsDistribution = this.emptyBloomsDistribution();
    for (const result of results) {
      bloomsDistribution[result.bloomsLevelDemonstrated]++;
    }

    // Identify strengths and weaknesses
    const correct = results.filter((r) => r.isCorrect);
    const incorrect = results.filter((r) => !r.isCorrect);

    return {
      overallScore,
      passed: overallScore >= this.config.passingScore,
      bloomsDistribution,
      strengths: correct.map((r) => r.questionId),
      weaknesses: incorrect.map((r) => r.questionId),
    };
  }

  // ==================== Private Methods ====================

  private buildQuestionGenerationPrompt(params: GenerateQuestionsParams) {
    return {
      system: `You are an expert assessment designer for educational content. Generate ${params.questionCount} questions at Bloom's taxonomy level "${params.bloomsLevel}" with difficulty "${params.difficulty}". Return valid JSON with a "questions" array. Each question must have: type, question, options (for MCQ), correctAnswer, explanation, points.`,
      messages: [
        {
          role: "user" as const,
          content: JSON.stringify({
            subject: params.subject,
            topic: params.topic,
            bloomsLevel: params.bloomsLevel,
            difficulty: params.difficulty,
            questionCount: params.questionCount,
            questionTypes: params.questionTypes,
            language: params.language || "en",
          }),
        },
      ],
    };
  }

  private validateAndNormalizeQuestion(
    raw: Record<string, unknown>,
    params: GenerateQuestionsParams,
    index: number
  ): AssessmentQuestion {
    return {
      id: (raw.id as string) || `q_${Date.now()}_${index}`,
      type: (raw.type as AssessmentQuestion["type"]) || params.questionTypes[0] || "mcq",
      bloomsLevel: params.bloomsLevel,
      difficulty: params.difficulty,
      subject: params.subject,
      topic: params.topic,
      question: (raw.question as string) || "",
      options: raw.options as string[] | undefined,
      correctAnswer: (raw.correctAnswer as string | string[]) || "",
      explanation: (raw.explanation as string) || "",
      points: (raw.points as number) || 1,
      timeLimit: this.config.defaultTimeLimit,
    };
  }

  private generateTemplateQuestions(params: GenerateQuestionsParams): AssessmentQuestion[] {
    const questions: AssessmentQuestion[] = [];
    for (let i = 0; i < params.questionCount; i++) {
      questions.push({
        id: `q_template_${Date.now()}_${i}`,
        type: params.questionTypes[i % params.questionTypes.length] || "mcq",
        bloomsLevel: params.bloomsLevel,
        difficulty: params.difficulty,
        subject: params.subject,
        topic: params.topic,
        question: `Question ${i + 1} about ${params.topic}`,
        options: params.questionTypes[i % params.questionTypes.length] === "mcq"
          ? ["Option A", "Option B", "Option C", "Option D"]
          : undefined,
        correctAnswer: "Option A",
        explanation: `This tests ${params.bloomsLevel} level understanding of ${params.topic}`,
        points: 1,
        timeLimit: this.config.defaultTimeLimit,
      });
    }
    return questions;
  }

  private evaluateObjectiveAnswer(
    question: AssessmentQuestion,
    studentAnswer: string,
    timeSpentSeconds: number
  ): AssessmentResult {
    const normalizedStudent = studentAnswer.trim().toLowerCase();
    const correctAnswers = Array.isArray(question.correctAnswer)
      ? question.correctAnswer.map((a) => a.trim().toLowerCase())
      : [question.correctAnswer.trim().toLowerCase()];

    const isCorrect = correctAnswers.includes(normalizedStudent);

    return {
      questionId: question.id,
      studentAnswer,
      score: isCorrect ? question.points : 0,
      maxScore: question.points,
      feedback: isCorrect
        ? "Correct!"
        : `Incorrect. The correct answer is: ${question.correctAnswer}`,
      isCorrect,
      bloomsLevelDemonstrated: isCorrect ? question.bloomsLevel : "remember",
      timeSpentSeconds,
    };
  }

  private async evaluateSubjectiveAnswer(
    question: AssessmentQuestion,
    studentAnswer: string,
    timeSpentSeconds: number
  ): Promise<AssessmentResult> {
    const prompt = {
      system:
        'You are an expert grader. Evaluate the student answer against the question and rubric. Return valid JSON with: score (0 to maxPoints), isCorrect (boolean), feedback (string), bloomsLevelDemonstrated (one of: remember, understand, apply, analyze, evaluate, create).',
      messages: [
        {
          role: "user" as const,
          content: JSON.stringify({
            question: question.question,
            correctAnswer: question.correctAnswer,
            studentAnswer,
            maxPoints: question.points,
            rubric: question.rubric,
            bloomsLevel: question.bloomsLevel,
          }),
        },
      ],
    };

    try {
      const response = await this.provider.complete(prompt);
      const parsed = JSON.parse(response.content);

      return {
        questionId: question.id,
        studentAnswer,
        score: Math.min(parsed.score || 0, question.points),
        maxScore: question.points,
        feedback: parsed.feedback || "",
        isCorrect: parsed.isCorrect || false,
        bloomsLevelDemonstrated: parsed.bloomsLevelDemonstrated || "remember",
        timeSpentSeconds,
      };
    } catch {
      // Fallback evaluation
      return {
        questionId: question.id,
        studentAnswer,
        score: 0,
        maxScore: question.points,
        feedback: "Unable to evaluate automatically. Please have a teacher review.",
        isCorrect: false,
        bloomsLevelDemonstrated: "remember",
        timeSpentSeconds,
      };
    }
  }

  private lowerBloomsLevel(level: BloomsTaxonomyLevel): BloomsTaxonomyLevel {
    const levels: BloomsTaxonomyLevel[] = [
      "remember",
      "understand",
      "apply",
      "analyze",
      "evaluate",
      "create",
    ];
    const idx = levels.indexOf(level);
    return idx > 0 ? levels[idx - 1] : level;
  }

  private emptyBloomsDistribution(): Record<BloomsTaxonomyLevel, number> {
    return {
      remember: 0,
      understand: 0,
      apply: 0,
      analyze: 0,
      evaluate: 0,
      create: 0,
    };
  }
}
