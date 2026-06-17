// Types
export * from "./types";

// Provider abstraction
export { AIProviderRegistry } from "./providers/base";
export type { AIProvider, AIProviderFactory } from "./providers/base";
export { BedrockProvider } from "./providers/bedrock";
export type { BedrockConfig, BedrockRuntimeClient } from "./providers/bedrock";
export { OpenAIProvider } from "./providers/openai";
export type { OpenAIConfig, OpenAIHttpClient } from "./providers/openai";

// Adaptive learning engine
export { AdaptiveLearningEngine } from "./engine/adaptive-learning";
export type { AdaptiveLearningConfig } from "./engine/adaptive-learning";
export { AssessmentEngine } from "./engine/assessment";
export type { AssessmentConfig, GenerateQuestionsParams, EvaluateAnswerParams } from "./engine/assessment";
export { KnowledgeGraphService } from "./engine/knowledge-graph";
export type { KnowledgeGraphConfig, LearningGap } from "./engine/knowledge-graph";

// AI Tutor
export { TutorService } from "./tutor/tutor-service";
export type { TutorServiceConfig } from "./tutor/tutor-service";
export { VoiceInterface } from "./tutor/voice-interface";
export type {
  SpeechToTextProvider,
  TextToSpeechProvider,
  VoiceInterfaceConfig,
} from "./tutor/voice-interface";

// Content generation
export { ContentGeneratorService } from "./content/generator";
export type { ContentGeneratorConfig, GenerateContentParams } from "./content/generator";
export { CurriculumMapper } from "./content/curriculum-mapper";
export type { CurriculumMapperConfig, MappingResult } from "./content/curriculum-mapper";

// Teacher co-pilot
export { TeacherCopilot } from "./teacher-copilot/copilot";
export type { TeacherCopilotConfig, LessonPlanParams, AssessmentParams, GradingResult } from "./teacher-copilot/copilot";
export { ClassroomAnalyticsService } from "./teacher-copilot/analytics";
export type { AnalyticsConfig, StudentActivityData } from "./teacher-copilot/analytics";
