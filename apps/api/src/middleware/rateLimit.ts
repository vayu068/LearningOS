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
 * NOTE: This store resets on every Lambda cold start and cannot share state
 * across concurrent invocations. Use DynamoDBRateLimitStore for production.
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
 * DynamoDB-based rate limit store for serverless (Lambda) environments.
 * Uses atomic counters (UpdateExpression ADD) and TTL for automatic cleanup.
 *
 * Table schema:
 *   PK: rate limit key (e.g., "rate:user:tenant-1:user-1")
 *   count: number (atomic counter)
 *   resetAt: ISO timestamp (window expiration)
 *   TTL: epoch seconds (for DynamoDB automatic deletion)
 *
 * TODO: Wire this to an actual DynamoDB DocumentClient in the Lambda handler
 * configuration. The API Gateway burst/rate limits (100 burst, 50/s) provide
 * a safety net, but this store enables per-tenant/per-user granularity.
 */
export class DynamoDBRateLimitStore implements RateLimitStore {
  private client: DynamoDBRateLimitClient;
  private tableName: string;

  constructor(client: DynamoDBRateLimitClient, tableName: string) {
    this.client = client;
    this.tableName = tableName;
  }

  async increment(key: string, windowMs: number): Promise<{ count: number; resetAt: Date }> {
    const now = new Date();
    const resetAt = new Date(now.getTime() + windowMs);
    const ttlSeconds = Math.floor(resetAt.getTime() / 1000) + 60; // TTL with 60s grace

    try {
      const result = await this.client.updateItem({
        tableName: this.tableName,
        key: { PK: key },
        updateExpression: "SET #resetAt = if_not_exists(#resetAt, :resetAt), #ttl = if_not_exists(#ttl, :ttl) ADD #count :inc",
        conditionExpression: "attribute_not_exists(#resetAt) OR #resetAt > :now",
        expressionAttributeNames: {
          "#count": "count",
          "#resetAt": "resetAt",
          "#ttl": "TTL",
        },
        expressionAttributeValues: {
          ":inc": 1,
          ":resetAt": resetAt.toISOString(),
          ":ttl": ttlSeconds,
          ":now": now.toISOString(),
        },
      });

      return {
        count: result.count,
        resetAt: new Date(result.resetAt),
      };
    } catch (error: unknown) {
      // If the condition check failed, the window expired - reset it
      if (error instanceof Error && error.message.includes("ConditionalCheckFailed")) {
        const result = await this.client.updateItem({
          tableName: this.tableName,
          key: { PK: key },
          updateExpression: "SET #count = :one, #resetAt = :resetAt, #ttl = :ttl",
          expressionAttributeNames: {
            "#count": "count",
            "#resetAt": "resetAt",
            "#ttl": "TTL",
          },
          expressionAttributeValues: {
            ":one": 1,
            ":resetAt": resetAt.toISOString(),
            ":ttl": ttlSeconds,
          },
        });
        return {
          count: result.count,
          resetAt: new Date(result.resetAt),
        };
      }
      throw error;
    }
  }
}

/**
 * Interface for DynamoDB operations needed by the rate limit store.
 * Allows dependency injection and testing without a real DynamoDB connection.
 */
export interface DynamoDBRateLimitClient {
  updateItem(params: {
    tableName: string;
    key: Record<string, string>;
    updateExpression: string;
    conditionExpression?: string;
    expressionAttributeNames: Record<string, string>;
    expressionAttributeValues: Record<string, unknown>;
  }): Promise<{ count: number; resetAt: string }>;
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
