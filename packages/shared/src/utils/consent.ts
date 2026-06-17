/**
 * Consent management utilities for DPDP Act compliance.
 * Handles consent collection, verification, and withdrawal.
 */

import {
  ConsentArtifact,
  ConsentCollectionRequest,
  ConsentPurpose,
  ConsentStatus,
  ConsentVerificationResult,
  ConsentWithdrawalRequest,
  DataCategory,
} from "../types/dpi";

/**
 * Creates a new consent artifact from a collection request.
 * This generates the consent record that should be stored in the database.
 *
 * @param request - The consent collection request
 * @param consentId - Pre-generated unique ID for the consent
 * @returns A ConsentArtifact ready for persistence
 */
export function createConsentArtifact(
  request: ConsentCollectionRequest,
  consentId: string
): ConsentArtifact {
  const now = new Date().toISOString();

  return {
    consentId,
    userId: request.userId,
    tenantId: request.tenantId,
    purpose: request.purposes[0],
    dataCategories: request.dataCategories,
    status: request.isMinor && !request.guardianUserId ? "pending_verification" : "active",
    collectedAt: now,
    noticeVersion: request.noticeVersion,
    isMinor: request.isMinor,
    guardianConsent: request.guardianUserId
      ? {
          guardianUserId: request.guardianUserId,
          relationship: "parent",
          consentedAt: now,
          verificationMethod: "manual",
        }
      : undefined,
    processingMode: "automatic",
  };
}

/**
 * Verifies whether a consent artifact is currently valid.
 *
 * @param consent - The consent artifact to verify
 * @returns Verification result with validity status and reason
 */
export function verifyConsent(consent: ConsentArtifact): ConsentVerificationResult {
  // Check if consent has been withdrawn
  if (consent.status === "withdrawn") {
    return {
      consentId: consent.consentId,
      isValid: false,
      reason: "Consent has been withdrawn",
    };
  }

  // Check if consent has expired
  if (consent.expiresAt) {
    const expiryDate = new Date(consent.expiresAt);
    if (expiryDate <= new Date()) {
      return {
        consentId: consent.consentId,
        isValid: false,
        reason: "Consent has expired",
        expiresAt: consent.expiresAt,
      };
    }
  }

  // Check if minor consent is still pending verification
  if (consent.status === "pending_verification") {
    return {
      consentId: consent.consentId,
      isValid: false,
      reason: "Consent is pending guardian verification",
    };
  }

  // Check that consent is in active status
  if (consent.status !== "active") {
    return {
      consentId: consent.consentId,
      isValid: false,
      reason: `Consent status is ${consent.status}`,
    };
  }

  return {
    consentId: consent.consentId,
    isValid: true,
    expiresAt: consent.expiresAt,
  };
}

/**
 * Processes a consent withdrawal request.
 * Returns the updated consent artifact with withdrawal metadata.
 *
 * @param consent - The existing consent artifact
 * @param request - The withdrawal request
 * @returns Updated consent artifact marked as withdrawn
 * @throws Error if consent cannot be withdrawn
 */
export function withdrawConsent(
  consent: ConsentArtifact,
  request: ConsentWithdrawalRequest
): ConsentArtifact {
  if (consent.status === "withdrawn") {
    throw new Error("Consent has already been withdrawn");
  }

  if (consent.userId !== request.userId) {
    throw new Error("Only the consent owner can withdraw consent");
  }

  return {
    ...consent,
    status: "withdrawn" as ConsentStatus,
    withdrawnAt: new Date().toISOString(),
  };
}

/**
 * Checks if a specific data processing purpose is covered by active consent.
 *
 * @param consents - Array of consent artifacts for a user
 * @param purpose - The purpose to check
 * @param dataCategory - The data category being processed
 * @returns Whether the processing is authorized by consent
 */
export function hasConsentForProcessing(
  consents: ConsentArtifact[],
  purpose: ConsentPurpose,
  dataCategory: DataCategory
): boolean {
  return consents.some((consent) => {
    const verification = verifyConsent(consent);
    if (!verification.isValid) return false;

    return consent.purpose === purpose && consent.dataCategories.includes(dataCategory);
  });
}

/**
 * Gets all active consents for a user within a tenant.
 *
 * @param consents - All consent artifacts
 * @param userId - The user to filter for
 * @param tenantId - The tenant context
 * @returns Active consent artifacts
 */
export function getActiveConsents(
  consents: ConsentArtifact[],
  userId: string,
  tenantId: string
): ConsentArtifact[] {
  return consents.filter((consent) => {
    if (consent.userId !== userId || consent.tenantId !== tenantId) return false;
    const verification = verifyConsent(consent);
    return verification.isValid;
  });
}

/**
 * Validates that a consent collection request meets DPDP requirements.
 *
 * @param request - The consent collection request
 * @returns Array of validation errors (empty if valid)
 */
export function validateConsentRequest(request: ConsentCollectionRequest): string[] {
  const errors: string[] = [];

  if (!request.userId) {
    errors.push("userId is required");
  }
  if (!request.tenantId) {
    errors.push("tenantId is required");
  }
  if (!request.purposes || request.purposes.length === 0) {
    errors.push("At least one purpose must be specified");
  }
  if (!request.dataCategories || request.dataCategories.length === 0) {
    errors.push("At least one data category must be specified");
  }
  if (!request.noticeVersion) {
    errors.push("Notice version is required");
  }
  if (request.isMinor && !request.guardianUserId) {
    errors.push("Guardian consent is required for minors");
  }

  return errors;
}
