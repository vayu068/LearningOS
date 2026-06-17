/**
 * India Digital Public Infrastructure (DPI) integration types.
 * Supports APAAR, DigiLocker, and Academic Bank of Credits (ABC).
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
