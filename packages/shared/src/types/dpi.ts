/**
 * India Digital Public Infrastructure (DPI) integration types.
 * Supports APAAR, DigiLocker, and Academic Bank of Credits (ABC).
 * Includes DPDP Act consent management types.
 */

/**
 * APAAR (Automated Permanent Academic Account Registry)
 * Unique lifelong identifier for students in India's education system.
 */
export interface APAARProfile {
  /** APAAR ID - unique 12-digit identifier */
  apaarId: string;
  /** Student name as registered */
  studentName: string;
  /** Date of birth */
  dateOfBirth: string;
  /** Gender */
  gender: "male" | "female" | "other";
  /** Registered institution */
  institutionId: string;
  /** Current academic level */
  academicLevel: AcademicLevel;
  /** Verification status */
  verificationStatus: DPIVerificationStatus;
  /** Last verified timestamp */
  lastVerifiedAt?: string;
}

export type AcademicLevel =
  | "primary"
  | "upper_primary"
  | "secondary"
  | "higher_secondary"
  | "undergraduate"
  | "postgraduate"
  | "doctoral";

export type DPIVerificationStatus = "pending" | "verified" | "rejected" | "expired";

/**
 * DigiLocker integration for document verification and storage.
 */
export interface DigiLockerDocument {
  /** Document URI in DigiLocker */
  documentUri: string;
  /** Document type */
  documentType: DigiLockerDocumentType;
  /** Issuer organization */
  issuer: string;
  /** Issue date */
  issuedAt: string;
  /** Document name/title */
  name: string;
  /** Verification hash */
  verificationHash: string;
}

export type DigiLockerDocumentType =
  | "marksheet"
  | "certificate"
  | "degree"
  | "transfer_certificate"
  | "migration_certificate"
  | "identity_document";

export interface DigiLockerAuthRequest {
  clientId: string;
  redirectUri: string;
  scope: string[];
  state: string;
}

export interface DigiLockerAuthResponse {
  authorizationCode: string;
  state: string;
}

/**
 * Academic Bank of Credits (ABC) for credit accumulation and transfer.
 */
export interface ABCAccount {
  /** ABC ID */
  abcId: string;
  /** Associated APAAR ID */
  apaarId: string;
  /** Student name */
  studentName: string;
  /** Total credits accumulated */
  totalCredits: number;
  /** Credits by category */
  creditsByCategory: ABCCreditCategory[];
  /** Credit transfer history */
  transferHistory: ABCCreditTransfer[];
}

export interface ABCCreditCategory {
  category: string;
  credits: number;
  level: AcademicLevel;
}

export interface ABCCreditTransfer {
  /** Transfer ID */
  transferId: string;
  /** Source institution */
  sourceInstitution: string;
  /** Destination institution */
  destinationInstitution: string;
  /** Credits transferred */
  credits: number;
  /** Course/subject reference */
  courseReference: string;
  /** Transfer date */
  transferredAt: string;
  /** Transfer status */
  status: "pending" | "approved" | "rejected" | "completed";
}

export interface ABCCreditDeposit {
  /** Course completed */
  courseId: string;
  /** Credits earned */
  credits: number;
  /** Grade/marks */
  grade: string;
  /** Institution awarding credits */
  institutionId: string;
  /** Semester/term */
  term: string;
  /** Completion date */
  completedAt: string;
}

/**
 * DPDP Act (Digital Personal Data Protection) Consent Artifact.
 * Models the full consent lifecycle: collect, verify, withdraw.
 */
export interface ConsentArtifact {
  /** Unique consent identifier */
  consentId: string;
  /** User who gave consent */
  userId: string;
  /** Tenant context */
  tenantId: string;
  /** Purpose of data collection */
  purpose: ConsentPurpose;
  /** Specific data categories covered */
  dataCategories: DataCategory[];
  /** Current consent status */
  status: ConsentStatus;
  /** When consent was collected */
  collectedAt: string;
  /** When consent expires (if applicable) */
  expiresAt?: string;
  /** When consent was withdrawn (if applicable) */
  withdrawnAt?: string;
  /** Version of the consent notice */
  noticeVersion: string;
  /** Whether this consent is for a minor (requires guardian approval) */
  isMinor: boolean;
  /** Guardian consent details (for minors) */
  guardianConsent?: GuardianConsent;
  /** Processing mode */
  processingMode: "automatic" | "manual";
}

export type ConsentStatus = "active" | "withdrawn" | "expired" | "pending_verification";

export type ConsentPurpose =
  | "education_delivery"
  | "assessment"
  | "ai_personalization"
  | "analytics"
  | "communication"
  | "dpi_integration"
  | "third_party_sharing"
  | "research";

export type DataCategory =
  | "personal_identity"
  | "academic_records"
  | "learning_activity"
  | "assessment_data"
  | "behavioral_data"
  | "health_data"
  | "biometric_data"
  | "location_data"
  | "communication_data";

export interface GuardianConsent {
  /** Guardian user ID */
  guardianUserId: string;
  /** Relationship to minor */
  relationship: "parent" | "legal_guardian";
  /** When guardian gave consent */
  consentedAt: string;
  /** Verification method */
  verificationMethod: "aadhaar" | "digilocker" | "manual";
}

/**
 * Consent collection request.
 */
export interface ConsentCollectionRequest {
  userId: string;
  tenantId: string;
  purposes: ConsentPurpose[];
  dataCategories: DataCategory[];
  noticeVersion: string;
  isMinor: boolean;
  guardianUserId?: string;
}

/**
 * Consent verification result.
 */
export interface ConsentVerificationResult {
  consentId: string;
  isValid: boolean;
  reason?: string;
  expiresAt?: string;
}

/**
 * Consent withdrawal request.
 */
export interface ConsentWithdrawalRequest {
  consentId: string;
  userId: string;
  reason?: string;
  /** Whether to delete associated data */
  requestDataDeletion: boolean;
}
