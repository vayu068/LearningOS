/**
 * Tenant management Lambda handler.
 * Update config, manage subscription, view usage analytics.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { TenantConfig, TenantPlan } from "@learning-os/shared";
import { TenantModel } from "../../models/tenant";

/**
 * Dependencies that can be injected for testing.
 */
export interface ManageTenantDependencies {
  tenantModel: TenantModel;
}

/**
 * Supported management actions.
 */
type ManageAction = "updateConfig" | "updateSubscription" | "updateStatus" | "getUsage";

interface ManageRequest {
  action: ManageAction;
  tenantId: string;
  config?: Partial<TenantConfig>;
  subscriptionTier?: TenantPlan;
  status?: "active" | "inactive" | "suspended";
}

/**
 * Creates the handler with injected dependencies.
 */
export function createManageTenantHandler(deps: ManageTenantDependencies) {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      if (!event.body) {
        return errorResponse(400, "INVALID_REQUEST", "Request body is required");
      }

      const request: ManageRequest = JSON.parse(event.body);

      // Validate base request
      if (!request.action) {
        return errorResponse(400, "VALIDATION_ERROR", "action is required");
      }
      if (!request.tenantId) {
        return errorResponse(400, "VALIDATION_ERROR", "tenantId is required");
      }

      // Verify tenant exists
      const existingTenant = await deps.tenantModel.getTenant(request.tenantId);
      if (!existingTenant) {
        return errorResponse(404, "TENANT_NOT_FOUND", "Tenant not found");
      }

      switch (request.action) {
        case "updateConfig": {
          if (!request.config) {
            return errorResponse(400, "VALIDATION_ERROR", "config is required for updateConfig action");
          }

          const updated = await deps.tenantModel.updateTenantConfig(request.tenantId, request.config);
          return successResponse(200, { tenant: updated });
        }

        case "updateSubscription": {
          if (!request.subscriptionTier) {
            return errorResponse(
              400,
              "VALIDATION_ERROR",
              "subscriptionTier is required for updateSubscription action"
            );
          }

          const validPlans: TenantPlan[] = ["free", "basic", "premium", "enterprise"];
          if (!validPlans.includes(request.subscriptionTier)) {
            return errorResponse(400, "VALIDATION_ERROR", "Invalid subscription tier");
          }

          const updated = await deps.tenantModel.updateSubscription(
            request.tenantId,
            request.subscriptionTier
          );
          return successResponse(200, { tenant: updated });
        }

        case "updateStatus": {
          if (!request.status) {
            return errorResponse(400, "VALIDATION_ERROR", "status is required for updateStatus action");
          }

          const validStatuses = ["active", "inactive", "suspended"];
          if (!validStatuses.includes(request.status)) {
            return errorResponse(400, "VALIDATION_ERROR", "Invalid status");
          }

          const updated = await deps.tenantModel.updateTenantStatus(
            request.tenantId,
            request.status
          );
          return successResponse(200, { tenant: updated });
        }

        case "getUsage": {
          return successResponse(200, {
            tenant: {
              tenantId: existingTenant.tenantId,
              name: existingTenant.name,
              subscriptionTier: existingTenant.subscriptionTier,
              config: existingTenant.config,
            },
          });
        }

        default:
          return errorResponse(400, "INVALID_ACTION", `Unknown action: ${request.action}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return errorResponse(500, "MANAGEMENT_ERROR", message);
    }
  };
}

function successResponse(statusCode: number, body: Record<string, unknown>): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ success: true, ...body }),
  };
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
export const handler = createManageTenantHandler({
  tenantModel: new TenantModel({
    tableName: process.env.TABLE_NAME || "learning-os-main",
    region: process.env.AWS_REGION || "ap-south-1",
  }),
});
