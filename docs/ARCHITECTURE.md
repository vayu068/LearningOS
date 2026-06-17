# LearningOS Platform Architecture

## Overview

LearningOS is an AI-powered adaptive learning platform built for India's education system. It integrates with Digital Public Infrastructure (DPI) including APAAR, DigiLocker, and Academic Bank of Credits (ABC), while maintaining full compliance with the Digital Personal Data Protection (DPDP) Act.

## System Context (C4 Level 1)

```
+-------------------+       +-------------------+       +-------------------+
|                   |       |                   |       |                   |
|    Students       |------>|   LearningOS      |<----->|   APAAR Registry  |
|    Teachers       |       |   Platform        |       |                   |
|    Admins         |       |                   |<----->+-------------------+
|                   |       |                   |       +-------------------+
+-------------------+       |                   |<----->|   DigiLocker      |
                            |                   |       +-------------------+
                            |                   |<----->+-------------------+
                            |                   |       |   Academic Bank   |
                            +-------------------+       |   of Credits      |
                                    |                   +-------------------+
                                    |
                            +-------v-----------+
                            |   Amazon Bedrock  |
                            |   (AI/ML)         |
                            +-------------------+
```

## Container Diagram (C4 Level 2)

### Frontend Layer
- **Web Application** (Next.js 14): Server-side rendered React app with App Router
  - Multi-tenant UI with dynamic theming
  - Offline-first with service worker caching
  - i18n support for 22 Indian languages
  - WCAG 2.1 AA accessibility compliance

### API Layer
- **API Gateway** (AWS HTTP API): Entry point for all API requests
  - WAF protection with rate limiting
  - JWT authentication via Cognito authorizer
  - Per-tenant throttling
  - Custom domain mapping (*.platform.gov.in)

- **Lambda Functions**: Serverless request handlers
  - Auth handlers (login, register, refresh)
  - Tenant management handlers
  - Learning session handlers
  - Assessment handlers
  - AI orchestration handlers
  - DPI integration handlers

### Service Layer
- **AI Engine** (packages/ai): Provider-agnostic AI service
  - Amazon Bedrock (Claude 3) for content generation
  - SageMaker for custom recommendation models
  - Adaptive learning algorithms
  - Content generation pipeline

- **DPI Services** (packages/shared/dpi):
  - APAAR Service: Student ID verification
  - DigiLocker Service: Document management via OAuth2
  - ABC Service: Credit accumulation and transfer
  - Consent Manager: DPDP compliance
  - Data Governance: Classification, retention, DSAR

### Data Layer
- **DynamoDB**: Primary data store (single-table design)
  - Multi-tenant isolation via partition key prefixing
  - 5 GSIs for diverse access patterns
  - DynamoDB Streams for event processing
  - Point-in-time recovery enabled

- **Aurora Serverless v2**: Analytics database (production)
  - PostgreSQL 15 for complex analytical queries
  - Scales to zero when idle
  - Read replicas for reporting workloads

- **S3 Buckets**:
  - Content bucket: Learning materials + CloudFront CDN
  - Uploads bucket: User-submitted files
  - Data lake: Analytics, ML training data, audit logs

### Infrastructure Layer
- **VPC**: Network isolation for sensitive resources
- **CloudFront CDN**: Global content delivery
- **SQS/SNS**: Async processing and event fan-out
- **CloudWatch**: Monitoring, alarms, and dashboards

## Component Diagram (C4 Level 3)

### Authentication Flow
```
Browser --> API Gateway --> Cognito User Pool
                              |
                              +--> Pre-Signup Lambda (tenant validation)
                              +--> Post-Confirmation Lambda (user setup)
                              +--> Pre-Token Lambda (custom claims)
                              |
                              v
                         Identity Pool (federated access)
```

### Multi-Tenancy Model
```
Tenant Isolation Strategy:
- Auth: Cognito custom attributes (tenantId)
- Data: DynamoDB partition key prefix (TENANT#<id>)
- API: Per-tenant throttling via WAF
- Storage: S3 prefix isolation (tenants/<id>/)
- Compute: Shared Lambda with tenant context injection
```

