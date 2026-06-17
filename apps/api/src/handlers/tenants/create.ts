/**
 * Tenant onboarding Lambda handler.
 * Provisions new tenant (school/university), sets up configuration, initializes Cognito group.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  CreateGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { v4 as uuidv4 } from "uuid";
import type { TenantRegistration } from "@learning-os/shared";
import { TenantModel } from "../../models/tenant";

/**
 * Dependencies that can be injected for testing.
 */
export interface CreateTenantDependencies {
  cognitoClient: CognitoIdentityProviderClient;
  tenantModel: TenantModel;
  userPoolId: string;
}

/**
 * Creates the handler with injected dependencies.
 */
export function createTenantHandler(deps: CreateTenantDependencies) {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      if (!event.body) {
        return errorResponse(400, "INVALID_REQUEST", "Request body is required");
      }

      const request: TenantRegistration = JSON.parse(event.body);

      // Validate request
      const validationErrors = validateCreateTenantRequest(request);
      if (validationErrors.length > 0) {
        return errorResponse(400, "VALIDATION_ERROR", validationErrors.join("; "));
      }

      // Generate tenant ID
      const tenantId = uuidv4();

      // Create Cognito group for the tenant
      await deps.cognitoClient.send(
        new CreateGroupCommand({
          UserPoolId: deps.userPoolId,
          GroupName: `tenant_${tenantId}`,
          Description: `Group for ${request.organizationName}`,
        })
      );

      // Create tenant in DynamoDB
      const tenant = await deps.tenantModel.createTenant(request, tenantId);

      return {
        statusCode: 201,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          success: true,
          tenant: {
            tenantId: tenant.tenantId,
            name: tenant.name,
            type: tenant.type,
            status: tenant.status,
            subscriptionTier: tenant.subscriptionTier,
            config: tenant.config,
            createdAt: tenant.createdAt,
          },
        }),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Tenant creation failed";

      if (message.includes("ConditionalCheckFailed")) {
        return errorResponse(409, "TENANT_EXISTS", "A tenant with this ID already exists");
      }

      return errorResponse(500, "CREATION_FAILED", message);
    }
  };
}

function validateCreateTenantRequest(request: TenantRegistration): string[] {
  const errors: string[] = [];

  if (!request.organizationName || request.organizationName.length < 2) {
    errors.push("organizationName must be at least 2 characters");
  }
  if (!request.adminEmail || !isValidEmail(request.adminEmail)) {
    errors.push("Valid adminEmail is required");
  }
  if (!request.adminName) {
    errors.push("adminName is required");
  }
  if (!request.type || !["school", "university", "institute", "government"].includes(request.type)) {
    errors.push("type must be one of: school, university, institute, government");
  }
  if (!request.plan || !["free", "basic", "premium", "enterprise"].includes(request.plan)) {
    errors.push("plan must be one of: free, basic, premium, enterprise");
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
 * Default handler using environment variables.
 */
export const handler = createTenantHandler({
  cognitoClient: new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION || "ap-south-1",
  }),
  tenantModel: new TenantModel({
    tableName: process.env.TABLE_NAME || "learning-os-main",
    region: process.env.AWS_REGION || "ap-south-1",
  }),
  userPoolId: process.env.USER_POOL_ID || "",
});
