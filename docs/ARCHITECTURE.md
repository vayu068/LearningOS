# LearningOS Architecture

## Overview

LearningOS is an AI-enabled National Learning Operating System designed for the Indian education ecosystem. It integrates with India's Digital Public Infrastructure (DPI) including APAAR, DigiLocker, and Academic Bank of Credits (ABC).

## System Architecture

```
+-------------------------------------------------------------------+
|                        Client Layer                                 |
|  +------------------+  +------------------+  +------------------+  |
|  |   Next.js Web    |  |   Mobile App     |  |   Admin Portal   |  |
|  |   (apps/web)     |  |   (future)       |  |   (future)       |  |
|  +------------------+  +------------------+  +------------------+  |
+-------------------------------------------------------------------+
                              |
+-------------------------------------------------------------------+
|                        API Layer                                    |
|  +------------------+  +------------------+  +------------------+  |
|  | API Gateway      |  | Lambda Handlers  |  | WebSocket API    |  |
|  | (REST + GraphQL) |  | (apps/api)       |  | (Real-time)      |  |
|  +------------------+  +------------------+  +------------------+  |
+-------------------------------------------------------------------+
                              |
+-------------------------------------------------------------------+
|                        Service Layer                                |
|  +------------------+  +------------------+  +------------------+  |
|  | Auth Service     |  | Learning Engine  |  | Content Service  |  |
|  | (Cognito)        |  | (packages/ai)    |  | (S3 + Lambda)    |  |
|  +------------------+  +------------------+  +------------------+  |
|  +------------------+  +------------------+  +------------------+  |
|  | DPI Integration  |  | Assessment Svc   |  | Analytics Svc    |  |
|  | (APAAR/ABC)      |  | (Adaptive)       |  | (CloudWatch)     |  |
|  +------------------+  +------------------+  +------------------+  |
+-------------------------------------------------------------------+
                              |
+-------------------------------------------------------------------+
|                        Data Layer                                   |
|  +------------------+  +------------------+  +------------------+  |
|  | DynamoDB         |  | S3               |  | ElastiCache      |  |
|  | (Multi-tenant)   |  | (Content Store)  |  | (Session/Cache)  |  |
|  +------------------+  +------------------+  +------------------+  |
+-------------------------------------------------------------------+
```

## Modules

### apps/web - Frontend Application
- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **State Management**: React Server Components + client-side state
- **Responsibilities**: User interface, SSR/SSG, client routing

### apps/api - Backend API
- **Framework**: Serverless Framework on AWS Lambda
- **Pattern**: CQRS with event sourcing
- **Responsibilities**: Business logic, API endpoints, event processing

### packages/shared - Shared Library
- **Contents**: TypeScript types, utility functions, constants
- **Key Types**: TenantContext, User roles, DPI interfaces (APAAR, DigiLocker, ABC)
- **Utilities**: Tenant-scoped key generation, validation helpers

### packages/ui - Component Library
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS classes
- **Responsibilities**: Reusable UI components shared across apps

### packages/ai - AI Service Layer
- **Interfaces**: LearningPathEngine, AITutor, ContentGenerator
- **Pattern**: Abstract interfaces with pluggable implementations
- **Responsibilities**: AI-powered personalization, tutoring, content generation

### infrastructure/ - AWS CDK
- **Stacks**: Auth, Database, API, Storage
- **Pattern**: Multi-stack with cross-stack references
- **Responsibilities**: Infrastructure as Code, deployment automation

## Data Flow

1. **Authentication Flow**: User -> Cognito -> JWT -> API Gateway -> Lambda
2. **Learning Path Flow**: Student action -> Lambda -> AI Engine -> DynamoDB -> Response
3. **DPI Integration Flow**: Verification request -> DPI Gateway -> APAAR/DigiLocker -> Store credentials
4. **Content Flow**: Request -> CDN (CloudFront) -> S3 -> Transformed response

## Multi-Tenant Design

- **Data Isolation**: Tenant-scoped DynamoDB partition keys (TENANT#<id>#ENTITY#<id>)
- **Auth Isolation**: Tenant attribute in Cognito JWT claims
- **Compute Isolation**: Tenant context propagated through all service calls
- **Config Isolation**: Per-tenant feature flags and configuration

## DPI Compliance

- **APAAR**: Unique student identification, academic record tracking
- **DigiLocker**: Document verification and credential storage
- **ABC (Academic Bank of Credits)**: Credit accumulation and transfer across institutions
- **DPDP Act**: Data privacy compliance with consent management and data localization

## Security

- All data encrypted at rest (KMS) and in transit (TLS 1.3)
- Row-level security via tenant-scoped access patterns
- Audit logging for all data access
- DPDP Act compliance with data residency in ap-south-1
