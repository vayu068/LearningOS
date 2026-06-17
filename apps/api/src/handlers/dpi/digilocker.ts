/**
 * Lambda handlers for DigiLocker integration endpoints.
 * Provides OAuth2 flow initiation, callback handling, and document operations.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

/**
 * GET /dpi/digilocker/authorize - Initiate DigiLocker OAuth2 flow
 */
export async function authorize(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const userId = event.requestContext.authorizer?.claims?.sub;
    const tenantId = event.requestContext.authorizer?.claims?.["custom:tenantId"];

    if (!userId || !tenantId) {
      return {
        statusCode: 401,
        headers: corsHeaders(),
        body: JSON.stringify({
          error: "UNAUTHORIZED",
          message: "Authentication required",
        }),
      };
    }

    // Generate state parameter for CSRF protection
    const state = Buffer.from(
      JSON.stringify({ userId, tenantId, timestamp: Date.now() })
    ).toString("base64url");

    // In production, this would use DigiLockerService.getAuthorizationUrl
    const authorizationUrl = `https://digilocker.gov.in/public/oauth2/1/authorize?client_id=APP_CLIENT_ID&redirect_uri=${encodeURIComponent("https://platform.gov.in/dpi/digilocker/callback")}&response_type=code&state=${state}&scope=openid+docs:pull+docs:verify`;

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ authorizationUrl, state }),
    };
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /dpi/digilocker/callback - Handle DigiLocker OAuth2 callback
 */
export async function callback(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || "{}");
    const { code, state } = body;

    if (!code || !state) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({
          error: "VALIDATION_ERROR",
          message: "Authorization code and state are required",
        }),
      };
    }

    // Validate state parameter
    let stateData: { userId: string; tenantId: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, "base64url").toString());
    } catch {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({
          error: "INVALID_STATE",
          message: "Invalid state parameter",
        }),
      };
    }

    // Check state freshness (10 minute window)
    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({
          error: "EXPIRED_STATE",
          message: "Authorization flow has expired, please retry",
        }),
      };
    }

    // In production, this would exchange code for tokens via DigiLockerService
    const result = {
      success: true,
      digiLockerId: "DL_LINKED_ID",
      linkedAt: new Date().toISOString(),
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
 * POST /dpi/digilocker/documents/pull - Pull documents from DigiLocker
 */
export async function pullDocuments(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || "{}");
    const { documentType, consentId } = body;

    if (!documentType || !consentId) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({
          error: "VALIDATION_ERROR",
          message: "documentType and consentId are required",
        }),
      };
    }

    // In production, this would call DigiLockerService.pullDocuments
    const documents = [
      {
        documentUri: `dl://docs/${documentType}/DOC001`,
        documentType,
        issuer: "Board of Education",
        issuedAt: "2023-06-15T00:00:00.000Z",
        name: `${documentType} Document`,
        verificationHash: "sha256:abc123",
      },
    ];

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ documents }),
    };
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /dpi/digilocker/documents/verify - Verify a DigiLocker certificate
 */
export async function verifyDocument(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || "{}");
    const { documentUri, expectedHash, consentId } = body;

    if (!documentUri || !expectedHash || !consentId) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({
          error: "VALIDATION_ERROR",
          message: "documentUri, expectedHash, and consentId are required",
        }),
      };
    }

    // In production, this would call DigiLockerService.verifyCertificate
    const result = {
      isAuthentic: true,
      status: "valid",
      issuer: "Board of Education",
      issuedAt: "2023-06-15T00:00:00.000Z",
      referenceId: `verify_${Date.now()}`,
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
  console.error("DigiLocker handler error:", error);
  const message = error instanceof Error ? error.message : "Internal server error";
  return {
    statusCode: 500,
    headers: corsHeaders(),
    body: JSON.stringify({ error: "INTERNAL_ERROR", message }),
  };
}
