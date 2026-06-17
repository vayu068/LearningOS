/**
 * User model with tenant-scoped access patterns.
 * Handles profile management, role assignments, and user lookups.
 */

import type { User, UserProfile, UserRole, UserStatus } from "@learning-os/shared";
import { BaseModel, BaseItem, Keys, TableConfig, PaginatedResult, QueryOptions } from "./base";

/**
 * DynamoDB item structure for a user.
 */
export interface UserItem extends BaseItem {
  entityType: "USER";
  userId: string;
  email: string;
  displayName: string;
  roles: UserRole[];
  profile: UserProfile;
  status: UserStatus;
  cognitoUsername?: string;
}

/**
 * Parameters for creating a new user.
 */
export interface CreateUserParams {
  userId: string;
  tenantId: string;
  email: string;
  displayName: string;
  roles: UserRole[];
  profile: UserProfile;
  cognitoUsername?: string;
}

/**
 * User model class for database operations.
 */
export class UserModel extends BaseModel {
  constructor(config: TableConfig) {
    super(config);
  }

  /**
   * Creates a new user within a tenant.
   */
  async createUser(params: CreateUserParams): Promise<User> {
    const now = new Date().toISOString();

    const item: UserItem = {
      PK: Keys.tenantPK(params.tenantId),
      SK: Keys.userSK(params.userId),
      GSI1PK: Keys.entityTypePK(params.tenantId, "USER"),
      GSI1SK: `STATUS#${params.roles[0]}#${params.userId}`,
      GSI2PK: Keys.emailLookupPK(params.email),
      GSI2SK: Keys.emailLookupSK(params.tenantId),
      entityType: "USER",
      tenantId: params.tenantId,
      userId: params.userId,
      email: params.email,
      displayName: params.displayName,
      roles: params.roles,
      profile: params.profile,
      status: "active",
      cognitoUsername: params.cognitoUsername,
      createdAt: now,
      updatedAt: now,
    };

    await this.putItemIfNotExists(item);

    return this.itemToUser(item);
  }

  /**
   * Gets a user by ID within a tenant.
   */
  async getUser(tenantId: string, userId: string): Promise<User | null> {
    const item = await this.getItem<UserItem>(
      Keys.tenantPK(tenantId),
      Keys.userSK(userId)
    );

    if (!item) return null;
    return this.itemToUser(item);
  }

  /**
   * Finds a user by email (cross-tenant lookup using GSI2).
   */
  async getUserByEmail(email: string, tenantId: string): Promise<User | null> {
    const result = await this.queryGSI<UserItem>(
      "GSI2",
      "GSI2PK",
      Keys.emailLookupPK(email),
      "GSI2SK",
      Keys.emailLookupSK(tenantId)
    );

    if (result.items.length === 0) return null;
    return this.itemToUser(result.items[0]);
  }

  /**
   * Lists users in a tenant, optionally filtered by role.
   */
  async listUsers(
    tenantId: string,
    role?: UserRole,
    options?: QueryOptions
  ): Promise<PaginatedResult<User>> {
    const skPrefix = role ? `STATUS#${role}` : "STATUS#";

    const result = await this.queryGSI<UserItem>(
      "GSI1",
      "GSI1PK",
      Keys.entityTypePK(tenantId, "USER"),
      "GSI1SK",
      skPrefix,
      options
    );

    return {
      items: result.items.map((item) => this.itemToUser(item)),
      lastKey: result.lastKey,
      count: result.count,
    };
  }

  /**
   * Updates a user's profile.
   */
  async updateProfile(
    tenantId: string,
    userId: string,
    profileUpdates: Partial<UserProfile>
  ): Promise<User | null> {
    const existing = await this.getUser(tenantId, userId);
    if (!existing) return null;

    const updatedProfile = { ...existing.profile, ...profileUpdates };

    const result = await this.updateItem(
      Keys.tenantPK(tenantId),
      Keys.userSK(userId),
      { profile: updatedProfile }
    );

    return this.itemToUser(result as unknown as UserItem);
  }

  /**
   * Updates a user's roles.
   */
  async updateRoles(
    tenantId: string,
    userId: string,
    roles: UserRole[]
  ): Promise<User | null> {
    const result = await this.updateItem(
      Keys.tenantPK(tenantId),
      Keys.userSK(userId),
      { roles }
    );

    return this.itemToUser(result as unknown as UserItem);
  }

  /**
   * Updates a user's status.
   */
  async updateStatus(
    tenantId: string,
    userId: string,
    status: UserStatus
  ): Promise<User | null> {
    const result = await this.updateItem(
      Keys.tenantPK(tenantId),
      Keys.userSK(userId),
      { status }
    );

    return this.itemToUser(result as unknown as UserItem);
  }

  /**
   * Deletes a user from a tenant (soft delete by changing status).
   */
  async deactivateUser(tenantId: string, userId: string): Promise<User | null> {
    return this.updateStatus(tenantId, userId, "inactive");
  }

  /**
   * Converts a DynamoDB item to a User domain object.
   */
  private itemToUser(item: UserItem): User {
    return {
      userId: item.userId,
      tenantId: item.tenantId,
      email: item.email,
      displayName: item.displayName,
      roles: item.roles,
      profile: item.profile,
      status: item.status,
      cognitoUsername: item.cognitoUsername,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
