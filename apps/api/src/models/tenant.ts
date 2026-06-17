/**
 * Tenant model for DynamoDB single-table design.
 * Handles tenant CRUD operations including provisioning, configuration, and usage tracking.
 */

import type { Tenant, TenantConfig, TenantRegistration, TenantPlan } from "@learning-os/shared";
import { DEFAULT_RATE_LIMITS } from "@learning-os/shared";
import { BaseModel, BaseItem, Keys, TableConfig, PaginatedResult, QueryOptions } from "./base";

/**
 * DynamoDB item structure for a tenant.
 */
export interface TenantItem extends BaseItem {
  entityType: "TENANT";
  name: string;
  type: string;
  domain?: string;
  config: TenantConfig;
  subscriptionTier: TenantPlan;
  isolationMode: string;
  status: string;
  adminEmail: string;
  usageStats?: TenantUsageStats;
}

export interface TenantUsageStats {
  totalUsers: number;
  activeUsers: number;
  storageUsedMB: number;
  aiRequestsToday: number;
  lastActivityAt: string;
}

/**
 * Tenant model class for database operations.
 */
export class TenantModel extends BaseModel {
  constructor(config: TableConfig) {
    super(config);
  }

  /**
   * Creates a new tenant.
   */
  async createTenant(registration: TenantRegistration, tenantId: string): Promise<Tenant> {
    const now = new Date().toISOString();

    const defaultConfig: TenantConfig = {
      maxUsers: getMaxUsersForPlan(registration.plan),
      enabledFeatures: getDefaultFeaturesForPlan(registration.plan),
      dpiEnabled: true,
      aiEnabled: registration.plan !== "free",
      rateLimits: DEFAULT_RATE_LIMITS[registration.plan],
    };

    const item: TenantItem = {
      PK: Keys.tenantPK(tenantId),
      SK: Keys.tenantMetaSK(),
      GSI1PK: `TENANTS#${registration.type}`,
      GSI1SK: `STATUS#active#${tenantId}`,
      entityType: "TENANT",
      tenantId,
      name: registration.organizationName,
      type: registration.type,
      domain: registration.domain,
      config: defaultConfig,
      subscriptionTier: registration.plan,
      isolationMode: "shared",
      status: "active",
      adminEmail: registration.adminEmail,
      createdAt: now,
      updatedAt: now,
    };

    await this.putItemIfNotExists(item);

    return this.itemToTenant(item);
  }

  /**
   * Gets a tenant by ID.
   */
  async getTenant(tenantId: string): Promise<Tenant | null> {
    const item = await this.getItem<TenantItem>(
      Keys.tenantPK(tenantId),
      Keys.tenantMetaSK()
    );

    if (!item) return null;
    return this.itemToTenant(item);
  }

  /**
   * Updates tenant configuration.
   */
  async updateTenantConfig(
    tenantId: string,
    configUpdates: Partial<TenantConfig>
  ): Promise<Tenant | null> {
    const existing = await this.getTenant(tenantId);
    if (!existing) return null;

    const updatedConfig = { ...existing.config, ...configUpdates };

    const result = await this.updateItem(
      Keys.tenantPK(tenantId),
      Keys.tenantMetaSK(),
      { config: updatedConfig }
    );

    return this.itemToTenant(result as unknown as TenantItem);
  }

  /**
   * Updates tenant subscription tier.
   */
  async updateSubscription(tenantId: string, newPlan: TenantPlan): Promise<Tenant | null> {
    const existing = await this.getTenant(tenantId);
    if (!existing) return null;

    const updatedConfig: TenantConfig = {
      ...existing.config,
      maxUsers: getMaxUsersForPlan(newPlan),
      aiEnabled: newPlan !== "free",
      rateLimits: DEFAULT_RATE_LIMITS[newPlan],
    };

    const result = await this.updateItem(
      Keys.tenantPK(tenantId),
      Keys.tenantMetaSK(),
      { subscriptionTier: newPlan, config: updatedConfig }
    );

    return this.itemToTenant(result as unknown as TenantItem);
  }

  /**
   * Updates tenant status (activate, suspend, deactivate).
   */
  async updateTenantStatus(
    tenantId: string,
    status: "active" | "inactive" | "suspended"
  ): Promise<Tenant | null> {
    const result = await this.updateItem(
      Keys.tenantPK(tenantId),
      Keys.tenantMetaSK(),
      { status }
    );

    return this.itemToTenant(result as unknown as TenantItem);
  }

  /**
   * Updates usage statistics for a tenant.
   */
  async updateUsageStats(tenantId: string, stats: Partial<TenantUsageStats>): Promise<void> {
    await this.updateItem(
      Keys.tenantPK(tenantId),
      Keys.tenantMetaSK(),
      { usageStats: stats }
    );
  }

  /**
   * Lists all tenants of a given type.
   */
  async listTenantsByType(
    type: string,
    options?: QueryOptions
  ): Promise<PaginatedResult<Tenant>> {
    const result = await this.queryGSI<TenantItem>(
      "GSI1",
      "GSI1PK",
      `TENANTS#${type}`,
      "GSI1SK",
      "STATUS#active",
      options
    );

    return {
      items: result.items.map((item) => this.itemToTenant(item)),
      lastKey: result.lastKey,
      count: result.count,
    };
  }

  /**
   * Converts a DynamoDB item to a Tenant domain object.
   */
  private itemToTenant(item: TenantItem): Tenant {
    return {
      tenantId: item.tenantId,
      name: item.name,
      type: item.type as Tenant["type"],
      domain: item.domain,
      config: item.config,
      subscriptionTier: item.subscriptionTier,
      isolationMode: item.isolationMode as Tenant["isolationMode"],
      status: item.status as Tenant["status"],
      adminEmail: item.adminEmail,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}

/**
 * Gets the max users allowed for a subscription plan.
 */
function getMaxUsersForPlan(plan: TenantPlan): number {
  switch (plan) {
    case "free":
      return 50;
    case "basic":
      return 500;
    case "premium":
      return 5000;
    case "enterprise":
      return 100000;
    default:
      return 50;
  }
}

/**
 * Gets the default features enabled for a subscription plan.
 */
function getDefaultFeaturesForPlan(plan: TenantPlan): string[] {
  const base = ["core_learning", "assessments", "progress_tracking"];

  switch (plan) {
    case "free":
      return base;
    case "basic":
      return [...base, "dpi_integration", "reports"];
    case "premium":
      return [...base, "dpi_integration", "reports", "ai_tutor", "analytics"];
    case "enterprise":
      return [
        ...base,
        "dpi_integration",
        "reports",
        "ai_tutor",
        "analytics",
        "custom_branding",
        "api_access",
        "sso",
      ];
    default:
      return base;
  }
}
