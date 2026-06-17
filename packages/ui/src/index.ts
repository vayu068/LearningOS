export { Button } from "./components/Button";
export type { ButtonProps } from "./components/Button";

// Layout components
export { MainLayout, DashboardLayout } from "./components/Layout";
export type { MainLayoutProps, NavItem, DashboardLayoutProps, DashboardWidget } from "./components/Layout";

// Auth components
export { LoginForm, RegisterForm } from "./components/Auth";
export type { LoginFormProps, RegisterFormProps } from "./components/Auth";

// Dashboard components
export { StudentDashboard, TeacherDashboard, AdminDashboard, GovernanceDashboard } from "./components/Dashboard";
export type { StudentDashboardProps, TeacherDashboardProps, AdminDashboardProps, GovernanceDashboardProps } from "./components/Dashboard";

// AI components
export { TutorChat, LearningPath, ContentCreator } from "./components/AI";
export type { TutorChatProps, ChatMessage, LearningPathProps, PathNode, ContentCreatorProps } from "./components/AI";

// Assessment components
export { QuizPlayer, ResultsView } from "./components/Assessment";
export type { QuizPlayerProps, QuizQuestion, ResultsViewProps, QuestionResult, CompetencyScore } from "./components/Assessment";

// DPI components
export { APAARConnect, DigiLockerConnect, ABCIntegration } from "./components/DPI";
export type { APAARConnectProps, DigiLockerConnectProps, Document, ABCIntegrationProps, CreditRecord } from "./components/DPI";
