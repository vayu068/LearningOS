/**
 * Teacher Co-pilot Service
 *
 * Generates lesson plans, suggests activities, creates assessments,
 * provides classroom analytics insights, and auto-grades assignments.
 */

import type { AIProvider } from "../providers/base";
import type {
  LessonPlan,
  LearningObjective,
  ActivityBlock,
  DifferentiationStrategy,
  AssessmentQuestion,
  BloomsTaxonomyLevel,
  ContentDifficulty,
  SupportedLanguage,
  CompetencyLevel,
} from "../types";

export interface TeacherCopilotConfig {
  defaultGrade: number;
  defaultLanguage: SupportedLanguage;
  maxQuestionsPerAssessment: number;
  enableDifferentiation: boolean;
}

const DEFAULT_COPILOT_CONFIG: TeacherCopilotConfig = {
  defaultGrade: 8,
  defaultLanguage: "en",
  maxQuestionsPerAssessment: 25,
  enableDifferentiation: true,
};

export interface LessonPlanParams {
  subject: string;
  topic: string;
  grade: number;
  duration: number;
  objectives: string[];
  language?: SupportedLanguage;
  includeAssessment?: boolean;
  includeDifferentiation?: boolean;
}

export interface AssessmentParams {
  subject: string;
  topic: string;
  grade: number;
  questionCount: number;
  bloomsLevels: BloomsTaxonomyLevel[];
  difficulty: ContentDifficulty;
  questionTypes: AssessmentQuestion["type"][];
}

export interface GradingResult {
  studentId: string;
  assignmentId: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  feedback: string;
  questionResults: Array<{
    questionId: string;
    score: number;
    maxScore: number;
    feedback: string;
  }>;
  gradedAt: string;
}

/**
 * Teacher co-pilot service for classroom support.
 */
export class TeacherCopilot {
  private provider: AIProvider;
  private config: TeacherCopilotConfig;

  constructor(provider: AIProvider, config?: Partial<TeacherCopilotConfig>) {
    this.provider = provider;
    this.config = { ...DEFAULT_COPILOT_CONFIG, ...config };
  }

  /**
   * Generate a comprehensive lesson plan.
   */
  async generateLessonPlan(params: LessonPlanParams): Promise<LessonPlan> {
    const prompt = {
      system: [
        "You are an expert educator and lesson planning specialist.",
        "Create a detailed, engaging lesson plan following best pedagogical practices.",
        "Include warm-up, main activities, assessment, and closure.",
        "Return valid JSON matching the lesson plan structure.",
      ].join(" "),
      messages: [
        {
          role: "user" as const,
          content: JSON.stringify({
            subject: params.subject,
            topic: params.topic,
            grade: params.grade,
            duration: params.duration,
            objectives: params.objectives,
            language: params.language || this.config.defaultLanguage,
            includeAssessment: params.includeAssessment ?? true,
            includeDifferentiation: params.includeDifferentiation ?? this.config.enableDifferentiation,
          }),
        },
      ],
    };

    try {
      const response = await this.provider.complete(prompt);
      const parsed = JSON.parse(response.content);
      return this.buildLessonPlan(parsed, params);
    } catch {
      return this.buildDefaultLessonPlan(params);
    }
  }

  /**
   * Generate an assessment for a topic.
   */
  async generateAssessment(params: AssessmentParams): Promise<AssessmentQuestion[]> {
    const questionCount = Math.min(
      params.questionCount,
      this.config.maxQuestionsPerAssessment
    );

    const prompt = {
      system:
        'You are an assessment design expert. Generate well-crafted questions at specified Bloom\'s taxonomy levels. Return valid JSON with a "questions" array.',
      messages: [
        {
          role: "user" as const,
          content: JSON.stringify({
            ...params,
            questionCount,
          }),
        },
      ],
    };

    try {
      const response = await this.provider.complete(prompt);
      const parsed = JSON.parse(response.content);
      return this.normalizeQuestions(parsed.questions || [], params);
    } catch {
      return this.generateDefaultQuestions(params, questionCount);
    }
  }

