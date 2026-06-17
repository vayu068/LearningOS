/**
 * Academic Bank of Credits (ABC) Integration Service.
 * Implements credit deposit, withdrawal, transfer between institutions,
 * and transcript generation for India's credit accumulation system.
 */

import type {
  ABCAccount,
  ABCCreditDeposit,
  ABCCreditTransfer,
  AcademicLevel,
} from "../types/dpi";

/**
 * ABC service configuration.
 */
export interface ABCConfig {
  /** Base URL for ABC API */
  baseUrl: string;
  /** API key for authentication */
  apiKey: string;
  /** Institution ID registered with ABC */
  institutionId: string;
  /** Timeout in milliseconds */
  timeout: number;
  /** Enable retry on failure */
  retryEnabled: boolean;
  /** Maximum retry attempts */
  maxRetries: number;
}

/**
 * Credit deposit request to ABC.
 */
export interface CreditDepositRequest {
  /** Student's ABC account ID */
  abcId: string;
  /** Student's APAAR ID */
  apaarId: string;
  /** Credits to deposit */
  credits: ABCCreditDeposit[];
  /** Consent artifact ID */
  consentId: string;
  /** Academic session (e.g., "2024-25-odd") */
  academicSession: string;
}

/**
 * Credit deposit response.
 */
export interface CreditDepositResponse {
  /** Whether deposit was successful */
  success: boolean;
  /** Deposit reference ID */
  referenceId: string;
  /** Updated total credits */
  totalCredits: number;
  /** Timestamp */
  processedAt: string;
  /** Error details if failed */
  error?: string;
}

/**
 * Credit withdrawal request.
 */
export interface CreditWithdrawalRequest {
  /** Student's ABC account ID */
  abcId: string;
  /** Credits to withdraw (e.g., for transfer to another institution) */
  creditIds: string[];
  /** Reason for withdrawal */
  reason: "transfer" | "correction" | "revocation";
  /** Destination institution (for transfer) */
  destinationInstitutionId?: string;
  /** Consent artifact ID */
  consentId: string;
}

/**
 * Credit withdrawal response.
 */
export interface CreditWithdrawalResponse {
  /** Whether withdrawal was successful */
  success: boolean;
  /** Withdrawal reference ID */
  referenceId: string;
  /** Credits withdrawn */
  withdrawnCredits: number;
  /** Transfer ID (if transfer initiated) */
  transferId?: string;
  /** Timestamp */
  processedAt: string;
  /** Error details if failed */
  error?: string;
}

/**
 * Credit transfer request between institutions.
 */
export interface CreditTransferRequest {
  /** Student's ABC account ID */
  abcId: string;
  /** Student's APAAR ID */
  apaarId: string;
  /** Source institution ID */
  sourceInstitutionId: string;
  /** Destination institution ID */
  destinationInstitutionId: string;
  /** Credits to transfer */
  credits: {
    courseId: string;
    credits: number;
    grade: string;
    level: AcademicLevel;
  }[];
  /** Transfer reason */
  reason: string;
  /** Consent artifact ID */
  consentId: string;
}

/**
 * Credit transfer response.
 */
export interface CreditTransferResponse {
  /** Whether the transfer request was accepted */
  accepted: boolean;
  /** Transfer record */
  transfer: ABCCreditTransfer;
  /** Next steps required (e.g., destination institution approval) */
  pendingActions?: string[];
  /** Error details if rejected */
  error?: string;
}

/**
 * Transcript generation request.
 */
export interface TranscriptRequest {
  /** Student's ABC account ID */
  abcId: string;
  /** APAAR ID for verification */
  apaarId: string;
  /** Transcript type */
  type: "complete" | "semester" | "transfer";
  /** Academic session filter (optional) */
  academicSession?: string;
  /** Format */
  format: "json" | "pdf" | "xml";
  /** Consent artifact ID */
  consentId: string;
}

/**
 * Transcript generation response.
 */
export interface TranscriptResponse {
  /** Whether generation was successful */
  success: boolean;
  /** Transcript reference ID */
  referenceId: string;
  /** Transcript content (base64 for PDF/XML, structured for JSON) */
  content: string;
  /** Content type */
  contentType: string;
  /** Digital signature/hash for verification */
  verificationHash: string;
  /** Generated timestamp */
  generatedAt: string;
}

/**
 * Academic Bank of Credits integration service.
 */
export class ABCService {
  private config: ABCConfig;

  constructor(config: ABCConfig) {
    this.config = config;
  }

  /**
   * Fetches a student's ABC account details including credit balance.
   */
  async getAccount(abcId: string, consentId: string): Promise<ABCAccount> {
    this.validateAbcId(abcId);
    this.validateConsentId(consentId);

    return this.makeRequest<ABCAccount>(
      `/v1/accounts/${abcId}`,
      "GET",
      undefined,
      { "X-Consent-Id": consentId }
    );
  }

