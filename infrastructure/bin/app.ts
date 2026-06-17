#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { AuthStack } from "../lib/auth-stack";
import { DatabaseStack } from "../lib/database-stack";
import { ApiStack } from "../lib/api-stack";
import { StorageStack } from "../lib/storage-stack";

const app = new cdk.App();

const env = {
  account: process.env.AWS_ACCOUNT_ID || process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.AWS_REGION || "ap-south-1",
};

const stage = app.node.tryGetContext("stage") || "dev";

const authStack = new AuthStack(app, `LearningOS-Auth-${stage}`, {
  env,
  stage,
});

const databaseStack = new DatabaseStack(app, `LearningOS-Database-${stage}`, {
  env,
  stage,
});

const storageStack = new StorageStack(app, `LearningOS-Storage-${stage}`, {
  env,
  stage,
});

new ApiStack(app, `LearningOS-Api-${stage}`, {
  env,
  stage,
  userPool: authStack.userPool,
  table: databaseStack.table,
  contentBucket: storageStack.contentBucket,
});
