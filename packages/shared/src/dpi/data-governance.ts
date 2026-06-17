/**
 * Data Governance Service.
 * Implements data classification, retention policies, audit logging,
 * and Data Subject Access Request (DSAR) handling for DPDP compliance.
 */

import type { ConsentPurpose, DataCategory } from "../types/dpi";

/**
 * Data classification levels per DPDP Act.
 */
export type DataClassification =
  | "public"
  | "internal"
  | "confidential"
  | "sensitive_personal"
  | "critical";

/**
 * Data retention policy definition.
 */
export interface RetentionPolicy {
  /** Data category this policy applies to */
  dataCategory: DataCategory;
  /** Classification level */
  classification: DataClassification;
  /** Retention period in days */
  retentionDays: number;
  /** Action when retention expires */
  expiryAction: "delete" | "anonymize" | "archive";
  /** Legal basis for retention */
  legalBasis: string;
  /** Whether data can be retained after consent withdrawal */
  retainAfterWithdrawal: boolean;
  /** Maximum retention after withdrawal (days) */
  maxRetentionAfterWithdrawal?: number;
}

/**
 * Audit log entry for data access/processing.
 */
export interface DataAuditLog {
  /** Unique log ID */
  logId: string;
  /** Timestamp */
  timestamp: string;
  /** Actor (user/system) performing the action */
  actor: {
    type: "user" | "system" | "admin";
    id: string;
    tenantId: string;
  };
  /** Action performed */
  action: DataAction;
  /** Data subject (whose data was accessed) */
  dataSubject: {
    userId: string;
    tenantId: string;
  };
  /** Data categories involved */
  dataCategories: DataCategory[];
  /** Purpose of processing */
  purpose: ConsentPurpose;
  /** Consent artifact ID authorizing this access */
  consentId?: string;
  /** Legal basis (if not consent-based) */
  legalBasis?: string;
  /** Result of the action */
  result: "success" | "denied" | "error";
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export type DataAction =
  | "read"
  | "write"
  | "update"
  | "delete"
  | "export"
  | "share"
  | "anonymize"
  | "archive"
  | "transfer";

/**
 * Data Subject Access Request (DSAR).
 */
export interface DSARRequest {
  /** Unique request ID */
  requestId: string;
  /** Requesting user */
  userId: string;
  /** Tenant context */
  tenantId: string;
  /** Type of request */
  type: DSARType;
  /** Specific data categories requested */
  dataCategories?: DataCategory[];
  /** Reason for request */
  reason?: string;
  /** Submitted timestamp */
  submittedAt: string;
  /** Identity verification reference */
  verificationRef: string;
}

export type DSARType =
  | "access"
  | "rectification"
  | "erasure"
  | "portability"
  | "restriction"
  | "objection";

/**
 * DSAR processing result.
 */
export interface DSARResult {
  /** Request ID */
  requestId: string;
  /** Processing status */
  status: "pending" | "processing" | "completed" | "rejected" | "partially_completed";
  /** Completion timestamp */
  completedAt?: string;
  /** Data exported (for access/portability requests) */
  exportedData?: {
    format: "json" | "csv" | "pdf";
    downloadUrl?: string;
    expiresAt?: string;
  };
  /** Items processed */
  itemsProcessed: number;
  /** Items that could not be processed */
  itemsFailed: number;
  /** Reason for rejection/partial completion */
  reason?: string;
  /** Legal basis for retention of any data not deleted */
  retentionJustification?: string;
}

/**
 * Data governance service for DPDP compliance.
 */
export class DataGovernanceService {
  private retentionPolicies: RetentionPolicy[];

  constructor(policies: RetentionPolicy[]) {
    this.retentionPolicies = policies;
  }

