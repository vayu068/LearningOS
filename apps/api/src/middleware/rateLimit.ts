/**
 * Per-tenant rate limiting middleware.
 * Configurable thresholds based on subscription tier.
 */

import type { TenantRateLimits, TenantPlan } from "@learning-os/shared";
import { DEFAULT_RATE_LIMITS } from "@learning-os/shared";

/**
 * Rate limit check result.
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: string;
  retryAfter?: number;
}

/**
 * Rate limit store interface - pluggable storage backend.
 * In production, this would use Redis or DynamoDB.
 */
export interface RateLimitStore {
  /**
   * Increments the request count for a key and returns current count.
   * @param key - The rate limit key (tenant:user or tenant)
   * @param windowMs - The time window in milliseconds
   * @returns Current count within the window
   */
  increment(key: string, windowMs: number): Promise<{ count: number; resetAt: Date }>;
}

/**
 * In-memory rate limit store for development/testing.
 */
export class InMemoryRateLimitStore implements RateLimitStore {
  private windows: Map<string, { count: number; resetAt: Date }> = new Map();

  async increment(key: string, windowMs: number): Promise<{ count: number; resetAt: Date }> {
    const now = new Date();
    const existing = this.windows.get(key);

    if (existing && existing.resetAt > now) {
      existing.count += 1;
      return { count: existing.count, resetAt: existing.resetAt };
    }

    // Window expired or new key - reset
    const resetAt = new Date(now.getTime() + windowMs);
    const entry = { count: 1, resetAt };
    this.windows.set(key, entry);
    return entry;
  }

  /**
   * Clears all stored windows (for testing).
   */
  clear(): void {
    this.windows.clear();
  }
}

/**
 * Checks rate limit for a per-user request (requests per minute).
 */
export async function checkUserRateLimit(
  store: RateLimitStore,
  tenantId: string,
  userId: string,
  limits: TenantRateLimits
): Promise<RateLimitResult> {
  const key = `rate:user:${tenantId}:${userId}`;
  const windowMs = 60 * 1000; // 1 minute window

  const { count, resetAt } = await store.increment(key, windowMs);
  const limit = limits.requestsPerMinute;
  const allowed = count <= limit;

  return {
    allowed,
    remaining: Math.max(0, limit - count),
    limit,
    resetAt: resetAt.toISOString(),
    retryAfter: allowed ? undefined : Math.ceil((resetAt.getTime() - Date.now()) / 1000),
  };
}

/**
 * Checks rate limit at the tenant level (requests per hour).
 */
export async function checkTenantRateLimit(
  store: RateLimitStore,
  tenantId: string,
  limits: TenantRateLimits
): Promise<RateLimitResult> {
  const key = `rate:tenant:${tenantId}`;
  const windowMs = 60 * 60 * 1000; // 1 hour window

  const { count, resetAt } = await store.increment(key, windowMs);
  const limit = limits.requestsPerHour;
  const allowed = count <= limit;

  return {
    allowed,
    remaining: Math.max(0, limit - count),
    limit,
    resetAt: resetAt.toISOString(),
    retryAfter: allowed ? undefined : Math.ceil((resetAt.getTime() - Date.now()) / 1000),
  };
}

/**
 * Gets the effective rate limits for a tenant based on its subscription plan.
 * Falls back to defaults if no custom limits are configured.
 */
export function getEffectiveRateLimits(
  plan: TenantPlan,
  customLimits?: TenantRateLimits
): TenantRateLimits {
  if (customLimits) {
    return customLimits;
  }
  return DEFAULT_RATE_LIMITS[plan] || DEFAULT_RATE_LIMITS.free;
}

/**
 * Creates rate limit response headers.
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.resetAt,
  };

  if (result.retryAfter !== undefined) {
    headers["Retry-After"] = result.retryAfter.toString();
  }

  return headers;
}

/**
 * Creates a rate limit exceeded response.
 */
export function createRateLimitExceededResponse(result: RateLimitResult) {
  return {
    statusCode: 429,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      ...createRateLimitHeaders(result),
    },
    body: JSON.stringify({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please try again later.",
        retryAfter: result.retryAfter,
      },
    }),
  };
}
