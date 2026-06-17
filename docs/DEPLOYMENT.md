# Deployment Guide

## Prerequisites

### AWS Account Setup
1. AWS account with appropriate permissions
2. AWS CLI configured with credentials
3. CDK CLI installed (`npm install -g aws-cdk`)
4. Node.js 20+ installed
5. Docker installed (for CDK asset bundling)

### Required AWS Services
- Amazon Cognito
- Amazon DynamoDB
- Amazon S3
- Amazon CloudFront
- AWS Lambda
- Amazon API Gateway v2
- Amazon SQS/SNS
- Amazon CloudWatch
- AWS WAF v2
- AWS VPC
- (Production) Aurora Serverless v2
- (Production) Amazon SageMaker
- (Production) Amazon Bedrock

### Environment Variables

```bash
# Required
export AWS_ACCOUNT_ID=123456789012
export AWS_REGION=ap-south-1
export CDK_DEFAULT_ACCOUNT=$AWS_ACCOUNT_ID
export CDK_DEFAULT_REGION=$AWS_REGION

# Optional overrides
export STAGE=dev          # dev | staging | prod
export DOMAIN=platform.gov.in
```

## Initial Setup

### 1. Bootstrap CDK

CDK requires a one-time bootstrap per account/region:

```bash
cd infrastructure
npx cdk bootstrap aws://$AWS_ACCOUNT_ID/$AWS_REGION \
  --qualifier learningos \
  --toolkit-stack-name LearningOS-CDKToolkit
```

### 2. Install Dependencies

```bash
# From repository root
pnpm install

# Build all packages
pnpm build
```

### 3. Configure Environment

Create `.env.local` in the repository root:

```bash
# API Configuration
API_BASE_URL=https://api.platform.gov.in/v1
NEXT_PUBLIC_API_URL=https://api.platform.gov.in/v1

# Auth Configuration
COGNITO_USER_POOL_ID=ap-south-1_XXXXXXXXX
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_DOMAIN=learning-os-dev.auth.ap-south-1.amazoncognito.com

# DPI Configuration
APAAR_API_URL=https://apaar.education.gov.in/api
APAAR_API_KEY=your-api-key
DIGILOCKER_CLIENT_ID=your-client-id
DIGILOCKER_CLIENT_SECRET=your-client-secret
ABC_API_URL=https://abc.education.gov.in/api
ABC_API_KEY=your-api-key

# AI Configuration
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
BEDROCK_REGION=ap-south-1
```

## Deployment Steps

### Development Environment

```bash
cd infrastructure

# Synthesize CloudFormation templates
npx cdk synth --context stage=dev

# Review changes
npx cdk diff --context stage=dev

# Deploy all stacks
npx cdk deploy --all --context stage=dev --require-approval never
```

### Staging Environment

```bash
cd infrastructure

# Deploy with approval for security-sensitive changes
npx cdk deploy --all --context stage=staging --require-approval broadening
```

### Production Environment

```bash
cd infrastructure

# Always review changes before production deployment
npx cdk diff --context stage=prod

# Deploy with manual approval for all changes
npx cdk deploy --all --context stage=prod --require-approval any-change
```

## Stack Deployment Order

Stacks are deployed in dependency order:

1. **NetworkStack** - VPC, subnets, security groups
2. **AuthStack** - Cognito User Pool, Identity Pool
3. **DatabaseStack** - DynamoDB, Aurora (depends on Network)
4. **StorageStack** - S3 buckets, CloudFront
5. **MessagingStack** - SQS, SNS queues and topics
6. **ApiStack** - API Gateway, WAF (depends on Auth, Database, Storage)
7. **AiStack** - SageMaker, Bedrock (depends on Network)
8. **MonitoringStack** - CloudWatch dashboards, alarms

CDK handles this order automatically via `addDependency()` calls.

## DNS Configuration

### Multi-Tenant Subdomain Setup

1. Register domain in Route 53 (or configure NS records)
2. Create hosted zone for `platform.gov.in`
3. Configure wildcard certificate in ACM:
   ```bash
   aws acm request-certificate \
     --domain-name platform.gov.in \
     --subject-alternative-names "*.platform.gov.in" \
     --validation-method DNS
   ```
4. Add custom domain to API Gateway
5. Create wildcard CNAME to CloudFront distribution

### DNS Records

| Record | Type | Value |
|--------|------|-------|
| platform.gov.in | A | CloudFront distribution |
| *.platform.gov.in | CNAME | CloudFront distribution |
| api.platform.gov.in | A | API Gateway custom domain |
| staging.platform.gov.in | CNAME | Staging CloudFront |

## Post-Deployment Steps

### 1. Verify Stack Outputs

```bash
# List all stack outputs
aws cloudformation describe-stacks \
  --query "Stacks[?contains(StackName, 'LearningOS')].Outputs" \
  --output table
```

### 2. Configure Cognito

After deployment, configure:
- Email sending (SES for production)
- SMS sending (SNS for MFA)
- Social identity providers (if needed)
- Custom domain for hosted UI

### 3. Seed Initial Data

```bash
# Create platform admin tenant
aws dynamodb put-item \
  --table-name learning-os-dev \
  --item '{"PK":{"S":"TENANT#platform"},"SK":{"S":"METADATA"},...}'

# Create initial admin user via Cognito
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username admin@platform.gov.in \
  --user-attributes Name=custom:tenantId,Value=platform Name=custom:role,Value=admin
```

### 4. Verify Monitoring

- Check CloudWatch dashboard is displaying metrics
- Verify alarm SNS topic has subscribers
- Test alarm by triggering a threshold (e.g., manual DLQ message)

## Monitoring Setup

### CloudWatch Dashboards
- Access via AWS Console > CloudWatch > Dashboards
- Dashboard name: `LearningOS-{stage}-Overview`
- Contains: API metrics, DynamoDB capacity, queue depth, alarm status

### Alarm Notifications
1. Subscribe to the alarm SNS topic:
   ```bash
   aws sns subscribe \
     --topic-arn arn:aws:sns:ap-south-1:$ACCOUNT:learning-os-dev-alarms \
     --protocol email \
     --notification-endpoint ops@learning-os.gov.in
   ```
2. Confirm subscription via email link

### Key Alarms
| Alarm | Threshold | Action |
|-------|-----------|--------|
| API Error Rate | >10 errors in 5min (prod) | Page on-call |
| API Latency P95 | >3000ms for 15min | Alert team |
| DLQ Messages | >0 messages | Investigate failures |
| Auth Failures | Sustained zero success | Check Cognito health |

## Rollback Procedures

### Automatic Rollback
CDK deployments automatically roll back on CloudFormation failure.

### Manual Rollback
```bash
# Roll back to previous version
npx cdk deploy --all --context stage=prod \
  --previous-parameters \
  --rollback
```

### Database Rollback
- DynamoDB: Restore from point-in-time backup
- Aurora: Restore from automated snapshot

## Troubleshooting

### Common Issues

**CDK synth fails:**
- Ensure `pnpm build` succeeds in infrastructure/ directory
- Check TypeScript compilation errors
- Verify aws-cdk-lib version matches CDK CLI

**Lambda cold starts:**
- Enable Provisioned Concurrency for critical functions
- Use Lambda SnapStart (Java) or optimize bundle size (Node.js)

**CORS errors:**
- Verify API Gateway CORS configuration matches frontend origin
- Check CloudFront behavior headers forwarding

**DPI integration timeouts:**
- Check APAAR/DigiLocker/ABC API status
- Verify API keys are valid and not rate-limited
- Check VPC NAT gateway connectivity (if Lambda is VPC-connected)
