/**
 * Lambda handlers for APAAR integration endpoints.
 * Provides student verification, profile fetch, and enrollment update operations.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

/**
 * POST /dpi/apaar/verify - Verify a student's APAAR ID
 */
export async function verifyStudent(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || "{}");
    const { apaarId, studentName, dateOfBirth, consentId } = body;

    if (!apaarId || !studentName || !dateOfBirth || !consentId) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({
          error: "VALIDATION_ERROR",
          message: "apaarId, studentName, dateOfBirth, and consentId are required",
        }),
      };
    }

    // Validate APAAR ID format
    if (!/^\d{12}$/.test(apaarId)) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({
          error: "INVALID_APAAR_ID",
          message: "APAAR ID must be a 12-digit numeric string",
        }),
      };
    }

    const institutionId = event.requestContext.authorizer?.claims?.["custom:institutionId"];

    // In production, this would call the APAARService
    const result = {
      verified: true,
      status: "verified",
      referenceId: `ref_${Date.now()}`,
      verifiedAt: new Date().toISOString(),
      profile: {
        apaarId,
        studentName,
        dateOfBirth,
        institutionId: institutionId || "unknown",
        verificationStatus: "verified",
      },
    };

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify(result),
    };
  } catch (error) {
    return handleError(error);
  }
}

/**
 * GET /dpi/apaar/profile/{apaarId} - Fetch APAAR profile
 */
export async function getProfile(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const apaarId = event.pathParameters?.apaarId;
    const consentId = event.headers["x-consent-id"];

    if (!apaarId) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({
          error: "VALIDATION_ERROR",
          message: "APAAR ID is required",
        }),
      };
    }

    if (!consentId) {
      return {
        statusCode: 403,
        headers: corsHeaders(),
        body: JSON.stringify({
          error: "CONSENT_REQUIRED",
          message: "X-Consent-Id header is required for profile access",
        }),
      };
    }

    // In production, this would call APAARService.fetchProfile
    const profile = {
      apaarId,
      studentName: "Student Name",
      dateOfBirth: "2005-01-01",
      gender: "male",
      institutionId: "INST001",
      academicLevel: "secondary",
      verificationStatus: "verified",
      lastVerifiedAt: new Date().toISOString(),
    };

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify(profile),
    };
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /dpi/apaar/enrollment - Update student enrollment
 */
export async function updateEnrollment(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || "{}");
    const { apaarId, academicLevel, programName, consentId } = body;

    if (!apaarId || !academicLevel || !programName || !consentId) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({
          error: "VALIDATION_ERROR",
          message: "apaarId, academicLevel, programName, and consentId are required",
        }),
      };
    }

    const result = {
      success: true,
      referenceId: `enroll_${Date.now()}`,
      updatedAt: new Date().toISOString(),
    };

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify(result),
    };
  } catch (error) {
    return handleError(error);
  }
}

function corsHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Tenant-Id,X-Consent-Id",
  };
}

function handleError(error: unknown): APIGatewayProxyResult {
  console.error("APAAR handler error:", error);
  const message = error instanceof Error ? error.message : "Internal server error";
  return {
    statusCode: 500,
    headers: corsHeaders(),
    body: JSON.stringify({ error: "INTERNAL_ERROR", message }),
  };
}
