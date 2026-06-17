/**
 * Authentication and authorization types.
 * Supports AWS Cognito integration with multi-tenant isolation.
 */

import { UserRole } from "./user";

export interface AuthToken {
  /** JWT access token */
  accessToken: string;
  /** JWT refresh token */
  refreshToken: string;
  /** JWT ID token */
  idToken: string;
  /** Token expiry in seconds */
  expiresIn: number;
  /** Token type (Bearer) */
  tokenType: string;
}

export interface AuthSession {
  /** Authenticated user ID */
  userId: string;
  /** Tenant context for the session */
  tenantId: string;
  /** User roles for authorization */
  roles: UserRole[];
  /** Session expiry timestamp */
  expiresAt: string;
  /** Whether session is currently valid */
  isValid: boolean;
}

export interface AuthRequest {
  email: string;
  password: string;
  tenantId?: string;
}

export interface AuthResponse {
  success: boolean;
  tokens?: AuthToken;
  session?: AuthSession;
  user?: {
    userId: string;
    email: string;
    displayName: string;
    roles: UserRole[];
  };
  error?: AuthError;
}

export interface AuthError {
  code: AuthErrorCode;
  message: string;
}

export type AuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_LOCKED"
  | "ACCOUNT_NOT_VERIFIED"
  | "TENANT_DISABLED"
  | "TOKEN_EXPIRED"
  | "TOKEN_INVALID"
  | "INSUFFICIENT_PERMISSIONS"
  | "MFA_REQUIRED"
  | "USER_EXISTS"
  | "INVALID_TENANT"
  | "REGISTRATION_FAILED"
  | "REFRESH_FAILED";

export interface Permission {
  resource: string;
  actions: ("create" | "read" | "update" | "delete" | "execute")[];
  conditions?: {
    field: string;
    operator: "equals" | "not_equals" | "contains" | "in";
    value: string | string[];
  }[];
}

/**
 * Cognito configuration per tenant.
 * Each tenant can have its own user pool or shared pool with groups.
 */
export interface CognitoConfig {
  /** User pool ID */
  userPoolId: string;
  /** Client ID for this tenant */
  clientId: string;
  /** Client secret (encrypted) */
  clientSecret?: string;
  /** Region */
  region: string;
  /** Identity pool ID for federated identities */
  identityPoolId?: string;
  /** Custom domain for Cognito hosted UI */
  customDomain?: string;
}

/**
 * MFA settings per tenant.
 */
export interface MFASettings {
  /** Whether MFA is enabled */
  enabled: boolean;
  /** Required or optional */
  enforcement: "required" | "optional" | "disabled";
  /** Supported MFA methods */
  methods: MFAMethod[];
  /** Grace period in days before MFA enforcement */
  gracePeriodDays?: number;
}

export type MFAMethod = "totp" | "sms" | "email";

/**
 * Decoded JWT claims from Cognito token.
 */
export interface DecodedToken {
  sub: string;
  email: string;
  "custom:tenantId": string;
  "custom:roles": string;
  "custom:userId": string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  token_use: "access" | "id";
}

/**
 * Registration request for new users.
 */
export interface RegisterRequest {
  email: string;
  password: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phoneNumber?: string;
}

/**
 * Token refresh request.
 */
export interface RefreshTokenRequest {
  refreshToken: string;
  tenantId: string;
}
