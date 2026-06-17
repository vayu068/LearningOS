/**
 * AI Tutor - Intelligent tutoring system that provides personalized
 * explanations, hints, and feedback in multiple languages.
 */

export interface AITutor {
  /**
   * Start a new tutoring session.
   */
  startSession(params: TutorSessionParams): Promise<TutorSession>;

  /**
   * Send a message and get a tutor response.
   */
  sendMessage(sessionId: string, message: TutorMessage): Promise<TutorResponse>;

  /**
   * End a tutoring session and get summary.
   */
  endSession(sessionId: string): Promise<TutorSessionSummary>;
}

export interface TutorSessionParams {
  studentId: string;
  subjectId: string;
  topicId: string;
  language: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface TutorSession {
  sessionId: string;
  studentId: string;
  subjectId: string;
  topicId: string;
  startedAt: string;
  messages: TutorMessage[];
}

export interface TutorMessage {
  role: "student" | "tutor";
  content: string;
  timestamp: string;
  metadata?: {
    confidence?: number;
    sources?: string[];
    relatedTopics?: string[];
  };
}

export interface TutorResponse {
  message: TutorMessage;
  suggestions: string[];
  relatedResources?: string[];
}

export interface TutorSessionSummary {
  sessionId: string;
  duration: number;
  topicsCovered: string[];
  questionsAsked: number;
  comprehensionLevel: "low" | "medium" | "high";
  recommendations: string[];
}
