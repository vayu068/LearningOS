/**
 * JWT verification middleware for Lambda handlers.
 * Extracts tenant context from Cognito tokens, validates tenant isolation, enforces RBAC.
 */

import type { APIGatewayProxyEvent } from "aws-lambda";
import type { TenantContext, UserRole, DecodedToken } from "@learning-os/shared";
import { ROLE_PERMISSIONS } from "@learning-os/shared";
import { extractTenantIdentifier, enforceTenantIsolation } from "./tenant";

/**
 * Authenticated request context extracted from the JWT token.
 */
export interface AuthContext {
  userId: string;
  email: string;
  tenantId: string;
  roles: UserRole[];
  tenantContext: TenantContext;
}

/**
 * Result of authentication middleware processing.
 */
export interface AuthResult {
  success: boolean;
  context?: AuthContext;
  error?: {
    statusCode: number;
    code: string;
    message: string;
  };
}

/**
 * Token verifier interface - allows injection of verification logic.
 * In production this would call Cognito JWKS endpoint.
 */
export interface TokenVerifier {
  verify(token: string): Promise<DecodedToken>;
}

/**
 * Tenant config loader interface.
 */
export interface TenantConfigLoader {
  loadTenantContext(tenantId: string): Promise<TenantContext | null>;
}

/**
 * Extracts the Bearer token from the Authorization header.
 */
export function extractBearerToken(event: APIGatewayProxyEvent): string | null {
  const authHeader = event.headers?.Authorization || event.headers?.authorization;
  if (!authHeader) return null;

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;

  return parts[1];
}

/**
 * Main authentication middleware function.
 * Verifies JWT token and builds the auth context.
 */
export async function authenticateRequest(
  event: APIGatewayProxyEvent,
  tokenVerifier: TokenVerifier,
  tenantConfigLoader: TenantConfigLoader
): Promise<AuthResult> {
  // Extract token
  const token = extractBearerToken(event);
  if (!token) {
    return {
      success: false,
      error: {
        statusCode: 401,
        code: "MISSING_TOKEN",
        message: "Authorization header with Bearer token is required",
      },
    };
  }

  // Verify token
  let decoded: DecodedToken;
  try {
    decoded = await tokenVerifier.verify(token);
  } catch (error) {
    return {
      success: false,
      error: {
        statusCode: 401,
        code: "INVALID_TOKEN",
        message: "Token verification failed",
      },
    };
  }

  // Check token expiry
  const now = Math.floor(Date.now() / 1000);
  if (decoded.exp <= now) {
    return {
      success: false,
      error: {
        statusCode: 401,
        code: "TOKEN_EXPIRED",
        message: "Token has expired",
      },
    };
  }

  // Extract tenant and roles from claims
  const tenantId = decoded["custom:tenantId"];
  const roles = (decoded["custom:roles"]?.split(",") || []) as UserRole[];
  const userId = decoded["custom:userId"] || decoded.sub;

  if (!tenantId) {
    return {
      success: false,
      error: {
        statusCode: 403,
        code: "MISSING_TENANT",
        message: "Token does not contain tenant information",
      },
    };
  }

  // Load tenant context
  const tenantContext = await tenantConfigLoader.loadTenantContext(tenantId);
  if (!tenantContext) {
    return {
      success: false,
      error: {
        statusCode: 403,
        code: "INVALID_TENANT",
        message: "Tenant not found or disabled",
      },
    };
  }

  // Enforce tenant isolation: compare the tenant from the request (header/subdomain/path)
  // against the authenticated user's tenant from the JWT
  const requestIdentifier = extractTenantIdentifier(event);
  const requestTenantId = requestIdentifier.tenantId;
  const isolationViolation = enforceTenantIsolation(requestTenantId, tenantId);
  if (isolationViolation) {
    return {
      success: false,
      error: {
        statusCode: isolationViolation.statusCode,
        code: isolationViolation.code,
        message: isolationViolation.message,
      },
    };
  }

  return {
    success: true,
    context: {
      userId,
      email: decoded.email,
      tenantId,
      roles,
      tenantContext,
    },
  };
}

/**
 * Checks if the authenticated user has the required permission.
 */
export function authorizeAction(
  authContext: AuthContext,
  resource: string,
  action: string
): boolean {
  for (const role of authContext.roles) {
    const permissions = ROLE_PERMISSIONS[role];
    if (!permissions) continue;

    for (const permission of permissions) {
      if (matchesResource(permission.resource, resource) && matchesAction(permission.actions, action)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks if a permission resource pattern matches the requested resource.
 */
function matchesResource(pattern: string, resource: string): boolean {
  if (pattern === "*") return true;

  // Handle wildcard patterns like "content:*", "users:own"
  const [patternDomain, patternScope] = pattern.split(":");
  const [resourceDomain] = resource.split(":");

  if (patternDomain === resourceDomain && patternScope === "*") {
    return true;
  }

  return pattern === resource;
}

/**
 * Checks if the required action is in the allowed actions list.
 */
function matchesAction(allowed: string[], required: string): boolean {
  return allowed.includes(required) || allowed.includes("manage");
}

/**
 * Creates an unauthorized error response.
 */
export function createUnauthorizedResponse(code: string, message: string) {
  return {
    statusCode: 401,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ error: { code, message } }),
  };
}

/**
 * Creates a forbidden error response.
 */
export function createForbiddenResponse(code: string, message: string) {
  return {
    statusCode: 403,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ error: { code, message } }),
  };
}
