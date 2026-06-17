/**
 * Multi-tenant context for request isolation.
 * Every request in the system carries a TenantContext to ensure data isolation.
 */
export interface TenantContext {
  /** Unique tenant identifier */
  tenantId: string;
  /** Organization name */
  organizationName: string;
  /** Tenant-specific configuration */
  config: TenantConfig;
  /** Isolation mode for data access */
  isolationMode: TenantIsolationMode;
}

export interface TenantConfig {
  /** Maximum number of users allowed */
  maxUsers: number;
  /** Enabled features for this tenant */
  enabledFeatures: string[];
  /** Custom branding */
  branding?: TenantBranding;
  /** DPI integration settings */
  dpiEnabled: boolean;
  /** AI features enabled */
  aiEnabled: boolean;
}

export interface TenantBranding {
  logoUrl?: string;
  primaryColor?: string;
  organizationDisplayName?: string;
}

export type TenantIsolationMode = "strict" | "shared" | "hybrid";

export interface TenantRegistration {
  organizationName: string;
  adminEmail: string;
  adminName: string;
  plan: TenantPlan;
}

export type TenantPlan = "free" | "basic" | "premium" | "enterprise";
