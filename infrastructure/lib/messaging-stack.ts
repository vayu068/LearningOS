import * as cdk from "aws-cdk-lib";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import { Construct } from "constructs";

export interface MessagingStackProps extends cdk.StackProps {
  stage: string;
}

/**
 * Messaging Stack - SQS queues for async processing, SNS topics for event fan-out,
 * and DLQ configuration for failure handling.
 */
export class MessagingStack extends cdk.Stack {
  public readonly contentGenerationQueue: sqs.Queue;
  public readonly analyticsQueue: sqs.Queue;
  public readonly notificationQueue: sqs.Queue;
  public readonly dpiProcessingQueue: sqs.Queue;
  public readonly platformEventsTopic: sns.Topic;
  public readonly userEventsTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: MessagingStackProps) {
    super(scope, id, props);

    // === Dead Letter Queues ===

    const contentGenerationDLQ = new sqs.Queue(this, "ContentGenerationDLQ", {
      queueName: `learning-os-${props.stage}-content-generation-dlq`,
      retentionPeriod: cdk.Duration.days(14),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
    });

    const analyticsDLQ = new sqs.Queue(this, "AnalyticsDLQ", {
      queueName: `learning-os-${props.stage}-analytics-dlq`,
      retentionPeriod: cdk.Duration.days(14),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
    });

    const notificationDLQ = new sqs.Queue(this, "NotificationDLQ", {
      queueName: `learning-os-${props.stage}-notification-dlq`,
      retentionPeriod: cdk.Duration.days(14),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
    });

    const dpiProcessingDLQ = new sqs.Queue(this, "DpiProcessingDLQ", {
      queueName: `learning-os-${props.stage}-dpi-processing-dlq`,
      retentionPeriod: cdk.Duration.days(14),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
    });

    // === Processing Queues ===

    // Content generation queue (AI-powered content creation)
    this.contentGenerationQueue = new sqs.Queue(this, "ContentGenerationQueue", {
      queueName: `learning-os-${props.stage}-content-generation`,
      visibilityTimeout: cdk.Duration.minutes(5),
      retentionPeriod: cdk.Duration.days(7),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
      deadLetterQueue: {
        queue: contentGenerationDLQ,
        maxReceiveCount: 3,
      },
    });

    // Analytics processing queue (event aggregation, reporting)
    this.analyticsQueue = new sqs.Queue(this, "AnalyticsQueue", {
      queueName: `learning-os-${props.stage}-analytics`,
      visibilityTimeout: cdk.Duration.minutes(2),
      retentionPeriod: cdk.Duration.days(7),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
      deadLetterQueue: {
        queue: analyticsDLQ,
        maxReceiveCount: 5,
      },
    });

    // Notification delivery queue (email, SMS, push)
    this.notificationQueue = new sqs.Queue(this, "NotificationQueue", {
      queueName: `learning-os-${props.stage}-notifications`,
      visibilityTimeout: cdk.Duration.seconds(30),
      retentionPeriod: cdk.Duration.days(3),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
      deadLetterQueue: {
        queue: notificationDLQ,
        maxReceiveCount: 3,
      },
    });

    // DPI processing queue (APAAR, DigiLocker, ABC integrations)
    this.dpiProcessingQueue = new sqs.Queue(this, "DpiProcessingQueue", {
      queueName: `learning-os-${props.stage}-dpi-processing`,
      visibilityTimeout: cdk.Duration.minutes(3),
      retentionPeriod: cdk.Duration.days(7),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
      deadLetterQueue: {
        queue: dpiProcessingDLQ,
        maxReceiveCount: 3,
      },
    });

    // === SNS Topics ===

    // Platform-wide events (system events, admin notifications)
    this.platformEventsTopic = new sns.Topic(this, "PlatformEventsTopic", {
      topicName: `learning-os-${props.stage}-platform-events`,
      displayName: "LearningOS Platform Events",
    });

    // User activity events (learning events, assessment completions)
    this.userEventsTopic = new sns.Topic(this, "UserEventsTopic", {
      topicName: `learning-os-${props.stage}-user-events`,
      displayName: "LearningOS User Events",
    });

    // Subscribe queues to topics for fan-out
    this.userEventsTopic.addSubscription(
      new subscriptions.SqsSubscription(this.analyticsQueue, {
        filterPolicy: {
          eventType: sns.SubscriptionFilter.stringFilter({
            allowlist: [
              "learning.session.completed",
              "assessment.submitted",
              "content.viewed",
              "milestone.achieved",
            ],
          }),
        },
      })
    );

    this.userEventsTopic.addSubscription(
      new subscriptions.SqsSubscription(this.notificationQueue, {
        filterPolicy: {
          eventType: sns.SubscriptionFilter.stringFilter({
            allowlist: [
              "assessment.graded",
              "milestone.achieved",
              "content.assigned",
              "message.received",
            ],
          }),
        },
      })
    );

    this.platformEventsTopic.addSubscription(
      new subscriptions.SqsSubscription(this.analyticsQueue, {
        filterPolicy: {
          eventType: sns.SubscriptionFilter.stringFilter({
            allowlist: [
              "tenant.created",
              "user.registered",
              "system.error",
            ],
          }),
        },
      })
    );

    // === Outputs ===

    new cdk.CfnOutput(this, "ContentGenerationQueueUrl", {
      value: this.contentGenerationQueue.queueUrl,
      exportName: `${props.stage}-ContentGenerationQueueUrl`,
    });

    new cdk.CfnOutput(this, "AnalyticsQueueUrl", {
      value: this.analyticsQueue.queueUrl,
      exportName: `${props.stage}-AnalyticsQueueUrl`,
    });

    new cdk.CfnOutput(this, "NotificationQueueUrl", {
      value: this.notificationQueue.queueUrl,
      exportName: `${props.stage}-NotificationQueueUrl`,
    });

    new cdk.CfnOutput(this, "DpiProcessingQueueUrl", {
      value: this.dpiProcessingQueue.queueUrl,
      exportName: `${props.stage}-DpiProcessingQueueUrl`,
    });

    new cdk.CfnOutput(this, "PlatformEventsTopicArn", {
      value: this.platformEventsTopic.topicArn,
      exportName: `${props.stage}-PlatformEventsTopicArn`,
    });

    new cdk.CfnOutput(this, "UserEventsTopicArn", {
      value: this.userEventsTopic.topicArn,
      exportName: `${props.stage}-UserEventsTopicArn`,
    });
  }
}
