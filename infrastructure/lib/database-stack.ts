import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as rds from "aws-cdk-lib/aws-rds";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

export interface DatabaseStackProps extends cdk.StackProps {
  stage: string;
  vpc?: ec2.IVpc;
}

export class DatabaseStack extends cdk.Stack {
  public readonly table: dynamodb.Table;
  public readonly analyticsCluster?: rds.IDatabaseCluster;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    // Single-table design for multi-tenant data
    this.table = new dynamodb.Table(this, "MainTable", {
      tableName: `learning-os-${props.stage}`,
      partitionKey: {
        name: "PK",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "SK",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy:
        props.stage === "prod" ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
      timeToLiveAttribute: "TTL",
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // GSI1: Tenant-scoped queries (e.g., all users in a tenant)
    this.table.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: {
        name: "GSI1PK",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "GSI1SK",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI2: Entity-type queries across tenants (admin/analytics use)
    this.table.addGlobalSecondaryIndex({
      indexName: "GSI2",
      partitionKey: {
        name: "GSI2PK",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "GSI2SK",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI3: Inverted index for relationship queries
    this.table.addGlobalSecondaryIndex({
      indexName: "GSI3",
      partitionKey: {
        name: "SK",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "PK",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI4: Status-based queries (e.g., pending assessments)
    this.table.addGlobalSecondaryIndex({
      indexName: "GSI4",
      partitionKey: {
        name: "GSI4PK",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "GSI4SK",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.KEYS_ONLY,
    });

    // GSI5: Date-based queries for audit logs and events
    this.table.addGlobalSecondaryIndex({
      indexName: "GSI5",
      partitionKey: {
        name: "GSI5PK",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "GSI5SK",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Auto-scaling for provisioned mode in production
    if (props.stage === "prod") {
      const readScaling = this.table.autoScaleReadCapacity({
        minCapacity: 5,
        maxCapacity: 1000,
      });
      readScaling.scaleOnUtilization({
        targetUtilizationPercent: 70,
      });

      const writeScaling = this.table.autoScaleWriteCapacity({
        minCapacity: 5,
        maxCapacity: 500,
      });
      writeScaling.scaleOnUtilization({
        targetUtilizationPercent: 70,
      });
    }

    // Aurora Serverless v2 for analytics queries (production only)
    if (props.stage === "prod" && props.vpc) {
      const dbSecurityGroup = new ec2.SecurityGroup(this, "AnalyticsDbSG", {
        vpc: props.vpc,
        description: "Security group for Aurora analytics database",
        allowAllOutbound: false,
      });

      this.analyticsCluster = new rds.DatabaseCluster(this, "AnalyticsCluster", {
        engine: rds.DatabaseClusterEngine.auroraPostgres({
          version: rds.AuroraPostgresEngineVersion.VER_15_4,
        }),
        serverlessV2MinCapacity: 0.5,
        serverlessV2MaxCapacity: 8,
        writer: rds.ClusterInstance.serverlessV2("Writer", {
          publiclyAccessible: false,
        }),
        readers: [
          rds.ClusterInstance.serverlessV2("Reader", {
            scaleWithWriter: true,
          }),
        ],
        vpc: props.vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
        securityGroups: [dbSecurityGroup],
        defaultDatabaseName: "learning_os_analytics",
        storageEncrypted: true,
        backup: {
          retention: cdk.Duration.days(14),
        },
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      });

      new cdk.CfnOutput(this, "AnalyticsClusterEndpoint", {
        value: this.analyticsCluster.clusterEndpoint.hostname,
        exportName: `${props.stage}-AnalyticsClusterEndpoint`,
      });
    }

    // Outputs
    new cdk.CfnOutput(this, "TableName", {
      value: this.table.tableName,
      exportName: `${props.stage}-TableName`,
    });

    new cdk.CfnOutput(this, "TableArn", {
      value: this.table.tableArn,
      exportName: `${props.stage}-TableArn`,
    });

    new cdk.CfnOutput(this, "TableStreamArn", {
      value: this.table.tableStreamArn || "",
      exportName: `${props.stage}-TableStreamArn`,
    });
  }
}