  /**
   * Classifies data based on its category and context.
   * Returns the appropriate classification level.
   */
  classifyData(dataCategory: DataCategory): DataClassification {
    const classificationMap: Record<DataCategory, DataClassification> = {
      personal_identity: "sensitive_personal",
      academic_records: "confidential",
      learning_activity: "internal",
      assessment_data: "confidential",
      behavioral_data: "confidential",
      health_data: "critical",
      biometric_data: "critical",
      location_data: "sensitive_personal",
      communication_data: "confidential",
    };

    return classificationMap[dataCategory] || "internal";
  }

  /**
   * Gets the applicable retention policy for a data category.
   */
  getRetentionPolicy(dataCategory: DataCategory): RetentionPolicy | undefined {
    return this.retentionPolicies.find((p) => p.dataCategory === dataCategory);
  }

  /**
   * Checks if data should be retained or deleted based on retention policies.
   */
  shouldRetainData(
    dataCategory: DataCategory,
    createdAt: string,
    consentWithdrawn: boolean
  ): { retain: boolean; reason: string; action?: "delete" | "anonymize" | "archive" } {
    const policy = this.getRetentionPolicy(dataCategory);

    if (!policy) {
      return { retain: true, reason: "No retention policy defined" };
    }

    const createdDate = new Date(createdAt);
    const now = new Date();
    const daysSinceCreation = Math.floor(
      (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // If consent is withdrawn
    if (consentWithdrawn) {
      if (!policy.retainAfterWithdrawal) {
        return {
          retain: false,
          reason: "Consent withdrawn and policy does not allow retention",
          action: policy.expiryAction,
        };
      }

      if (
        policy.maxRetentionAfterWithdrawal &&
        daysSinceCreation > policy.maxRetentionAfterWithdrawal
      ) {
        return {
          retain: false,
          reason: "Post-withdrawal retention period exceeded",
          action: policy.expiryAction,
        };
      }

      return {
        retain: true,
        reason: `Legal basis: ${policy.legalBasis}`,
      };
    }

    // Check standard retention period
    if (daysSinceCreation > policy.retentionDays) {
      return {
        retain: false,
        reason: "Retention period exceeded",
        action: policy.expiryAction,
      };
    }

    return { retain: true, reason: "Within retention period" };
  }

  /**
   * Creates an audit log entry for data processing.
   * All data access must be logged for DPDP compliance.
   */
  createAuditLog(params: {
    logId: string;
    actor: DataAuditLog["actor"];
    action: DataAction;
    dataSubject: DataAuditLog["dataSubject"];
    dataCategories: DataCategory[];
    purpose: ConsentPurpose;
    consentId?: string;
    legalBasis?: string;
    result: "success" | "denied" | "error";
    metadata?: Record<string, unknown>;
  }): DataAuditLog {
    return {
      logId: params.logId,
      timestamp: new Date().toISOString(),
      actor: params.actor,
      action: params.action,
      dataSubject: params.dataSubject,
      dataCategories: params.dataCategories,
      purpose: params.purpose,
      consentId: params.consentId,
      legalBasis: params.legalBasis,
      result: params.result,
      metadata: params.metadata,
    };
  }

  /**
   * Processes a Data Subject Access Request (DSAR).
   * Returns the initial processing result; actual data export is async.
   */
  initiateDSAR(request: DSARRequest): DSARResult {
    // Validate the request
    if (!request.userId || !request.tenantId) {
      return {
        requestId: request.requestId,
        status: "rejected",
        itemsProcessed: 0,
        itemsFailed: 0,
        reason: "Invalid request: user ID and tenant ID are required",
      };
    }

    if (!request.verificationRef) {
      return {
        requestId: request.requestId,
        status: "rejected",
        itemsProcessed: 0,
        itemsFailed: 0,
        reason: "Identity verification is required before processing DSAR",
      };
    }

    // Determine data categories to process
    const categoriesToProcess = request.dataCategories || [
      "personal_identity",
      "academic_records",
      "learning_activity",
      "assessment_data",
      "behavioral_data",
      "communication_data",
    ] as DataCategory[];

    return {
      requestId: request.requestId,
      status: "processing",
      itemsProcessed: 0,
      itemsFailed: 0,
      reason: `Processing ${request.type} request for ${categoriesToProcess.length} data categories`,
    };
  }

  /**
   * Determines the legal basis for data processing.
   * Returns whether processing is allowed without explicit consent.
   */
  hasLegalBasis(
    purpose: ConsentPurpose,
    dataCategory: DataCategory
  ): { allowed: boolean; basis: string } {
    // Legitimate interests that don't require consent per DPDP Section 7
    const legitimateInterests: Record<string, ConsentPurpose[]> = {
      education_delivery: ["education_delivery"],
      legal_obligation: ["assessment"],
      vital_interests: [],
    };

    // State-mandated educational data can be processed without explicit consent
    if (
      purpose === "education_delivery" &&
      (dataCategory === "academic_records" || dataCategory === "learning_activity")
    ) {
      return {
        allowed: true,
        basis: "Legitimate interest: provision of educational services (DPDP Section 7(a))",
      };
    }

    // Assessment data required by regulatory mandate
    if (purpose === "assessment" && dataCategory === "assessment_data") {
      return {
        allowed: true,
        basis: "Legal obligation: educational assessment as mandated by regulation",
      };
    }

    return {
      allowed: false,
      basis: "No legal basis found; explicit consent required",
    };
  }

  /**
   * Returns the default retention policies for the platform.
   * These follow DPDP Act guidelines and educational sector requirements.
   */
  static getDefaultPolicies(): RetentionPolicy[] {
    return [
      {
        dataCategory: "personal_identity",
        classification: "sensitive_personal",
        retentionDays: 2555, // 7 years per educational regulations
        expiryAction: "anonymize",
        legalBasis: "Educational records retention requirement",
        retainAfterWithdrawal: true,
        maxRetentionAfterWithdrawal: 180,
      },
      {
        dataCategory: "academic_records",
        classification: "confidential",
        retentionDays: 3650, // 10 years
        expiryAction: "archive",
        legalBasis: "Academic records preservation mandate",
        retainAfterWithdrawal: true,
        maxRetentionAfterWithdrawal: 3650,
      },
      {
        dataCategory: "learning_activity",
        classification: "internal",
        retentionDays: 365, // 1 year
        expiryAction: "anonymize",
        legalBasis: "Service improvement",
        retainAfterWithdrawal: false,
      },
      {
        dataCategory: "assessment_data",
        classification: "confidential",
        retentionDays: 2555, // 7 years
        expiryAction: "archive",
        legalBasis: "Assessment integrity and appeals",
        retainAfterWithdrawal: true,
        maxRetentionAfterWithdrawal: 365,
      },
      {
        dataCategory: "behavioral_data",
        classification: "confidential",
        retentionDays: 180, // 6 months
        expiryAction: "delete",
        legalBasis: "Personalization and safety",
        retainAfterWithdrawal: false,
      },
      {
        dataCategory: "health_data",
        classification: "critical",
        retentionDays: 1825, // 5 years
        expiryAction: "delete",
        legalBasis: "Accessibility accommodation records",
        retainAfterWithdrawal: true,
        maxRetentionAfterWithdrawal: 90,
      },
      {
        dataCategory: "biometric_data",
        classification: "critical",
        retentionDays: 90, // 3 months
        expiryAction: "delete",
        legalBasis: "Examination authentication",
        retainAfterWithdrawal: false,
      },
      {
        dataCategory: "location_data",
        classification: "sensitive_personal",
        retentionDays: 30, // 1 month
        expiryAction: "delete",
        legalBasis: "Service delivery verification",
        retainAfterWithdrawal: false,
      },
      {
        dataCategory: "communication_data",
        classification: "confidential",
        retentionDays: 365, // 1 year
        expiryAction: "anonymize",
        legalBasis: "Dispute resolution and safety",
        retainAfterWithdrawal: false,
      },
    ];
  }
}
