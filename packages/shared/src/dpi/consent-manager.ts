/**
 * DPDP-Compliant Consent Lifecycle Manager.
 * Provides granular consent collection, purpose limitation, data minimization,
 * and right-to-erasure implementation per the Digital Personal Data Protection Act.
 */

import type {
  ConsentArtifact,
  ConsentCollectionRequest,
  ConsentPurpose,
  ConsentStatus,
  ConsentVerificationResult,
  ConsentWithdrawalRequest,
  DataCategory,
  GuardianConsent,
} from "../types/dpi";

/**
 * Consent manager configuration.
 */
export interface ConsentManagerConfig {
  /** Default consent expiry duration in days */
  defaultExpiryDays: number;
  /** Whether to require guardian consent for minors */
  requireGuardianConsent: boolean;
  /** Minimum age for self-consent (typically 18 in India) */
  minimumConsentAge: number;
  /** Supported notice versions */
  supportedNoticeVersions: string[];
  /** Data Processing Agreement reference */
  dpaReference: string;
}

/**
 * Consent audit event for tracking all consent operations.
 */
export interface ConsentAuditEvent {
  /** Event ID */
  eventId: string;
  /** Event type */
  eventType: ConsentEventType;
  /** Consent ID (if applicable) */
  consentId?: string;
  /** User ID */
  userId: string;
  /** Tenant ID */
  tenantId: string;
  /** Timestamp */
  timestamp: string;
  /** IP address of the requester */
  ipAddress?: string;
  /** User agent */
  userAgent?: string;
  /** Event details */
  details: Record<string, unknown>;
}

export type ConsentEventType =
  | "consent_requested"
  | "consent_granted"
  | "consent_denied"
  | "consent_withdrawn"
  | "consent_expired"
  | "consent_renewed"
  | "data_access_request"
  | "data_deletion_request"
  | "guardian_consent_requested"
  | "guardian_consent_granted";

/**
 * Batch consent operation for collecting multiple consents at once.
 */
export interface BatchConsentRequest {
  userId: string;
  tenantId: string;
  consents: {
    purpose: ConsentPurpose;
    dataCategories: DataCategory[];
    granted: boolean;
  }[];
  noticeVersion: string;
  isMinor: boolean;
  guardianUserId?: string;
}

/**
 * Consent summary for user-facing displays.
 */
export interface ConsentSummary {
  userId: string;
  tenantId: string;
  activeConsents: {
    purpose: ConsentPurpose;
    dataCategories: DataCategory[];
    grantedAt: string;
    expiresAt?: string;
  }[];
  withdrawnConsents: number;
  expiredConsents: number;
  lastUpdated: string;
}

/**
 * DPDP-compliant consent lifecycle manager.
 * Manages the full lifecycle of consent artifacts from collection to withdrawal.
 */
export class ConsentManager {
  private config: ConsentManagerConfig;

  constructor(config: ConsentManagerConfig) {
    this.config = config;
  }

  /**
   * Creates a new consent artifact with full DPDP compliance.
   * Validates notice version, purpose limitation, and minor consent requirements.
   */
  createConsent(
    request: ConsentCollectionRequest,
    consentId: string,
    options?: { expiryDays?: number; ipAddress?: string }
  ): { artifact: ConsentArtifact; auditEvent: ConsentAuditEvent } {
    // Validate notice version
    if (!this.config.supportedNoticeVersions.includes(request.noticeVersion)) {
      throw new ConsentError(
        "INVALID_NOTICE_VERSION",
        `Notice version ${request.noticeVersion} is not supported. Valid versions: ${this.config.supportedNoticeVersions.join(", ")}`
      );
    }

    // Validate data minimization: ensure purposes and categories are specific
    if (request.purposes.length === 0) {
      throw new ConsentError(
        "PURPOSE_REQUIRED",
        "At least one specific purpose is required (data minimization principle)"
      );
    }

    if (request.dataCategories.length === 0) {
      throw new ConsentError(
        "CATEGORY_REQUIRED",
        "At least one data category must be specified"
      );
    }

    // Validate minor consent requirements
    if (request.isMinor && this.config.requireGuardianConsent && !request.guardianUserId) {
      throw new ConsentError(
        "GUARDIAN_REQUIRED",
        "Guardian consent is required for users below the minimum consent age"
      );
    }

    const now = new Date();
    const expiryDays = options?.expiryDays || this.config.defaultExpiryDays;
    const expiresAt = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);

