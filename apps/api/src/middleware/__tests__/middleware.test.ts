/**
 * Unit tests for auth, tenant, and rate limit middleware.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { APIGatewayProxyEvent } from "aws-lambda";
import {
  authenticateRequest,
  extractBearerToken,
  authorizeAction,
  type AuthContext,
  type TokenVerifier,
  type TenantConfigLoader,
} from "../auth";
import {
  resolveTenant,
  extractTenantIdentifier,
  validateTenantIsolation,
  type TenantLoader,
} from "../tenant";
import {
  InMemoryRateLimitStore,
  checkUserRateLimit,
  checkTenantRateLimit,
  getEffectiveRateLimits,
  createRateLimitHeaders,
  createRateLimitExceededResponse,
} from "../rateLimit";

function createMockEvent(overrides?: Partial<APIGatewayProxyEvent>): APIGatewayProxyEvent {
  return {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: "GET",
    isBase64Encoded: false,
    path: "/",
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as APIGatewayProxyEvent["requestContext"],
    resource: "",
    ...overrides,
  };
}

describe("Auth Middleware", () => {
  describe("extractBearerToken", () => {
    it("should extract token from Authorization header", () => {
      const event = createMockEvent({
        headers: { Authorization: "Bearer my-jwt-token" },
      });
      expect(extractBearerToken(event)).toBe("my-jwt-token");
    });

    it("should handle lowercase authorization header", () => {
      const event = createMockEvent({
        headers: { authorization: "Bearer lowercase-token" },
      });
      expect(extractBearerToken(event)).toBe("lowercase-token");
    });

    it("should return null for missing header", () => {
      const event = createMockEvent({ headers: {} });
      expect(extractBearerToken(event)).toBeNull();
    });

    it("should return null for non-Bearer token", () => {
      const event = createMockEvent({
        headers: { Authorization: "Basic abc123" },
      });
      expect(extractBearerToken(event)).toBeNull();
    });

    it("should return null for malformed header", () => {
      const event = createMockEvent({
        headers: { Authorization: "Bearer" },
      });
      expect(extractBearerToken(event)).toBeNull();
    });
  });

  describe("authenticateRequest", () => {
    const mockTokenVerifier: TokenVerifier = {
      verify: vi.fn(),
    };

    const mockTenantLoader: TenantConfigLoader = {
      loadTenantContext: vi.fn(),
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should authenticate valid request", async () => {
      const event = createMockEvent({
        headers: { Authorization: "Bearer valid-token" },
      });

      (mockTokenVerifier.verify as any).mockResolvedValue({
        sub: "cognito-sub-id",
        email: "user@example.com",
        "custom:tenantId": "tenant-1",
        "custom:roles": "student,teacher",
        "custom:userId": "user-1",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      });

      (mockTenantLoader.loadTenantContext as any).mockResolvedValue({
        tenantId: "tenant-1",
        organizationName: "Test School",
        config: { maxUsers: 100 },
        isolationMode: "shared",
      });

      const result = await authenticateRequest(event, mockTokenVerifier, mockTenantLoader);

      expect(result.success).toBe(true);
      expect(result.context?.userId).toBe("user-1");
      expect(result.context?.tenantId).toBe("tenant-1");
      expect(result.context?.roles).toEqual(["student", "teacher"]);
      expect(result.context?.email).toBe("user@example.com");
    });

    it("should return error for missing token", async () => {
      const event = createMockEvent({ headers: {} });

      const result = await authenticateRequest(event, mockTokenVerifier, mockTenantLoader);

      expect(result.success).toBe(false);
      expect(result.error?.statusCode).toBe(401);
      expect(result.error?.code).toBe("MISSING_TOKEN");
    });

    it("should return error for invalid token", async () => {
      const event = createMockEvent({
        headers: { Authorization: "Bearer invalid-token" },
      });

      (mockTokenVerifier.verify as any).mockRejectedValue(new Error("Invalid signature"));

      const result = await authenticateRequest(event, mockTokenVerifier, mockTenantLoader);

      expect(result.success).toBe(false);
      expect(result.error?.statusCode).toBe(401);
      expect(result.error?.code).toBe("INVALID_TOKEN");
    });

    it("should return error for expired token", async () => {
      const event = createMockEvent({
        headers: { Authorization: "Bearer expired-token" },
      });

      (mockTokenVerifier.verify as any).mockResolvedValue({
        sub: "sub-id",
        email: "user@example.com",
        "custom:tenantId": "tenant-1",
        "custom:roles": "student",
        "custom:userId": "user-1",
        exp: Math.floor(Date.now() / 1000) - 3600, // expired 1 hour ago
        iat: Math.floor(Date.now() / 1000) - 7200,
      });

      const result = await authenticateRequest(event, mockTokenVerifier, mockTenantLoader);

      expect(result.success).toBe(false);
      expect(result.error?.statusCode).toBe(401);
      expect(result.error?.code).toBe("TOKEN_EXPIRED");
    });

    it("should return error when tenant not found", async () => {
      const event = createMockEvent({
        headers: { Authorization: "Bearer valid-token" },
      });

      (mockTokenVerifier.verify as any).mockResolvedValue({
        sub: "sub-id",
        email: "user@example.com",
        "custom:tenantId": "missing-tenant",
        "custom:roles": "student",
        "custom:userId": "user-1",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      });

      (mockTenantLoader.loadTenantContext as any).mockResolvedValue(null);

      const result = await authenticateRequest(event, mockTokenVerifier, mockTenantLoader);

      expect(result.success).toBe(false);
      expect(result.error?.statusCode).toBe(403);
      expect(result.error?.code).toBe("INVALID_TENANT");
    });

    it("should return error when token has no tenant claim", async () => {
      const event = createMockEvent({
        headers: { Authorization: "Bearer valid-token" },
      });

      (mockTokenVerifier.verify as any).mockResolvedValue({
        sub: "sub-id",
        email: "user@example.com",
        "custom:tenantId": "",
        "custom:roles": "student",
        "custom:userId": "user-1",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      });

      const result = await authenticateRequest(event, mockTokenVerifier, mockTenantLoader);

      expect(result.success).toBe(false);
      expect(result.error?.statusCode).toBe(403);
      expect(result.error?.code).toBe("MISSING_TENANT");
    });
  });

  describe("authorizeAction", () => {
    const adminContext: AuthContext = {
      userId: "user-1",
      email: "admin@test.com",
      tenantId: "tenant-1",
      roles: ["tenant_admin"],
      tenantContext: {
        tenantId: "tenant-1",
        organizationName: "Test",
        config: { maxUsers: 100, enabledFeatures: [], dpiEnabled: false, aiEnabled: false },
        isolationMode: "shared",
      },
    };

    const studentContext: AuthContext = {
      userId: "user-2",
      email: "student@test.com",
      tenantId: "tenant-1",
      roles: ["student"],
      tenantContext: adminContext.tenantContext,
    };

    it("should authorize admin for user management", () => {
      expect(authorizeAction(adminContext, "users:all", "create")).toBe(true);
      expect(authorizeAction(adminContext, "users:all", "delete")).toBe(true);
    });

    it("should authorize student for own profile", () => {
      expect(authorizeAction(studentContext, "profile:own", "read")).toBe(true);
      expect(authorizeAction(studentContext, "profile:own", "update")).toBe(true);
    });

    it("should deny student from managing users", () => {
      expect(authorizeAction(studentContext, "users:all", "create")).toBe(false);
      expect(authorizeAction(studentContext, "users:all", "delete")).toBe(false);
    });

    it("should authorize super_admin for everything", () => {
      const superAdminContext: AuthContext = {
        ...adminContext,
        roles: ["super_admin"],
      };
      expect(authorizeAction(superAdminContext, "anything", "delete")).toBe(true);
    });
  });
});

describe("Tenant Middleware", () => {
  describe("extractTenantIdentifier", () => {
    it("should extract tenant from X-Tenant-ID header", () => {
      const event = createMockEvent({
        headers: { "X-Tenant-ID": "tenant-123" },
      });
      const result = extractTenantIdentifier(event);
      expect(result.tenantId).toBe("tenant-123");
    });

    it("should extract tenant from lowercase header", () => {
      const event = createMockEvent({
        headers: { "x-tenant-id": "tenant-456" },
      });
      const result = extractTenantIdentifier(event);
      expect(result.tenantId).toBe("tenant-456");
    });

    it("should extract domain from Host subdomain", () => {
      const event = createMockEvent({
        headers: { Host: "schoolname.learningos.in" },
      });
      const result = extractTenantIdentifier(event);
      expect(result.domain).toBe("schoolname");
    });

    it("should ignore www subdomain", () => {
      const event = createMockEvent({
        headers: { Host: "www.learningos.in" },
      });
      const result = extractTenantIdentifier(event);
      expect(result.tenantId).toBeUndefined();
      expect(result.domain).toBeUndefined();
    });

    it("should ignore api subdomain", () => {
      const event = createMockEvent({
        headers: { Host: "api.learningos.in" },
      });
      const result = extractTenantIdentifier(event);
      expect(result.tenantId).toBeUndefined();
      expect(result.domain).toBeUndefined();
    });

    it("should fall back to path parameter", () => {
      const event = createMockEvent({
        pathParameters: { tenantId: "path-tenant" },
      });
      const result = extractTenantIdentifier(event);
      expect(result.tenantId).toBe("path-tenant");
    });

    it("should return empty when no tenant info present", () => {
      const event = createMockEvent({});
      const result = extractTenantIdentifier(event);
      expect(result.tenantId).toBeUndefined();
      expect(result.domain).toBeUndefined();
    });
  });

  describe("resolveTenant", () => {
    const mockTenantLoader: TenantLoader = {
      getByDomain: vi.fn(),
      getById: vi.fn(),
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should resolve tenant by ID", async () => {
      const event = createMockEvent({
        headers: { "X-Tenant-ID": "tenant-1" },
      });

      (mockTenantLoader.getById as any).mockResolvedValue({
        tenantId: "tenant-1",
        name: "Test School",
        status: "active",
        config: { maxUsers: 100, enabledFeatures: [] },
        isolationMode: "shared",
      });

      const result = await resolveTenant(event, mockTenantLoader);

      expect(result.success).toBe(true);
      expect(result.tenantContext?.tenantId).toBe("tenant-1");
      expect(result.tenantContext?.organizationName).toBe("Test School");
    });

    it("should resolve tenant by domain", async () => {
      const event = createMockEvent({
        headers: { Host: "myschool.learningos.in" },
      });

      (mockTenantLoader.getByDomain as any).mockResolvedValue({
        tenantId: "tenant-2",
        name: "My School",
        status: "active",
        config: { maxUsers: 500, enabledFeatures: ["ai_tutor"] },
        isolationMode: "strict",
      });

      const result = await resolveTenant(event, mockTenantLoader);

      expect(result.success).toBe(true);
      expect(result.tenantContext?.tenantId).toBe("tenant-2");
      expect(result.tenantContext?.isolationMode).toBe("strict");
    });

    it("should return error when tenant not specified", async () => {
      const event = createMockEvent({});
      const result = await resolveTenant(event, mockTenantLoader);

      expect(result.success).toBe(false);
      expect(result.error?.statusCode).toBe(400);
      expect(result.error?.code).toBe("TENANT_NOT_SPECIFIED");
    });

    it("should return error when tenant not found", async () => {
      const event = createMockEvent({
        headers: { "X-Tenant-ID": "nonexistent" },
      });

      (mockTenantLoader.getById as any).mockResolvedValue(null);

      const result = await resolveTenant(event, mockTenantLoader);

      expect(result.success).toBe(false);
      expect(result.error?.statusCode).toBe(404);
      expect(result.error?.code).toBe("TENANT_NOT_FOUND");
    });

    it("should return error when tenant is inactive", async () => {
      const event = createMockEvent({
        headers: { "X-Tenant-ID": "suspended-tenant" },
      });

      (mockTenantLoader.getById as any).mockResolvedValue({
        tenantId: "suspended-tenant",
        name: "Suspended",
        status: "suspended",
        config: {},
        isolationMode: "shared",
      });

      const result = await resolveTenant(event, mockTenantLoader);

      expect(result.success).toBe(false);
      expect(result.error?.statusCode).toBe(403);
      expect(result.error?.code).toBe("TENANT_INACTIVE");
    });
  });

  describe("validateTenantIsolation", () => {
    it("should return true for matching tenant IDs", () => {
      expect(validateTenantIsolation("tenant-1", "tenant-1")).toBe(true);
    });

    it("should return false for different tenant IDs", () => {
      expect(validateTenantIsolation("tenant-1", "tenant-2")).toBe(false);
    });
  });
});

describe("Rate Limit Middleware", () => {
  describe("InMemoryRateLimitStore", () => {
    it("should track request counts within a window", async () => {
      const store = new InMemoryRateLimitStore();
      const windowMs = 60000;

      const first = await store.increment("key-1", windowMs);
      expect(first.count).toBe(1);

      const second = await store.increment("key-1", windowMs);
      expect(second.count).toBe(2);

      const third = await store.increment("key-1", windowMs);
      expect(third.count).toBe(3);
    });

    it("should track different keys independently", async () => {
      const store = new InMemoryRateLimitStore();

      await store.increment("key-a", 60000);
      await store.increment("key-a", 60000);
      const resultA = await store.increment("key-a", 60000);

      const resultB = await store.increment("key-b", 60000);

      expect(resultA.count).toBe(3);
      expect(resultB.count).toBe(1);
    });

    it("should clear all windows", async () => {
      const store = new InMemoryRateLimitStore();
      await store.increment("key-1", 60000);
      store.clear();
      const result = await store.increment("key-1", 60000);
      expect(result.count).toBe(1);
    });
  });

  describe("checkUserRateLimit", () => {
    it("should allow requests within limit", async () => {
      const store = new InMemoryRateLimitStore();
      const limits = { requestsPerMinute: 5, requestsPerHour: 100, burstLimit: 10 };

      const result = await checkUserRateLimit(store, "tenant-1", "user-1", limits);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.limit).toBe(5);
    });

    it("should deny requests exceeding limit", async () => {
      const store = new InMemoryRateLimitStore();
      const limits = { requestsPerMinute: 2, requestsPerHour: 100, burstLimit: 5 };

      await checkUserRateLimit(store, "tenant-1", "user-1", limits);
      await checkUserRateLimit(store, "tenant-1", "user-1", limits);
      const result = await checkUserRateLimit(store, "tenant-1", "user-1", limits);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });
  });

  describe("checkTenantRateLimit", () => {
    it("should allow requests within tenant limit", async () => {
      const store = new InMemoryRateLimitStore();
      const limits = { requestsPerMinute: 60, requestsPerHour: 3, burstLimit: 10 };

      const result = await checkTenantRateLimit(store, "tenant-1", limits);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it("should deny requests exceeding tenant limit", async () => {
      const store = new InMemoryRateLimitStore();
      const limits = { requestsPerMinute: 60, requestsPerHour: 2, burstLimit: 10 };

      await checkTenantRateLimit(store, "tenant-1", limits);
      await checkTenantRateLimit(store, "tenant-1", limits);
      const result = await checkTenantRateLimit(store, "tenant-1", limits);

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });
  });

  describe("getEffectiveRateLimits", () => {
    it("should return custom limits when provided", () => {
      const custom = { requestsPerMinute: 999, requestsPerHour: 9999, burstLimit: 50 };
      const result = getEffectiveRateLimits("free", custom);
      expect(result).toEqual(custom);
    });

    it("should return defaults for free plan", () => {
      const result = getEffectiveRateLimits("free");
      expect(result.requestsPerMinute).toBe(30);
      expect(result.requestsPerHour).toBe(500);
    });

    it("should return defaults for enterprise plan", () => {
      const result = getEffectiveRateLimits("enterprise");
      expect(result.requestsPerMinute).toBe(300);
      expect(result.requestsPerHour).toBe(20000);
    });
  });

  describe("createRateLimitHeaders", () => {
    it("should create headers without retry-after when allowed", () => {
      const headers = createRateLimitHeaders({
        allowed: true,
        remaining: 5,
        limit: 10,
        resetAt: "2024-01-01T00:01:00.000Z",
      });

      expect(headers["X-RateLimit-Limit"]).toBe("10");
      expect(headers["X-RateLimit-Remaining"]).toBe("5");
      expect(headers["Retry-After"]).toBeUndefined();
    });

    it("should include retry-after when not allowed", () => {
      const headers = createRateLimitHeaders({
        allowed: false,
        remaining: 0,
        limit: 10,
        resetAt: "2024-01-01T00:01:00.000Z",
        retryAfter: 30,
      });

      expect(headers["Retry-After"]).toBe("30");
    });
  });

  describe("createRateLimitExceededResponse", () => {
    it("should return 429 response with proper body", () => {
      const response = createRateLimitExceededResponse({
        allowed: false,
        remaining: 0,
        limit: 10,
        resetAt: "2024-01-01T00:01:00.000Z",
        retryAfter: 45,
      });

      expect(response.statusCode).toBe(429);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(body.error.retryAfter).toBe(45);
    });
  });
});
