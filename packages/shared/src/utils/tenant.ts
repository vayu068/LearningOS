/**
 * Tenant utility functions for multi-tenant operations.
 */

import { TenantContext, TenantIsolationMode } from "../types/tenant";

/**
 * Creates a scoped DynamoDB key with tenant isolation.
 */
export function createTenantScopedKey(tenantId: string, entityType: string, entityId: string): string {
  return `TENANT#${tenantId}#${entityType}#${entityId}`;
}

/**
 * Extracts tenant ID from a scoped DynamoDB key.
 */
export function extractTenantFromKey(key: string): string | null {
  const parts = key.split("#");
  if (parts[0] === "TENANT" && parts.length >= 2) {
    return parts[1];
  }
  return null;
}

/**
 * Validates that a request belongs to the given tenant context.
 */
export function validateTenantAccess(
  tenantContext: TenantContext,
  resourceTenantId: string
): boolean {
  if (tenantContext.isolationMode === "strict") {
    return tenantContext.tenantId === resourceTenantId;
  }
  // In shared/hybrid mode, cross-tenant access may be allowed with additional checks
  return tenantContext.tenantId === resourceTenantId;
}

/**
 * Gets the DynamoDB table name for a tenant based on isolation mode.
 */
export function getTenantTableName(
  baseTableName: string,
  tenantId: string,
  isolationMode: TenantIsolationMode
): string {
  switch (isolationMode) {
    case "strict":
      return `${baseTableName}-${tenantId}`;
    case "shared":
    case "hybrid":
      return baseTableName;
    default:
      return baseTableName;
  }
}
