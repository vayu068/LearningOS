/**
 * Lambda handler for learning path generation and management.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { AIProvider } from "@learning-os/ai";

import { AdaptiveLearningEngine } from "@learning-os/ai";

export interface LearningPathDependencies {
  aiProvider: AIProvider;
}

export function createLearningPathHandler(deps: LearningPathDependencies) {
  const engine = new AdaptiveLearningEngine(deps.aiProvider);

  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const method = event.httpMethod;
      const path = event.pathParameters?.proxy || "";

      if (method === "POST" && path === "generate") {
        return handleGenerate(event, engine);
      }

      if (method === "POST" && path === "adapt") {
        return handleAdapt(event, engine);
      }

      if (method === "POST" && path === "difficulty") {
        return handleDifficulty(event, engine);
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
  engine: AdaptiveLearningEngine
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return errorResponse(400, "INVALID_REQUEST", "Request body is required");
  }

  const body = JSON.parse(event.body);
  const { studentProfile, knowledgeGraph, targetObjectives } = body;

  if (!studentProfile || !knowledgeGraph) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "studentProfile and knowledgeGraph are required"
    );
  }

  const path = await engine.generateLearningPath(
    studentProfile,
    knowledgeGraph,
    targetObjectives || []
  );

  return successResponse(201, { learningPath: path });
}

async function handleAdapt(
  event: APIGatewayProxyEvent,
  engine: AdaptiveLearningEngine
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return errorResponse(400, "INVALID_REQUEST", "Request body is required");
  }

  const body = JSON.parse(event.body);
  const { currentPath, performance, studentProfile } = body;

  if (!currentPath || !performance || !studentProfile) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "currentPath, performance, and studentProfile are required"
    );
  }

  const adaptedPath = await engine.adaptPath(currentPath, performance, studentProfile);

  return successResponse(200, { learningPath: adaptedPath });
}

async function handleDifficulty(
  event: APIGatewayProxyEvent,
  engine: AdaptiveLearningEngine
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return errorResponse(400, "INVALID_REQUEST", "Request body is required");
  }

  const body = JSON.parse(event.body);
  const { studentProfile } = body;

  if (!studentProfile) {
    return errorResponse(400, "VALIDATION_ERROR", "studentProfile is required");
  }

  const difficulty = engine.calculateRecommendedDifficulty(studentProfile);

  return successResponse(200, { recommendedDifficulty: difficulty });
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
