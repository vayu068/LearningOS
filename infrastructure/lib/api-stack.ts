import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export interface ApiStackProps extends cdk.StackProps {
  stage: string;
  userPool: cognito.UserPool;
  table: dynamodb.Table;
  contentBucket: s3.Bucket;
}

/**
 * API Stack - placeholder for API Gateway and Lambda functions.
 * The actual Lambda functions are deployed via Serverless Framework (apps/api),
 * but this stack provides shared API infrastructure.
 */
export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    // Placeholder: API Gateway, Lambda layers, and shared resources
    // will be added as features are implemented.

    new cdk.CfnOutput(this, "Stage", {
      value: props.stage,
    });
  }
}
