/**
 * User types and roles for the multi-tenant learning platform.
 */

export type UserRole =
  | "super_admin"
  | "tenant_admin"
  | "teacher"
  | "student"
  | "parent"
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
}

export interface AccessibilityPreferences {
  fontSize: "small" | "medium" | "large" | "extra-large";
  highContrast: boolean;
  screenReaderOptimized: boolean;
  reduceMotion: boolean;
}

export type UserStatus = "active" | "inactive" | "suspended" | "pending_verification";
