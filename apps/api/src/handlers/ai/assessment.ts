/**
 * Lambda handler for AI-powered assessment generation and evaluation.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { AIProvider } from "@learning-os/ai";

import { AssessmentEngine } from "@learning-os/ai";

export interface AssessmentHandlerDependencies {
  aiProvider: AIProvider;
}

export function createAssessmentHandler(deps: AssessmentHandlerDependencies) {
  const engine = new AssessmentEngine(deps.aiProvider);

  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const method = event.httpMethod;
      const path = event.pathParameters?.proxy || "";

      if (method === "POST" && path === "generate") {
        return handleGenerate(event, engine);
      }

      if (method === "POST" && path === "evaluate") {
        return handleEvaluate(event, engine);
      }

      if (method === "POST" && path === "feedback") {
        return handleFeedback(event, engine);
      }

      if (method === "POST" && path === "competency") {
        return handleCompetency(event, engine);
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
  engine: AssessmentEngine
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return errorResponse(400, "INVALID_REQUEST", "Request body is required");
  }

  const body = JSON.parse(event.body);
  const { subject, topic, bloomsLevel, difficulty, questionCount, questionTypes, language } = body;

  if (!subject || !topic || !bloomsLevel || !difficulty) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "subject, topic, bloomsLevel, and difficulty are required"
    );
  }

  const questions = await engine.generateQuestions({
    subject,
    topic,
    bloomsLevel,
    difficulty,
    questionCount: questionCount || 10,
    questionTypes: questionTypes || ["mcq"],
    language,
  });

  return successResponse(201, { questions });
}

async function handleEvaluate(
  event: APIGatewayProxyEvent,
  engine: AssessmentEngine
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return errorResponse(400, "INVALID_REQUEST", "Request body is required");
  }

  const body = JSON.parse(event.body);
  const { question, studentAnswer, timeSpentSeconds } = body;

  if (!question || !studentAnswer) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "question and studentAnswer are required"
    );
  }

  const result = await engine.evaluateAnswer({
    question,
    studentAnswer,
    timeSpentSeconds: timeSpentSeconds || 0,
  });

  return successResponse(200, { result });
}

async function handleFeedback(
  event: APIGatewayProxyEvent,
  engine: AssessmentEngine
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return errorResponse(400, "INVALID_REQUEST", "Request body is required");
  }

  const body = JSON.parse(event.body);
  const { question, result } = body;

  if (!question || !result) {
    return errorResponse(400, "VALIDATION_ERROR", "question and result are required");
  }

  const feedback = await engine.generateFeedback(question, result);

  return successResponse(200, { feedback });
}

async function handleCompetency(
  event: APIGatewayProxyEvent,
  engine: AssessmentEngine
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return errorResponse(400, "INVALID_REQUEST", "Request body is required");
  }

  const body = JSON.parse(event.body);
  const { results } = body;

  if (!results || !Array.isArray(results)) {
    return errorResponse(400, "VALIDATION_ERROR", "results array is required");
  }

  const competency = engine.calculateCompetency(results);

  return successResponse(200, { competency });
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
