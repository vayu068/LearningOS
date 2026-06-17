/**
 * Multi-tenant context for request isolation.
 * Every request in the system carries a TenantContext to ensure data isolation.
 */

export interface Tenant {
  /** Unique tenant identifier */
  tenantId: string;
  /** Organization name */
  name: string;
  /** Type of institution */
  type: TenantType;
  /** Custom domain (e.g., school.learningos.in) */
  domain?: string;
  /** Tenant configuration */
  config: TenantConfig;
  /** Subscription plan/tier */
  subscriptionTier: TenantPlan;
  /** Data isolation mode */
  isolationMode: TenantIsolationMode;
  /** Account status */
  status: TenantStatus;
  /** Admin contact email */
  adminEmail: string;
  /** Timestamps */
  createdAt: string;
  updatedAt: string;
}

export type TenantType = "school" | "university" | "institute" | "government";

export type TenantStatus = "active" | "inactive" | "suspended" | "provisioning";

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
  /** AI usage quotas */
  aiQuotas?: AIQuotas;
  /** Rate limiting config */
  rateLimits?: TenantRateLimits;
}

export interface AIQuotas {
  /** Maximum AI requests per day */
  maxRequestsPerDay: number;
  /** Maximum tokens per request */
  maxTokensPerRequest: number;
  /** Allowed AI models */
  allowedModels: string[];
}

export interface TenantRateLimits {
  /** Requests per minute per user */
  requestsPerMinute: number;
  /** Requests per hour per tenant */
  requestsPerHour: number;
  /** Burst limit */
  burstLimit: number;
}

export interface TenantBranding {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  organizationDisplayName?: string;
  faviconUrl?: string;
}

export type TenantIsolationMode = "strict" | "shared" | "hybrid";

export interface TenantRegistration {
  organizationName: string;
  adminEmail: string;
  adminName: string;
  type: TenantType;
  plan: TenantPlan;
  domain?: string;
}

export type TenantPlan = "free" | "basic" | "premium" | "enterprise";

export interface TenantUser {
  /** User ID */
  userId: string;
  /** Tenant this user belongs to */
  tenantId: string;
  /** User's role within the tenant */
  role: string;
  /** When user joined the tenant */
  joinedAt: string;
  /** Whether user is currently active */
  isActive: boolean;
}

/** Default rate limits by subscription tier */
export const DEFAULT_RATE_LIMITS: Record<TenantPlan, TenantRateLimits> = {
  free: { requestsPerMinute: 30, requestsPerHour: 500, burstLimit: 10 },
  basic: { requestsPerMinute: 60, requestsPerHour: 2000, burstLimit: 20 },
  premium: { requestsPerMinute: 120, requestsPerHour: 5000, burstLimit: 50 },
  enterprise: { requestsPerMinute: 300, requestsPerHour: 20000, burstLimit: 100 },
};
