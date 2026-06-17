/**
 * AI Tutor Service
 *
 * Manages conversation context, provides explanations in multiple languages,
 * adapts teaching style to student level, and uses Socratic method.
 */

import type { AIProvider } from "../providers/base";
import type {
  TutorSessionConfig,
  TutorSessionState,
  TutorConversationMessage,
  SupportedLanguage,
  BloomsTaxonomyLevel,
} from "../types";

export interface TutorServiceConfig {
  maxContextMessages: number;
  defaultMaxTurns: number;
  socraticHintRatio: number;
}

const DEFAULT_TUTOR_CONFIG: TutorServiceConfig = {
  maxContextMessages: 20,
  defaultMaxTurns: 50,
  socraticHintRatio: 0.6,
};

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: "English",
  hi: "Hindi",
  ta: "Tamil",
  te: "Telugu",
  bn: "Bengali",
  mr: "Marathi",
  gu: "Gujarati",
  kn: "Kannada",
  ml: "Malayalam",
  pa: "Punjabi",
  or: "Odia",
};

/**
 * AI Tutor service for personalized, multi-language tutoring sessions.
 */
export class TutorService {
  private provider: AIProvider;
  private config: TutorServiceConfig;
  private sessions: Map<string, TutorSessionState> = new Map();

  constructor(provider: AIProvider, config?: Partial<TutorServiceConfig>) {
    this.provider = provider;
    this.config = { ...DEFAULT_TUTOR_CONFIG, ...config };
  }