### AI Pipeline Architecture
```
User Request
    |
    v
AI Orchestrator (Lambda)
    |
    +--> Intent Classification
    |
    +--> Context Assembly (student profile, learning history)
    |
    +--> Provider Selection (Bedrock / SageMaker)
    |         |
    |         +--> Bedrock: Content generation, tutoring
    |         +--> SageMaker: Recommendations, predictions
    |
    +--> Response Formatting
    |
    +--> Feedback Loop (analytics queue)
    |
    v
Response to User
```

### Data Flow - Learning Session
```
1. Student starts session -> Lambda creates session record in DynamoDB
2. AI generates content -> Bedrock call -> Content stored in DynamoDB
3. Student interacts -> Events published to SNS User Events topic
4. Analytics queue processes events -> Learning model updated
5. Session ends -> Credits eligible for ABC deposit
6. Assessment results -> APAAR enrollment update (with consent)
```

## Security Architecture

### Authentication and Authorization
- **Cognito User Pool**: Primary identity provider
  - MFA required in production (SMS + TOTP)
  - Password policy: 8+ chars, mixed case, digits, symbols
  - Device tracking with challenge on new devices
- **Identity Pool**: Federated access for DPI integrations
- **JWT Claims**: tenantId, role, permissions embedded in tokens
- **Resource-level Authorization**: Fine-grained via custom Lambda authorizer

### Data Protection
- **Encryption at Rest**: AES-256 for all data stores
- **Encryption in Transit**: TLS 1.2+ everywhere
- **Key Management**: AWS KMS with per-tenant encryption keys
- **Data Classification**: 5 levels (public to critical)

### Network Security
- **VPC**: Private subnets for databases and sensitive resources
- **Security Groups**: Minimal ingress/egress rules
- **VPC Endpoints**: Reduce data exposure via private connectivity
- **WAF**: IP rate limiting, SQL injection protection, known bad inputs

### Consent and Privacy
- **DPDP Act Compliance**: Full consent lifecycle management
- **Purpose Limitation**: Processing restricted to consented purposes
- **Data Minimization**: Only collect what is needed
- **Right to Erasure**: Automated DSAR processing pipeline
- **Audit Trail**: Immutable logging of all data access

## Scalability

### Horizontal Scaling
- Lambda: Automatic (1000+ concurrent per region)
- DynamoDB: On-demand or auto-scaling provisioned capacity
- Aurora: Serverless v2 scales 0.5 to 8 ACUs
- CloudFront: Global edge network

### Performance Targets
- API response: P95 < 200ms for read, < 500ms for write
- AI response: P95 < 3s for content generation
- Page load: < 2s on 3G connections (offline-first PWA)
- CDN cache hit ratio: > 90% for static content

## Deployment Architecture

### Environments
- **Development**: Minimal resources, single AZ, relaxed security
- **Staging**: Production-like, 2 AZs, full monitoring
- **Production**: Full redundancy, 3 AZs, WAF, MFA required

### CI/CD Pipeline
```
Code Push -> GitHub Actions -> Build & Test -> CDK Synth
    -> Deploy to Dev -> Integration Tests
    -> Deploy to Staging -> E2E Tests
    -> Manual Approval -> Deploy to Production
```

### Stack Dependencies
```
NetworkStack (VPC, subnets)
    |
    +--> DatabaseStack (DynamoDB, Aurora)
    |        |
    |        +--> ApiStack (API Gateway, WAF)
    |
    +--> AiStack (SageMaker, Bedrock)
    |
AuthStack (Cognito)
    |
    +--> ApiStack
    |
StorageStack (S3, CloudFront)
    |
    +--> ApiStack
    |
MessagingStack (SQS, SNS)
    |
MonitoringStack (CloudWatch, Alarms)
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14, React 18, TailwindCSS | Server-rendered UI |
| API | AWS Lambda, API Gateway v2 | Serverless compute |
| Auth | Amazon Cognito | Identity management |
| Database | DynamoDB, Aurora Serverless v2 | Data persistence |
| AI/ML | Amazon Bedrock, SageMaker | AI capabilities |
| Storage | S3, CloudFront | File storage and CDN |
| Messaging | SQS, SNS | Async processing |
| IaC | AWS CDK v2 (TypeScript) | Infrastructure |
| Testing | Vitest, Playwright | Unit + E2E testing |
| Monitoring | CloudWatch, X-Ray | Observability |
