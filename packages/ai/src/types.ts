/**
 * Comprehensive AI types for the LearningOS adaptive learning platform.
 */

// ==================== Competency & Learning Levels ====================

export type CompetencyLevel =
  | "novice"
  | "beginner"
  | "intermediate"
  | "proficient"
  | "advanced"
  | "expert";

export type BloomsTaxonomyLevel =
  | "remember"
  | "understand"
  | "apply"
  | "analyze"
  | "evaluate"
  | "create";

export type ContentDifficulty = "easy" | "medium" | "hard" | "advanced";

// ==================== Knowledge Graph ====================

export interface KnowledgeNode {
  id: string;
  label: string;
  subject: string;
  topic: string;
  description: string;
  bloomsLevel: BloomsTaxonomyLevel;
  competencyLevel: CompetencyLevel;
  prerequisites: string[];
  relatedNodes: string[];
  metadata?: Record<string, unknown>;
}

export interface KnowledgeEdge {
  source: string;
  target: string;
  relationship: "prerequisite" | "related" | "extends" | "applies_to";
  weight: number;
}

export interface KnowledgeGraph {
  id: string;
  subject: string;
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  version: string;
  updatedAt: string;
}

// ==================== Learning Path ====================

export interface LearningObjective {
  id: string;
  description: string;
  bloomsLevel: BloomsTaxonomyLevel;
  competencyLevel: CompetencyLevel;
  subject: string;
  topic: string;
  measurableCriteria: string[];
}

export interface LearningPathNode {
  id: string;
  title: string;
  description: string;
  objectiveIds: string[];
  contentType: "lesson" | "quiz" | "assignment" | "project" | "discussion" | "video" | "reading";
  estimatedMinutes: number;
  difficulty: ContentDifficulty;
  prerequisites: string[];
  status: "locked" | "available" | "in_progress" | "completed" | "skipped";
  masteryScore?: number;
  adaptiveRules: AdaptiveRule[];
}

