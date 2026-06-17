export { APAARService, APAARError } from "./apaar";
export type {
  APAARConfig,
  APAARVerificationRequest,
  APAARVerificationResponse,
  APAAREnrollmentUpdate,
  APAAREnrollmentResponse,
} from "./apaar";

export { DigiLockerService, DigiLockerError } from "./digilocker";
export type {
  DigiLockerConfig,
  DigiLockerAuthParams,
  DigiLockerScope,
  DigiLockerTokenResponse,
  DocumentPullRequest,
  DocumentPushRequest,
  CertificateVerificationRequest,
  CertificateVerificationResponse,
} from "./digilocker";

export { ABCService, ABCError } from "./abc";
export type {
  ABCConfig,
  CreditDepositRequest,
  CreditDepositResponse,
  CreditWithdrawalRequest,
  CreditWithdrawalResponse,
  CreditTransferRequest,
  CreditTransferResponse,
  TranscriptRequest,
  TranscriptResponse,
} from "./abc";

export { ConsentManager, ConsentError } from "./consent-manager";
export type {
  ConsentManagerConfig,
  ConsentAuditEvent,
  ConsentEventType,
  BatchConsentRequest,
  ConsentSummary,
} from "./consent-manager";

export { DataGovernanceService } from "./data-governance";
export type {
  DataClassification,
  RetentionPolicy,
  DataAuditLog,
  DataAction,
  DSARRequest,
  DSARType,
  DSARResult,
} from "./data-governance";
