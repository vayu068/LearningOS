/**
 * User types and roles for the multi-tenant learning platform.
 */

export type UserRole =
  | "super_admin"
  | "tenant_admin"
  | "teacher"
  | "student"
  | "parent"
  | "principal"
  | "governance"
  | "content_creator"
  | "counselor";

export interface User {
  /** Unique user identifier */
  userId: string;
  /** Tenant this user belongs to */
  tenantId: string;
  /** User's email address */
  email: string;
  /** Display name */
  displayName: string;
  /** Assigned roles */
  roles: UserRole[];
  /** User profile */
  profile: UserProfile;
  /** Account status */
  status: UserStatus;
  /** Cognito username */
  cognitoUsername?: string;
  /** Timestamps */
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  grade?: string;
  institution?: string;
  /** APAAR ID for DPI integration */
  apaarId?: string;
  /** Preferred language */
  preferredLanguage: string;
  /** Accessibility preferences */
  accessibility?: AccessibilityPreferences;
  /** Phone number */
  phoneNumber?: string;
  /** Address */
  address?: UserAddress;
}

export interface UserAddress {
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country: string;
}

export interface AccessibilityPreferences {
  fontSize: "small" | "medium" | "large" | "extra-large";
  highContrast: boolean;
  screenReaderOptimized: boolean;
  reduceMotion: boolean;
}

export type UserStatus = "active" | "inactive" | "suspended" | "pending_verification";

/**
 * User permissions with role-based access control (RBAC).
 */
export interface UserPermissions {
  userId: string;
  tenantId: string;
  roles: UserRole[];
  permissions: RolePermission[];
}

export interface RolePermission {
  resource: string;
  actions: PermissionAction[];
  conditions?: PermissionCondition[];
}

export type PermissionAction = "create" | "read" | "update" | "delete" | "execute" | "manage";

export interface PermissionCondition {
  field: string;
  operator: "equals" | "not_equals" | "contains" | "in" | "starts_with";
  value: string | string[];
}

/** Default permissions by role */
export const ROLE_PERMISSIONS: Record<UserRole, RolePermission[]> = {
  super_admin: [
    { resource: "*", actions: ["create", "read", "update", "delete", "execute", "manage"] },
  ],
  tenant_admin: [
    { resource: "tenant:*", actions: ["read", "update", "manage"] },
    { resource: "users:*", actions: ["create", "read", "update", "delete", "manage"] },
    { resource: "content:*", actions: ["create", "read", "update", "delete"] },
    { resource: "analytics:*", actions: ["read"] },
  ],
  principal: [
    { resource: "users:*", actions: ["read", "update"] },
    { resource: "content:*", actions: ["read", "update"] },
    { resource: "analytics:*", actions: ["read"] },
    { resource: "reports:*", actions: ["read", "create"] },
  ],
  governance: [
    { resource: "analytics:*", actions: ["read"] },
    { resource: "reports:*", actions: ["read"] },
    { resource: "compliance:*", actions: ["read", "manage"] },
  ],
  teacher: [
    { resource: "content:own", actions: ["create", "read", "update", "delete"] },
    { resource: "students:own", actions: ["read", "update"] },
    { resource: "assessments:own", actions: ["create", "read", "update", "delete"] },
    { resource: "analytics:own", actions: ["read"] },
  ],
  student: [
    { resource: "content:assigned", actions: ["read"] },
    { resource: "assessments:own", actions: ["read", "execute"] },
    { resource: "profile:own", actions: ["read", "update"] },
    { resource: "progress:own", actions: ["read"] },
  ],
  parent: [
    { resource: "students:children", actions: ["read"] },
    { resource: "progress:children", actions: ["read"] },
    { resource: "reports:children", actions: ["read"] },
  ],
  content_creator: [
    { resource: "content:own", actions: ["create", "read", "update", "delete"] },
    { resource: "media:own", actions: ["create", "read", "update", "delete"] },
  ],
  counselor: [
    { resource: "students:assigned", actions: ["read"] },
    { resource: "sessions:own", actions: ["create", "read", "update"] },
    { resource: "notes:own", actions: ["create", "read", "update", "delete"] },
  ],
};
