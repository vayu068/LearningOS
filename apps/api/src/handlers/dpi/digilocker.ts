/**
 * Lambda handlers for DigiLocker integration endpoints.
 * Provides OAuth2 flow initiation, callback handling, and document operations.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { createHmac } from "crypto";

/**
 * Secret used for HMAC-SHA256 signing of OAuth state parameters.
 * In production, this should be injected from AWS Secrets Manager or environment.
 */
const STATE_SIGNING_SECRET = process.env.DIGILOCKER_STATE_SECRET || "default-state-secret-change-in-production";

/**
 * Signs an OAuth state payload with HMAC-SHA256 to prevent forgery.
 */
export function signState(payload: string): string {
  const signature = createHmac("sha256", STATE_SIGNING_SECRET)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

/**
 * Verifies and extracts a signed OAuth state parameter.
 * Returns null if the signature is invalid.
 */
export function verifySignedState(signedState: string): string | null {
  const lastDotIndex = signedState.lastIndexOf(".");
  if (lastDotIndex === -1) return null;

  const payload = signedState.slice(0, lastDotIndex);
  const providedSignature = signedState.slice(lastDotIndex + 1);

  const expectedSignature = createHmac("sha256", STATE_SIGNING_SECRET)
    .update(payload)
    .digest("base64url");

  // Constant-time comparison to prevent timing attacks
  if (providedSignature.length !== expectedSignature.length) return null;
  let mismatch = 0;
  for (let i = 0; i < providedSignature.length; i++) {
    mismatch |= providedSignature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  if (mismatch !== 0) return null;

  return payload;
}

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

    // Generate state parameter for CSRF protection with HMAC-SHA256 signature
    const statePayload = Buffer.from(
      JSON.stringify({ userId, tenantId, timestamp: Date.now() })
    ).toString("base64url");
    const state = signState(statePayload);

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

    // Validate state parameter HMAC signature
    const verifiedPayload = verifySignedState(state);
    if (!verifiedPayload) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({
          error: "INVALID_STATE",
          message: "Invalid state parameter: signature verification failed",
        }),
      };
    }

    let stateData: { userId: string; tenantId: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(verifiedPayload, "base64url").toString());
    } catch {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({
          error: "INVALID_STATE",
          message: "Invalid state parameter: malformed payload",
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