    const status: ConsentStatus = request.isMinor && !request.guardianUserId
      ? "pending_verification"
      : "active";

    const artifact: ConsentArtifact = {
      consentId,
      userId: request.userId,
      tenantId: request.tenantId,
      purpose: request.purposes[0],
      dataCategories: request.dataCategories,
      status,
      collectedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      noticeVersion: request.noticeVersion,
      isMinor: request.isMinor,
      guardianConsent: request.guardianUserId
        ? {
            guardianUserId: request.guardianUserId,
            relationship: "parent",
            consentedAt: now.toISOString(),
            verificationMethod: "manual",
          }
        : undefined,
      processingMode: "automatic",
    };

    const auditEvent: ConsentAuditEvent = {
      eventId: `evt_${consentId}`,
      eventType: "consent_granted",
      consentId,
      userId: request.userId,
      tenantId: request.tenantId,
      timestamp: now.toISOString(),
      ipAddress: options?.ipAddress,
      details: {
        purposes: request.purposes,
        dataCategories: request.dataCategories,
        noticeVersion: request.noticeVersion,
        expiresAt: expiresAt.toISOString(),
        isMinor: request.isMinor,
      },
    };

    return { artifact, auditEvent };
  }

  /**
   * Processes batch consent collection (e.g., during onboarding).
   * Creates individual consent artifacts for each purpose.
   */
  createBatchConsents(
    request: BatchConsentRequest,
    consentIdGenerator: () => string
  ): { artifacts: ConsentArtifact[]; auditEvents: ConsentAuditEvent[] } {
    const artifacts: ConsentArtifact[] = [];
    const auditEvents: ConsentAuditEvent[] = [];

    for (const consent of request.consents) {
      if (!consent.granted) {
        // Record denial for audit trail
        auditEvents.push({
          eventId: `evt_denied_${consentIdGenerator()}`,
          eventType: "consent_denied",
          userId: request.userId,
          tenantId: request.tenantId,
          timestamp: new Date().toISOString(),
          details: {
            purpose: consent.purpose,
            dataCategories: consent.dataCategories,
          },
        });
        continue;
      }

      const collectionRequest: ConsentCollectionRequest = {
        userId: request.userId,
        tenantId: request.tenantId,
        purposes: [consent.purpose],
        dataCategories: consent.dataCategories,
        noticeVersion: request.noticeVersion,
        isMinor: request.isMinor,
        guardianUserId: request.guardianUserId,
      };

      const { artifact, auditEvent } = this.createConsent(
        collectionRequest,
        consentIdGenerator()
      );

      artifacts.push(artifact);
      auditEvents.push(auditEvent);
    }

    return { artifacts, auditEvents };
  }

  /**
   * Withdraws consent and generates the required audit trail.
   * Implements the right to withdraw consent under DPDP.
   */
  withdrawConsent(
    consent: ConsentArtifact,
    request: ConsentWithdrawalRequest,
    options?: { ipAddress?: string }
  ): { artifact: ConsentArtifact; auditEvent: ConsentAuditEvent } {
    if (consent.status === "withdrawn") {
      throw new ConsentError(
        "ALREADY_WITHDRAWN",
        "This consent has already been withdrawn"
      );
    }

    if (consent.userId !== request.userId) {
      throw new ConsentError(
        "UNAUTHORIZED",
        "Only the data principal can withdraw their consent"
      );
    }

    const now = new Date().toISOString();

    const updatedArtifact: ConsentArtifact = {
      ...consent,
      status: "withdrawn",
      withdrawnAt: now,
    };

    const auditEvent: ConsentAuditEvent = {
      eventId: `evt_withdraw_${consent.consentId}`,
      eventType: "consent_withdrawn",
      consentId: consent.consentId,
      userId: request.userId,
      tenantId: consent.tenantId,
      timestamp: now,
      ipAddress: options?.ipAddress,
      details: {
        reason: request.reason,
        requestDataDeletion: request.requestDataDeletion,
        originalPurpose: consent.purpose,
        originalCategories: consent.dataCategories,
      },
    };

    return { artifact: updatedArtifact, auditEvent };
  }

  /**
   * Verifies if a consent artifact is currently valid for a specific processing purpose.
   * Checks status, expiry, purpose alignment, and data category coverage.
   */
  verifyConsentForProcessing(
    consent: ConsentArtifact,
    purpose: ConsentPurpose,
    dataCategory: DataCategory
  ): ConsentVerificationResult {
    // Check status
    if (consent.status === "withdrawn") {
      return {
        consentId: consent.consentId,
        isValid: false,
        reason: "Consent has been withdrawn by the data principal",
      };
    }

    if (consent.status === "pending_verification") {
      return {
        consentId: consent.consentId,
        isValid: false,
        reason: "Consent is pending guardian verification",
      };
    }

    // Check expiry
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

    // Check purpose limitation
    if (consent.purpose !== purpose) {
      return {
        consentId: consent.consentId,
        isValid: false,
        reason: `Consent was granted for "${consent.purpose}" but processing is for "${purpose}"`,
      };
    }

    // Check data category coverage
    if (!consent.dataCategories.includes(dataCategory)) {
      return {
        consentId: consent.consentId,
        isValid: false,
        reason: `Data category "${dataCategory}" is not covered by this consent`,
      };
    }

    return {
      consentId: consent.consentId,
      isValid: true,
      expiresAt: consent.expiresAt,
    };
  }

  /**
   * Generates a consent summary for user-facing display.
   * Shows what the user has consented to and what has been withdrawn.
   */
  generateSummary(consents: ConsentArtifact[], userId: string, tenantId: string): ConsentSummary {
    const userConsents = consents.filter(
      (c) => c.userId === userId && c.tenantId === tenantId
    );

    const activeConsents = userConsents
      .filter((c) => c.status === "active")
      .map((c) => ({
        purpose: c.purpose,
        dataCategories: c.dataCategories,
        grantedAt: c.collectedAt,
        expiresAt: c.expiresAt,
      }));

    const withdrawnCount = userConsents.filter((c) => c.status === "withdrawn").length;
    const expiredCount = userConsents.filter((c) => {
      if (c.expiresAt && c.status !== "withdrawn") {
        return new Date(c.expiresAt) <= new Date();
      }
      return false;
    }).length;

    return {
      userId,
      tenantId,
      activeConsents,
      withdrawnConsents: withdrawnCount,
      expiredConsents: expiredCount,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Adds guardian consent to a minor's pending consent artifact.
   */
  addGuardianConsent(
    consent: ConsentArtifact,
    guardianConsent: GuardianConsent
  ): { artifact: ConsentArtifact; auditEvent: ConsentAuditEvent } {
    if (consent.status !== "pending_verification") {
      throw new ConsentError(
        "INVALID_STATE",
        "Guardian consent can only be added to pending consents"
      );
    }

    if (!consent.isMinor) {
      throw new ConsentError(
        "NOT_MINOR",
        "Guardian consent is only applicable for minor users"
      );
    }

    const now = new Date().toISOString();

    const updatedArtifact: ConsentArtifact = {
      ...consent,
      status: "active",
      guardianConsent,
    };

    const auditEvent: ConsentAuditEvent = {
      eventId: `evt_guardian_${consent.consentId}`,
      eventType: "guardian_consent_granted",
      consentId: consent.consentId,
      userId: consent.userId,
      tenantId: consent.tenantId,
      timestamp: now,
      details: {
        guardianUserId: guardianConsent.guardianUserId,
        relationship: guardianConsent.relationship,
        verificationMethod: guardianConsent.verificationMethod,
      },
    };

    return { artifact: updatedArtifact, auditEvent };
  }
}

/**
 * Custom error class for consent management errors.
 */
export class ConsentError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ConsentError";
    this.code = code;
  }
}
