/**
 * Lambda handler for teacher co-pilot features.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { AIProvider } from "@learning-os/ai";

import { TeacherCopilot, ClassroomAnalyticsService } from "@learning-os/ai";

export interface TeacherCopilotHandlerDependencies {
  aiProvider: AIProvider;
}

export function createTeacherCopilotHandler(deps: TeacherCopilotHandlerDependencies) {
  const copilot = new TeacherCopilot(deps.aiProvider);
  const analytics = new ClassroomAnalyticsService(deps.aiProvider);

  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const method = event.httpMethod;
      const path = event.pathParameters?.proxy || "";

      if (method === "POST" && path === "lesson-plan") {
        return handleLessonPlan(event, copilot);
      }

      if (method === "POST" && path === "assessment") {
        return handleAssessment(event, copilot);
      }

      if (method === "POST" && path === "grade") {
        return handleGrade(event, copilot);
      }

      if (method === "POST" && path === "activities") {
        return handleActivities(event, copilot);
      }

      if (method === "POST" && path === "analytics") {
        return handleAnalytics(event, analytics);
      }

      if (method === "POST" && path === "analytics/report") {
        return handleAnalyticsReport(event, analytics);
      }

      return errorResponse(404, "NOT_FOUND", `Unknown path: ${path}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return errorResponse(500, "INTERNAL_ERROR", message);
    }
  };
}

async function handleLessonPlan(
  event: APIGatewayProxyEvent,
  copilot: TeacherCopilot
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return errorResponse(400, "INVALID_REQUEST", "Request body is required");
  }

  const body = JSON.parse(event.body);
  const { subject, topic, grade, duration, objectives, language } = body;

  if (!subject || !topic || !duration) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "subject, topic, and duration are required"
    );
  }

  const lessonPlan = await copilot.generateLessonPlan({
    subject,
    topic,
    grade: grade || 8,
    duration,
    objectives: objectives || [],
    language,
  });

  return successResponse(201, { lessonPlan });
}

async function handleAssessment(
  event: APIGatewayProxyEvent,
  copilot: TeacherCopilot
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return errorResponse(400, "INVALID_REQUEST", "Request body is required");
  }

  const body = JSON.parse(event.body);
  const { subject, topic, grade, questionCount, bloomsLevels, difficulty, questionTypes } = body;

  if (!subject || !topic) {
    return errorResponse(400, "VALIDATION_ERROR", "subject and topic are required");
  }

  const questions = await copilot.generateAssessment({
    subject,
    topic,
    grade: grade || 8,
    questionCount: questionCount || 10,
    bloomsLevels: bloomsLevels || ["apply"],
    difficulty: difficulty || "medium",
    questionTypes: questionTypes || ["mcq"],
  });

  return successResponse(201, { questions });
}

async function handleGrade(
  event: APIGatewayProxyEvent,
  copilot: TeacherCopilot
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return errorResponse(400, "INVALID_REQUEST", "Request body is required");
  }

  const body = JSON.parse(event.body);
  const { studentId, assignmentId, questions, answers } = body;

  if (!studentId || !assignmentId || !questions || !answers) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "studentId, assignmentId, questions, and answers are required"
    );
  }

  const result = await copilot.gradeAssignment(studentId, assignmentId, questions, answers);

  return successResponse(200, { result });
}

async function handleActivities(
  event: APIGatewayProxyEvent,
  copilot: TeacherCopilot
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return errorResponse(400, "INVALID_REQUEST", "Request body is required");
  }

  const body = JSON.parse(event.body);
  const { subject, topic, grade, duration, activityTypes } = body;

  if (!subject || !topic) {
    return errorResponse(400, "VALIDATION_ERROR", "subject and topic are required");
  }

  const activities = await copilot.suggestActivities({
    subject,
    topic,
    grade: grade || 8,
    duration: duration || 45,
    activityTypes,
  });

  return successResponse(200, { activities });
}

async function handleAnalytics(
  event: APIGatewayProxyEvent,
  analyticsService: ClassroomAnalyticsService
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return errorResponse(400, "INVALID_REQUEST", "Request body is required");
  }

  const body = JSON.parse(event.body);
  const { engagements, performances } = body;

  if (!engagements || !Array.isArray(engagements)) {
    return errorResponse(400, "VALIDATION_ERROR", "engagements array is required");
  }

  const insights = await analyticsService.generateInsights(
    engagements,
    performances || []
  );

  return successResponse(200, { insights });
}

async function handleAnalyticsReport(
  event: APIGatewayProxyEvent,
  analyticsService: ClassroomAnalyticsService
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return errorResponse(400, "INVALID_REQUEST", "Request body is required");
  }

  const body = JSON.parse(event.body);
  const { classId, engagements, performances } = body;

  if (!classId || !engagements) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "classId and engagements are required"
    );
  }

  const report = await analyticsService.generateReport(
    classId,
    engagements,
    performances || []
  );

  return successResponse(200, { report });
}

function successResponse(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ success: true, data: body }),
  };
}

function errorResponse(statusCode: number, code: string, message: string): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ success: false, error: { code, message } }),
  };
}
