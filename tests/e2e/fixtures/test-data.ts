/**
 * Shared test fixtures for E2E tests.
 * Provides mock tenant data, user profiles, and learning content.
 */

export const testTenant = {
  id: "test-tenant-001",
  name: "Test School District",
  subdomain: "test-district",
  plan: "premium" as const,
  settings: {
    branding: {
      primaryColor: "#1a73e8",
      logo: "/images/test-logo.png",
      name: "Test School District",
    },
    features: {
      aiTutor: true,
      digiLocker: true,
      apaar: true,
      abc: true,
      offlineMode: true,
    },
    languages: ["en", "hi"],
    defaultLanguage: "en",
  },
};

export const testUsers = {
  student: {
    email: "student@test-district.platform.gov.in",
    password: "Test@Student123",
    fullName: "Aarav Sharma",
    role: "student" as const,
    tenantId: testTenant.id,
    apaarId: "123456789012",
    grade: "10",
    section: "A",
  },
  teacher: {
    email: "teacher@test-district.platform.gov.in",
    password: "Test@Teacher123",
    fullName: "Priya Patel",
    role: "teacher" as const,
    tenantId: testTenant.id,
    subjects: ["Mathematics", "Science"],
    classes: ["10-A", "10-B"],
  },
  admin: {
    email: "admin@test-district.platform.gov.in",
    password: "Test@Admin123",
    fullName: "Rajesh Kumar",
    role: "admin" as const,
    tenantId: testTenant.id,
  },
  guardian: {
    email: "guardian@test-district.platform.gov.in",
    password: "Test@Guardian123",
    fullName: "Meera Sharma",
    role: "student" as const,
    tenantId: testTenant.id,
    isGuardian: true,
    wardApaarId: "123456789012",
  },
};

export const testContent = {
  subjects: [
    { id: "math-10", name: "Mathematics", grade: "10" },
    { id: "science-10", name: "Science", grade: "10" },
    { id: "english-10", name: "English", grade: "10" },
  ],
  topics: [
    { id: "topic-quadratic", subjectId: "math-10", name: "Quadratic Equations" },
    { id: "topic-algebra", subjectId: "math-10", name: "Linear Algebra" },
    { id: "topic-physics-motion", subjectId: "science-10", name: "Laws of Motion" },
    { id: "topic-chemistry-periodic", subjectId: "science-10", name: "Periodic Table" },
  ],
  assessments: [
    {
      id: "assessment-001",
      title: "Quadratic Equations Quiz",
      type: "quiz" as const,
      subjectId: "math-10",
      duration: 30,
      totalMarks: 20,
      questions: [
        {
          id: "q1",
          text: "Solve: x^2 - 5x + 6 = 0",
          type: "short_answer",
          marks: 5,
        },
        {
          id: "q2",
          text: "What is the discriminant of x^2 + 4x + 4 = 0?",
          type: "multiple_choice",
          marks: 3,
          options: ["0", "4", "8", "16"],
        },
      ],
    },
  ],
};

export const testLearningSession = {
  id: "session-001",
  subjectId: "math-10",
  topicId: "topic-quadratic",
  status: "active" as const,
  startedAt: new Date().toISOString(),
  messages: [
    {
      role: "assistant" as const,
      content: "Welcome! Let us learn about Quadratic Equations. What do you already know about solving equations?",
    },
  ],
};

export const apiRoutes = {
  auth: {
    login: "/api/auth/login",
    register: "/api/auth/register",
    refresh: "/api/auth/refresh",
    logout: "/api/auth/logout",
  },
  learning: {
    sessions: "/api/learning/sessions",
    content: "/api/learning/content",
  },
  assessments: {
    list: "/api/assessments",
    submit: (id: string) => `/api/assessments/${id}/submit`,
  },
  dpi: {
    apaarVerify: "/api/dpi/apaar/verify",
    digilockerAuth: "/api/dpi/digilocker/authorize",
    abcAccount: (id: string) => `/api/dpi/abc/account/${id}`,
  },
};
