import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export interface StorageStackProps extends cdk.StackProps {
  stage: string;
}

export class StorageStack extends cdk.Stack {
  public readonly contentBucket: s3.Bucket;
  public readonly uploadsBucket: s3.Bucket;
  public readonly dataLakeBucket: s3.Bucket;
  public readonly cdnDistribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    // Content bucket for learning materials, media, and static assets
    this.contentBucket = new s3.Bucket(this, "ContentBucket", {
      bucketName: `learning-os-${props.stage}-content-${cdk.Aws.ACCOUNT_ID}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy:
        props.stage === "prod" ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: props.stage !== "prod",
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: props.stage === "prod"
            ? ["https://*.platform.gov.in"]
            : ["http://localhost:3000", "https://*.platform.gov.in"],
          allowedHeaders: ["*"],
          maxAge: 3600,
        },
      ],
      lifecycleRules: [
        {
          id: "InfrequentAccessTransition",
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(90),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(365),
            },
          ],
          prefix: "archives/",
        },
        {
          id: "AbortIncompleteMultipartUploads",
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
        },
      ],
      intelligentTieringConfigurations: [
        {
          name: "ContentTiering",
          archiveAccessTierTime: cdk.Duration.days(90),
          deepArchiveAccessTierTime: cdk.Duration.days(180),
        },
      ],
    });

    // User uploads bucket with stricter lifecycle policies
    this.uploadsBucket = new s3.Bucket(this, "UploadsBucket", {
      bucketName: `learning-os-${props.stage}-uploads-${cdk.Aws.ACCOUNT_ID}`,
      versioned: false,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy:
        props.stage === "prod" ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: props.stage !== "prod",
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
          allowedOrigins: props.stage === "prod"
            ? ["https://*.platform.gov.in"]
            : ["http://localhost:3000", "https://*.platform.gov.in"],
          allowedHeaders: ["*"],
          exposedHeaders: ["ETag"],
          maxAge: 3600,
        },
      ],
      lifecycleRules: [
        {
          id: "TempFilesExpiration",
          expiration: cdk.Duration.days(7),
          prefix: "temp/",
        },
        {
          id: "ProcessedFilesTransition",
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30),
            },
          ],
          prefix: "processed/",
        },
      ],
    });

    // Data lake bucket for analytics, ML training data, and audit logs
    this.dataLakeBucket = new s3.Bucket(this, "DataLakeBucket", {
      bucketName: `learning-os-${props.stage}-datalake-${cdk.Aws.ACCOUNT_ID}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          id: "RawDataTransition",
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
          prefix: "raw/",
        },
        {
          id: "AuditLogRetention",
          transitions: [
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(365),
            },
          ],
          expiration: cdk.Duration.days(2555), // 7 years retention for compliance
          prefix: "audit/",
        },
      ],
    });

    // CloudFront CDN for content delivery
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      "ContentOAI",
      {
        comment: `OAI for learning-os-${props.stage} content`,
      }
    );

    this.contentBucket.grantRead(originAccessIdentity);

    this.cdnDistribution = new cloudfront.Distribution(this, "ContentCDN", {
      comment: `LearningOS ${props.stage} Content CDN`,
      defaultBehavior: {
        origin: new origins.S3Origin(this.contentBucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        compress: true,
      },
      additionalBehaviors: {
        "/media/*": {
          origin: new origins.S3Origin(this.contentBucket, {
            originAccessIdentity,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: new cloudfront.CachePolicy(this, "MediaCachePolicy", {
            cachePolicyName: `learning-os-${props.stage}-media-cache`,
            defaultTtl: cdk.Duration.days(30),
            maxTtl: cdk.Duration.days(365),
            minTtl: cdk.Duration.days(1),
            enableAcceptEncodingGzip: true,
            enableAcceptEncodingBrotli: true,
          }),
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          compress: true,
        },
      },
      priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
      enabled: true,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
    });

    // Outputs
    new cdk.CfnOutput(this, "ContentBucketName", {
      value: this.contentBucket.bucketName,
      exportName: `${props.stage}-ContentBucketName`,
    });

    new cdk.CfnOutput(this, "UploadsBucketName", {
      value: this.uploadsBucket.bucketName,
      exportName: `${props.stage}-UploadsBucketName`,
    });

    new cdk.CfnOutput(this, "DataLakeBucketName", {
      value: this.dataLakeBucket.bucketName,
      exportName: `${props.stage}-DataLakeBucketName`,
    });

    new cdk.CfnOutput(this, "CDNDomainName", {
      value: this.cdnDistribution.distributionDomainName,
      exportName: `${props.stage}-CDNDomainName`,
    });

    new cdk.CfnOutput(this, "CDNDistributionId", {
      value: this.cdnDistribution.distributionId,
      exportName: `${props.stage}-CDNDistributionId`,
    });
  }
}