  /**
   * Deposits credits to a student's ABC account.
   * Called when a student completes courses/assessments.
   */
  async depositCredits(request: CreditDepositRequest): Promise<CreditDepositResponse> {
    this.validateAbcId(request.abcId);
    this.validateConsentId(request.consentId);

    if (!request.credits || request.credits.length === 0) {
      throw new ABCError("INVALID_REQUEST", "At least one credit deposit is required");
    }

    const payload = {
      abcId: request.abcId,
      apaarId: request.apaarId,
      institutionId: this.config.institutionId,
      credits: request.credits.map((credit) => ({
        courseId: credit.courseId,
        credits: credit.credits,
        grade: credit.grade,
        institutionId: credit.institutionId,
        term: credit.term,
        completedAt: credit.completedAt,
      })),
      academicSession: request.academicSession,
      consentArtifactId: request.consentId,
    };

    return this.makeRequest<CreditDepositResponse>(
      "/v1/credits/deposit",
      "POST",
      payload
    );
  }

  /**
   * Withdraws credits from a student's ABC account.
   * Used for corrections, revocations, or pre-transfer operations.
   */
  async withdrawCredits(
    request: CreditWithdrawalRequest
  ): Promise<CreditWithdrawalResponse> {
    this.validateAbcId(request.abcId);
    this.validateConsentId(request.consentId);

    if (!request.creditIds || request.creditIds.length === 0) {
      throw new ABCError("INVALID_REQUEST", "At least one credit ID is required");
    }

    const payload = {
      abcId: request.abcId,
      creditIds: request.creditIds,
      reason: request.reason,
      destinationInstitutionId: request.destinationInstitutionId,
      institutionId: this.config.institutionId,
      consentArtifactId: request.consentId,
    };

    return this.makeRequest<CreditWithdrawalResponse>(
      "/v1/credits/withdraw",
      "POST",
      payload
    );
  }

  /**
   * Initiates a credit transfer between institutions.
   * Requires approval from the destination institution.
   */
  async transferCredits(
    request: CreditTransferRequest
  ): Promise<CreditTransferResponse> {
    this.validateAbcId(request.abcId);
    this.validateConsentId(request.consentId);

    if (!request.credits || request.credits.length === 0) {
      throw new ABCError("INVALID_REQUEST", "At least one credit entry is required for transfer");
    }

    const payload = {
      abcId: request.abcId,
      apaarId: request.apaarId,
      sourceInstitutionId: request.sourceInstitutionId,
      destinationInstitutionId: request.destinationInstitutionId,
      credits: request.credits,
      reason: request.reason,
      consentArtifactId: request.consentId,
    };

    return this.makeRequest<CreditTransferResponse>(
      "/v1/credits/transfer",
      "POST",
      payload
    );
  }

  /**
   * Generates a transcript from the student's ABC account.
   */
  async generateTranscript(request: TranscriptRequest): Promise<TranscriptResponse> {
    this.validateAbcId(request.abcId);
    this.validateConsentId(request.consentId);

    const payload = {
      abcId: request.abcId,
      apaarId: request.apaarId,
      type: request.type,
      academicSession: request.academicSession,
      format: request.format,
      institutionId: this.config.institutionId,
      consentArtifactId: request.consentId,
    };

    return this.makeRequest<TranscriptResponse>(
      "/v1/transcripts/generate",
      "POST",
      payload
    );
  }

  /**
   * Gets the transfer history for a student's account.
   */
  async getTransferHistory(
    abcId: string,
    consentId: string
  ): Promise<ABCCreditTransfer[]> {
    this.validateAbcId(abcId);
    this.validateConsentId(consentId);

    return this.makeRequest<ABCCreditTransfer[]>(
      `/v1/accounts/${abcId}/transfers`,
      "GET",
      undefined,
      { "X-Consent-Id": consentId }
    );
  }

  /**
   * Validates ABC account ID format.
   */
  private validateAbcId(abcId: string): void {
    if (!abcId || abcId.trim().length === 0) {
      throw new ABCError("INVALID_ABC_ID", "ABC account ID is required");
    }
  }

  /**
   * Validates consent ID presence.
   */
  private validateConsentId(consentId: string): void {
    if (!consentId || consentId.trim().length === 0) {
      throw new ABCError(
        "MISSING_CONSENT",
        "Consent artifact ID is required for DPDP compliance"
      );
    }
  }

  /**
   * Makes an HTTP request to the ABC API with retry logic.
   */
  private async makeRequest<T>(
    path: string,
    method: string,
    body?: unknown,
    additionalHeaders?: Record<string, string>
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Api-Key": this.config.apiKey,
      "X-Institution-Id": this.config.institutionId,
      ...additionalHeaders,
    };

    let lastError: Error | null = null;
    const maxAttempts = this.config.retryEnabled ? this.config.maxRetries + 1 : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text();
          throw new ABCError(
            `HTTP_${response.status}`,
            `ABC API error: ${response.status} - ${errorBody}`,
            response.status
          );
        }

        return (await response.json()) as T;
      } catch (error) {
        lastError = error as Error;
        if (error instanceof ABCError && error.statusCode && error.statusCode < 500) {
          throw error;
        }
        if (attempt < maxAttempts) {
          await this.delay(Math.pow(2, attempt) * 100);
        }
      }
    }

    throw lastError || new ABCError("UNKNOWN", "Unknown ABC API error");
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Custom error class for ABC integration errors.
 */
export class ABCError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;

  constructor(code: string, message: string, statusCode?: number) {
    super(message);
    this.name = "ABCError";
    this.code = code;
    this.statusCode = statusCode;
  }
}