  /**
   * Auto-grade student assignments using AI.
   */
  async gradeAssignment(
    studentId: string,
    assignmentId: string,
    questions: AssessmentQuestion[],
    answers: Array<{ questionId: string; answer: string }>
  ): Promise<GradingResult> {
    const questionResults: GradingResult["questionResults"] = [];
    let totalScore = 0;
    let maxScore = 0;

    for (const question of questions) {
      const studentAnswer = answers.find((a) => a.questionId === question.id);
      const answer = studentAnswer?.answer || "";

      const result = await this.gradeQuestion(question, answer);
      questionResults.push(result);
      totalScore += result.score;
      maxScore += result.maxScore;
    }

    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    // Generate overall feedback
    const feedback = await this.generateOverallFeedback(
      percentage,
      questionResults,
      questions
    );

    return {
      studentId,
      assignmentId,
      totalScore,
      maxScore,
      percentage,
      feedback,
      questionResults,
      gradedAt: new Date().toISOString(),
    };
  }

  /**
   * Suggest teaching activities for a topic.
   */
  async suggestActivities(params: {
    subject: string;
    topic: string;
    grade: number;
    duration: number;
    activityTypes?: string[];
  }): Promise<ActivityBlock[]> {
    const prompt = {
      system:
        'You are a creative educator. Suggest engaging classroom activities. Return valid JSON with an "activities" array. Each activity has: title, description, durationMinutes, type, materials, instructions.',
      messages: [
        {
          role: "user" as const,
          content: JSON.stringify(params),
        },
      ],
    };

    try {
      const response = await this.provider.complete(prompt);
      const parsed = JSON.parse(response.content);
      return this.normalizeActivities(parsed.activities || []);
    } catch {
      return [
        {
          title: `${params.topic} Discussion`,
          description: `Group discussion about key concepts in ${params.topic}`,
          durationMinutes: Math.min(15, params.duration),
          type: "discussion",
          materials: ["Whiteboard", "Markers"],
          instructions: [
            "Introduce the topic",
            "Break into small groups",
            "Discuss key concepts",
            "Report back to class",
          ],
        },
      ];
    }
  }

  // ==================== Private Methods ====================

  private async gradeQuestion(
    question: AssessmentQuestion,
    answer: string
  ): Promise<GradingResult["questionResults"][0]> {
    // For objective questions, grade locally
    if (question.type === "mcq" || question.type === "true_false") {
      const isCorrect =
        answer.trim().toLowerCase() ===
        (Array.isArray(question.correctAnswer)
          ? question.correctAnswer[0]
          : question.correctAnswer
        )
          .trim()
          .toLowerCase();

      return {
        questionId: question.id,
        score: isCorrect ? question.points : 0,
        maxScore: question.points,
        feedback: isCorrect
          ? "Correct!"
          : `Incorrect. The correct answer is: ${question.correctAnswer}`,
      };
    }

    // For subjective questions, use AI
    try {
      const prompt = {
        system:
          "You are a fair and thorough grader. Evaluate the student answer. Return valid JSON with: score (number), maxScore (number), feedback (string).",
        messages: [
          {
            role: "user" as const,
            content: JSON.stringify({
              question: question.question,
              correctAnswer: question.correctAnswer,
              studentAnswer: answer,
              maxPoints: question.points,
              rubric: question.rubric,
            }),
          },
        ],
      };

      const response = await this.provider.complete(prompt);
      const parsed = JSON.parse(response.content);

      return {
        questionId: question.id,
        score: Math.min(parsed.score || 0, question.points),
        maxScore: question.points,
        feedback: parsed.feedback || "",
      };
    } catch {
      return {
        questionId: question.id,
        score: 0,
        maxScore: question.points,
        feedback: "Unable to auto-grade. Please review manually.",
      };
    }
  }

