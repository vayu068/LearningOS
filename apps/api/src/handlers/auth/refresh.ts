/**
 * Token refresh Lambda handler.
 * Refreshes tokens with session validation.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  AdminInitiateAuthCommand,
  AuthFlowType,
} from "@aws-sdk/client-cognito-identity-provider";
import type { RefreshTokenRequest, AuthResponse } from "@learning-os/shared";
import { TenantModel } from "../../models/tenant";

/**
 * Dependencies that can be injected for testing.
 */
export interface RefreshDependencies {
  cognitoClient: CognitoIdentityProviderClient;
  tenantModel: TenantModel;
  userPoolId: string;
  clientId: string;
}

/**
 * Creates the handler with injected dependencies.
 */
export function createRefreshHandler(deps: RefreshDependencies) {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      if (!event.body) {
        return errorResponse(400, "INVALID_REQUEST", "Request body is required");
      }

      const request: RefreshTokenRequest = JSON.parse(event.body);

      // Validate request
      if (!request.refreshToken) {
        return errorResponse(400, "VALIDATION_ERROR", "refreshToken is required");
      }
      if (!request.tenantId) {
        return errorResponse(400, "VALIDATION_ERROR", "tenantId is required");
      }

      // Verify tenant is still active
      const tenant = await deps.tenantModel.getTenant(request.tenantId);
      if (!tenant) {
        return errorResponse(404, "INVALID_TENANT", "Tenant not found");
      }
      if (tenant.status !== "active") {
        return errorResponse(403, "TENANT_DISABLED", "Tenant is not active");
      }

      // Refresh tokens via Cognito
      const authResult = await deps.cognitoClient.send(
        new AdminInitiateAuthCommand({
          UserPoolId: deps.userPoolId,
          ClientId: deps.clientId,
          AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
          AuthParameters: {
            REFRESH_TOKEN: request.refreshToken,
          },
        })
      );

      if (!authResult.AuthenticationResult) {
        return errorResponse(401, "REFRESH_FAILED", "Token refresh failed");
      }

      const { AccessToken, IdToken, ExpiresIn } = authResult.AuthenticationResult;

      const response: AuthResponse = {
        success: true,
        tokens: {
          accessToken: AccessToken || "",
          // Refresh token is not returned on refresh - use existing one
          refreshToken: request.refreshToken,
          idToken: IdToken || "",
          expiresIn: ExpiresIn || 3600,
          tokenType: "Bearer",
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
      const message = error instanceof Error ? error.message : "Token refresh failed";

      if (message.includes("NotAuthorizedException")) {
        return errorResponse(401, "REFRESH_FAILED", "Refresh token is invalid or expired");
      }

      return errorResponse(500, "REFRESH_FAILED", message);
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
export const handler = createRefreshHandler({
  cognitoClient: new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION || "ap-south-1",
  }),
  tenantModel: new TenantModel({
    tableName: process.env.TABLE_NAME || "learning-os-main",
    region: process.env.AWS_REGION || "ap-south-1",
  }),
  userPoolId: process.env.USER_POOL_ID || "",
  clientId: process.env.CLIENT_ID || "",
});
