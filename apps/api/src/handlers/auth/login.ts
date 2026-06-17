/**
 * Authentication Lambda handler.
 * Authenticates against Cognito, returns JWT with tenant claims, logs session.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  AdminInitiateAuthCommand,
  AuthFlowType,
} from "@aws-sdk/client-cognito-identity-provider";
import type { AuthRequest, AuthResponse } from "@learning-os/shared";
import { UserModel } from "../../models/user";
import { TenantModel } from "../../models/tenant";

/**
 * Dependencies that can be injected for testing.
 */
export interface LoginDependencies {
  cognitoClient: CognitoIdentityProviderClient;
  userModel: UserModel;
  tenantModel: TenantModel;
  userPoolId: string;
  clientId: string;
}

/**
 * Creates the handler with injected dependencies.
 */
export function createLoginHandler(deps: LoginDependencies) {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      if (!event.body) {
        return errorResponse(400, "INVALID_REQUEST", "Request body is required");
      }

      const request: AuthRequest = JSON.parse(event.body);

      // Validate request
      if (!request.email || !request.password) {
        return errorResponse(400, "VALIDATION_ERROR", "Email and password are required");
      }
      if (!request.tenantId) {
        return errorResponse(400, "VALIDATION_ERROR", "tenantId is required");
      }

      // Verify tenant exists and is active
      const tenant = await deps.tenantModel.getTenant(request.tenantId);
      if (!tenant) {
        return errorResponse(404, "INVALID_TENANT", "Tenant not found");
      }
      if (tenant.status !== "active") {
        return errorResponse(403, "TENANT_DISABLED", "Tenant is not active");
      }

      // Look up user in DynamoDB to get the Cognito username
      const user = await deps.userModel.getUserByEmail(request.email, request.tenantId);
      if (!user) {
        return errorResponse(401, "INVALID_CREDENTIALS", "Invalid email or password");
      }

      if (user.status === "suspended") {
        return errorResponse(403, "ACCOUNT_LOCKED", "Account has been suspended");
      }

      if (user.status === "pending_verification") {
        return errorResponse(403, "ACCOUNT_NOT_VERIFIED", "Account is pending verification");
      }

      // Authenticate with Cognito
      const cognitoUsername = user.cognitoUsername || `${request.tenantId}_${user.userId}`;

      const authResult = await deps.cognitoClient.send(
        new AdminInitiateAuthCommand({
          UserPoolId: deps.userPoolId,
          ClientId: deps.clientId,
          AuthFlow: AuthFlowType.ADMIN_USER_PASSWORD_AUTH,
          AuthParameters: {
            USERNAME: cognitoUsername,
            PASSWORD: request.password,
          },
        })
      );

      if (!authResult.AuthenticationResult) {
        // MFA challenge or other auth flow required
        if (authResult.ChallengeName) {
          return errorResponse(401, "MFA_REQUIRED", "Additional authentication step required");
        }
        return errorResponse(401, "INVALID_CREDENTIALS", "Authentication failed");
      }

      const { AccessToken, RefreshToken, IdToken, ExpiresIn } = authResult.AuthenticationResult;

      const response: AuthResponse = {
        success: true,
        tokens: {
          accessToken: AccessToken || "",
          refreshToken: RefreshToken || "",
          idToken: IdToken || "",
          expiresIn: ExpiresIn || 3600,
          tokenType: "Bearer",
        },
        user: {
          userId: user.userId,
          email: user.email,
          displayName: user.displayName,
          roles: user.roles,
        },
      };

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify(response),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Authentication failed";

      if (message.includes("NotAuthorizedException") || message.includes("UserNotFoundException")) {
        return errorResponse(401, "INVALID_CREDENTIALS", "Invalid email or password");
      }

      return errorResponse(500, "AUTH_ERROR", message);
    }
  };
}

function errorResponse(statusCode: number, code: string, message: string): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({
      success: false,
      error: { code, message },
    }),
  };
}

/**
 * Default handler using environment variables.
 */
export const handler = createLoginHandler({
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
  clientId: process.env.CLIENT_ID || "",
});
