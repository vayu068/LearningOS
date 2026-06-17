/**
 * Unit tests for tenant management handlers (create, manage).
 * Mocks AWS Cognito and DynamoDB services.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { createTenantHandler } from "../create";
import { createManageTenantHandler } from "../manage";

vi.mock("uuid", () => ({
  v4: () => "mock-tenant-uuid",
}));

function createMockEvent(body: unknown): APIGatewayProxyEvent {
  return {
    body: body ? JSON.stringify(body) : null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: "POST",
    isBase64Encoded: false,
    path: "/",
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as APIGatewayProxyEvent["requestContext"],
    resource: "",
  };
}

describe("Create Tenant Handler", () => {
  const mockCognitoClient = { send: vi.fn() };
  const mockTenantModel = { createTenant: vi.fn() };

  const handler = createTenantHandler({
    cognitoClient: mockCognitoClient as any,
    tenantModel: mockTenantModel as any,
    userPoolId: "test-pool-id",
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a tenant successfully", async () => {
    mockCognitoClient.send.mockResolvedValue({});
    mockTenantModel.createTenant.mockResolvedValue({
      tenantId: "mock-tenant-uuid",
      name: "Test School",
      type: "school",
      status: "active",
      subscriptionTier: "basic",
      config: { maxUsers: 500, enabledFeatures: ["core_learning"] },
      createdAt: "2024-01-01T00:00:00.000Z",
    });

    const event = createMockEvent({
      organizationName: "Test School",
      adminEmail: "admin@testschool.com",
      adminName: "Admin User",
      type: "school",
      plan: "basic",
    });

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(201);
    expect(body.success).toBe(true);
    expect(body.tenant.tenantId).toBe("mock-tenant-uuid");
    expect(body.tenant.name).toBe("Test School");
    expect(body.tenant.type).toBe("school");
    expect(body.tenant.subscriptionTier).toBe("basic");
  });

  it("should return 400 for missing body", async () => {
    const event = createMockEvent(null);
    const result = await handler(event);
    expect(result.statusCode).toBe(400);
  });

  it("should return 400 for invalid organization name", async () => {
    const event = createMockEvent({
      organizationName: "X",
      adminEmail: "admin@test.com",
      adminName: "Admin",
      type: "school",
      plan: "basic",
    });

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 400 for invalid email", async () => {
    const event = createMockEvent({
      organizationName: "Good School",
      adminEmail: "not-an-email",
      adminName: "Admin",
      type: "school",
      plan: "basic",
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(400);
  });

  it("should return 400 for invalid type", async () => {
    const event = createMockEvent({
      organizationName: "Good School",
      adminEmail: "admin@test.com",
      adminName: "Admin",
      type: "invalid_type",
      plan: "basic",
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(400);
  });

  it("should return 400 for invalid plan", async () => {
    const event = createMockEvent({
      organizationName: "Good School",
      adminEmail: "admin@test.com",
      adminName: "Admin",
      type: "school",
      plan: "invalid_plan",
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(400);
  });

  it("should create Cognito group with correct name", async () => {
    mockCognitoClient.send.mockResolvedValue({});
    mockTenantModel.createTenant.mockResolvedValue({
      tenantId: "mock-tenant-uuid",
      name: "University",
      type: "university",
      status: "active",
      subscriptionTier: "premium",
      config: {},
      createdAt: "2024-01-01T00:00:00.000Z",
    });

    const event = createMockEvent({
      organizationName: "University",
      adminEmail: "admin@uni.edu",
      adminName: "Dean",
      type: "university",
      plan: "premium",
    });

    await handler(event);

    expect(mockCognitoClient.send).toHaveBeenCalledTimes(1);
    const call = mockCognitoClient.send.mock.calls[0][0];
    expect(call.input).toEqual(
      expect.objectContaining({
        UserPoolId: "test-pool-id",
        GroupName: "tenant_mock-tenant-uuid",
      })
    );
  });

  it("should handle ConditionalCheckFailed error", async () => {
    mockCognitoClient.send.mockResolvedValue({});
    mockTenantModel.createTenant.mockRejectedValue(
      new Error("ConditionalCheckFailed")
    );

    const event = createMockEvent({
      organizationName: "Duplicate School",
      adminEmail: "admin@dup.com",
      adminName: "Admin",
      type: "school",
      plan: "free",
    });

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(409);
    expect(body.error.code).toBe("TENANT_EXISTS");
  });
});

describe("Manage Tenant Handler", () => {
  const mockTenantModel = {
    getTenant: vi.fn(),
    updateTenantConfig: vi.fn(),
    updateSubscription: vi.fn(),
    updateTenantStatus: vi.fn(),
  };

  const handler = createManageTenantHandler({
    tenantModel: mockTenantModel as any,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update tenant config successfully", async () => {
    mockTenantModel.getTenant.mockResolvedValue({
      tenantId: "tenant-1",
      name: "Test School",
      config: { maxUsers: 100 },
    });
    mockTenantModel.updateTenantConfig.mockResolvedValue({
      tenantId: "tenant-1",
      name: "Test School",
      config: { maxUsers: 200, aiEnabled: true },
    });

    const event = createMockEvent({
      action: "updateConfig",
      tenantId: "tenant-1",
      config: { maxUsers: 200, aiEnabled: true },
    });

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.tenant.config.aiEnabled).toBe(true);
  });

  it("should update subscription tier", async () => {
    mockTenantModel.getTenant.mockResolvedValue({
      tenantId: "tenant-1",
      subscriptionTier: "basic",
    });
    mockTenantModel.updateSubscription.mockResolvedValue({
      tenantId: "tenant-1",
      subscriptionTier: "premium",
    });

    const event = createMockEvent({
      action: "updateSubscription",
      tenantId: "tenant-1",
      subscriptionTier: "premium",
    });

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.success).toBe(true);
  });

  it("should update tenant status", async () => {
    mockTenantModel.getTenant.mockResolvedValue({
      tenantId: "tenant-1",
      status: "active",
    });
    mockTenantModel.updateTenantStatus.mockResolvedValue({
      tenantId: "tenant-1",
      status: "suspended",
    });

    const event = createMockEvent({
      action: "updateStatus",
      tenantId: "tenant-1",
      status: "suspended",
    });

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.success).toBe(true);
  });

  it("should return usage data", async () => {
    mockTenantModel.getTenant.mockResolvedValue({
      tenantId: "tenant-1",
      name: "My School",
      subscriptionTier: "premium",
      config: { maxUsers: 5000 },
    });

    const event = createMockEvent({
      action: "getUsage",
      tenantId: "tenant-1",
    });

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.tenant.name).toBe("My School");
    expect(body.tenant.subscriptionTier).toBe("premium");
  });

  it("should return 400 for missing action", async () => {
    const event = createMockEvent({
      tenantId: "tenant-1",
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(400);
  });

  it("should return 400 for missing tenantId", async () => {
    const event = createMockEvent({
      action: "getUsage",
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(400);
  });

  it("should return 404 for non-existent tenant", async () => {
    mockTenantModel.getTenant.mockResolvedValue(null);

    const event = createMockEvent({
      action: "getUsage",
      tenantId: "bad-tenant",
    });

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(404);
    expect(body.error.code).toBe("TENANT_NOT_FOUND");
  });

  it("should return 400 for missing config in updateConfig", async () => {
    mockTenantModel.getTenant.mockResolvedValue({ tenantId: "tenant-1" });

    const event = createMockEvent({
      action: "updateConfig",
      tenantId: "tenant-1",
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(400);
  });

  it("should return 400 for invalid subscription tier", async () => {
    mockTenantModel.getTenant.mockResolvedValue({ tenantId: "tenant-1" });

    const event = createMockEvent({
      action: "updateSubscription",
      tenantId: "tenant-1",
      subscriptionTier: "invalid",
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(400);
  });

  it("should return 400 for unknown action", async () => {
    mockTenantModel.getTenant.mockResolvedValue({ tenantId: "tenant-1" });

    const event = createMockEvent({
      action: "unknownAction",
      tenantId: "tenant-1",
    });

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(400);
    expect(body.error.code).toBe("INVALID_ACTION");
  });
});