export interface LearningPath {
  id: string;
  studentId: string;
  subject: string;
  title: string;
  description: string;
  nodes: LearningPathNode[];
  currentNodeIndex: number;
  completionPercentage: number;
  estimatedTotalMinutes: number;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

// ==================== Adaptive Rules ====================

export interface AdaptiveRule {
  id: string;
  condition: AdaptiveCondition;
  action: AdaptiveAction;
  priority: number;
}

export interface AdaptiveCondition {
  type: "score_below" | "score_above" | "time_exceeded" | "attempts_exceeded" | "streak";
  threshold: number;
  nodeId?: string;
}

export interface AdaptiveAction {
  type: "adjust_difficulty" | "add_remediation" | "skip_node" | "suggest_resource" | "branch_path";
  parameters: Record<string, unknown>;
}

// ==================== Student Performance ====================

export interface StudentPerformance {
  studentId: string;
  nodeId: string;
  score: number;
  timeSpentMinutes: number;
  attempts: number;
  completedAt: string;
  bloomsLevelAchieved: BloomsTaxonomyLevel;
  errors: PerformanceError[];
}

export interface PerformanceError {
  type: string;
  description: string;
  conceptId: string;
  frequency: number;
}

export interface StudentProfile {
  studentId: string;
  currentLevel: CompetencyLevel;
  strengths: string[];
  weaknesses: string[];
  learningStyle: "visual" | "auditory" | "reading" | "kinesthetic";
  preferredLanguage: string;
  averageSessionMinutes: number;
  performanceHistory: StudentPerformance[];
}

// ==================== Tutor Session ====================

export interface TutorSessionConfig {
  studentId: string;
  subject: string;
  topic: string;
  language: SupportedLanguage;
  difficulty: ContentDifficulty;
  teachingStyle: "socratic" | "direct" | "exploratory" | "scaffolded";
  maxTurns?: number;
}

export interface TutorConversationMessage {
  id: string;
  role: "student" | "tutor" | "system";
  content: string;
  language: SupportedLanguage;
  timestamp: string;
  metadata?: {
    confidence?: number;
    conceptsReferenced?: string[];
    bloomsLevel?: BloomsTaxonomyLevel;
    hints?: string[];
  };
}

export interface TutorSessionState {
  sessionId: string;
  config: TutorSessionConfig;
  messages: TutorConversationMessage[];
  conceptsCovered: string[];
  comprehensionScore: number;
  startedAt: string;
  lastActivityAt: string;
  status: "active" | "paused" | "completed";
}

export type SupportedLanguage =
  | "en"
  | "hi"
  | "ta"
  | "te"
  | "bn"
  | "mr"
  | "gu"
  | "kn"
  | "ml"
  | "pa"
  | "or";

// ==================== Content Templates ====================

export interface ContentTemplate {
  id: string;
  type: ContentTemplateType;
  name: string;
  description: string;
  structure: Record<string, unknown>;
  variables: TemplateVariable[];
  outputFormat: "markdown" | "html" | "json" | "plain";
}

export type ContentTemplateType =
  | "lesson_plan"
  | "quiz"
  | "worksheet"
  | "summary"
  | "explanation"
  | "flashcards"
  | "concept_map"
  | "practice_problems";

export interface TemplateVariable {
  name: string;
  type: "string" | "number" | "array" | "object";
  required: boolean;
  defaultValue?: unknown;
  description: string;
}

// ==================== Assessment ====================

export interface AssessmentQuestion {
  id: string;
  type: "mcq" | "true_false" | "short_answer" | "essay" | "fill_blank" | "matching";
  bloomsLevel: BloomsTaxonomyLevel;
  difficulty: ContentDifficulty;
  subject: string;
  topic: string;
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
  rubric?: AssessmentRubric;
  points: number;
  timeLimit?: number;
}

export interface AssessmentRubric {
  criteria: RubricCriterion[];
  totalPoints: number;
}

export interface RubricCriterion {
  name: string;
  description: string;
  levels: RubricLevel[];
}

export interface RubricLevel {
  score: number;
  label: string;
  description: string;
}

export interface AssessmentResult {
  questionId: string;
  studentAnswer: string;
  score: number;
  maxScore: number;
  feedback: string;
  isCorrect: boolean;
  bloomsLevelDemonstrated: BloomsTaxonomyLevel;
  timeSpentSeconds: number;
}

// ==================== Curriculum Mapping ====================

export interface CurriculumStandard {
  id: string;
  framework: "NEP2020" | "NCERT" | "CBSE" | "ICSE" | "STATE_BOARD";
  grade: number;
  subject: string;
  chapter: string;
  competencyCode: string;
  description: string;
  learningOutcomes: string[];
}

export interface CurriculumMapping {
  standardId: string;
  contentId: string;
  alignmentScore: number;
  coveredOutcomes: string[];
  gaps: string[];
}

// ==================== Teacher Co-pilot ====================

export interface LessonPlan {
  id: string;
  title: string;
  subject: string;
  grade: number;
  duration: number;
  objectives: LearningObjective[];
  warmUp: ActivityBlock;
  mainActivities: ActivityBlock[];
  assessment: ActivityBlock;
  closure: ActivityBlock;
  differentiation: DifferentiationStrategy;
  resources: string[];
  curriculumStandards: string[];
}

export interface ActivityBlock {
  title: string;
  description: string;
  durationMinutes: number;
  type: "instruction" | "practice" | "discussion" | "assessment" | "activity";
  materials?: string[];
  instructions: string[];
}

export interface DifferentiationStrategy {
  advanced: string[];
  onLevel: string[];
  struggling: string[];
  ell: string[];
}

// ==================== Classroom Analytics ====================

export interface StudentEngagement {
  studentId: string;
  engagementScore: number;
  participationRate: number;
  assignmentCompletionRate: number;
  averageTimeOnTask: number;
  trend: "improving" | "stable" | "declining";
  lastUpdated: string;
}

export interface ClassroomInsight {
  type: "at_risk" | "high_performer" | "engagement_drop" | "concept_gap" | "pacing_issue";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  affectedStudents: string[];
  suggestedActions: string[];
  dataPoints: Record<string, number>;
}

export interface ClassroomAnalytics {
  classId: string;
  totalStudents: number;
  averageEngagement: number;
  averagePerformance: number;
  insights: ClassroomInsight[];
  atRiskStudents: string[];
  topPerformers: string[];
  conceptGaps: { concept: string; studentCount: number }[];
  updatedAt: string;
}

// ==================== AI Provider Types ====================

export interface AIProviderConfig {
  provider: "bedrock" | "openai" | "custom";
  modelId: string;
  region?: string;
  apiKey?: string;
  maxTokens: number;
  temperature: number;
  topP?: number;
  stopSequences?: string[];
}

export interface AIPrompt {
  system: string;
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: "complete" | "max_tokens" | "stop_sequence" | "error";
}

export interface AIStreamChunk {
  content: string;
  isComplete: boolean;
  error?: string;
}