  private async generateOverallFeedback(
    percentage: number,
    results: GradingResult["questionResults"],
    _questions: AssessmentQuestion[]
  ): Promise<string> {
    const correctCount = results.filter((r) => r.score === r.maxScore).length;
    const totalCount = results.length;

    if (percentage >= 90) {
      return `Excellent work! You scored ${percentage.toFixed(0)}% (${correctCount}/${totalCount} correct). Outstanding understanding demonstrated.`;
    }
    if (percentage >= 70) {
      return `Good effort! You scored ${percentage.toFixed(0)}% (${correctCount}/${totalCount} correct). Review the incorrect answers to strengthen your understanding.`;
    }
    if (percentage >= 50) {
      return `You scored ${percentage.toFixed(0)}% (${correctCount}/${totalCount} correct). Consider reviewing the material and trying again. Focus on the areas where you made mistakes.`;
    }
    return `You scored ${percentage.toFixed(0)}% (${correctCount}/${totalCount} correct). It seems like you need more practice with this material. Please review the topic and reach out to your teacher for help.`;
  }

  private buildLessonPlan(
    parsed: Record<string, unknown>,
    params: LessonPlanParams
  ): LessonPlan {
    const objectives: LearningObjective[] = params.objectives.map((obj, i) => ({
      id: `obj_${Date.now()}_${i}`,
      description: obj,
      bloomsLevel: "apply" as BloomsTaxonomyLevel,
      competencyLevel: "intermediate" as CompetencyLevel,
      subject: params.subject,
      topic: params.topic,
      measurableCriteria: [`Student can demonstrate: ${obj}`],
    }));

    return {
      id: `lp_${Date.now()}`,
      title: (parsed.title as string) || `${params.topic} Lesson Plan`,
      subject: params.subject,
      grade: params.grade,
      duration: params.duration,
      objectives,
      warmUp: this.normalizeActivity(parsed.warmUp as Record<string, unknown>) || {
        title: "Warm Up",
        description: "Brief review of previous concepts",
        durationMinutes: 5,
        type: "discussion",
        instructions: ["Review previous lesson", "Connect to today's topic"],
      },
      mainActivities: this.normalizeActivities(
        (parsed.mainActivities as Array<Record<string, unknown>>) || []
      ),
      assessment: this.normalizeActivity(parsed.assessment as Record<string, unknown>) || {
        title: "Assessment",
        description: "Quick check for understanding",
        durationMinutes: 10,
        type: "assessment",
        instructions: ["Administer assessment", "Collect responses"],
      },
      closure: this.normalizeActivity(parsed.closure as Record<string, unknown>) || {
        title: "Closure",
        description: "Summarize key learnings",
        durationMinutes: 5,
        type: "discussion",
        instructions: ["Review key points", "Preview next lesson"],
      },
      differentiation: (parsed.differentiation as DifferentiationStrategy) || {
        advanced: ["Extended problems", "Peer tutoring"],
        onLevel: ["Standard activities"],
        struggling: ["Simplified problems", "Additional scaffolding"],
        ell: ["Visual aids", "Vocabulary support"],
      },
      resources: (parsed.resources as string[]) || [],
      curriculumStandards: [],
    };
  }

