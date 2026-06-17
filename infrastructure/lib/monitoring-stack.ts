import * as cdk from "aws-cdk-lib";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as logs from "aws-cdk-lib/aws-logs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as actions from "aws-cdk-lib/aws-cloudwatch-actions";
import { Construct } from "constructs";

export interface MonitoringStackProps extends cdk.StackProps {
  stage: string;
}

/**
 * Monitoring Stack - CloudWatch dashboards, alarms for error rates and latency,
 * X-Ray tracing configuration, and log groups with retention policies.
 */
export class MonitoringStack extends cdk.Stack {
  public readonly alarmTopic: sns.Topic;
  public readonly dashboard: cloudwatch.Dashboard;

  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    const isProd = props.stage === "prod";

    // SNS Topic for alarm notifications
    this.alarmTopic = new sns.Topic(this, "AlarmTopic", {
      topicName: `learning-os-${props.stage}-alarms`,
      displayName: "LearningOS Monitoring Alarms",
    });

    // === Log Groups ===

    const apiLogGroup = new logs.LogGroup(this, "ApiLogGroup", {
      logGroupName: `/learning-os/${props.stage}/api`,
      retention: isProd ? logs.RetentionDays.ONE_YEAR : logs.RetentionDays.ONE_WEEK,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    const aiLogGroup = new logs.LogGroup(this, "AiLogGroup", {
      logGroupName: `/learning-os/${props.stage}/ai`,
      retention: isProd ? logs.RetentionDays.SIX_MONTHS : logs.RetentionDays.ONE_WEEK,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    const dpiLogGroup = new logs.LogGroup(this, "DpiLogGroup", {
      logGroupName: `/learning-os/${props.stage}/dpi`,
      retention: isProd ? logs.RetentionDays.TWO_YEARS : logs.RetentionDays.ONE_MONTH,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    const auditLogGroup = new logs.LogGroup(this, "AuditLogGroup", {
      logGroupName: `/learning-os/${props.stage}/audit`,
      retention: logs.RetentionDays.TWO_YEARS,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // === Metric Filters ===

    const errorMetricFilter = new logs.MetricFilter(this, "ErrorMetricFilter", {
      logGroup: apiLogGroup,
      metricNamespace: `LearningOS/${props.stage}`,
      metricName: "ApiErrors",
      filterPattern: logs.FilterPattern.literal("ERROR"),
      metricValue: "1",
    });

    const latencyMetricFilter = new logs.MetricFilter(this, "LatencyMetricFilter", {
      logGroup: apiLogGroup,
      metricNamespace: `LearningOS/${props.stage}`,
      metricName: "ApiLatency",
      filterPattern: logs.FilterPattern.exists("$.duration"),
      metricValue: "$.duration",
    });

    // === Alarms ===

    // API Error Rate Alarm
    const apiErrorAlarm = new cloudwatch.Alarm(this, "ApiErrorRateAlarm", {
      alarmName: `learning-os-${props.stage}-api-error-rate`,
      alarmDescription: "API error rate exceeds threshold",
      metric: new cloudwatch.Metric({
        namespace: `LearningOS/${props.stage}`,
        metricName: "ApiErrors",
        statistic: "Sum",
        period: cdk.Duration.minutes(5),
      }),
      threshold: isProd ? 10 : 50,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    apiErrorAlarm.addAlarmAction(new actions.SnsAction(this.alarmTopic));

    // API Latency Alarm (P95)
    const apiLatencyAlarm = new cloudwatch.Alarm(this, "ApiLatencyAlarm", {
      alarmName: `learning-os-${props.stage}-api-latency-p95`,
      alarmDescription: "API P95 latency exceeds threshold",
      metric: new cloudwatch.Metric({
        namespace: `LearningOS/${props.stage}`,
        metricName: "ApiLatency",
        statistic: "p95",
        period: cdk.Duration.minutes(5),
      }),
      threshold: isProd ? 3000 : 5000, // milliseconds
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    apiLatencyAlarm.addAlarmAction(new actions.SnsAction(this.alarmTopic));

    // DLQ Messages Alarm
    const dlqAlarm = new cloudwatch.Alarm(this, "DLQMessagesAlarm", {
      alarmName: `learning-os-${props.stage}-dlq-messages`,
      alarmDescription: "Messages appearing in Dead Letter Queues",
      metric: new cloudwatch.Metric({
        namespace: "AWS/SQS",
        metricName: "ApproximateNumberOfMessagesVisible",
        dimensionsMap: {
          QueueName: `learning-os-${props.stage}-content-generation-dlq`,
        },
        statistic: "Sum",
        period: cdk.Duration.minutes(5),
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    dlqAlarm.addAlarmAction(new actions.SnsAction(this.alarmTopic));

    // Cognito Sign-in Failures Alarm
    const authFailureAlarm = new cloudwatch.Alarm(this, "AuthFailureAlarm", {
      alarmName: `learning-os-${props.stage}-auth-failures`,
      alarmDescription: "Excessive authentication failures (possible brute force)",
      metric: new cloudwatch.Metric({
        namespace: "AWS/Cognito",
        metricName: "SignInSuccesses",
        dimensionsMap: {
          UserPool: `learning-os-${props.stage}-users`,
        },
        statistic: "Sum",
        period: cdk.Duration.minutes(5),
      }),
      threshold: 0,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // === Dashboard ===

    this.dashboard = new cloudwatch.Dashboard(this, "PlatformDashboard", {
      dashboardName: `LearningOS-${props.stage}-Overview`,
      periodOverride: cloudwatch.PeriodOverride.AUTO,
    });

    // Row 1: API Health
    this.dashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown: `# LearningOS Platform Dashboard (${props.stage})`,
        width: 24,
        height: 1,
      })
    );

    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: "API Error Rate",
        width: 8,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: `LearningOS/${props.stage}`,
            metricName: "ApiErrors",
            statistic: "Sum",
            period: cdk.Duration.minutes(5),
          }),
        ],
      }),
      new cloudwatch.GraphWidget({
        title: "API Latency (P50, P95, P99)",
        width: 8,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: `LearningOS/${props.stage}`,
            metricName: "ApiLatency",
            statistic: "p50",
            period: cdk.Duration.minutes(5),
            label: "P50",
          }),
          new cloudwatch.Metric({
            namespace: `LearningOS/${props.stage}`,
            metricName: "ApiLatency",
            statistic: "p95",
            period: cdk.Duration.minutes(5),
            label: "P95",
          }),
          new cloudwatch.Metric({
            namespace: `LearningOS/${props.stage}`,
            metricName: "ApiLatency",
            statistic: "p99",
            period: cdk.Duration.minutes(5),
            label: "P99",
          }),
        ],
      }),
      new cloudwatch.AlarmStatusWidget({
        title: "Alarm Status",
        width: 8,
        height: 6,
        alarms: [apiErrorAlarm, apiLatencyAlarm, dlqAlarm],
      })
    );

    // Row 2: DynamoDB and Queue Metrics
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: "DynamoDB Consumed Capacity",
        width: 12,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: "AWS/DynamoDB",
            metricName: "ConsumedReadCapacityUnits",
            dimensionsMap: {
              TableName: `learning-os-${props.stage}`,
            },
            statistic: "Sum",
            period: cdk.Duration.minutes(5),
            label: "Read",
          }),
          new cloudwatch.Metric({
            namespace: "AWS/DynamoDB",
            metricName: "ConsumedWriteCapacityUnits",
            dimensionsMap: {
              TableName: `learning-os-${props.stage}`,
            },
            statistic: "Sum",
            period: cdk.Duration.minutes(5),
            label: "Write",
          }),
        ],
      }),
      new cloudwatch.GraphWidget({
        title: "SQS Queue Depth",
        width: 12,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: "AWS/SQS",
            metricName: "ApproximateNumberOfMessagesVisible",
            dimensionsMap: {
              QueueName: `learning-os-${props.stage}-content-generation`,
            },
            statistic: "Sum",
            period: cdk.Duration.minutes(1),
            label: "Content Generation",
          }),
          new cloudwatch.Metric({
            namespace: "AWS/SQS",
            metricName: "ApproximateNumberOfMessagesVisible",
            dimensionsMap: {
              QueueName: `learning-os-${props.stage}-analytics`,
            },
            statistic: "Sum",
            period: cdk.Duration.minutes(1),
            label: "Analytics",
          }),
          new cloudwatch.Metric({
            namespace: "AWS/SQS",
            metricName: "ApproximateNumberOfMessagesVisible",
            dimensionsMap: {
              QueueName: `learning-os-${props.stage}-notifications`,
            },
            statistic: "Sum",
            period: cdk.Duration.minutes(1),
            label: "Notifications",
          }),
        ],
      })
    );

    // Outputs
    new cdk.CfnOutput(this, "AlarmTopicArn", {
      value: this.alarmTopic.topicArn,
      exportName: `${props.stage}-AlarmTopicArn`,
    });

    new cdk.CfnOutput(this, "DashboardName", {
      value: this.dashboard.dashboardName,
      exportName: `${props.stage}-DashboardName`,
    });

    new cdk.CfnOutput(this, "ApiLogGroupName", {
      value: apiLogGroup.logGroupName,
      exportName: `${props.stage}-ApiLogGroupName`,
    });

    new cdk.CfnOutput(this, "AuditLogGroupName", {
      value: auditLogGroup.logGroupName,
      exportName: `${props.stage}-AuditLogGroupName`,
    });
  }
}
