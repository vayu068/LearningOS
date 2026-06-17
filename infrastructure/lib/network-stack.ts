import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

export interface NetworkStackProps extends cdk.StackProps {
  stage: string;
}

/**
 * Network Stack - VPC, subnets, NAT gateways, security groups, and VPC endpoints.
 * Provides network isolation for Aurora, Lambda (VPC-connected), and private services.
 */
export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly lambdaSecurityGroup: ec2.SecurityGroup;
  public readonly databaseSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    super(scope, id, props);

    const isProd = props.stage === "prod";

    // VPC with public, private, and isolated subnets
    this.vpc = new ec2.Vpc(this, "Vpc", {
      vpcName: `learning-os-${props.stage}-vpc`,
      maxAzs: isProd ? 3 : 2,
      natGateways: isProd ? 2 : 1,
      ipAddresses: ec2.IpAddresses.cidr("10.0.0.0/16"),
      subnetConfiguration: [
        {
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
          mapPublicIpOnLaunch: false,
        },
        {
          name: "Private",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 22,
        },
        {
          name: "Isolated",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
      enableDnsHostnames: true,
      enableDnsSupport: true,
      flowLogs: {
        default: {
          destination: ec2.FlowLogDestination.toCloudWatchLogs(),
          trafficType: ec2.FlowLogTrafficType.REJECT,
        },
      },
    });

    // Security group for Lambda functions in VPC
    this.lambdaSecurityGroup = new ec2.SecurityGroup(this, "LambdaSG", {
      vpc: this.vpc,
      securityGroupName: `learning-os-${props.stage}-lambda-sg`,
      description: "Security group for Lambda functions accessing VPC resources",
      allowAllOutbound: true,
    });

    // Security group for databases (Aurora, ElastiCache)
    this.databaseSecurityGroup = new ec2.SecurityGroup(this, "DatabaseSG", {
      vpc: this.vpc,
      securityGroupName: `learning-os-${props.stage}-database-sg`,
      description: "Security group for database instances",
      allowAllOutbound: false,
    });

    // Allow Lambda to connect to databases
    this.databaseSecurityGroup.addIngressRule(
      this.lambdaSecurityGroup,
      ec2.Port.tcp(5432),
      "Allow Lambda to connect to Aurora PostgreSQL"
    );

    this.databaseSecurityGroup.addIngressRule(
      this.lambdaSecurityGroup,
      ec2.Port.tcp(6379),
      "Allow Lambda to connect to ElastiCache Redis"
    );

    // VPC Endpoints for AWS services (reduces NAT costs and improves latency)
    // Gateway endpoints (free)
    this.vpc.addGatewayEndpoint("S3Endpoint", {
      service: ec2.GatewayVpcEndpointAwsService.S3,
      subnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
    });

    this.vpc.addGatewayEndpoint("DynamoDBEndpoint", {
      service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
      subnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
    });

    // Interface endpoints (for production, reduces data transfer costs)
    if (isProd) {
      this.vpc.addInterfaceEndpoint("SQSEndpoint", {
        service: ec2.InterfaceVpcEndpointAwsService.SQS,
        privateDnsEnabled: true,
        subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      });

      this.vpc.addInterfaceEndpoint("SNSEndpoint", {
        service: ec2.InterfaceVpcEndpointAwsService.SNS,
        privateDnsEnabled: true,
        subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      });

      this.vpc.addInterfaceEndpoint("SecretsManagerEndpoint", {
        service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
        privateDnsEnabled: true,
        subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      });

      this.vpc.addInterfaceEndpoint("KMSEndpoint", {
        service: ec2.InterfaceVpcEndpointAwsService.KMS,
        privateDnsEnabled: true,
        subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      });

      this.vpc.addInterfaceEndpoint("CloudWatchLogsEndpoint", {
        service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
        privateDnsEnabled: true,
        subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      });

      this.vpc.addInterfaceEndpoint("BedrockEndpoint", {
        service: ec2.InterfaceVpcEndpointAwsService.BEDROCK_RUNTIME,
        privateDnsEnabled: true,
        subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      });
    }

    // Outputs
    new cdk.CfnOutput(this, "VpcId", {
      value: this.vpc.vpcId,
      exportName: `${props.stage}-VpcId`,
    });

    new cdk.CfnOutput(this, "PrivateSubnetIds", {
      value: this.vpc.privateSubnets.map((s) => s.subnetId).join(","),
      exportName: `${props.stage}-PrivateSubnetIds`,
    });

    new cdk.CfnOutput(this, "IsolatedSubnetIds", {
      value: this.vpc.isolatedSubnets.map((s) => s.subnetId).join(","),
      exportName: `${props.stage}-IsolatedSubnetIds`,
    });

    new cdk.CfnOutput(this, "LambdaSecurityGroupId", {
      value: this.lambdaSecurityGroup.securityGroupId,
      exportName: `${props.stage}-LambdaSecurityGroupId`,
    });

    new cdk.CfnOutput(this, "DatabaseSecurityGroupId", {
      value: this.databaseSecurityGroup.securityGroupId,
      exportName: `${props.stage}-DatabaseSecurityGroupId`,
    });
  }
}
