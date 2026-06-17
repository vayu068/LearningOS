/**
 * Lambda handlers for Academic Bank of Credits (ABC) integration endpoints.
 * Provides credit deposit, withdrawal, transfer, and transcript operations.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { ConsentArtifact, ConsentPurpose, DataCategory } from "@learning-os/shared";
import { ConsentManager } from "@learning-os/shared";

/**
 * Interface for consent store lookup.
 * In production, this queries DynamoDB for the consent artifact by ID.
 */
export interface ConsentStore {
  getConsent(consentId: string): Promise<ConsentArtifact | null>;
}

/** Default consent manager instance for verification */
const consentManager = new ConsentManager({
  defaultExpiryDays: 365,
  requireGuardianConsent: true,
  minimumConsentAge: 18,
  supportedNoticeVersions: ["1.0", "1.1"],
  dpaReference: "DPDP-2023",
});

/**
 * Placeholder consent store. In production, inject a real DynamoDB-backed store.
 * For now, returns null to indicate that the consent could not be verified,
 * which will reject the request - enforcing consent verification.
 */
let _consentStore: ConsentStore | null = null;

/**
 * Sets the consent store implementation (for dependency injection / testing).
 */
export function setConsentStore(store: ConsentStore): void {
  _consentStore = store;
}

/**
 * Verifies that a consent ID references an active, valid consent artifact
 * covering the requested purpose and data category.
 * Returns an error response if verification fails, or null if consent is valid.
 */
async function verifyConsent(
  consentId: string,
  purpose: ConsentPurpose,
  dataCategory: DataCategory
): Promise<APIGatewayProxyResult | null> {
  if (!_consentStore) {
    // No consent store configured - reject the request to be safe.
    // In production, the consent store must always be wired up.
    return {
      statusCode: 503,
      headers: corsHeaders(),
      body: JSON.stringify({
        error: "CONSENT_VERIFICATION_UNAVAILABLE",
        message: "Consent verification service is not available. Contact support.",
      }),
    };
  }

  const consent = await _consentStore.getConsent(consentId);
  if (!consent) {
    return {
      statusCode: 403,
      headers: corsHeaders(),
      body: JSON.stringify({
        error: "INVALID_CONSENT",
        message: "The provided consent ID does not reference a valid consent artifact",
      }),
    };
  }

  const verification = consentManager.verifyConsentForProcessing(consent, purpose, dataCategory);
  if (!verification.isValid) {
    return {
      statusCode: 403,
      headers: corsHeaders(),
      body: JSON.stringify({
        error: "CONSENT_VERIFICATION_FAILED",
        message: verification.reason || "Consent verification failed",
      }),
    };
  }

  return null; // Consent is valid
}

/**
 * GET /dpi/abc/account/{abcId} - Get ABC account details
 */
export async function getAccount(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const abcId = event.pathParameters?.abcId;
    const consentId = event.headers["x-consent-id"];

    if (!abcId) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({
          error: "VALIDATION_ERROR",
          message: "ABC account ID is required",
        }),
      };
    }

    if (!consentId) {
      return {
        statusCode: 403,
        headers: corsHeaders(),
        body: JSON.stringify({
          error: "CONSENT_REQUIRED",
          message: "X-Consent-Id header is required for account access",
        }),
      };
    }

    // Verify the consent artifact is active, unexpired, and covers the requested purpose
    const consentError = await verifyConsent(consentId, "dpi_integration", "academic_records");
    if (consentError) {
      return consentError;
    }

    // In production, this would call ABCService.getAccount
    const account = {
      abcId,
      apaarId: "123456789012",
      studentName: "Student Name",
      totalCredits: 120,
      creditsByCategory: [
        { category: "Core", credits: 60, level: "undergraduate" },
        { category: "Elective", credits: 40, level: "undergraduate" },
        { category: "Lab", credits: 20, level: "undergraduate" },
      ],
      transferHistory: [],
    };

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify(account),
    };
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /dpi/abc/credits/deposit - Deposit credits to ABC account
 */
