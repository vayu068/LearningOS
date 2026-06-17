/**
 * DynamoDB single-table design base model.
 * Defines the key structure, GSI definitions, and access patterns.
 *
 * Single-table design:
 * - PK: TENANT#{tenantId}
 * - SK: {EntityType}#{EntityId} (e.g., USER#userId, TENANT_CONFIG, etc.)
 *
 * GSIs:
 * - GSI1: GSI1PK/GSI1SK - For entity-type queries (e.g., all users in a tenant)
 * - GSI2: GSI2PK/GSI2SK - For lookup patterns (e.g., user by email)
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

/**
 * Base table item structure.
 */
export interface BaseItem {
  PK: string;
  SK: string;
  GSI1PK?: string;
  GSI1SK?: string;
  GSI2PK?: string;
  GSI2SK?: string;
  entityType: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  ttl?: number;
}

/**
 * Table configuration.
 */
export interface TableConfig {
  tableName: string;
  region: string;
  endpoint?: string;
}

/**
 * Query options for listing items.
 */
export interface QueryOptions {
  limit?: number;
  startKey?: Record<string, unknown>;
  scanForward?: boolean;
}

/**
 * Paginated query result.
 */
export interface PaginatedResult<T> {
  items: T[];
  lastKey?: Record<string, unknown>;
  count: number;
}

/**
 * Creates a DynamoDB Document Client instance.
 */
export function createDocClient(config: TableConfig): DynamoDBDocumentClient {
  const client = new DynamoDBClient({
    region: config.region,
    ...(config.endpoint ? { endpoint: config.endpoint } : {}),
  });

  return DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      removeUndefinedValues: true,
    },
  });
}

/**
 * Key factory functions for the single-table design.
 */
export const Keys = {
  /** Partition key for tenant-scoped items */
  tenantPK(tenantId: string): string {
    return `TENANT#${tenantId}`;
  },

  /** Sort key for tenant metadata */
  tenantMetaSK(): string {
    return "METADATA";
  },

  /** Sort key for user items */
  userSK(userId: string): string {
    return `USER#${userId}`;
  },

  /** Sort key for tenant config */
  tenantConfigSK(): string {
    return "CONFIG";
  },

  /** GSI1 partition key for querying all entities of a type within a tenant */
  entityTypePK(tenantId: string, entityType: string): string {
    return `${tenantId}#${entityType}`;
  },

  /** GSI2 partition key for email lookups */
  emailLookupPK(email: string): string {
    return `EMAIL#${email}`;
  },

  /** GSI2 sort key for email lookup pointing to tenant */
  emailLookupSK(tenantId: string): string {
    return `TENANT#${tenantId}`;
  },
};

/**
 * Base model class with common CRUD operations.
 */
export class BaseModel {
  protected docClient: DynamoDBDocumentClient;
  protected tableName: string;

  constructor(config: TableConfig) {
    this.docClient = createDocClient(config);
    this.tableName = config.tableName;
  }

  /**
   * Gets a single item by PK and SK.
   */
  protected async getItem<T extends BaseItem>(pk: string, sk: string): Promise<T | null> {
    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: pk, SK: sk },
      })
    );

    return (result.Item as T) || null;
  }

  /**
   * Puts an item into the table.
   */
  protected async putItem<T extends BaseItem>(item: T): Promise<T> {
    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      })
    );

    return item;
  }

  /**
   * Puts an item only if it does not already exist.
   */
  protected async putItemIfNotExists<T extends BaseItem>(item: T): Promise<T> {
    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
        ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
      })
    );

    return item;
  }

  /**
   * Queries items by partition key and optional sort key prefix.
   */
  protected async queryItems<T extends BaseItem>(
    pk: string,
    skPrefix?: string,
    options?: QueryOptions
  ): Promise<PaginatedResult<T>> {
    const keyCondition = skPrefix
      ? "PK = :pk AND begins_with(SK, :sk)"
      : "PK = :pk";

    const expressionValues = skPrefix
      ? { ":pk": pk, ":sk": skPrefix }
      : { ":pk": pk };

    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: keyCondition,
        ExpressionAttributeValues: expressionValues,
        ScanIndexForward: options?.scanForward ?? true,
        ...(options?.limit ? { Limit: options.limit } : {}),
        ...(options?.startKey ? { ExclusiveStartKey: options.startKey } : {}),
      })
    );

    return {
      items: (result.Items as T[]) || [],
      lastKey: result.LastEvaluatedKey as Record<string, unknown> | undefined,
      count: result.Count || 0,
    };
  }

  /**
   * Queries a GSI.
   */
  protected async queryGSI<T>(
    indexName: string,
    pkName: string,
    pkValue: string,
    skName?: string,
    skPrefix?: string,
    options?: QueryOptions
  ): Promise<PaginatedResult<T>> {
    const keyCondition = skPrefix
      ? `${pkName} = :pk AND begins_with(${skName}, :sk)`
      : `${pkName} = :pk`;

    const expressionValues = skPrefix
      ? { ":pk": pkValue, ":sk": skPrefix }
      : { ":pk": pkValue };

    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: indexName,
        KeyConditionExpression: keyCondition,
        ExpressionAttributeValues: expressionValues,
        ScanIndexForward: options?.scanForward ?? true,
        ...(options?.limit ? { Limit: options.limit } : {}),
        ...(options?.startKey ? { ExclusiveStartKey: options.startKey } : {}),
      })
    );

    return {
      items: (result.Items as T[]) || [],
      lastKey: result.LastEvaluatedKey as Record<string, unknown> | undefined,
      count: result.Count || 0,
    };
  }

  /**
   * Updates specific attributes of an item.
   */
  protected async updateItem(
    pk: string,
    sk: string,
    updates: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const updateExpressions: string[] = [];
    const expressionValues: Record<string, unknown> = {};
    const expressionNames: Record<string, string> = {};

    Object.entries(updates).forEach(([key, value], index) => {
      const attrName = `#attr${index}`;
      const attrValue = `:val${index}`;
      updateExpressions.push(`${attrName} = ${attrValue}`);
      expressionNames[attrName] = key;
      expressionValues[attrValue] = value;
    });

    // Always update the updatedAt timestamp
    updateExpressions.push("#updatedAt = :updatedAt");
    expressionNames["#updatedAt"] = "updatedAt";
    expressionValues[":updatedAt"] = new Date().toISOString();

    const result = await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { PK: pk, SK: sk },
        UpdateExpression: `SET ${updateExpressions.join(", ")}`,
        ExpressionAttributeNames: expressionNames,
        ExpressionAttributeValues: expressionValues,
        ReturnValues: "ALL_NEW",
      })
    );

    return result.Attributes as Record<string, unknown>;
  }

  /**
   * Deletes an item.
   */
  protected async deleteItem(pk: string, sk: string): Promise<void> {
    await this.docClient.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { PK: pk, SK: sk },
      })
    );
  }
}