  /**
   * Start a new tutoring session.
   */
  startSession(sessionConfig: TutorSessionConfig): TutorSessionState {
    const sessionId = `tutor_${Date.now()}_${sessionConfig.studentId}`;
    const now = new Date().toISOString();

    const session: TutorSessionState = {
      sessionId,
      config: sessionConfig,
      messages: [],
      conceptsCovered: [],
      comprehensionScore: 0,
      startedAt: now,
      lastActivityAt: now,
      status: "active",
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Send a message from the student and get a tutor response.
   */
  async sendMessage(
    sessionId: string,
    content: string
  ): Promise<{ response: TutorConversationMessage; session: TutorSessionState }> {
    const session = this.getSession(sessionId);

    if (session.status !== "active") {
      throw new Error(`Session ${sessionId} is not active (status: ${session.status})`);
    }

    // Add student message
    const studentMessage: TutorConversationMessage = {
      id: `msg_${Date.now()}_student`,
      role: "student",
      content,
      language: session.config.language,
      timestamp: new Date().toISOString(),
    };
    session.messages.push(studentMessage);

    // Generate tutor response
    const tutorResponse = await this.generateResponse(session, content);

    session.messages.push(tutorResponse);
    session.lastActivityAt = new Date().toISOString();

    // Update comprehension score based on interaction
    session.comprehensionScore = this.estimateComprehension(session);

    // Check max turns
    const maxTurns = session.config.maxTurns || this.config.defaultMaxTurns;
    if (session.messages.filter((m) => m.role === "student").length >= maxTurns) {
      session.status = "completed";
    }

    this.sessions.set(sessionId, session);

    return { response: tutorResponse, session };
  }

  /**
   * End a tutoring session.
   */
  endSession(sessionId: string): TutorSessionState {
    const session = this.getSession(sessionId);
    session.status = "completed";
    session.lastActivityAt = new Date().toISOString();
    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Get session state.
   */
  getSession(sessionId: string): TutorSessionState {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    return session;
  }

  /**
   * Get session summary for analytics.
   */
  getSessionSummary(sessionId: string): {
    duration: number;
    messageCount: number;
    conceptsCovered: string[];
    comprehensionScore: number;
    language: SupportedLanguage;
  } {
    const session = this.getSession(sessionId);
    const startTime = new Date(session.startedAt).getTime();
    const endTime = new Date(session.lastActivityAt).getTime();

    return {
      duration: Math.round((endTime - startTime) / 1000 / 60),
      messageCount: session.messages.length,
      conceptsCovered: session.conceptsCovered,
      comprehensionScore: session.comprehensionScore,
      language: session.config.language,
    };
  }

  // ==================== Private Methods ====================

  private async generateResponse(
    session: TutorSessionState,
    studentMessage: string
  ): Promise<TutorConversationMessage> {
    const systemPrompt = this.buildSystemPrompt(session);
    const contextMessages = this.getContextMessages(session);

    const prompt = {
      system: systemPrompt,
      messages: [
        ...contextMessages.map((m) => ({
          role: (m.role === "student" ? "user" : "assistant") as "user" | "assistant",
          content: m.content,
        })),
        { role: "user" as const, content: studentMessage },
      ],
    };

    try {
      const response = await this.provider.complete(prompt);

      // Try to parse structured response
      let content = response.content;
      let conceptsReferenced: string[] = [];
      let hints: string[] = [];

      try {
        const parsed = JSON.parse(response.content);
        content = parsed.response || parsed.content || response.content;
        conceptsReferenced = parsed.concepts || [];
        hints = parsed.hints || [];

        // Update concepts covered
        if (conceptsReferenced.length > 0) {
          for (const concept of conceptsReferenced) {
            if (!session.conceptsCovered.includes(concept)) {
              session.conceptsCovered.push(concept);
            }
          }
        }
      } catch {
        // Response is plain text, use as-is
      }

      return {
        id: `msg_${Date.now()}_tutor`,
        role: "tutor",
        content,
        language: session.config.language,
        timestamp: new Date().toISOString(),
        metadata: {
          confidence: 0.85,
          conceptsReferenced,
          hints,
        },
      };
    } catch (error) {
      // Fallback response
      return {
        id: `msg_${Date.now()}_tutor`,
        role: "tutor",
        content: this.getFallbackResponse(session.config.language),
        language: session.config.language,
        timestamp: new Date().toISOString(),
        metadata: {
          confidence: 0,
        },
      };
    }
  }

  private buildSystemPrompt(session: TutorSessionState): string {
    const languageName = LANGUAGE_NAMES[session.config.language] || "English";
    const teachingStyle = this.getTeachingStyleInstructions(session.config.teachingStyle);

    return [
      `You are an expert AI tutor for ${session.config.subject}, specifically on the topic of ${session.config.topic}.`,
      `Communicate in ${languageName}. If the student writes in a different language, respond in their language while keeping technical terms accurate.`,
      `The student's current level is: ${session.config.difficulty}.`,
      teachingStyle,
      `Keep responses concise and educational. Focus on building understanding step by step.`,
      `When the student makes errors, guide them toward the correct understanding rather than directly giving answers.`,
      `Return your response as JSON with fields: "response" (your message), "concepts" (array of concepts referenced), "hints" (optional array of follow-up hints).`,
    ].join("\n");
  }

  private getTeachingStyleInstructions(style: TutorSessionConfig["teachingStyle"]): string {
    switch (style) {
      case "socratic":
        return "Use the Socratic method: ask guiding questions to help the student discover answers themselves. Never give direct answers without first asking a probing question.";
      case "direct":
        return "Use a direct teaching approach: explain concepts clearly, provide examples, and confirm understanding.";
      case "exploratory":
        return "Encourage exploration: present multiple perspectives, ask open-ended questions, and let the student form their own connections.";
      case "scaffolded":
        return "Use scaffolded instruction: break complex concepts into smaller steps, provide support at each level, and gradually reduce assistance.";
      default:
        return "Adapt your teaching style to what seems most effective for this student.";
    }
  }

  private getContextMessages(session: TutorSessionState): TutorConversationMessage[] {
    const messages = session.messages.filter((m) => m.role !== "system");
    if (messages.length <= this.config.maxContextMessages) {
      return messages;
    }
    // Keep the most recent messages within context window
    return messages.slice(-this.config.maxContextMessages);
  }

  private estimateComprehension(session: TutorSessionState): number {
    const studentMessages = session.messages.filter((m) => m.role === "student");
    if (studentMessages.length === 0) return 0;

    // Simple heuristic: longer, more detailed responses suggest higher comprehension
    let score = 0;
    const recentMessages = studentMessages.slice(-5);

    for (const msg of recentMessages) {
      const wordCount = msg.content.split(/\s+/).length;
      if (wordCount > 20) score += 0.3;
      else if (wordCount > 10) score += 0.2;
      else score += 0.1;
    }

    // Factor in concepts covered
    score += session.conceptsCovered.length * 0.05;

    return Math.min(1, score / recentMessages.length);
  }

  private getFallbackResponse(language: SupportedLanguage): string {
    const fallbacks: Partial<Record<SupportedLanguage, string>> = {
      en: "I apologize, but I am having trouble generating a response right now. Could you please rephrase your question?",
      hi: "मुझे खेद है, लेकिन मुझे अभी उत्तर देने में कठिनाई हो रही है। कृपया अपना प्रश्न दोबारा पूछें।",
      ta: "மன்னிக்கவும், இப்போது பதில் அளிப்பதில் சிரமம் உள்ளது. தயவுசெய்து உங்கள் கேள்வியை மீண்டும் கேளுங்கள்.",
      te: "క్షమించండి, ప్రస్తుతం సమాధానం ఇవ్వడంలో ఇబ్బంది ఉంది. దయచేసి మీ ప్రశ్నను మళ్ళీ అడగండి.",
    };

    return fallbacks[language] || fallbacks.en!;
  }
}
