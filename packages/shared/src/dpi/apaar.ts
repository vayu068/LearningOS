/**
 * APAAR (Automated Permanent Academic Account Registry) Integration Service.
 * Provides student ID verification, profile fetch, and enrollment updates
 * via the APAAR API ecosystem.
 */

import type { APAARProfile, AcademicLevel, DPIVerificationStatus } from "../types/dpi";

/**
 * APAAR API configuration for different environments.
 */
export interface APAARConfig {
  /** Base URL for APAAR API */
  baseUrl: string;
  /** API key for authentication */
  apiKey: string;
  /** Institution ID registered with APAAR */
  institutionId: string;
  /** Timeout in milliseconds */
  timeout: number;
  /** Whether to enable retry logic */
  retryEnabled: boolean;
  /** Maximum number of retries */
  maxRetries: number;
}

/**
 * APAAR student verification request.
 */
export interface APAARVerificationRequest {
  /** Student's APAAR ID (12-digit) */
  apaarId: string;
  /** Student's name for cross-verification */
  studentName: string;
  /** Date of birth for verification */
  dateOfBirth: string;
  /** Requesting institution ID */
  institutionId: string;
  /** Consent artifact ID (DPDP compliance) */
  consentId: string;
}

/**
 * APAAR verification response.
 */
export interface APAARVerificationResponse {
  /** Whether verification was successful */
  verified: boolean;
  /** Verification status */
  status: DPIVerificationStatus;
  /** Matched profile (if verified) */
  profile?: APAARProfile;
  /** Error details (if verification failed) */
  error?: string;
  /** Verification reference ID for audit trail */
  referenceId: string;
  /** Timestamp of verification */
  verifiedAt: string;
}

/**
 * APAAR enrollment update request.
 */
export interface APAAREnrollmentUpdate {
  /** Student's APAAR ID */
  apaarId: string;
  /** New institution ID */
  institutionId: string;
  /** Academic level */
  academicLevel: AcademicLevel;
  /** Course/program name */
  programName: string;
  /** Enrollment date */
  enrolledAt: string;
  /** Expected completion date */
  expectedCompletionAt: string;
  /** Consent artifact ID */
  consentId: string;
}

/**
 * APAAR enrollment update response.
 */
export interface APAAREnrollmentResponse {
  /** Whether the update was successful */
  success: boolean;
  /** Update reference ID */
  referenceId: string;
  /** Error message if failed */
  error?: string;
  /** Updated at timestamp */
  updatedAt: string;
}

/**
 * APAAR Integration Service class.
 * Handles all communication with the APAAR registry.
 */
export class APAARService {
  private config: APAARConfig;

  constructor(config: APAARConfig) {
    this.config = config;
  }

  /**
   * Verifies a student's identity against APAAR records.
   * Requires valid consent artifact ID for DPDP compliance.
   */
  async verifyStudent(request: APAARVerificationRequest): Promise<APAARVerificationResponse> {
    this.validateApaarId(request.apaarId);
    this.validateConsentId(request.consentId);

    const payload = {
      apaarId: request.apaarId,
      studentName: request.studentName,
      dateOfBirth: request.dateOfBirth,
      institutionId: request.institutionId,
      consentArtifactId: request.consentId,
    };

    const response = await this.makeRequest<APAARVerificationResponse>(
      "/v1/verify",
      "POST",
      payload
    );

    return {
      ...response,
      verifiedAt: new Date().toISOString(),
    };
  }

  /**
   * Fetches a student's APAAR profile.
   * Requires prior verification and valid consent.
   */
  async fetchProfile(apaarId: string, consentId: string): Promise<APAARProfile> {
    this.validateApaarId(apaarId);
    this.validateConsentId(consentId);

    const response = await this.makeRequest<APAARProfile>(
      `/v1/profiles/${apaarId}`,
      "GET",
      undefined,
      { "X-Consent-Id": consentId }
    );

    return response;
  }

  /**
   * Updates a student's enrollment status in APAAR.
   * Used when a student enrolls in a new course/program.
   */
  async updateEnrollment(request: APAAREnrollmentUpdate): Promise<APAAREnrollmentResponse> {
    this.validateApaarId(request.apaarId);
    this.validateConsentId(request.consentId);

    const payload = {
      apaarId: request.apaarId,
      institutionId: request.institutionId,
      academicLevel: request.academicLevel,
      programName: request.programName,
      enrolledAt: request.enrolledAt,
      expectedCompletionAt: request.expectedCompletionAt,
      consentArtifactId: request.consentId,
    };

    return this.makeRequest<APAAREnrollmentResponse>(
      "/v1/enrollments",
      "POST",
      payload
    );
  }

  /**
   * Checks if an APAAR ID exists and is active.
   * Lightweight check without fetching full profile.
   */
  async checkIdStatus(apaarId: string): Promise<{ exists: boolean; active: boolean }> {
    this.validateApaarId(apaarId);

    return this.makeRequest<{ exists: boolean; active: boolean }>(
      `/v1/status/${apaarId}`,
      "GET"
    );
  }

  /**
   * Validates APAAR ID format (12-digit numeric string).
   */
  private validateApaarId(apaarId: string): void {
    if (!apaarId || !/^\d{12}$/.test(apaarId)) {
      throw new APAARError(
        "INVALID_APAAR_ID",
        "APAAR ID must be a 12-digit numeric string"
      );
    }
  }

  /**
   * Validates consent artifact ID is present.
   */
  private validateConsentId(consentId: string): void {
    if (!consentId || consentId.trim().length === 0) {
      throw new APAARError(
        "MISSING_CONSENT",
        "Consent artifact ID is required for DPDP compliance"
      );
    }
  }

  /**
   * Makes an HTTP request to the APAAR API with retry logic.
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
          throw new APAARError(
            `HTTP_${response.status}`,
            `APAAR API error: ${response.status} - ${errorBody}`,
            response.status
          );
        }

        return (await response.json()) as T;
      } catch (error) {
        lastError = error as Error;
        if (
          error instanceof APAARError &&
          error.statusCode &&
          error.statusCode < 500
        ) {
          throw error; // Don't retry client errors
        }
        if (attempt < maxAttempts) {
          await this.delay(Math.pow(2, attempt) * 100); // Exponential backoff
        }
      }
    }

    throw lastError || new APAARError("UNKNOWN", "Unknown APAAR API error");
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Custom error class for APAAR integration errors.
 */
export class APAARError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;

  constructor(code: string, message: string, statusCode?: number) {
    super(message);
    this.name = "APAARError";
    this.code = code;
    this.statusCode = statusCode;
  }
}
