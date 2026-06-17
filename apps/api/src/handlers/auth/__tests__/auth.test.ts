/**
 * Unit tests for auth handlers (register, login, refresh).
 * Mocks AWS Cognito and DynamoDB services.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { createRegisterHandler } from "../register";
import { createLoginHandler } from "../login";
import { createRefreshHandler } from "../refresh";

// Mock UUID
vi.mock("uuid", () => ({
  v4: () => "mock-uuid-1234",
}));

function createMockEvent(body: unknown, overrides?: Partial<APIGatewayProxyEvent>): APIGatewayProxyEvent {
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
    ...overrides,
  };
}

describe("Register Handler", () => {
  const mockCognitoClient = {
    send: vi.fn(),
  };

  const mockUserModel = {
    getUserByEmail: vi.fn(),
    createUser: vi.fn(),
  };

  const mockTenantModel = {
    getTenant: vi.fn(),
  };

  const handler = createRegisterHandler({
    cognitoClient: mockCognitoClient as any,
    userModel: mockUserModel as any,
    tenantModel: mockTenantModel as any,
    userPoolId: "test-pool-id",
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should register a new user successfully", async () => {
    mockTenantModel.getTenant.mockResolvedValue({
      tenantId: "tenant-1",
      status: "active",
      config: { maxUsers: 100 },
    });
    mockUserModel.getUserByEmail.mockResolvedValue(null);
    mockCognitoClient.send.mockResolvedValue({});
    mockUserModel.createUser.mockResolvedValue({
      userId: "mock-uuid-1234",
      email: "user@example.com",
      displayName: "John Doe",
      roles: ["student"],
      tenantId: "tenant-1",
    });

    const event = createMockEvent({
      email: "user@example.com",
      password: "SecureP@ss1",
      tenantId: "tenant-1",
      firstName: "John",
      lastName: "Doe",
      role: "student",
    });

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(201);
    expect(body.success).toBe(true);
    expect(body.user.userId).toBe("mock-uuid-1234");
    expect(body.user.email).toBe("user@example.com");
    expect(body.user.roles).toEqual(["student"]);
  });

  it("should return 400 for missing request body", async () => {
    const event = createMockEvent(null);
    const result = await handler(event);
    expect(result.statusCode).toBe(400);
  });

  it("should return 400 for invalid email", async () => {
    const event = createMockEvent({
      email: "invalid-email",
      password: "SecureP@ss1",
      tenantId: "tenant-1",
      firstName: "John",
      lastName: "Doe",
      role: "student",
    });

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 400 for short password", async () => {
    const event = createMockEvent({
      email: "user@example.com",
      password: "short",
      tenantId: "tenant-1",
      firstName: "John",
      lastName: "Doe",
      role: "student",
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(400);
  });

  it("should return 404 for non-existent tenant", async () => {
    mockTenantModel.getTenant.mockResolvedValue(null);

    const event = createMockEvent({
      email: "user@example.com",
      password: "SecureP@ss1",
      tenantId: "non-existent-tenant",
      firstName: "John",
      lastName: "Doe",
      role: "student",
    });

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(404);
    expect(body.error.code).toBe("INVALID_TENANT");
  });

  it("should return 403 for inactive tenant", async () => {
    mockTenantModel.getTenant.mockResolvedValue({
      tenantId: "tenant-1",
      status: "suspended",
    });

    const event = createMockEvent({
      email: "user@example.com",
      password: "SecureP@ss1",
      tenantId: "tenant-1",
      firstName: "John",
      lastName: "Doe",
      role: "student",
    });

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(403);
    expect(body.error.code).toBe("TENANT_DISABLED");
  });

  it("should return 409 when user already exists", async () => {
    mockTenantModel.getTenant.mockResolvedValue({
      tenantId: "tenant-1",
      status: "active",
    });
    mockUserModel.getUserByEmail.mockResolvedValue({ userId: "existing-user" });

    const event = createMockEvent({
      email: "existing@example.com",
      password: "SecureP@ss1",
      tenantId: "tenant-1",
      firstName: "John",
      lastName: "Doe",
      role: "student",
    });

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(409);
    expect(body.error.code).toBe("USER_EXISTS");
  });

  it("should call Cognito with correct parameters", async () => {
    mockTenantModel.getTenant.mockResolvedValue({
      tenantId: "tenant-1",
      status: "active",
    });
    mockUserModel.getUserByEmail.mockResolvedValue(null);
    mockCognitoClient.send.mockResolvedValue({});
    mockUserModel.createUser.mockResolvedValue({
      userId: "mock-uuid-1234",
      email: "user@example.com",
      displayName: "John Doe",
      roles: ["teacher"],
      tenantId: "tenant-1",
    });

    const event = createMockEvent({
      email: "user@example.com",
      password: "SecureP@ss1",
      tenantId: "tenant-1",
      firstName: "John",
      lastName: "Doe",
      role: "teacher",
    });

    await handler(event);

    // Verify AdminCreateUserCommand was called
    expect(mockCognitoClient.send).toHaveBeenCalledTimes(3);
    const createCall = mockCognitoClient.send.mock.calls[0][0];
    expect(createCall.input).toEqual(
      expect.objectContaining({
        UserPoolId: "test-pool-id",
        Username: "tenant-1_mock-uuid-1234",
        UserAttributes: expect.arrayContaining([
          { Name: "email", Value: "user@example.com" },
          { Name: "custom:tenantId", Value: "tenant-1" },
          { Name: "custom:roles", Value: "teacher" },
        ]),
      })
    );
  });
});

describe("Login Handler", () => {
  const mockCognitoClient = {
    send: vi.fn(),
  };

  const mockUserModel = {
    getUserByEmail: vi.fn(),
  };

  const mockTenantModel = {
    getTenant: vi.fn(),
  };

  const handler = createLoginHandler({
    cognitoClient: mockCognitoClient as any,
    userModel: mockUserModel as any,
    tenantModel: mockTenantModel as any,
    userPoolId: "test-pool-id",
    clientId: "test-client-id",
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should login successfully with valid credentials", async () => {
    mockTenantModel.getTenant.mockResolvedValue({
      tenantId: "tenant-1",
      status: "active",
    });
    mockUserModel.getUserByEmail.mockResolvedValue({
      userId: "user-1",
      email: "user@example.com",
      displayName: "John Doe",
      roles: ["student"],
      status: "active",
      cognitoUsername: "tenant-1_user-1",
    });
    mockCognitoClient.send.mockResolvedValue({
      AuthenticationResult: {
        AccessToken: "access-token-123",
        RefreshToken: "refresh-token-123",
        IdToken: "id-token-123",
        ExpiresIn: 3600,
      },
    });

    const event = createMockEvent({
      email: "user@example.com",
      password: "SecureP@ss1",
      tenantId: "tenant-1",
    });

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.tokens.accessToken).toBe("access-token-123");
    expect(body.tokens.refreshToken).toBe("refresh-token-123");
    expect(body.tokens.tokenType).toBe("Bearer");
    expect(body.user.userId).toBe("user-1");
    expect(body.user.roles).toEqual(["student"]);
  });

  it("should return 400 for missing email or password", async () => {
    const event = createMockEvent({
      email: "user@example.com",
      tenantId: "tenant-1",
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(400);
  });

  it("should return 400 for missing tenantId", async () => {
    const event = createMockEvent({
      email: "user@example.com",
      password: "pass",
    });

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 401 when user not found", async () => {
    mockTenantModel.getTenant.mockResolvedValue({
      tenantId: "tenant-1",
      status: "active",
    });
    mockUserModel.getUserByEmail.mockResolvedValue(null);

    const event = createMockEvent({
      email: "noone@example.com",
      password: "SecureP@ss1",
      tenantId: "tenant-1",
    });

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(401);
    expect(body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("should return 403 for suspended account", async () => {
    mockTenantModel.getTenant.mockResolvedValue({
      tenantId: "tenant-1",
      status: "active",
    });
    mockUserModel.getUserByEmail.mockResolvedValue({
      userId: "user-1",
      email: "user@example.com",
      status: "suspended",
    });

    const event = createMockEvent({
      email: "user@example.com",
      password: "SecureP@ss1",
      tenantId: "tenant-1",
    });

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(403);
    expect(body.error.code).toBe("ACCOUNT_LOCKED");
  });

  it("should return 401 on MFA challenge", async () => {
    mockTenantModel.getTenant.mockResolvedValue({
      tenantId: "tenant-1",
      status: "active",
    });
    mockUserModel.getUserByEmail.mockResolvedValue({
      userId: "user-1",
      email: "user@example.com",
      status: "active",
      cognitoUsername: "tenant-1_user-1",
    });
    mockCognitoClient.send.mockResolvedValue({
      ChallengeName: "SMS_MFA",
      Session: "session-id",
    });

    const event = createMockEvent({
      email: "user@example.com",
      password: "SecureP@ss1",
      tenantId: "tenant-1",
    });

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(401);
    expect(body.error.code).toBe("MFA_REQUIRED");
  });

  it("should return 404 for non-existent tenant", async () => {
    mockTenantModel.getTenant.mockResolvedValue(null);

    const event = createMockEvent({
      email: "user@example.com",
      password: "SecureP@ss1",
      tenantId: "bad-tenant",
    });

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(404);
    expect(body.error.code).toBe("INVALID_TENANT");
  });
});

describe("Refresh Handler", () => {
  const mockCognitoClient = {
    send: vi.fn(),
  };

  const mockTenantModel = {
    getTenant: vi.fn(),
  };

  const handler = createRefreshHandler({
    cognitoClient: mockCognitoClient as any,
    tenantModel: mockTenantModel as any,
    userPoolId: "test-pool-id",
    clientId: "test-client-id",
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should refresh tokens successfully", async () => {
    mockTenantModel.getTenant.mockResolvedValue({
      tenantId: "tenant-1",
      status: "active",
    });
    mockCognitoClient.send.mockResolvedValue({
      AuthenticationResult: {
        AccessToken: "new-access-token",
        IdToken: "new-id-token",
        ExpiresIn: 3600,
      },
    });

    const event = createMockEvent({
      refreshToken: "valid-refresh-token",
      tenantId: "tenant-1",
    });

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.tokens.accessToken).toBe("new-access-token");
    expect(body.tokens.refreshToken).toBe("valid-refresh-token");
    expect(body.tokens.idToken).toBe("new-id-token");
  });

  it("should return 400 for missing refreshToken", async () => {
    const event = createMockEvent({
      tenantId: "tenant-1",
    });

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 400 for missing tenantId", async () => {
    const event = createMockEvent({
      refreshToken: "some-token",
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(400);
  });

  it("should return 404 for non-existent tenant", async () => {
    mockTenantModel.getTenant.mockResolvedValue(null);

    const event = createMockEvent({
      refreshToken: "some-token",
      tenantId: "bad-tenant",
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(404);
  });

  it("should return 403 for inactive tenant", async () => {
    mockTenantModel.getTenant.mockResolvedValue({
      tenantId: "tenant-1",
      status: "suspended",
    });

    const event = createMockEvent({
      refreshToken: "some-token",
      tenantId: "tenant-1",
    });

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(403);
    expect(body.error.code).toBe("TENANT_DISABLED");
  });

  it("should return 401 on Cognito NotAuthorizedException", async () => {
    mockTenantModel.getTenant.mockResolvedValue({
      tenantId: "tenant-1",
      status: "active",
    });
    mockCognitoClient.send.mockRejectedValue(
      new Error("NotAuthorizedException: Refresh Token has expired")
    );

    const event = createMockEvent({
      refreshToken: "expired-token",
      tenantId: "tenant-1",
    });

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(401);
    expect(body.error.code).toBe("REFRESH_FAILED");
  });

  it("should return 401 when AuthenticationResult is null", async () => {
    mockTenantModel.getTenant.mockResolvedValue({
      tenantId: "tenant-1",
      status: "active",
    });
    mockCognitoClient.send.mockResolvedValue({
      AuthenticationResult: null,
    });

    const event = createMockEvent({
      refreshToken: "valid-token",
      tenantId: "tenant-1",
    });

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(401);
    expect(body.error.code).toBe("REFRESH_FAILED");
  });
});
