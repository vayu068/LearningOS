# LearningOS

AI-enabled National Learning Operating System - an EdTech platform integrated with India's Digital Public Infrastructure (DPI).

## Overview

LearningOS is a serverless, multi-tenant learning platform that provides:

- **Personalized Learning Paths** - AI-driven adaptive learning experiences
- **Intelligent Tutoring** - Context-aware AI tutor supporting multiple languages
- **DPI Integration** - APAAR, DigiLocker, and Academic Bank of Credits (ABC)
- **Multi-Tenant Architecture** - Isolated, configurable per-institution deployments
- **Offline-First Design** - Works in low-connectivity environments

## Architecture

```
apps/
  web/          - Next.js 14 frontend (App Router, Tailwind CSS)
  api/          - Serverless Lambda backend (AWS)
packages/
  shared/       - Shared types, utilities, DPI interfaces
  ui/           - React component library
  ai/           - AI service abstraction layer
infrastructure/ - AWS CDK stacks (Auth, Database, API, Storage)
tests/          - Playwright E2E tests
docs/           - Architecture documentation
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed system design.

## Prerequisites

- Node.js 22+
- pnpm 9+
- AWS CLI (configured for deployment)
- AWS CDK CLI (for infrastructure)

## Getting Started

1. **Clone and install:**
   ```bash
   git clone <repository-url>
   cd LearningOS
   pnpm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Build all packages:**
   ```bash
   pnpm build
   ```

4. **Start development:**
   ```bash
   pnpm dev
   ```

   This starts:
   - Web app at http://localhost:3000
   - API (serverless-offline) at http://localhost:4000

## Development Workflow

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm build` | Build all packages |
| `pnpm dev` | Start all dev servers |
| `pnpm lint` | Lint all packages |
| `pnpm test` | Run unit tests |
| `pnpm test:e2e` | Run Playwright E2E tests |
| `pnpm format` | Format code with Prettier |
| `pnpm clean` | Clean all build outputs |

### Adding a Package

This is a pnpm workspaces monorepo with Turborepo for build orchestration. To add a workspace dependency:

```bash
pnpm add @learning-os/shared --filter @learning-os/web
```

### Code Style

- TypeScript strict mode enabled
- ESLint with TypeScript and React rules
- Prettier for consistent formatting
- Conventional commits recommended

## DPI Integration

LearningOS integrates with India's Digital Public Infrastructure:

- **APAAR** - Automated Permanent Academic Account Registry for student identification
- **DigiLocker** - Document verification and credential storage
- **ABC** - Academic Bank of Credits for credit transfer between institutions

## Deployment

Infrastructure is managed with AWS CDK:

```bash
cd infrastructure
pnpm synth     # Synthesize CloudFormation
pnpm deploy    # Deploy to AWS
```

The API is deployed via Serverless Framework:

```bash
cd apps/api
npx serverless deploy --stage dev
```

## Security and Compliance

- DPDP Act compliant data handling
- Data residency in ap-south-1 (Mumbai)
- Multi-tenant data isolation
- End-to-end encryption
- Audit logging

## License

Proprietary - All rights reserved.
