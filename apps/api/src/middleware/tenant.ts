/**
 * Tenant resolution middleware.
 * Identifies tenant from subdomain/header, loads tenant config, injects TenantContext.
 */

import type { APIGatewayProxyEvent } from "aws-lambda";
import type { Tenant, TenantContext } from "@learning-os/shared";

/**
 * Result of tenant resolution.
 */
export interface TenantResolutionResult {
  success: boolean;
  tenantContext?: TenantContext;
  error?: {
    statusCode: number;
    code: string;
    message: string;
  };
}

/**
 * Interface for loading tenant data.
 */
export interface TenantLoader {
  getByDomain(domain: string): Promise<Tenant | null>;
  getById(tenantId: string): Promise<Tenant | null>;
}

/**
 * Extracts tenant identifier from the request.
 * Resolution order:
 * 1. X-Tenant-ID header (explicit tenant)
 * 2. Subdomain from Host header (e.g., schoolname.learningos.in)
 * 3. Path prefix (e.g., /api/v1/tenants/{tenantId}/...)
 */
export function extractTenantIdentifier(event: APIGatewayProxyEvent): {
  tenantId?: string;
  domain?: string;
} {
  // Check X-Tenant-ID header first
  const tenantIdHeader = event.headers?.["X-Tenant-ID"] || event.headers?.["x-tenant-id"];
  if (tenantIdHeader) {
    return { tenantId: tenantIdHeader };
  }

  // Check subdomain from Host header
  const host = event.headers?.Host || event.headers?.host;
  if (host) {
    const subdomain = extractSubdomain(host);
    if (subdomain && subdomain !== "www" && subdomain !== "api") {
      return { domain: subdomain };
    }
  }

  // Check path parameters
  const tenantIdParam = event.pathParameters?.tenantId;
  if (tenantIdParam) {
    return { tenantId: tenantIdParam };
  }

  return {};
}

/**
 * Extracts subdomain from a host string.
 */
function extractSubdomain(host: string): string | null {
  // Remove port if present
  const hostname = host.split(":")[0];
  const parts = hostname.split(".");

  // Need at least 3 parts for a subdomain (sub.domain.tld)
  if (parts.length >= 3) {
    return parts[0];
  }

  return null;
}

/**
 * Resolves tenant from the request and loads configuration.
 */
export async function resolveTenant(
  event: APIGatewayProxyEvent,
  tenantLoader: TenantLoader
): Promise<TenantResolutionResult> {
  const identifier = extractTenantIdentifier(event);

  if (!identifier.tenantId && !identifier.domain) {
    return {
      success: false,
      error: {
        statusCode: 400,
        code: "TENANT_NOT_SPECIFIED",
        message: "Tenant could not be determined from the request",
      },
    };
  }

  let tenant: Tenant | null = null;

  if (identifier.tenantId) {
    tenant = await tenantLoader.getById(identifier.tenantId);
  } else if (identifier.domain) {
    tenant = await tenantLoader.getByDomain(identifier.domain);
  }

  if (!tenant) {
    return {
      success: false,
      error: {
        statusCode: 404,
        code: "TENANT_NOT_FOUND",
        message: "The specified tenant does not exist",
      },
    };
  }

  if (tenant.status !== "active") {
    return {
      success: false,
      error: {
        statusCode: 403,
        code: "TENANT_INACTIVE",
        message: `Tenant is currently ${tenant.status}`,
      },
    };
  }

  const tenantContext: TenantContext = {
    tenantId: tenant.tenantId,
    organizationName: tenant.name,
    config: tenant.config,
    isolationMode: tenant.isolationMode,
  };

  return {
    success: true,
    tenantContext,
  };
}

/**
 * Validates that a request's tenant context matches the authenticated user's tenant.
 * Ensures cross-tenant access is prevented.
 */
export function validateTenantIsolation(
  requestTenantId: string,
  authTenantId: string
): boolean {
  return requestTenantId === authTenantId;
}
