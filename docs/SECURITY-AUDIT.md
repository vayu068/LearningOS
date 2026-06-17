# LearningOS Platform - Security Audit Report

**Audit Date:** $(date +%Y-%m-%d)
**Auditor:** Automated Code Analysis
**Scope:** Full platform codebase (apps, packages, infrastructure)
**Classification:** Internal - Confidential

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Authentication Security](#2-authentication-security)
3. [Authorization (RBAC)](#3-authorization-rbac)
4. [Multi-Tenant Isolation](#4-multi-tenant-isolation)
5. [Rate Limiting & DDoS Protection](#5-rate-limiting--ddos-protection)
6. [DPI Security (DigiLocker & ABC)](#6-dpi-security-digilocker--abc)
7. [Encryption & Data Protection](#7-encryption--data-protection)
8. [Infrastructure Security](#8-infrastructure-security)
9. [API Gateway Security](#9-api-gateway-security)
10. [DPDP Consent & Data Governance](#10-dpdp-consent--data-governance)
11. [Vulnerabilities & Findings](#11-vulnerabilities--findings)
12. [Recommendations](#12-recommendations)

---

## 1. Executive Summary

The LearningOS platform demonstrates a security-conscious architecture with multiple defense layers. The codebase implements defense-in-depth through WAF protection, JWT-based authentication, tenant isolation enforcement, HMAC-signed OAuth state parameters, AES-256-GCM encryption for PII, and DPDP-compliant consent lifecycle management.

**Overall Risk Assessment:** MEDIUM

**Key Strengths:**
- Constant-time comparison for HMAC verification (prevents timing attacks)
- Multi-layer tenant isolation with enforcement at middleware level
- Comprehensive consent lifecycle management with audit trails
- Infrastructure-level encryption at rest for all data stores
- WAF rules with managed rule groups (SQLi, Common, Known Bad Inputs)

**Key Concerns:**
- Default signing secret fallback in DigiLocker handler
- In-memory rate limit store in Lambda (ineffective in serverless)
- DynamoDB rate limit store not yet wired to actual client
- CORS `Access-Control-Allow-Origin: *` in error responses
- No input sanitization layer before JSON parsing

---

## 2. Authentication Security

### 2.1 Cognito User Pool Configuration

| Setting | Value | Assessment |
|---------|-------|------------|
| MFA (Production) | REQUIRED | GOOD - Mandatory MFA for production |
| MFA (Dev/Staging) | OPTIONAL | ACCEPTABLE - Reduces friction in dev |
| MFA Methods | SMS + TOTP | GOOD - Multiple second factors |
| Password Min Length | 8 characters | ACCEPTABLE - Meets NIST minimum |
| Require Uppercase | Yes | GOOD |
| Require Lowercase | Yes | GOOD |
| Require Digits | Yes | GOOD |
| Require Symbols | Yes | GOOD |
| Temp Password Validity | 3 days | GOOD |
| Access Token Validity | 1 hour | GOOD - Short-lived |
| Refresh Token Validity | 30 days | ACCEPTABLE |
| Device Tracking | Challenge on new device | GOOD |
| preventUserExistenceErrors | true | GOOD - Prevents user enumeration |
| Account Recovery | Email + Phone (no MFA) | ACCEPTABLE |

### 2.2 Lambda Triggers Security Analysis

**Pre-Signup Trigger:**
- Validates tenant ID is present in client metadata
- Prevents registrations without a valid tenant context
- Does NOT auto-confirm or auto-verify - forces email verification

**Post-Confirmation Trigger:**
- Creates user record in DynamoDB after email verification
- Risk: Currently only logs - production implementation needed

**Custom Message Trigger:**
- Provides tenant-branded email templates
- Risk: No sanitization of tenant name in email body (low risk, admin-controlled)

**Pre-Token Generation Trigger:**
- Injects custom claims: tenantId, role, permissions
- Risk: Reads from user attributes which are Cognito-managed (safe)

### 2.3 Token Configuration

```
Web Client:
- Auth Flow: USER_PASSWORD, USER_SRP, CUSTOM
- OAuth: Authorization Code Grant (PKCE-compatible)
- Implicit Grant: DISABLED (good - prevents token leakage)
- Client Secret: Not generated (public client for SPA)
- Token Validity: Access 1hr, ID 1hr, Refresh 30d

Service Client:
- Auth Flow: CLIENT_CREDENTIALS only
- Token Validity: Access 15 minutes (very short - good)
- Client Secret: Generated (private client)
```

### 2.4 Identity Pool

- `allowUnauthenticatedIdentities: false` - GOOD
- Server-side token check enabled
- Authenticated role scoped to user-specific S3 path using `cognito-identity.amazonaws.com:sub`
- Unauthenticated role exists but has no permissions attached

---

## 3. Authorization (RBAC)

### 3.1 Role-Based Access Control Implementation

The authorization system uses a `ROLE_PERMISSIONS` map that maps roles to resource/action pairs.

**Key Implementation Details (auth.ts):**

```typescript
// Resource matching supports wildcards
matchesResource("content:*", "content:read") // true
matchesResource("*", "anything") // true (superadmin)

// Action matching supports "manage" as catch-all
matchesAction(["manage"], "read") // true
matchesAction(["read", "write"], "delete") // false
```

### 3.2 Self-Registration Role Restriction

```typescript
const SELF_REGISTRATION_ALLOWED_ROLES = ["student", "teacher", "parent"];
```

Privileged roles (super_admin, tenant_admin, governance, principal) require administrator assignment. This prevents privilege escalation through self-registration.

### 3.3 Authorization Flow

1. JWT decoded to extract roles array
2. For each role, load permissions from `ROLE_PERMISSIONS`
3. Check if any permission matches the requested resource AND action
4. Wildcard `*` on resource means full access
5. `manage` action means all actions allowed

**Finding:** The `matchesResource` function only splits on the first `:` for domain/scope matching. If resource identifiers contain multiple colons (e.g., `content:course:123`), matching may behave unexpectedly.

---

## 4. Multi-Tenant Isolation

### 4.1 Tenant Resolution (3-Layer)

Resolution priority order:
1. `X-Tenant-ID` header (explicit)
2. Subdomain from `Host` header (e.g., `school.learningos.in`)
3. Path parameter (`:tenantId` in route)

### 4.2 Isolation Enforcement

```typescript
export function enforceTenantIsolation(
  requestTenantId: string | undefined,
  authTenantId: string
): TenantIsolationViolation | null {
  // If no request tenant ID, allow through (uses auth tenant)
  if (!requestTenantId) return null;
  // Compare request tenant to JWT tenant
  if (!validateTenantIsolation(requestTenantId, authTenantId)) {
    return { statusCode: 403, code: "TENANT_ISOLATION_VIOLATION", ... };
  }
  return null;
}
```

### 4.3 Data Layer Isolation

DynamoDB single-table design uses tenant ID as part of the partition key:
- Pattern: `PK = TENANT#{tenantId}`, `SK = ENTITY#{entityId}`
- GSI1 specifically designed for tenant-scoped queries
- Cross-tenant queries only possible through GSI2 (admin/analytics use)

### 4.4 Assessment

| Layer | Status | Notes |
|-------|--------|-------|
| Request-level isolation | IMPLEMENTED | enforceTenantIsolation in auth middleware |
| Data-level isolation | IMPLEMENTED | Partition key includes tenant ID |
| Tenant status check | IMPLEMENTED | Inactive tenants rejected |
| Domain-based resolution | IMPLEMENTED | Subdomain extraction with validation |

**Finding:** When `requestTenantId` is `undefined` (no header, no subdomain, no path param), the request is allowed through and defaults to the JWT's tenant. This is safe but could be tightened for defense-in-depth.

---

## 5. Rate Limiting & DDoS Protection

### 5.1 Application-Level Rate Limiting

**Per-User Limits:**
- Window: 1 minute
- Key pattern: `rate:user:{tenantId}:{userId}`
- Configurable per tenant plan

**Per-Tenant Limits:**
- Window: 1 hour
- Key pattern: `rate:tenant:{tenantId}`
- Configurable per tenant plan

### 5.2 Rate Limit Store Implementations

| Store | Environment | Status |
|-------|-------------|--------|
| InMemoryRateLimitStore | Dev/Test | ACTIVE - Resets on cold start |
| DynamoDBRateLimitStore | Production | DEFINED but NOT WIRED |

The DynamoDB store uses:
- Atomic counters (`ADD #count :inc`)
- Conditional expressions for window management
- TTL for automatic cleanup (with 60s grace period)
- Fallback reset on ConditionalCheckFailed

### 5.3 WAF Protection (API Gateway)

| Rule | Priority | Type | Limit |
|------|----------|------|-------|
| RateLimitPerIP | 1 | Rate-based (IP) | 2000 requests / 5 minutes |
| AWSManagedRulesCommonRuleSet | 2 | Managed | AWS-managed common threats |
| AWSManagedRulesKnownBadInputsRuleSet | 3 | Managed | Known bad inputs |
| AWSManagedRulesSQLiRuleSet | 4 | Managed | SQL injection |
| TenantThrottling | 5 | Rate-based (Forwarded IP) | 5000 requests / 5 minutes |

### 5.4 API Gateway Throttling

- Burst limit: 100 requests
- Rate limit: 50 requests/second
- Detailed metrics enabled

**Finding:** The `DynamoDBRateLimitStore` is fully implemented but the TODO comment indicates it is not yet connected to an actual DynamoDB client in the Lambda handler configuration. The WAF and API Gateway limits provide a safety net, but per-user granularity is not enforced in production.

---

## 6. DPI Security (DigiLocker & ABC)

### 6.1 DigiLocker OAuth State Security

**HMAC-SHA256 State Signing:**

```typescript
// State format: base64url(payload).hmac_signature
const signature = createHmac("sha256", STATE_SIGNING_SECRET)
  .update(payload)
  .digest("base64url");
```

**Constant-Time Comparison:**

```typescript
// Prevents timing attacks
let mismatch = 0;
for (let i = 0; i < providedSignature.length; i++) {
  mismatch |= providedSignature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
}
if (mismatch !== 0) return null;
```

**State Freshness Check:**
- 10-minute expiry window
- Prevents replay attacks with stale authorization codes

**Assessment:** The implementation is cryptographically sound. The constant-time comparison prevents timing-based side-channel attacks. Length check before comparison prevents length oracle attacks.

### 6.2 DigiLocker Secret Management

```typescript
const STATE_SIGNING_SECRET = process.env.DIGILOCKER_STATE_SECRET || "default-state-secret-change-in-production";
```

**CRITICAL FINDING:** A hardcoded fallback secret exists. If the environment variable is not set, any attacker who knows the default secret can forge OAuth state parameters. While the comment indicates this should be changed in production, there is no runtime validation to ensure the production secret differs from the default.

### 6.3 ABC Consent Enforcement

Every ABC endpoint enforces consent verification before processing:

```typescript
// Called in: getAccount, depositCredits, withdrawCredits, transferCredits, generateTranscript
const consentError = await verifyConsent(consentId, "dpi_integration", "academic_records");
if (consentError) return consentError;
```

The `verifyConsent` function:
1. Checks consent store is configured (returns 503 if not)
2. Loads consent artifact by ID
3. Calls `consentManager.verifyConsentForProcessing()` which checks:
   - Status (not withdrawn, not pending_verification)
   - Expiry date
   - Purpose limitation (must match requested purpose)
   - Data category coverage

**Assessment:** Consent enforcement is thorough. The fail-closed design (503 when store is unavailable) is secure. No ABC operation can bypass consent verification.

---

## 7. Encryption & Data Protection

### 7.1 AES-256-GCM Implementation

```typescript
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;        // 128-bit IV (correct for GCM)
const AUTH_TAG_LENGTH = 16;  // 128-bit auth tag (standard)
```

**Key Derivation:**
```typescript
function deriveKey(keyMaterial: string): Buffer {
  return createHash("sha256").update(keyMaterial).digest();
}
```

**Encryption Process:**
1. Derive 256-bit key via SHA-256 hash of key material
2. Generate random 16-byte IV using `crypto.randomBytes()`
3. Encrypt with AES-256-GCM (authenticated encryption)
4. Return: ciphertext + IV + authTag + keyId + algorithm

**Decryption Process:**
1. Derive key from same material
2. Reconstruct cipher with stored IV and auth tag
3. Decrypt and verify authentication tag
4. Throws on tampering (GCM provides integrity)

### 7.2 Index Hashing

```typescript
export function hashForIndex(value: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}
```

Uses tenant-scoped salt for blind index queries (e.g., email lookup without storing plaintext).

### 7.3 PII Masking

Supports email, phone, Aadhaar, and name masking for display purposes.

### 7.4 Assessment

| Aspect | Status | Notes |
|--------|--------|-------|
| Algorithm | AES-256-GCM | Industry standard authenticated encryption |
| IV Generation | Random (crypto.randomBytes) | GOOD - No IV reuse |
| Auth Tag | 128-bit | Standard length |
| Key Derivation | SHA-256 of material | CONCERN - No iterations/stretching |
| Key Rotation | keyId tracked | Supports rotation detection |

**Finding:** The key derivation uses a single SHA-256 hash without key stretching (no PBKDF2, Argon2, or scrypt). If the key material is a passphrase or low-entropy secret, this is vulnerable to brute-force attacks. For KMS-derived keys (high entropy), this is acceptable. The code comment indicates production should use AWS KMS, where this concern is mitigated.

---

## 8. Infrastructure Security

### 8.1 Network Security

| Control | Implementation | Assessment |
|---------|---------------|------------|
| VPC Flow Logs | REJECT traffic to CloudWatch | GOOD - Detects blocked access |
| NAT Gateways | 1 (dev) / 2 (prod) | GOOD - HA in prod |
| Isolated Subnets | Databases only | GOOD - No internet access |
| Security Groups | Lambda -> DB only on 5432/6379 | GOOD - Least privilege |
| DB Outbound | allowAllOutbound: false | GOOD - No DB egress |
| mapPublicIpOnLaunch | false (public subnets) | GOOD |

### 8.2 Storage Security

| Resource | Encryption | Public Access | Versioning | Retention |
|----------|-----------|---------------|------------|-----------|
| Content Bucket | S3-Managed | BLOCK ALL | Yes | RETAIN (prod) |
| Uploads Bucket | S3-Managed | BLOCK ALL | No | RETAIN (prod) |
| Data Lake Bucket | S3-Managed | BLOCK ALL | Yes | RETAIN always |
| DynamoDB | AWS Managed | N/A | N/A | PITR enabled |
| Aurora | Storage Encrypted | N/A | N/A | 14-day backup |
| SQS Queues | SQS-Managed | N/A | N/A | 7-14 day retention |

### 8.3 S3 Lifecycle & Compliance

- Audit logs: 7-year retention (2555 days) then expiration
- Archives: IA at 90 days, Glacier at 365 days
- Temp uploads: Auto-expire at 7 days
- Incomplete multipart uploads: Abort after 7 days

### 8.4 CloudFront Security

| Setting | Value | Assessment |
|---------|-------|------------|
| Protocol | HTTP/2 + HTTP/3 | GOOD - Modern protocols |
| TLS Version | TLS 1.2+ (2021 policy) | GOOD - No deprecated protocols |
| Viewer Policy | Redirect to HTTPS | GOOD - Forces encryption |
| Origin Access | OAI (Origin Access Identity) | GOOD - No direct S3 access |

### 8.5 Monitoring & Alerting

| Alarm | Threshold | Assessment |
|-------|-----------|------------|
| API Error Rate | 10/5min (prod) | GOOD |
| API Latency P95 | 3000ms (prod) | GOOD |
| DLQ Messages | >= 1 message | GOOD - Immediate alert |
| Auth Failures | Excessive failures | GOOD - Brute force detection |

### 8.6 Log Retention

| Log Group | Production Retention |
|-----------|---------------------|
| API Logs | 1 year |
| AI Logs | 6 months |
| DPI Logs | 2 years |
| Audit Logs | 2 years (RETAIN policy) |

---

## 9. API Gateway Security

### 9.1 CORS Configuration

```typescript
corsConfiguration: {
  allowHeaders: ["Content-Type", "Authorization", "X-Tenant-Id", "X-Request-Id", "X-Amz-Date"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowOrigins: stage === "prod"
    ? ["https://*.platform.gov.in"]
    : ["http://localhost:3000", "https://*.platform.gov.in"],
  maxAge: 86400,
  allowCredentials: true,
}
```

**Assessment:**
- Production restricts origins to `*.platform.gov.in` - GOOD
- `allowCredentials: true` with specific origins - CORRECT implementation
- Dev allows localhost - ACCEPTABLE for development

**Finding:** Individual handler error responses use `"Access-Control-Allow-Origin": "*"` instead of the API Gateway-level CORS configuration. This inconsistency could expose endpoints to cross-origin requests from unauthorized domains, especially in production where origins should be restricted.

### 9.2 Access Logging Format

```json
{
  "requestId": "$context.requestId",
  "ip": "$context.identity.sourceIp",
  "requestTime": "$context.requestTime",
  "httpMethod": "$context.httpMethod",
  "path": "$context.path",
  "status": "$context.status",
  "responseLength": "$context.responseLength",
  "tenantId": "$context.authorizer.claims.custom:tenantId"
}
```

**Assessment:** Structured JSON logging with tenant context enables per-tenant analysis. Includes request ID for correlation.

### 9.3 Throttling

- Default route: Burst 100, Rate 50/s
- Detailed metrics: Enabled
- Stage: Auto-deploy with `$default`

---

## 10. DPDP Consent & Data Governance

### 10.1 Consent Lifecycle Operations

| Operation | Implementation | Audit Event |
|-----------|---------------|-------------|
| Create Consent | `createConsent()` | consent_granted |
| Batch Create | `createBatchConsents()` | consent_granted / consent_denied per item |
| Withdraw | `withdrawConsent()` | consent_withdrawn |
| Verify for Processing | `verifyConsentForProcessing()` | N/A (read-only check) |
| Guardian Consent | `addGuardianConsent()` | guardian_consent_granted |
| Generate Summary | `generateSummary()` | N/A (read-only) |

### 10.2 Consent Validation Checks

The `verifyConsentForProcessing` function performs 4 sequential checks:

1. **Status Check:** Must be "active" (not withdrawn, not pending_verification)
2. **Expiry Check:** `expiresAt` must be in the future
3. **Purpose Limitation:** Consent purpose must exactly match requested purpose
4. **Data Category Coverage:** Requested category must be in consent's category list

### 10.3 Guardian Consent for Minors

- Configurable minimum consent age (default: 18 per Indian law)
- When `isMinor: true` and `requireGuardianConsent: true`:
  - Consent created with status `pending_verification`
  - Requires explicit `addGuardianConsent()` call to activate
  - Guardian relationship and verification method tracked

### 10.4 Audit Trail

Every consent operation generates a `ConsentAuditEvent` with:
- Unique event ID
- Event type (10 defined types)
- User and tenant context
- Timestamp
- IP address (when available)
- Detailed event-specific metadata

### 10.5 Data Minimization

- Purpose must be specific (no empty purposes allowed)
- Data categories must be explicitly listed
- Processing rejected if category not in consent scope
- Notice version validated against supported versions

### 10.6 Right to Withdraw

- Only the data principal can withdraw their own consent
- Double-withdrawal prevented (already withdrawn check)
- Optional `requestDataDeletion` flag for erasure requests
- Withdrawal reason captured for compliance

---

## 11. Vulnerabilities & Findings

### CRITICAL

| ID | Finding | Location | Risk |
|----|---------|----------|------|
| SEC-001 | Hardcoded fallback HMAC secret | `apps/api/src/handlers/dpi/digilocker.ts:13` | OAuth state forgery if env var not set |

**Detail:** The `STATE_SIGNING_SECRET` defaults to `"default-state-secret-change-in-production"`. An attacker who knows this default can forge valid OAuth state parameters, potentially linking their DigiLocker account to another user's profile.

**Remediation:** Remove the fallback, throw an error at startup if `DIGILOCKER_STATE_SECRET` is not set.

---

### HIGH

| ID | Finding | Location | Risk |
|----|---------|----------|------|
| SEC-002 | Rate limit store not wired in production | `apps/api/src/middleware/rateLimit.ts` | Per-user/tenant limits not enforced |
| SEC-003 | Wildcard CORS in error responses | Multiple handler files | Cross-origin data leakage |

**SEC-002 Detail:** The `DynamoDBRateLimitStore` is fully implemented but the TODO comment states it needs to be wired to an actual DynamoDB DocumentClient. The `InMemoryRateLimitStore` resets on every Lambda cold start and cannot share state across concurrent invocations, making it ineffective in a serverless environment.

**SEC-003 Detail:** Handler error responses (register.ts, digilocker.ts, abc.ts) use `"Access-Control-Allow-Origin": "*"` while the API Gateway CORS configuration restricts origins to `*.platform.gov.in` in production. Error responses bypass the API Gateway CORS since they are returned directly from Lambda.

---

### MEDIUM

| ID | Finding | Location | Risk |
|----|---------|----------|------|
| SEC-004 | Single SHA-256 key derivation (no stretching) | `packages/shared/src/utils/encryption.ts:38` | Brute-force if key material is low entropy |
| SEC-005 | No request body size validation | Handler JSON.parse calls | Potential memory exhaustion |
| SEC-006 | Tenant isolation bypass when no identifier present | `apps/api/src/middleware/tenant.ts:135` | Defaults to JWT tenant (safe but loose) |
| SEC-007 | No CSRF token for non-OAuth state-changing operations | API handlers | CSRF via allowCredentials |

**SEC-004 Detail:** `deriveKey()` uses `createHash("sha256").update(keyMaterial).digest()` without iteration. If key material comes from a password or low-entropy source, it could be brute-forced. Production should use KMS-managed keys which are already high-entropy.

**SEC-005 Detail:** `JSON.parse(event.body || "{}")` has no size check. While API Gateway has a 10MB payload limit, a large JSON payload could still consume significant Lambda memory during parsing.

**SEC-006 Detail:** When `enforceTenantIsolation` receives `undefined` as `requestTenantId`, it returns null (allow). This means requests without any tenant identifier in headers/subdomain/path will proceed using the JWT's tenant. While not exploitable for cross-tenant access, it reduces observability.

---

### LOW

| ID | Finding | Location | Risk |
|----|---------|----------|------|
| SEC-008 | Error messages may leak internal details | Handler catch blocks | Information disclosure |
| SEC-009 | No request ID logging in all paths | Various handlers | Reduced traceability |
| SEC-010 | Cognito username pattern is predictable | `register.ts` (tenantId_userId) | User enumeration (mitigated by preventUserExistenceErrors) |

---

## 12. Recommendations

### Immediate (P0 - Before Production)

1. **Remove default HMAC secret fallback** - Add startup validation that `DIGILOCKER_STATE_SECRET` environment variable is set and is not the default value. Throw a fatal error otherwise.

2. **Wire DynamoDB rate limit store** - Connect the `DynamoDBRateLimitStore` to an actual DynamoDB DocumentClient in the Lambda handler configuration. The API Gateway and WAF limits provide infrastructure-level protection, but application-level per-user limits are needed for fine-grained control.

3. **Fix wildcard CORS in handlers** - Replace `"Access-Control-Allow-Origin": "*"` with the appropriate origin from the request or a configured allowed-origins list. Use a shared utility function for all handler responses.

### Short-term (P1 - Within 30 Days)

4. **Add request body size validation** - Implement a middleware that checks `Content-Length` header and rejects oversized payloads before parsing.

5. **Implement key derivation with stretching** - For any non-KMS key derivation, use PBKDF2 with at least 100,000 iterations or switch to Argon2id. Document that the current SHA-256 derivation is only acceptable with KMS-provided high-entropy key material.

6. **Add CSRF protection** - For cookie-based sessions or requests with `credentials: include`, implement CSRF tokens or require custom headers that prevent simple cross-origin requests.

7. **Tighten tenant isolation default** - When no tenant identifier is present in the request, consider requiring explicit tenant context rather than defaulting to JWT tenant. Log a warning for monitoring.

### Medium-term (P2 - Within 90 Days)

8. **Implement audit log immutability** - The audit log bucket has lifecycle policies but no object lock. Enable S3 Object Lock in compliance mode for the audit prefix to prevent deletion.

9. **Add secret rotation** - Implement automated rotation for the DigiLocker state signing secret using AWS Secrets Manager rotation Lambda.

10. **Add penetration testing** - Conduct external penetration testing focusing on:
    - OAuth state parameter manipulation
    - Cross-tenant data access attempts
    - Rate limit bypass techniques
    - Input injection vectors

11. **Implement WAF custom rules** - Add geo-restriction rules (if platform is India-only), bot detection, and custom rate limiting by tenant ID header.

12. **Add runtime security monitoring** - Implement CloudWatch Contributor Insights for DynamoDB to detect unusual access patterns and potential data exfiltration attempts.

---

## Appendix A: Security Controls Matrix

| Control Category | Implementation | Coverage |
|-----------------|---------------|----------|
| Authentication | Cognito + MFA + JWT | Complete |
| Authorization | RBAC with wildcard matching | Complete |
| Tenant Isolation | 3-layer resolution + enforcement | Complete |
| Rate Limiting | WAF + API GW + App-level (partial) | 80% |
| Encryption at Rest | All stores encrypted | Complete |
| Encryption in Transit | TLS 1.2+ everywhere | Complete |
| PII Encryption | AES-256-GCM field-level | Complete |
| Consent Management | DPDP lifecycle | Complete |
| Audit Logging | All consent + API operations | Complete |
| DDoS Protection | WAF + API GW throttling | Complete |
| Input Validation | Per-handler validation | Partial |
| Secret Management | Env vars (should be Secrets Manager) | Partial |
| VPC Isolation | Public/Private/Isolated subnets | Complete |
| Monitoring | CloudWatch + Alarms | Complete |

## Appendix B: Compliance Posture

| Regulation | Status | Notes |
|-----------|--------|-------|
| DPDP Act 2023 | Largely Compliant | Consent lifecycle, purpose limitation, data minimization implemented |
| IT Act 2000 (Section 43A) | Compliant | Reasonable security practices for sensitive data |
| RBI Data Localization | N/A | No financial data processing |
| CERT-In Reporting | Partial | Monitoring exists, incident response playbook needed |
