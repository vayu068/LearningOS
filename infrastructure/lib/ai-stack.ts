import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sagemaker from "aws-cdk-lib/aws-sagemaker";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

export interface AiStackProps extends cdk.StackProps {
  stage: string;
  vpc?: ec2.IVpc;
}

/**
 * AI Stack - SageMaker endpoints for custom models, Bedrock access configuration,
 * Lambda layers for AI dependencies, and model hosting infrastructure.
 */
export class AiStack extends cdk.Stack {
  public readonly aiLambdaLayer: lambda.LayerVersion;
  public readonly bedrockAccessRole: iam.Role;

  constructor(scope: Construct, id: string, props: AiStackProps) {
    super(scope, id, props);

    const isProd = props.stage === "prod";

    // IAM Role for Bedrock access
    this.bedrockAccessRole = new iam.Role(this, "BedrockAccessRole", {
      roleName: `learning-os-${props.stage}-bedrock-access`,
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: "Role for Lambda functions to access Amazon Bedrock",
    });

    this.bedrockAccessRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
          "bedrock:ListFoundationModels",
          "bedrock:GetFoundationModel",
        ],
        resources: [
          `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-sonnet*`,
          `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-haiku*`,
          `arn:aws:bedrock:${this.region}::foundation-model/amazon.titan-embed*`,
          `arn:aws:bedrock:${this.region}::foundation-model/amazon.titan-text*`,
        ],
      })
    );

    // Lambda layer for AI/ML dependencies (numpy, transformers tokenizer, etc.)
    this.aiLambdaLayer = new lambda.LayerVersion(this, "AiDependenciesLayer", {
      layerVersionName: `learning-os-${props.stage}-ai-deps`,
      description: "AI/ML dependencies for Lambda functions (tokenizers, embeddings)",
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X, lambda.Runtime.PYTHON_3_12],
      code: lambda.Code.fromInline("// Placeholder - replaced during CI/CD with actual layer"),
      compatibleArchitectures: [lambda.Architecture.ARM_64, lambda.Architecture.X86_64],
    });

    // SageMaker execution role
    const sagemakerRole = new iam.Role(this, "SageMakerExecutionRole", {
      roleName: `learning-os-${props.stage}-sagemaker-execution`,
      assumedBy: new iam.ServicePrincipal("sagemaker.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSageMakerFullAccess"),
      ],
    });

    sagemakerRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:GetObject", "s3:PutObject", "s3:ListBucket"],
        resources: [
          `arn:aws:s3:::learning-os-${props.stage}-datalake-${cdk.Aws.ACCOUNT_ID}`,
          `arn:aws:s3:::learning-os-${props.stage}-datalake-${cdk.Aws.ACCOUNT_ID}/*`,
        ],
      })
    );

    // SageMaker endpoint for custom learning recommendation model (production only)
    if (isProd) {
      const modelName = `learning-os-${props.stage}-recommendation-model`;

      const model = new sagemaker.CfnModel(this, "RecommendationModel", {
        modelName,
        executionRoleArn: sagemakerRole.roleArn,
        primaryContainer: {
          image: `${cdk.Aws.ACCOUNT_ID}.dkr.ecr.${this.region}.amazonaws.com/learning-os-models:latest`,
          modelDataUrl: `s3://learning-os-${props.stage}-datalake-${cdk.Aws.ACCOUNT_ID}/models/recommendation/model.tar.gz`,
        },
        vpcConfig: props.vpc
          ? {
              subnets: props.vpc.privateSubnets.map((s) => s.subnetId),
              securityGroupIds: [],
            }
          : undefined,
      });

      const endpointConfig = new sagemaker.CfnEndpointConfig(
        this,
        "RecommendationEndpointConfig",
        {
          endpointConfigName: `${modelName}-config`,
          productionVariants: [
            {
              variantName: "primary",
              modelName: model.modelName!,
              initialInstanceCount: 1,
              instanceType: "ml.g5.xlarge",
              initialVariantWeight: 1.0,
            },
          ],
          asyncInferenceConfig: {
            outputConfig: {
              s3OutputPath: `s3://learning-os-${props.stage}-datalake-${cdk.Aws.ACCOUNT_ID}/inference-output/`,
            },
          },
        }
      );
      endpointConfig.addDependency(model);

      const endpoint = new sagemaker.CfnEndpoint(this, "RecommendationEndpoint", {
        endpointName: `${modelName}-endpoint`,
        endpointConfigName: endpointConfig.endpointConfigName!,
      });
      endpoint.addDependency(endpointConfig);

      new cdk.CfnOutput(this, "RecommendationEndpointName", {
        value: endpoint.endpointName!,
        exportName: `${props.stage}-RecommendationEndpointName`,
      });
    }

    // Lambda function for AI inference orchestration
    const aiInferenceFunction = new lambda.Function(this, "AiInferenceFunction", {
      functionName: `learning-os-${props.stage}-ai-inference`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          // Orchestrates AI inference: routes to Bedrock or SageMaker
          return { statusCode: 200, body: JSON.stringify({ status: 'ok' }) };
        };
      `),
      memorySize: 512,
      timeout: cdk.Duration.seconds(60),
      role: this.bedrockAccessRole,
      environment: {
        STAGE: props.stage,
        BEDROCK_REGION: this.region,
        MODEL_ID: "anthropic.claude-3-sonnet-20240229-v1:0",
      },
      layers: [this.aiLambdaLayer],
    });

    // Outputs
    new cdk.CfnOutput(this, "BedrockAccessRoleArn", {
      value: this.bedrockAccessRole.roleArn,
      exportName: `${props.stage}-BedrockAccessRoleArn`,
    });

    new cdk.CfnOutput(this, "AiLayerArn", {
      value: this.aiLambdaLayer.layerVersionArn,
      exportName: `${props.stage}-AiLayerArn`,
    });

    new cdk.CfnOutput(this, "AiInferenceFunctionArn", {
      value: aiInferenceFunction.functionArn,
      exportName: `${props.stage}-AiInferenceFunctionArn`,
    });
  }
}
