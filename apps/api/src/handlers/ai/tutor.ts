/**
 * Lambda handler for AI tutor sessions with WebSocket support pattern.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { AIProvider } from "@learning-os/ai";

import { TutorService } from "@learning-os/ai";

export interface TutorHandlerDependencies {
  aiProvider: AIProvider;
}

export function createTutorHandler(deps: TutorHandlerDependencies) {
  const tutorService = new TutorService(deps.aiProvider);

  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const method = event.httpMethod;
      const path = event.pathParameters?.proxy || "";

      if (method === "POST" && path === "start") {
        return handleStartSession(event, tutorService);
      }

      if (method === "POST" && path === "message") {
        return handleMessage(event, tutorService);
      }

      if (method === "POST" && path === "end") {
        return handleEndSession(event, tutorService);
      }

      if (method === "GET" && path.startsWith("session/")) {
        return handleGetSession(event, tutorService, path);
      }

      return errorResponse(404, "NOT_FOUND", `Unknown path: ${path}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Internal server error";

      if (message.includes("not found")) {
        return errorResponse(404, "SESSION_NOT_FOUND", message);
      }
      if (message.includes("not active")) {
        return errorResponse(409, "SESSION_INACTIVE", message);
      }

      return errorResponse(500, "INTERNAL_ERROR", message);
    }
  };
}

async function handleStartSession(
  event: APIGatewayProxyEvent,
  tutorService: TutorService
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return errorResponse(400, "INVALID_REQUEST", "Request body is required");
  }

  const body = JSON.parse(event.body);
  const { studentId, subject, topic, language, difficulty, teachingStyle } = body;

  if (!studentId || !subject || !topic) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "studentId, subject, and topic are required"
    );
  }

  const session = tutorService.startSession({
    studentId,
    subject,
    topic,
    language: language || "en",
    difficulty: difficulty || "medium",
    teachingStyle: teachingStyle || "socratic",
  });

  return successResponse(201, { session });
}

async function handleMessage(
  event: APIGatewayProxyEvent,
  tutorService: TutorService
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return errorResponse(400, "INVALID_REQUEST", "Request body is required");
  }

  const body = JSON.parse(event.body);
  const { sessionId, message } = body;

  if (!sessionId || !message) {
    return errorResponse(400, "VALIDATION_ERROR", "sessionId and message are required");
  }

  const result = await tutorService.sendMessage(sessionId, message);

  return successResponse(200, {
    response: result.response,
    session: {
      sessionId: result.session.sessionId,
      status: result.session.status,
      messageCount: result.session.messages.length,
      comprehensionScore: result.session.comprehensionScore,
    },
  });
}

async function handleEndSession(
  event: APIGatewayProxyEvent,
  tutorService: TutorService
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return errorResponse(400, "INVALID_REQUEST", "Request body is required");
  }

  const body = JSON.parse(event.body);
  const { sessionId } = body;

  if (!sessionId) {
    return errorResponse(400, "VALIDATION_ERROR", "sessionId is required");
  }

  const session = tutorService.endSession(sessionId);
  const summary = tutorService.getSessionSummary(sessionId);

  return successResponse(200, { session: { ...session, summary } });
}

async function handleGetSession(
  _event: APIGatewayProxyEvent,
  tutorService: TutorService,
  path: string
): Promise<APIGatewayProxyResult> {
  const sessionId = path.replace("session/", "");

  if (!sessionId) {
    return errorResponse(400, "VALIDATION_ERROR", "sessionId is required");
  }

  const session = tutorService.getSession(sessionId);
  const summary = tutorService.getSessionSummary(sessionId);

  return successResponse(200, { session, summary });
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
