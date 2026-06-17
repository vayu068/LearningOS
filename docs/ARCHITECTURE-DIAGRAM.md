# LearningOS Platform - Architecture Diagram

## Table of Contents

1. [High-Level System Architecture](#1-high-level-system-architecture)
2. [CDK Stack Relationships](#2-cdk-stack-relationships)
3. [Authentication & Authorization Flow](#3-authentication--authorization-flow)
4. [Learning Data Flow](#4-learning-data-flow)
5. [DPI Integration Flow](#5-dpi-integration-flow)
6. [AI/ML Pipeline](#6-aiml-pipeline)
7. [Multi-Tenant Isolation](#7-multi-tenant-isolation)
8. [Network Topology](#8-network-topology)
9. [Messaging Architecture](#9-messaging-architecture)
10. [Storage Architecture](#10-storage-architecture)
11. [CDN & Content Delivery](#11-cdn--content-delivery)
12. [Component Inventory](#12-component-inventory)

---

## 1. High-Level System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Next.js 14 Web App<br/>App Router + Tailwind CSS]
        MOBILE[Mobile PWA]
    end

    subgraph "CDN Layer"
        CF[CloudFront Distribution<br/>HTTP/2+3, TLS 1.2+ 2021]
    end

    subgraph "API Layer"
        APIGW[API Gateway v2 HTTP<br/>Burst: 100, Rate: 50/s]
        WAF[AWS WAF v2<br/>IP Rate: 2000/5min<br/>Tenant Throttle: 5000/5min]
    end

    subgraph "Compute Layer"
        AUTH_FN[Auth Handlers<br/>Register, Login, MFA]
        DPI_FN[DPI Handlers<br/>DigiLocker, ABC, APAAR]
        LEARN_FN[Learning Handlers<br/>Content, Assessment, Progress]
        AI_FN[AI Inference<br/>Bedrock Orchestration]
    end

    subgraph "AI/ML Layer"
        BEDROCK[Amazon Bedrock<br/>Claude 3 Sonnet/Haiku<br/>Titan Embed/Text]
        SAGEMAKER[SageMaker Endpoint<br/>Recommendation Model]
        AI_LAYER[Lambda Layer<br/>AI Dependencies]
    end

    subgraph "Data Layer"
        DDB[DynamoDB Single-Table<br/>PK/SK + 5 GSIs]
        AURORA[Aurora Serverless v2<br/>PostgreSQL 15.4<br/>Analytics - Prod Only]
    end

    subgraph "Storage Layer"
        S3_CONTENT[S3: Content Bucket<br/>Learning Materials]
        S3_UPLOADS[S3: Uploads Bucket<br/>User Files]
        S3_DATALAKE[S3: Data Lake<br/>Analytics + Audit Logs]
    end

    subgraph "Messaging Layer"
        SNS_PLATFORM[SNS: Platform Events]
        SNS_USER[SNS: User Events]
        SQS_CONTENT[SQS: Content Generation]
        SQS_ANALYTICS[SQS: Analytics]
        SQS_NOTIFY[SQS: Notifications]
        SQS_DPI[SQS: DPI Processing]
    end

    subgraph "Auth Layer"
        COGNITO[Cognito User Pool<br/>MFA + Custom Attributes]
        IDP[Identity Pool<br/>Federated Access]
    end

    subgraph "Monitoring"
        CW[CloudWatch<br/>Dashboards + Alarms]
        XRAY[X-Ray Tracing]
    end

    WEB --> CF
    MOBILE --> CF
    CF --> APIGW
    WAF --> APIGW
    APIGW --> AUTH_FN
    APIGW --> DPI_FN
    APIGW --> LEARN_FN
    APIGW --> AI_FN

    AUTH_FN --> COGNITO
    AUTH_FN --> DDB
    DPI_FN --> DDB
    LEARN_FN --> DDB
    AI_FN --> BEDROCK
    AI_FN --> SAGEMAKER

    LEARN_FN --> SNS_USER
    SNS_USER --> SQS_ANALYTICS
    SNS_USER --> SQS_NOTIFY
    SNS_PLATFORM --> SQS_ANALYTICS
    DPI_FN --> SQS_DPI
    AI_FN --> SQS_CONTENT

    AUTH_FN --> CW
    DPI_FN --> CW
    LEARN_FN --> CW
    AI_FN --> CW
```

---

## 2. CDK Stack Relationships

```mermaid
graph LR
    subgraph "Infrastructure Stacks"
        NET[NetworkStack<br/>VPC, Subnets, SGs, Endpoints]
        AUTH[AuthStack<br/>Cognito, Triggers, Identity Pool]
        DB[DatabaseStack<br/>DynamoDB, Aurora]
        STORE[StorageStack<br/>S3 Buckets, CloudFront]
        MSG[MessagingStack<br/>SQS Queues, SNS Topics]
        API[ApiStack<br/>API Gateway, WAF]
        AI[AiStack<br/>Bedrock, SageMaker, Layer]
        MON[MonitoringStack<br/>CloudWatch, Alarms]
    end

    NET --> DB
    NET --> AI
    AUTH --> API
    DB --> API
    STORE --> API
    MSG --> MON
    API --> MON
    DB --> MON
```

Each stack is parameterized by `stage` (dev/staging/prod) with environment-specific configurations:

| Stack | Dev | Staging | Prod |
|-------|-----|---------|------|
| NetworkStack | 2 AZs, 1 NAT | 2 AZs, 1 NAT | 3 AZs, 2 NATs, VPC Endpoints |
| DatabaseStack | PAY_PER_REQUEST | PAY_PER_REQUEST | PROVISIONED + Auto-scaling |
| AuthStack | MFA Optional | MFA Optional | MFA Required |
| StorageStack | Auto-delete objects | Auto-delete objects | RETAIN policy |
| ApiStack | Relaxed CORS | Relaxed CORS | Strict *.platform.gov.in |
| AiStack | Bedrock only | Bedrock only | Bedrock + SageMaker endpoint |
| MonitoringStack | 1-week log retention | 1-month retention | 1-year+ retention |

---

## 3. Authentication & Authorization Flow

```mermaid
sequenceDiagram
    participant U as User/Client
    participant APIGW as API Gateway
    participant MW as Auth Middleware
    participant COG as Cognito User Pool
    participant T as Tenant Middleware
    participant RL as Rate Limiter
    participant H as Handler

    U->>APIGW: POST /auth/register
    APIGW->>MW: Route Request

    Note over MW: Extract Bearer Token
    MW->>COG: Verify JWT (JWKS)
    COG-->>MW: Decoded Token (sub, tenantId, roles)

    Note over MW: Check token expiry
    MW->>T: Extract Tenant Identifier
    Note over T: Resolution: X-Tenant-ID > Subdomain > Path Param

    T->>T: enforceTenantIsolation()
    Note over T: Compare request tenant vs JWT tenant

    MW->>RL: checkUserRateLimit(tenant, user)
    Note over RL: DynamoDB atomic counter (prod)<br/>In-memory store (dev)
    RL-->>MW: RateLimitResult

    alt Rate Limited
        MW-->>U: 429 Too Many Requests + Retry-After
    else Allowed
        MW->>H: AuthContext (userId, email, tenantId, roles)
        H->>H: authorizeAction(resource, action)
        Note over H: RBAC: matchesResource() + matchesAction()<br/>Wildcard support: "content:*"
        H-->>U: 200 Success / 403 Forbidden
    end
```

### Cognito Lambda Triggers

```mermaid
flowchart LR
    subgraph "Pre-Signup"
        PS[PreSignUpTrigger] --> PSV{Validate Tenant?}
        PSV -->|No tenantId| PSE[Throw Error]
        PSV -->|Valid| PSP[Proceed]
    end

    subgraph "Post-Confirmation"
        PC[PostConfirmationTrigger] --> PCA[Create User in DynamoDB]
        PCA --> PCR[Assign Default Role]
    end

    subgraph "Custom Message"
        CM[CustomMessageTrigger] --> CMB[Apply Tenant Branding]
        CMB --> CME[Send Branded Email]
    end

    subgraph "Pre-Token Generation"
        PT[PreTokenTrigger] --> PTC[Inject Custom Claims]
        PTC --> PTR[tenantId + role + permissions]
    end
```

---

## 4. Learning Data Flow

```mermaid
sequenceDiagram
    participant S as Student
    participant API as API Gateway
    participant LH as Learning Handler
    participant AI as AI Engine
    participant DDB as DynamoDB
    participant SQS as SQS Analytics
    participant SNS as User Events Topic

    S->>API: GET /learning/next-activity
    API->>LH: Authenticated Request
    LH->>DDB: Query progress (PK=TENANT#t1, SK=USER#u1#PROGRESS)
    DDB-->>LH: Learning State

    LH->>AI: AdaptiveLearningEngine.getNextPath()
    Note over AI: Knowledge Graph Analysis<br/>Mastery Level Computation<br/>Gap Identification
    AI-->>LH: Recommended Content Path

    LH-->>S: Next Activity + Content

    S->>API: POST /learning/activity/complete
    API->>LH: Activity Completion
    LH->>DDB: Update Progress
    LH->>SNS: Publish "learning.session.completed"

    SNS->>SQS: Fan-out to Analytics Queue
    Note over SQS: Filter: learning.session.completed,<br/>assessment.submitted,<br/>content.viewed, milestone.achieved
```

---

## 5. DPI Integration Flow

```mermaid
sequenceDiagram
    participant U as User
    participant API as API Handler
    participant DL as DigiLocker OAuth
    participant CM as Consent Manager
    participant ABC as ABC Service
    participant DDB as DynamoDB

    rect rgb(240, 248, 255)
    Note over U, DDB: DigiLocker OAuth Flow
    U->>API: GET /dpi/digilocker/authorize
    API->>API: signState(HMAC-SHA256)
    Note over API: Payload: {userId, tenantId, timestamp}<br/>Signed with STATE_SIGNING_SECRET
    API-->>U: authorizationUrl + state

    U->>DL: Redirect to DigiLocker
    DL-->>U: Authorization Code + State

    U->>API: POST /dpi/digilocker/callback
    API->>API: verifySignedState()
    Note over API: Constant-time comparison<br/>Prevents timing attacks
    API->>API: Check state freshness (10 min window)
    API->>DL: Exchange code for tokens
    DL-->>API: Access Token
    API->>DDB: Store linked account
    API-->>U: Success
    end

    rect rgb(255, 248, 240)
    Note over U, DDB: ABC Credit Operations (All require consent)
    U->>API: POST /dpi/abc/credits/deposit
    API->>CM: verifyConsent(consentId, "dpi_integration", "academic_records")
    CM->>DDB: Load ConsentArtifact
    CM->>CM: Check status, expiry, purpose, category
    alt Consent Invalid
        CM-->>API: Verification Failed
        API-->>U: 403 CONSENT_VERIFICATION_FAILED
    else Consent Valid
        API->>ABC: depositCredits()
        ABC-->>API: Reference ID
        API-->>U: 200 Success
    end
    end
```

---

## 6. AI/ML Pipeline

```mermaid
graph TB
    subgraph "AI Package Exports"
        ALE[AdaptiveLearningEngine]
        AE[AssessmentEngine]
        KGS[KnowledgeGraphService]
        TS[TutorService]
        VI[VoiceInterface]
        CGS[ContentGeneratorService]
        CRM[CurriculumMapper]
        TC[TeacherCopilot]
        CAS[ClassroomAnalyticsService]
    end

    subgraph "Provider Registry"
        REG[AIProviderRegistry]
        BP[BedrockProvider]
        OP[OpenAIProvider]
    end

    subgraph "AWS AI Services"
        BR_SONNET[Claude 3 Sonnet<br/>Complex reasoning, content gen]
        BR_HAIKU[Claude 3 Haiku<br/>Fast responses, tutoring]
        BR_TITAN_E[Titan Embeddings<br/>Semantic search, knowledge graph]
        BR_TITAN_T[Titan Text<br/>Summarization, extraction]
        SM_REC[SageMaker Endpoint<br/>Recommendation Model<br/>ml.g5.xlarge]
    end

    subgraph "Lambda Infrastructure"
        AI_LAYER[AI Lambda Layer<br/>Node.js 20 + Python 3.12<br/>ARM64 + x86_64]
        AI_FN[AI Inference Function<br/>512MB, 60s timeout]
    end

    REG --> BP
    REG --> OP
    BP --> BR_SONNET
    BP --> BR_HAIKU
    BP --> BR_TITAN_E
    BP --> BR_TITAN_T

    ALE --> REG
    AE --> REG
    KGS --> REG
    TS --> REG
    CGS --> REG
    TC --> REG

    ALE --> SM_REC
    CAS --> SM_REC

    AI_FN --> AI_LAYER
    AI_FN --> REG
```

### AI Inference Request Flow

```mermaid
sequenceDiagram
    participant LH as Lambda Handler
    participant REG as AIProviderRegistry
    participant BP as BedrockProvider
    participant BR as Bedrock Runtime
    participant SQS as Content Gen Queue

    LH->>REG: getProvider("bedrock")
    REG-->>LH: BedrockProvider instance

    LH->>BP: invokeModel(params)
    BP->>BR: InvokeModel / InvokeModelWithResponseStream
    Note over BR: Model: anthropic.claude-3-sonnet-20240229-v1:0
    BR-->>BP: Model Response
    BP-->>LH: Parsed Result

    Note over LH: For async content generation:
    LH->>SQS: Send to content-generation queue
    Note over SQS: Visibility: 5min, Retry: 3, DLQ
```

---

## 7. Multi-Tenant Isolation

```mermaid
graph TB
    subgraph "Tenant Resolution (3-Layer)"
        L1[Layer 1: X-Tenant-ID Header]
        L2[Layer 2: Subdomain Extraction<br/>school.learningos.in]
        L3[Layer 3: Path Parameter<br/>/api/v1/tenants/:tenantId/...]
    end

    subgraph "Isolation Enforcement"
        JWT[JWT Claims<br/>custom:tenantId]
        REQ[Request Tenant ID]
        CHECK{enforceTenantIsolation<br/>requestTenantId === authTenantId?}
        ALLOW[Allow Request]
        DENY[403 TENANT_ISOLATION_VIOLATION]
    end

    subgraph "Data Isolation (DynamoDB)"
        TABLE[Single Table Design]
        PK1["PK: TENANT#tenant-a<br/>SK: USER#user-1"]
        PK2["PK: TENANT#tenant-b<br/>SK: USER#user-2"]
        GSI1["GSI1PK: TENANT#tenant-a<br/>GSI1SK: ENTITY#..."]
    end

    L1 --> CHECK
    L2 --> CHECK
    L3 --> CHECK
    JWT --> CHECK
    CHECK -->|Match| ALLOW
    CHECK -->|Mismatch| DENY
    ALLOW --> TABLE
```

---

## 8. Network Topology

```mermaid
graph TB
    subgraph "VPC: 10.0.0.0/16"
        subgraph "Public Subnets (/24)"
            PUB_A[Public Subnet AZ-a<br/>NAT Gateway 1]
            PUB_B[Public Subnet AZ-b<br/>NAT Gateway 2 - Prod]
            PUB_C[Public Subnet AZ-c<br/>Prod only]
        end

        subgraph "Private Subnets (/22) - Lambda, Services"
            PRIV_A[Private Subnet AZ-a<br/>Lambda Functions]
            PRIV_B[Private Subnet AZ-b<br/>Lambda Functions]
            PRIV_C[Private Subnet AZ-c<br/>Prod only]
        end

        subgraph "Isolated Subnets (/24) - Databases"
            ISO_A[Isolated Subnet AZ-a<br/>Aurora Writer]
            ISO_B[Isolated Subnet AZ-b<br/>Aurora Reader]
            ISO_C[Isolated Subnet AZ-c<br/>Prod only]
        end

        subgraph "VPC Endpoints"
            GW_S3[Gateway: S3]
            GW_DDB[Gateway: DynamoDB]
            IF_SQS[Interface: SQS - Prod]
            IF_SNS[Interface: SNS - Prod]
            IF_SM[Interface: Secrets Manager - Prod]
            IF_KMS[Interface: KMS - Prod]
            IF_CWL[Interface: CloudWatch Logs - Prod]
            IF_BR[Interface: Bedrock Runtime - Prod]
        end

        subgraph "Security Groups"
            SG_LAMBDA[Lambda SG<br/>Outbound: All]
            SG_DB[Database SG<br/>Inbound: 5432, 6379 from Lambda SG<br/>Outbound: None]
        end
    end

    subgraph "Flow Logs"
        FL[VPC Flow Logs<br/>REJECT traffic only<br/>Destination: CloudWatch Logs]
    end

    PUB_A --> PRIV_A
    PUB_B --> PRIV_B
    PRIV_A --> ISO_A
    PRIV_B --> ISO_B
    SG_LAMBDA -.->|Port 5432| SG_DB
    SG_LAMBDA -.->|Port 6379| SG_DB
```

---

## 9. Messaging Architecture

```mermaid
graph TB
    subgraph "SNS Topics"
        PLAT_TOPIC[platform-events<br/>tenant.created, user.registered, system.error]
        USER_TOPIC[user-events<br/>learning.session.completed, assessment.submitted,<br/>content.viewed, milestone.achieved,<br/>assessment.graded, content.assigned, message.received]
    end

    subgraph "SQS Queues"
        Q_CONTENT[content-generation<br/>Visibility: 5min<br/>Retention: 7 days<br/>Max Receive: 3]
        Q_ANALYTICS[analytics<br/>Visibility: 2min<br/>Retention: 7 days<br/>Max Receive: 5]
        Q_NOTIFY[notifications<br/>Visibility: 30s<br/>Retention: 3 days<br/>Max Receive: 3]
        Q_DPI[dpi-processing<br/>Visibility: 3min<br/>Retention: 7 days<br/>Max Receive: 3]
    end

    subgraph "Dead Letter Queues"
        DLQ_CONTENT[content-generation-dlq<br/>Retention: 14 days]
        DLQ_ANALYTICS[analytics-dlq<br/>Retention: 14 days]
        DLQ_NOTIFY[notification-dlq<br/>Retention: 14 days]
        DLQ_DPI[dpi-processing-dlq<br/>Retention: 14 days]
    end

    USER_TOPIC -->|"Filter: learning.session.completed,<br/>assessment.submitted,<br/>content.viewed, milestone.achieved"| Q_ANALYTICS
    USER_TOPIC -->|"Filter: assessment.graded,<br/>milestone.achieved,<br/>content.assigned, message.received"| Q_NOTIFY
    PLAT_TOPIC -->|"Filter: tenant.created,<br/>user.registered, system.error"| Q_ANALYTICS

    Q_CONTENT -->|"After 3 failures"| DLQ_CONTENT
    Q_ANALYTICS -->|"After 5 failures"| DLQ_ANALYTICS
    Q_NOTIFY -->|"After 3 failures"| DLQ_NOTIFY
    Q_DPI -->|"After 3 failures"| DLQ_DPI
```

All queues use SQS managed encryption (SSE-SQS).

---

## 10. Storage Architecture

```mermaid
graph TB
    subgraph "S3 Buckets"
        subgraph "Content Bucket"
            CB[learning-os-{stage}-content-{accountId}]
            CB_V[Versioned: Yes]
            CB_E[Encryption: S3-Managed]
            CB_BP[Block Public Access: ALL]
            CB_LC1[archives/ -> IA @ 90d -> Glacier @ 365d]
            CB_LC2[Abort incomplete multipart: 7d]
            CB_IT[Intelligent Tiering: Archive 90d, Deep 180d]
        end

        subgraph "Uploads Bucket"
            UB[learning-os-{stage}-uploads-{accountId}]
            UB_V[Versioned: No]
            UB_E[Encryption: S3-Managed]
            UB_BP[Block Public Access: ALL]
            UB_LC1[temp/ -> Expire @ 7d]
            UB_LC2[processed/ -> IA @ 30d]
        end

        subgraph "Data Lake Bucket"
            DLB[learning-os-{stage}-datalake-{accountId}]
            DLB_V[Versioned: Yes]
            DLB_E[Encryption: S3-Managed]
            DLB_BP[Block Public Access: ALL]
            DLB_LC1[raw/ -> IA @ 30d -> Glacier @ 90d]
            DLB_LC2["audit/ -> Glacier @ 365d -> Expire @ 2555d (7 years)"]
        end
    end

    subgraph "DynamoDB Single-Table Design"
        DDB[Table: learning-os-{stage}]
        PK[PK: Partition Key - String]
        SK[SK: Sort Key - String]
        TTL[TTL Attribute for auto-expiry]
        STREAM[Stream: NEW_AND_OLD_IMAGES]
        ENC[Encryption: AWS Managed]
        PITR[Point-in-Time Recovery: Enabled]

        subgraph "Global Secondary Indexes"
            GSI1[GSI1: Tenant-scoped queries<br/>GSI1PK / GSI1SK - ALL projection]
            GSI2[GSI2: Entity-type cross-tenant<br/>GSI2PK / GSI2SK - ALL projection]
            GSI3[GSI3: Inverted index (SK->PK)<br/>Relationship queries - ALL projection]
            GSI4[GSI4: Status-based queries<br/>GSI4PK / GSI4SK - KEYS_ONLY projection]
            GSI5[GSI5: Date-based queries<br/>GSI5PK / GSI5SK - ALL projection]
        end
    end

    subgraph "Aurora Serverless v2 (Prod Only)"
        AUR[PostgreSQL 15.4]
        AUR_W[Writer Instance]
        AUR_R[Reader Instance (scale with writer)]
        AUR_CAP[Capacity: 0.5 - 8 ACU]
        AUR_ENC[Storage Encrypted: Yes]
        AUR_BK[Backup: 14 days retention]
        AUR_SUB[Subnet: PRIVATE_ISOLATED]
    end
```

### DynamoDB Access Patterns

| Access Pattern | PK | SK | Index |
|---|---|---|---|
| Get user by ID | TENANT#{tenantId} | USER#{userId} | Table |
| All users in tenant | TENANT#{tenantId} | USER# | GSI1 |
| Entity type queries | TYPE#{entityType} | CREATED#{timestamp} | GSI2 |
| Relationship lookup | (original SK) | (original PK) | GSI3 |
| Pending items | STATUS#pending | CREATED#{timestamp} | GSI4 |
| Audit log by date | AUDIT#{tenantId} | DATE#{timestamp} | GSI5 |

---

## 11. CDN & Content Delivery

```mermaid
graph LR
    subgraph "CloudFront Distribution"
        CF[CloudFront CDN]
        CF_HTTP[HTTP/2 + HTTP/3]
        CF_TLS[TLS 1.2+ (2021 Policy)]
        CF_PRICE[Price Class 200]

        subgraph "Behaviors"
            DEF["Default: /*<br/>Cache: CACHING_OPTIMIZED<br/>Methods: GET, HEAD, OPTIONS<br/>Compress: Yes"]
            MEDIA["/media/*<br/>TTL: 1d min, 30d default, 365d max<br/>Gzip + Brotli<br/>Methods: GET, HEAD, OPTIONS"]
        end
    end

    subgraph "Origin"
        OAI[Origin Access Identity]
        S3[Content S3 Bucket]
    end

    CF --> DEF
    CF --> MEDIA
    DEF --> OAI
    MEDIA --> OAI
    OAI --> S3
```

---

## 12. Component Inventory

### Applications

| Component | Path | Technology | Description |
|---|---|---|---|
| Web Frontend | `apps/web` | Next.js 14, App Router, Tailwind CSS | Student/teacher/admin interface |
| API Backend | `apps/api` | Node.js 20, Lambda, Serverless Framework | RESTful API handlers |

### Packages

| Component | Path | Key Exports | Description |
|---|---|---|---|
| Shared | `packages/shared` | Types, ConsentManager, encryption utils | Shared utilities and DPI integration |
| UI | `packages/ui` | React components | Reusable component library |
| AI | `packages/ai` | AdaptiveLearningEngine, AssessmentEngine, KnowledgeGraphService, TutorService, VoiceInterface, ContentGeneratorService, CurriculumMapper, TeacherCopilot, ClassroomAnalyticsService, AIProviderRegistry, BedrockProvider, OpenAIProvider | AI/ML engine for adaptive learning |

### Infrastructure Stacks

| Stack | Path | Key Resources |
|---|---|---|
| NetworkStack | `infrastructure/lib/network-stack.ts` | VPC, Subnets (3 types), NAT Gateways, Security Groups, VPC Endpoints (8) |
| AuthStack | `infrastructure/lib/auth-stack.ts` | Cognito User Pool, User Pool Client, Identity Pool, 4 Lambda Triggers |
| DatabaseStack | `infrastructure/lib/database-stack.ts` | DynamoDB Table (5 GSIs), Aurora Serverless v2 (prod) |
| StorageStack | `infrastructure/lib/storage-stack.ts` | 3 S3 Buckets, CloudFront Distribution, OAI |
| MessagingStack | `infrastructure/lib/messaging-stack.ts` | 4 SQS Queues, 4 DLQs, 2 SNS Topics |
| ApiStack | `infrastructure/lib/api-stack.ts` | HTTP API Gateway v2, WAF WebACL (5 rules), Access Logs |
| AiStack | `infrastructure/lib/ai-stack.ts` | Bedrock IAM Role, SageMaker Endpoint (prod), Lambda Layer |
| MonitoringStack | `infrastructure/lib/monitoring-stack.ts` | CloudWatch Dashboard, 4 Alarms, 4 Log Groups, Metric Filters |

### API Middleware Stack

| Middleware | File | Purpose |
|---|---|---|
| Authentication | `apps/api/src/middleware/auth.ts` | JWT verification, token extraction, RBAC |
| Tenant Resolution | `apps/api/src/middleware/tenant.ts` | 3-layer tenant identification, isolation enforcement |
| Rate Limiting | `apps/api/src/middleware/rateLimit.ts` | Per-user (req/min) + per-tenant (req/hr) limiting |

### DPI Integration Handlers

| Handler | File | Operations |
|---|---|---|
| DigiLocker | `apps/api/src/handlers/dpi/digilocker.ts` | OAuth authorize, callback, pull documents, verify |
| ABC | `apps/api/src/handlers/dpi/abc.ts` | Get account, deposit/withdraw/transfer credits, transcript |
| Consent Manager | `packages/shared/src/dpi/consent-manager.ts` | Create, batch, withdraw, verify, guardian consent |

### Test Infrastructure

| Component | Path | Description |
|---|---|---|
| E2E Tests | `tests/e2e/` | 6 Playwright spec files |
| Config | `tests/playwright.config.ts` | Playwright configuration |
