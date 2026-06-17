/**
 * DigiLocker Integration Service.
 * Implements OAuth2 flow, document pull/push, and certificate verification
 * for India's digital document wallet system.
 */

import type { DigiLockerDocument, DigiLockerDocumentType } from "../types/dpi";

/**
 * DigiLocker service configuration.
 */
export interface DigiLockerConfig {
  /** Client ID registered with DigiLocker */
  clientId: string;
  /** Client secret */
  clientSecret: string;
  /** OAuth2 redirect URI */
  redirectUri: string;
  /** DigiLocker API base URL */
  baseUrl: string;
  /** OAuth2 authorization endpoint */
  authorizationEndpoint: string;
  /** OAuth2 token endpoint */
  tokenEndpoint: string;
  /** Request timeout in milliseconds */
  timeout: number;
}

/**
 * OAuth2 authorization URL parameters.
 */
export interface DigiLockerAuthParams {
  /** State parameter for CSRF protection */
  state: string;
  /** Requested scopes */
  scopes: DigiLockerScope[];
  /** Code challenge for PKCE */
  codeChallenge?: string;
  /** Code challenge method */
  codeChallengeMethod?: "S256" | "plain";
}

export type DigiLockerScope =
  | "openid"
  | "profile"
  | "docs:pull"
  | "docs:push"
  | "docs:verify";

/**
 * OAuth2 token response from DigiLocker.
 */
export interface DigiLockerTokenResponse {
  /** Access token */
  accessToken: string;
  /** Token type (Bearer) */
  tokenType: string;
  /** Token expiry in seconds */
  expiresIn: number;
  /** Refresh token */
  refreshToken: string;
  /** DigiLocker user ID */
  digiLockerId: string;
}

/**
 * Document pull request parameters.
 */
export interface DocumentPullRequest {
  /** Document type to pull */
  documentType: DigiLockerDocumentType;
  /** Issuer organization URI */
  issuerUri?: string;
  /** Document date range filter */
  dateRange?: {
    from: string;
    to: string;
  };
  /** Consent artifact ID */
  consentId: string;
}

/**
 * Document push request parameters.
 */
export interface DocumentPushRequest {
  /** Document type */
  documentType: DigiLockerDocumentType;
  /** Document name */
  name: string;
  /** Document content (base64 encoded) */
  content: string;
  /** Content type (e.g., application/pdf) */
  contentType: string;
  /** Metadata for the document */
  metadata: Record<string, string>;
  /** Consent artifact ID */
  consentId: string;
}

/**
 * Certificate verification request.
 */
export interface CertificateVerificationRequest {
  /** Document URI in DigiLocker */
  documentUri: string;
  /** Verification hash to compare */
  expectedHash: string;
  /** Consent artifact ID */
  consentId: string;
}

/**
 * Certificate verification response.
 */
export interface CertificateVerificationResponse {
  /** Whether the certificate is authentic */
  isAuthentic: boolean;
  /** Verification status */
  status: "valid" | "tampered" | "expired" | "revoked" | "not_found";
  /** Issuer details */
  issuer?: string;
  /** Issue date */
  issuedAt?: string;
  /** Expiry date */
  expiresAt?: string;
  /** Verification reference ID */
  referenceId: string;
}

/**
 * DigiLocker Integration Service class.
 * Manages OAuth2 authentication and document operations.
 */
export class DigiLockerService {
  private config: DigiLockerConfig;

  constructor(config: DigiLockerConfig) {
    this.config = config;
  }

  /**
   * Generates the OAuth2 authorization URL for DigiLocker login.
   * Implements PKCE for enhanced security.
   */
  getAuthorizationUrl(params: DigiLockerAuthParams): string {
    const queryParams = new URLSearchParams({
      response_type: "code",
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      state: params.state,
      scope: params.scopes.join(" "),
    });

    if (params.codeChallenge) {
      queryParams.set("code_challenge", params.codeChallenge);
      queryParams.set(
        "code_challenge_method",
        params.codeChallengeMethod || "S256"
      );
    }

    return `${this.config.authorizationEndpoint}?${queryParams.toString()}`;
  }

  /**
   * Exchanges authorization code for access and refresh tokens.
   */
  async exchangeAuthorizationCode(
    code: string,
    codeVerifier?: string
  ): Promise<DigiLockerTokenResponse> {
    const body: Record<string, string> = {
      grant_type: "authorization_code",
      code,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.redirectUri,
    };

    if (codeVerifier) {
      body.code_verifier = codeVerifier;
    }

    const response = await this.makeRequest<{
      access_token: string;
      token_type: string;
      expires_in: number;
      refresh_token: string;
      digilocker_id: string;
    }>(this.config.tokenEndpoint, "POST", new URLSearchParams(body).toString(), {
      "Content-Type": "application/x-www-form-urlencoded",
    });

    return {
      accessToken: response.access_token,
      tokenType: response.token_type,
      expiresIn: response.expires_in,
      refreshToken: response.refresh_token,
      digiLockerId: response.digilocker_id,
    };
  }

