/**
 * Multi-tenant user registration Lambda handler.
 * Validates tenant, creates Cognito user in tenant user pool group, stores profile in DynamoDB.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminAddUserToGroupCommand,
  AdminSetUserPasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { v4 as uuidv4 } from "uuid";
import type { RegisterRequest } from "@learning-os/shared";
import { UserModel, CreateUserParams } from "../../models/user";
import { TenantModel } from "../../models/tenant";

/**
 * Dependencies that can be injected for testing.
 */
export interface RegisterDependencies {
  cognitoClient: CognitoIdentityProviderClient;
  userModel: UserModel;
  tenantModel: TenantModel;
  userPoolId: string;
}

/**
 * Creates the handler with injected dependencies (for testability).
 */
export function createRegisterHandler(deps: RegisterDependencies) {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      // Parse and validate request body
      if (!event.body) {
        return errorResponse(400, "INVALID_REQUEST", "Request body is required");
      }

      const request: RegisterRequest = JSON.parse(event.body);

      // Validate required fields
      const validationErrors = validateRegisterRequest(request);
      if (validationErrors.length > 0) {
        return errorResponse(400, "VALIDATION_ERROR", validationErrors.join("; "));
      }

      // Verify tenant exists and is active
      const tenant = await deps.tenantModel.getTenant(request.tenantId);
      if (!tenant) {
        return errorResponse(404, "INVALID_TENANT", "Tenant not found");
      }
      if (tenant.status !== "active") {
        return errorResponse(403, "TENANT_DISABLED", "Tenant is not active");
      }

      // Check if user already exists in this tenant
      const existingUser = await deps.userModel.getUserByEmail(request.email, request.tenantId);
      if (existingUser) {
        return errorResponse(409, "USER_EXISTS", "A user with this email already exists in this tenant");
      }

      // Create user in Cognito
      const userId = uuidv4();
      const cognitoUsername = `${request.tenantId}_${userId}`;

      await deps.cognitoClient.send(
        new AdminCreateUserCommand({
          UserPoolId: deps.userPoolId,
          Username: cognitoUsername,
          UserAttributes: [
            { Name: "email", Value: request.email },
            { Name: "email_verified", Value: "true" },
            { Name: "custom:tenantId", Value: request.tenantId },
            { Name: "custom:userId", Value: userId },
            { Name: "custom:roles", Value: request.role },
          ],
          MessageAction: "SUPPRESS",
        })
      );

      // Set permanent password
      await deps.cognitoClient.send(
        new AdminSetUserPasswordCommand({
          UserPoolId: deps.userPoolId,
          Username: cognitoUsername,
          Password: request.password,
          Permanent: true,
        })
      );

      // Add user to tenant group in Cognito
      await deps.cognitoClient.send(
        new AdminAddUserToGroupCommand({
          UserPoolId: deps.userPoolId,
          Username: cognitoUsername,
          GroupName: `tenant_${request.tenantId}`,
        })
      );

      // Store user profile in DynamoDB
      const createParams: CreateUserParams = {
        userId,
        tenantId: request.tenantId,
        email: request.email,
        displayName: `${request.firstName} ${request.lastName}`,
        roles: [request.role],
        profile: {
          firstName: request.firstName,
          lastName: request.lastName,
          preferredLanguage: "en",
          phoneNumber: request.phoneNumber,
        },
        cognitoUsername,
      };

      const user = await deps.userModel.createUser(createParams);

      return {
        statusCode: 201,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          success: true,
          user: {
            userId: user.userId,
            email: user.email,
            displayName: user.displayName,
            roles: user.roles,
            tenantId: user.tenantId,
          },
        }),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Internal server error";

      if (message.includes("ConditionalCheckFailed")) {
        return errorResponse(409, "USER_EXISTS", "User already exists");
      }

      return errorResponse(500, "REGISTRATION_FAILED", message);
    }
  };
}

function validateRegisterRequest(request: RegisterRequest): string[] {
  const errors: string[] = [];

  if (!request.email || !isValidEmail(request.email)) {
    errors.push("Valid email is required");
  }
  if (!request.password || request.password.length < 8) {
    errors.push("Password must be at least 8 characters");
  }
  if (!request.tenantId) {
    errors.push("tenantId is required");
  }
  if (!request.firstName) {
    errors.push("firstName is required");
  }
  if (!request.lastName) {
    errors.push("lastName is required");
  }
  if (!request.role) {
    errors.push("role is required");
  }

  return errors;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function errorResponse(statusCode: number, code: string, message: string): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ success: false, error: { code, message } }),
  };
}

/**
 * Default handler using environment variables for configuration.
 */
export const handler = createRegisterHandler({
  cognitoClient: new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION || "ap-south-1",
  }),
  userModel: new UserModel({
    tableName: process.env.TABLE_NAME || "learning-os-main",
    region: process.env.AWS_REGION || "ap-south-1",
  }),
  tenantModel: new TenantModel({
    tableName: process.env.TABLE_NAME || "learning-os-main",
    region: process.env.AWS_REGION || "ap-south-1",
  }),
  userPoolId: process.env.USER_POOL_ID || "",
});
