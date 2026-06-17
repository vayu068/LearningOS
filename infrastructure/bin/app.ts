#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { AuthStack } from "../lib/auth-stack";
import { DatabaseStack } from "../lib/database-stack";
import { ApiStack } from "../lib/api-stack";
import { StorageStack } from "../lib/storage-stack";
import { NetworkStack } from "../lib/network-stack";
import { AiStack } from "../lib/ai-stack";
import { MessagingStack } from "../lib/messaging-stack";
import { MonitoringStack } from "../lib/monitoring-stack";

const app = new cdk.App();

const env = {
  account: process.env.AWS_ACCOUNT_ID || process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.AWS_REGION || "ap-south-1",
};

const stage = app.node.tryGetContext("stage") || "dev";

// Network stack (VPC, subnets, security groups)
const networkStack = new NetworkStack(app, `LearningOS-Network-${stage}`, {
  env,
  stage,
});

// Auth stack (Cognito, identity pool, Lambda triggers)
const authStack = new AuthStack(app, `LearningOS-Auth-${stage}`, {
  env,
  stage,
});

// Database stack (DynamoDB, Aurora Serverless)
const databaseStack = new DatabaseStack(app, `LearningOS-Database-${stage}`, {
  env,
  stage,
  vpc: networkStack.vpc,
});
databaseStack.addDependency(networkStack);

// Storage stack (S3, CloudFront CDN)
const storageStack = new StorageStack(app, `LearningOS-Storage-${stage}`, {
  env,
  stage,
});

// API stack (API Gateway, WAF, Lambda integrations)
const apiStack = new ApiStack(app, `LearningOS-Api-${stage}`, {
  env,
  stage,
  userPool: authStack.userPool,
  table: databaseStack.table,
  contentBucket: storageStack.contentBucket,
});
apiStack.addDependency(authStack);
apiStack.addDependency(databaseStack);
apiStack.addDependency(storageStack);

// AI stack (SageMaker, Bedrock, Lambda layers)
const aiStack = new AiStack(app, `LearningOS-Ai-${stage}`, {
  env,
  stage,
  vpc: networkStack.vpc,
});
aiStack.addDependency(networkStack);

// Messaging stack (SQS, SNS, DLQ)
const messagingStack = new MessagingStack(app, `LearningOS-Messaging-${stage}`, {
  env,
  stage,
});

// Monitoring stack (CloudWatch, alarms, dashboards)
const monitoringStack = new MonitoringStack(app, `LearningOS-Monitoring-${stage}`, {
  env,
  stage,
});

// Tag all resources
cdk.Tags.of(app).add("Project", "LearningOS");
cdk.Tags.of(app).add("Stage", stage);
cdk.Tags.of(app).add("ManagedBy", "CDK");