  /**
   * Refreshes an expired access token.
   */
  async refreshAccessToken(refreshToken: string): Promise<DigiLockerTokenResponse> {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    }).toString();

    const response = await this.makeRequest<{
      access_token: string;
      token_type: string;
      expires_in: number;
      refresh_token: string;
      digilocker_id: string;
    }>(this.config.tokenEndpoint, "POST", body, {
      "Content-Type": "application/x-www-form-urlencoded",
    });

    return {
      accessToken: response.access_token,
      tokenType: response.token_type,
      expiresIn: response.expires_in,
      refreshToken: response.refresh_token,
      digiLockerId: response.digilocker_id,
    };
  }

  /**
   * Pulls documents from a user's DigiLocker account.
   * Requires valid access token and consent.
   */
  async pullDocuments(
    accessToken: string,
    request: DocumentPullRequest
  ): Promise<DigiLockerDocument[]> {
    if (!request.consentId) {
      throw new DigiLockerError("MISSING_CONSENT", "Consent artifact ID is required");
    }

    const queryParams = new URLSearchParams({
      doc_type: request.documentType,
      consent_id: request.consentId,
    });

    if (request.issuerUri) {
      queryParams.set("issuer", request.issuerUri);
    }
    if (request.dateRange) {
      queryParams.set("from_date", request.dateRange.from);
      queryParams.set("to_date", request.dateRange.to);
    }

    const documents = await this.makeRequest<DigiLockerDocument[]>(
      `${this.config.baseUrl}/v2/docs/pull?${queryParams.toString()}`,
      "GET",
      undefined,
      {
        Authorization: `Bearer ${accessToken}`,
        "X-Consent-Id": request.consentId,
      }
    );

    return documents;
  }

  /**
   * Pushes a document to a user's DigiLocker (e.g., certificate issuance).
   * Used by institutions to issue digitally signed documents.
   */
  async pushDocument(
    accessToken: string,
    request: DocumentPushRequest
  ): Promise<{ documentUri: string; status: string }> {
    if (!request.consentId) {
      throw new DigiLockerError("MISSING_CONSENT", "Consent artifact ID is required");
    }

    const payload = {
      doc_type: request.documentType,
      name: request.name,
      content: request.content,
      content_type: request.contentType,
      metadata: request.metadata,
      consent_id: request.consentId,
    };

    return this.makeRequest<{ documentUri: string; status: string }>(
      `${this.config.baseUrl}/v2/docs/push`,
      "POST",
      JSON.stringify(payload),
      {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Consent-Id": request.consentId,
      }
    );
  }

  /**
   * Verifies the authenticity of a DigiLocker certificate.
   * Validates the document hash against DigiLocker records.
   */
  async verifyCertificate(
    request: CertificateVerificationRequest
  ): Promise<CertificateVerificationResponse> {
    if (!request.consentId) {
      throw new DigiLockerError("MISSING_CONSENT", "Consent artifact ID is required");
    }

    const payload = {
      document_uri: request.documentUri,
      expected_hash: request.expectedHash,
      consent_id: request.consentId,
    };

    return this.makeRequest<CertificateVerificationResponse>(
      `${this.config.baseUrl}/v2/docs/verify`,
      "POST",
      JSON.stringify(payload),
      {
        "Content-Type": "application/json",
        "X-Consent-Id": request.consentId,
      }
    );
  }

  /**
   * Makes an HTTP request to the DigiLocker API.
   */
  private async makeRequest<T>(
    url: string,
    method: string,
    body?: string,
    headers?: Record<string, string>
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          ...headers,
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new DigiLockerError(
          `HTTP_${response.status}`,
          `DigiLocker API error: ${response.status} - ${errorBody}`,
          response.status
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof DigiLockerError) {
        throw error;
      }
      throw new DigiLockerError(
        "NETWORK_ERROR",
        `DigiLocker request failed: ${(error as Error).message}`
      );
    }
  }
}

/**
 * Custom error class for DigiLocker integration errors.
 */
export class DigiLockerError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;

  constructor(code: string, message: string, statusCode?: number) {
    super(message);
    this.name = "DigiLockerError";
    this.code = code;
    this.statusCode = statusCode;
  }
}
