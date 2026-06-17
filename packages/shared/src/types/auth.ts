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
  | "INSUFFICIENT_PERMISSIONS"
  | "MFA_REQUIRED";

export interface Permission {
  resource: string;
  actions: PermissionAction[];
  conditions?: PermissionCondition[];
}

export type PermissionAction = "create" | "read" | "update" | "delete" | "execute";

export interface PermissionCondition {
  field: string;
  operator: "equals" | "not_equals" | "contains" | "in";
  value: string | string[];
}
