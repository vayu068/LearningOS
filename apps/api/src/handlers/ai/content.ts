/**
 * Lambda handler for content generation requests.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { AIProvider } from "@learning-os/ai";

import { ContentGeneratorService, CurriculumMapper } from "@learning-os/ai";

export interface ContentHandlerDependencies {
  aiProvider: AIProvider;
}

export function createContentHandler(deps: ContentHandlerDependencies) {
  const generator = new ContentGeneratorService(deps.aiProvider);
  const mapper = new CurriculumMapper(deps.aiProvider);

  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const method = event.httpMethod;
      const path = event.pathParameters?.proxy || "";

      if (method === "POST" && path === "generate") {
        return handleGenerate(event, generator);
      }

      if (method === "POST" && path === "lesson-plan") {
        return handleLessonPlan(event, generator);
      }

      if (method === "POST" && path === "quiz") {
        return handleQuiz(event, generator);
      }

      if (method === "POST" && path === "map-curriculum") {
        return handleMapCurriculum(event, mapper);
      }

      return errorResponse(404, "NOT_FOUND", `Unknown path: ${path}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return errorResponse(500, "INTERNAL_ERROR", message);
    }
  };
}

async function handleGenerate(
  event: APIGatewayProxyEvent,
  generator: ContentGeneratorService
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return errorResponse(400, "INVALID_REQUEST", "Request body is required");
  }

  const body = JSON.parse(event.body);
  const { type, subject, topic, grade, difficulty, bloomsLevel, language } = body;

  if (!type || !subject || !topic) {
    return errorResponse(400, "VALIDATION_ERROR", "type, subject, and topic are required");
  }

  const content = await generator.generate({
    type,
    subject,
    topic,
    grade: grade || 0,
    difficulty: difficulty || "medium",
    bloomsLevel: bloomsLevel || "understand",
    language: language || "en",
  });

  return successResponse(201, { content });
}

async function handleLessonPlan(
  event: APIGatewayProxyEvent,
  generator: ContentGeneratorService
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

  const content = await generator.generateLessonPlan({
    subject,
    topic,
    grade: grade || 0,
    duration,
    objectives: objectives || [],
    language,
  });

  return successResponse(201, { content });
}

async function handleQuiz(
  event: APIGatewayProxyEvent,
  generator: ContentGeneratorService
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return errorResponse(400, "INVALID_REQUEST", "Request body is required");
  }

  const body = JSON.parse(event.body);
  const { subject, topic, questionCount, difficulty, questionTypes, language } = body;

  if (!subject || !topic) {
    return errorResponse(400, "VALIDATION_ERROR", "subject and topic are required");
  }

  const content = await generator.generateQuiz({
    subject,
    topic,
    questionCount: questionCount || 10,
    difficulty: difficulty || "medium",
    questionTypes: questionTypes || ["multiple_choice"],
    language,
  });

  return successResponse(201, { content });
}

async function handleMapCurriculum(
  event: APIGatewayProxyEvent,
  mapper: CurriculumMapper
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return errorResponse(400, "INVALID_REQUEST", "Request body is required");
  }

  const body = JSON.parse(event.body);
  const { contentId, content, subject, grade, standards } = body;

  if (!contentId || !content || !subject || !grade) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "contentId, content, subject, and grade are required"
    );
  }

  // Register any provided standards
  if (standards && Array.isArray(standards)) {
    mapper.registerStandards(standards);
  }

  const mapping = await mapper.mapContent(contentId, content, subject, grade);

  return successResponse(200, { mapping });
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