  private buildDefaultLessonPlan(params: LessonPlanParams): LessonPlan {
    const objectives: LearningObjective[] = params.objectives.map((obj, i) => ({
      id: `obj_${Date.now()}_${i}`,
      description: obj,
      bloomsLevel: "apply" as BloomsTaxonomyLevel,
      competencyLevel: "intermediate" as CompetencyLevel,
      subject: params.subject,
      topic: params.topic,
      measurableCriteria: [`Student can demonstrate: ${obj}`],
    }));

    return {
      id: `lp_${Date.now()}`,
      title: `${params.topic} - Lesson Plan`,
      subject: params.subject,
      grade: params.grade,
      duration: params.duration,
      objectives,
      warmUp: {
        title: "Warm Up",
        description: `Quick review connecting to ${params.topic}`,
        durationMinutes: 5,
        type: "discussion",
        instructions: ["Review previous lesson", "Introduce today's topic"],
      },
      mainActivities: [
        {
          title: "Direct Instruction",
          description: `Teach key concepts of ${params.topic}`,
          durationMinutes: Math.round(params.duration * 0.3),
          type: "instruction",
          instructions: ["Present concepts", "Provide examples", "Check understanding"],
        },
        {
          title: "Guided Practice",
          description: "Students practice with teacher support",
          durationMinutes: Math.round(params.duration * 0.3),
          type: "practice",
          instructions: ["Distribute practice problems", "Circulate and assist"],
        },
      ],
      assessment: {
        title: "Exit Ticket",
        description: "Quick assessment of learning",
        durationMinutes: 10,
        type: "assessment",
        instructions: ["Distribute exit tickets", "Collect and review"],
      },
      closure: {
        title: "Closure",
        description: "Summarize and preview",
        durationMinutes: 5,
        type: "discussion",
        instructions: ["Review key points", "Preview next lesson", "Assign homework"],
      },
      differentiation: {
        advanced: ["Extension problems", "Research project"],
        onLevel: ["Standard practice set"],
        struggling: ["Modified problems", "Peer support"],
        ell: ["Visual aids", "Bilingual vocabulary list"],
      },
      resources: ["Textbook", "Whiteboard", "Worksheets"],
      curriculumStandards: [],
    };
  }

  private normalizeActivities(raw: Array<Record<string, unknown>>): ActivityBlock[] {
    if (!Array.isArray(raw) || raw.length === 0) {
      return [
        {
          title: "Main Activity",
          description: "Core learning activity",
          durationMinutes: 20,
          type: "instruction",
          instructions: ["Present content", "Engage students"],
        },
      ];
    }

    return raw.map((a) => this.normalizeActivity(a) || {
      title: "Activity",
      description: "",
      durationMinutes: 15,
      type: "activity" as const,
      instructions: [],
    });
  }

  private normalizeActivity(raw: Record<string, unknown> | undefined | null): ActivityBlock | null {
    if (!raw) return null;

    return {
      title: (raw.title as string) || "Activity",
      description: (raw.description as string) || "",
      durationMinutes: (raw.durationMinutes as number) || 15,
      type: (raw.type as ActivityBlock["type"]) || "activity",
      materials: raw.materials as string[] | undefined,
      instructions: (raw.instructions as string[]) || [],
    };
  }

  private normalizeQuestions(
    raw: Array<Record<string, unknown>>,
    params: AssessmentParams
  ): AssessmentQuestion[] {
    return raw.map((q, i) => ({
      id: (q.id as string) || `q_${Date.now()}_${i}`,
      type: (q.type as AssessmentQuestion["type"]) || params.questionTypes[0] || "mcq",
      bloomsLevel: (q.bloomsLevel as BloomsTaxonomyLevel) || params.bloomsLevels[0] || "apply",
      difficulty: params.difficulty,
      subject: params.subject,
      topic: params.topic,
      question: (q.question as string) || "",
      options: q.options as string[] | undefined,
      correctAnswer: (q.correctAnswer as string | string[]) || "",
      explanation: (q.explanation as string) || "",
      points: (q.points as number) || 1,
      timeLimit: (q.timeLimit as number) || 60,
    }));
  }

  private generateDefaultQuestions(
    params: AssessmentParams,
    count: number
  ): AssessmentQuestion[] {
    const questions: AssessmentQuestion[] = [];
    for (let i = 0; i < count; i++) {
      questions.push({
        id: `q_default_${Date.now()}_${i}`,
        type: params.questionTypes[i % params.questionTypes.length] || "mcq",
        bloomsLevel: params.bloomsLevels[i % params.bloomsLevels.length] || "apply",
        difficulty: params.difficulty,
        subject: params.subject,
        topic: params.topic,
        question: `Question ${i + 1} about ${params.topic}`,
        options:
          params.questionTypes[i % params.questionTypes.length] === "mcq"
            ? ["Option A", "Option B", "Option C", "Option D"]
            : undefined,
        correctAnswer: "Option A",
        explanation: `Tests ${params.bloomsLevels[i % params.bloomsLevels.length]} level of ${params.topic}`,
        points: 1,
        timeLimit: 60,
      });
    }
    return questions;
  }
}