export async function depositCredits(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || "{}");
    const { abcId, apaarId, credits, academicSession, consentId } = body;

    if (!abcId || !apaarId || !credits || !academicSession || !consentId) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({
          error: "VALIDATION_ERROR",
          message: "abcId, apaarId, credits, academicSession, and consentId are required",
        }),
      };
    }

    if (!Array.isArray(credits) || credits.length === 0) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({
          error: "VALIDATION_ERROR",
          message: "At least one credit entry is required",
        }),
      };
    }

    // Verify the consent artifact is active and covers academic records processing
    const consentError = await verifyConsent(consentId, "dpi_integration", "academic_records");
    if (consentError) {
      return consentError;
    }

    // In production, this would call ABCService.depositCredits
    const totalCreditsDeposited = credits.reduce(
      (sum: number, c: { credits: number }) => sum + c.credits,
      0
    );

    const result = {
      success: true,
      referenceId: `dep_${Date.now()}`,
      totalCredits: totalCreditsDeposited,
      processedAt: new Date().toISOString(),
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
 * POST /dpi/abc/credits/withdraw - Withdraw credits from ABC account
 */
export async function withdrawCredits(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || "{}");
    const { abcId, creditIds, reason, consentId } = body;

    if (!abcId || !creditIds || !reason || !consentId) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({
          error: "VALIDATION_ERROR",
          message: "abcId, creditIds, reason, and consentId are required",
        }),
      };
    }

    // Verify the consent artifact is active and covers academic records processing
    const consentError = await verifyConsent(consentId, "dpi_integration", "academic_records");
    if (consentError) {
      return consentError;
    }

    // In production, this would call ABCService.withdrawCredits
    const result = {
      success: true,
      referenceId: `wdr_${Date.now()}`,
      withdrawnCredits: creditIds.length * 3,
      processedAt: new Date().toISOString(),
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
 * POST /dpi/abc/credits/transfer - Transfer credits between institutions
 */
export async function transferCredits(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || "{}");
    const {
      abcId,
      apaarId,
      sourceInstitutionId,
      destinationInstitutionId,
      credits,
      consentId,
    } = body;

    if (!abcId || !apaarId || !sourceInstitutionId || !destinationInstitutionId || !credits || !consentId) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({
          error: "VALIDATION_ERROR",
          message: "All transfer parameters are required",
        }),
      };
    }

    // Verify the consent artifact is active and covers academic records processing
    const consentError = await verifyConsent(consentId, "dpi_integration", "academic_records");
    if (consentError) {
      return consentError;
    }

    // In production, this would call ABCService.transferCredits
    const result = {
      accepted: true,
      transfer: {
        transferId: `txr_${Date.now()}`,
        sourceInstitution: sourceInstitutionId,
        destinationInstitution: destinationInstitutionId,
        credits: credits.reduce((sum: number, c: { credits: number }) => sum + c.credits, 0),
        courseReference: credits[0]?.courseId || "COURSE001",
        transferredAt: new Date().toISOString(),
        status: "pending",
      },
      pendingActions: ["Destination institution approval required"],
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
 * POST /dpi/abc/transcript - Generate transcript
 */
export async function generateTranscript(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || "{}");
    const { abcId, apaarId, type, format, consentId } = body;

    if (!abcId || !apaarId || !type || !format || !consentId) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({
          error: "VALIDATION_ERROR",
          message: "abcId, apaarId, type, format, and consentId are required",
        }),
      };
    }

    // Verify the consent artifact is active and covers academic records processing
    const consentError = await verifyConsent(consentId, "dpi_integration", "academic_records");
    if (consentError) {
      return consentError;
    }

    // In production, this would call ABCService.generateTranscript
    const result = {
      success: true,
      referenceId: `trans_${Date.now()}`,
      content: format === "json" ? JSON.stringify({ credits: [] }) : "base64-encoded-content",
      contentType: format === "json" ? "application/json" : `application/${format}`,
      verificationHash: `sha256:${Date.now().toString(16)}`,
      generatedAt: new Date().toISOString(),
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
  console.error("ABC handler error:", error);
  const message = error instanceof Error ? error.message : "Internal server error";
  return {
    statusCode: 500,
    headers: corsHeaders(),
    body: JSON.stringify({ error: "INTERNAL_ERROR", message }),
  };
}
