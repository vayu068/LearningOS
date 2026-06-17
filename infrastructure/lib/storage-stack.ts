import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export interface StorageStackProps extends cdk.StackProps {
  stage: string;
}

export class StorageStack extends cdk.Stack {
  public readonly contentBucket: s3.Bucket;
  public readonly uploadsBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

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
          allowedMethods: [s3.HttpMethods.GET],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
        },
      ],
    });

    this.uploadsBucket = new s3.Bucket(this, "UploadsBucket", {
      bucketName: `learning-os-${props.stage}-uploads-${cdk.Aws.ACCOUNT_ID}`,
      versioned: false,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy:
        props.stage === "prod" ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: props.stage !== "prod",
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(30),
          prefix: "temp/",
        },
      ],
    });

    new cdk.CfnOutput(this, "ContentBucketName", {
      value: this.contentBucket.bucketName,
    });

    new cdk.CfnOutput(this, "UploadsBucketName", {
      value: this.uploadsBucket.bucketName,
    });
  }
}
