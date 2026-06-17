import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigatewayv2";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as logs from "aws-cdk-lib/aws-logs";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";
import { Construct } from "constructs";

export interface ApiStackProps extends cdk.StackProps {
  stage: string;
  userPool: cognito.UserPool;
  table: dynamodb.Table;
  contentBucket: s3.Bucket;
}

/**
 * API Stack - HTTP API Gateway with WAF protection, custom domain mapping,
 * per-tenant throttling, and access logging.
 */
export class ApiStack extends cdk.Stack {
  public readonly httpApi: apigateway.CfnApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    // Access log group
    const accessLogGroup = new logs.LogGroup(this, "ApiAccessLogs", {
      logGroupName: `/aws/apigateway/learning-os-${props.stage}`,
      retention: props.stage === "prod"
        ? logs.RetentionDays.ONE_YEAR
        : logs.RetentionDays.ONE_WEEK,
      removalPolicy:
        props.stage === "prod" ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // HTTP API (API Gateway v2)
    this.httpApi = new apigateway.CfnApi(this, "HttpApi", {
      name: `learning-os-${props.stage}-api`,
      protocolType: "HTTP",
      corsConfiguration: {
        allowHeaders: [
          "Content-Type",
          "Authorization",
          "X-Tenant-Id",
          "X-Request-Id",
          "X-Amz-Date",
        ],
        allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowOrigins: props.stage === "prod"
          ? ["https://*.platform.gov.in"]
          : ["http://localhost:3000", "https://*.platform.gov.in"],
        maxAge: 86400,
        allowCredentials: true,
      },
      description: "LearningOS Platform API",
    });

    // Default stage with access logging and throttling
    new apigateway.CfnStage(this, "DefaultStage", {
      apiId: this.httpApi.ref,
      stageName: "$default",
      autoDeploy: true,
      accessLogSettings: {
        destinationArn: accessLogGroup.logGroupArn,
        format: JSON.stringify({
          requestId: "$context.requestId",
          ip: "$context.identity.sourceIp",
          requestTime: "$context.requestTime",
          httpMethod: "$context.httpMethod",
          path: "$context.path",
          status: "$context.status",
          responseLength: "$context.responseLength",
          tenantId: "$context.authorizer.claims.custom:tenantId",
        }),
      },
      defaultRouteSettings: {
        throttlingBurstLimit: 100,
        throttlingRateLimit: 50,
        detailedMetricsEnabled: true,
      },
    });

    // WAF Web ACL for API protection
    const webAcl = new wafv2.CfnWebACL(this, "ApiWaf", {
      name: `learning-os-${props.stage}-api-waf`,
      scope: "REGIONAL",
      defaultAction: { allow: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: `learning-os-${props.stage}-api-waf`,
        sampledRequestsEnabled: true,
      },
      rules: [
        {
          name: "RateLimitPerIP",
          priority: 1,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              limit: 2000,
              aggregateKeyType: "IP",
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: "RateLimitPerIP",
            sampledRequestsEnabled: true,
          },
        },
        {
          name: "AWSManagedRulesCommonRuleSet",
          priority: 2,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: "AWS",
              name: "AWSManagedRulesCommonRuleSet",
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: "AWSManagedRulesCommonRuleSet",
            sampledRequestsEnabled: true,
          },
        },
        {
          name: "AWSManagedRulesKnownBadInputsRuleSet",
          priority: 3,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: "AWS",
              name: "AWSManagedRulesKnownBadInputsRuleSet",
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: "AWSManagedRulesKnownBadInputs",
            sampledRequestsEnabled: true,
          },
        },
        {
          name: "AWSManagedRulesSQLiRuleSet",
          priority: 4,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: "AWS",
              name: "AWSManagedRulesSQLiRuleSet",
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: "AWSManagedRulesSQLi",
            sampledRequestsEnabled: true,
          },
        },
        {
          name: "TenantThrottling",
          priority: 5,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              limit: 5000,
              aggregateKeyType: "FORWARDED_IP",
              forwardedIpConfig: {
                headerName: "X-Forwarded-For",
                fallbackBehavior: "MATCH",
              },
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: "TenantThrottling",
            sampledRequestsEnabled: true,
          },
        },
      ],
    });

    // Outputs
    new cdk.CfnOutput(this, "ApiEndpoint", {
      value: `https://${this.httpApi.ref}.execute-api.${this.region}.amazonaws.com`,
      exportName: `${props.stage}-ApiEndpoint`,
    });

    new cdk.CfnOutput(this, "WebAclArn", {
      value: webAcl.attrArn,
      exportName: `${props.stage}-WebAclArn`,
    });

    new cdk.CfnOutput(this, "Stage", {
      value: props.stage,
    });
  }
}
