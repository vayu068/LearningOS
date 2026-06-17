# DPI Compliance Documentation

## Overview

LearningOS integrates with India's Digital Public Infrastructure (DPI) ecosystem, including APAAR (Automated Permanent Academic Account Registry), DigiLocker, and the Academic Bank of Credits (ABC). All integrations fully comply with the Digital Personal Data Protection (DPDP) Act, 2023.

## APAAR Integration

### Purpose
APAAR provides a unique 12-digit lifelong identifier for every student in India's education system, enabling seamless academic mobility and record tracking.

### Integration Points

| Operation | Endpoint | Consent Required | Data Categories |
|-----------|----------|-----------------|-----------------|
| ID Verification | POST /dpi/apaar/verify | Yes | personal_identity |
| Profile Fetch | GET /dpi/apaar/profile/{id} | Yes | personal_identity, academic_records |
| Enrollment Update | POST /dpi/apaar/enrollment | Yes | academic_records |
| Status Check | GET /dpi/apaar/status/{id} | No (public info) | None |

### Data Flow
1. Student provides APAAR ID during onboarding
2. Platform collects consent for `dpi_integration` purpose
3. API verifies ID against APAAR registry
4. On success, profile data is cached locally (with TTL)
5. Enrollment updates are pushed when students complete courses

### Security Controls
- APAAR ID validated (12-digit format) before any API call
- Consent artifact ID included in every request header
- API key and institution ID authentication
- Retry with exponential backoff for transient failures
- All responses logged in audit trail

## DigiLocker Integration

### Purpose
DigiLocker is India's digital document wallet enabling paperless governance. LearningOS uses it for document verification and certificate issuance.

### OAuth2 Flow
```
1. User clicks "Link DigiLocker" in profile settings
2. Platform generates authorization URL with PKCE challenge
3. User redirected to DigiLocker consent screen
4. After approval, DigiLocker redirects back with auth code
5. Platform exchanges code for access/refresh tokens
6. Tokens stored securely for subsequent document operations
```

### Integration Points

| Operation | Endpoint | Consent Required | Scope |
|-----------|----------|-----------------|-------|
| OAuth Authorization | GET /dpi/digilocker/authorize | Yes | openid, profile |
| Token Exchange | POST /dpi/digilocker/callback | Yes | - |
| Document Pull | POST /dpi/digilocker/documents/pull | Yes | docs:pull |
| Document Push | POST /dpi/digilocker/documents/push | Yes | docs:push |
| Certificate Verify | POST /dpi/digilocker/documents/verify | Yes | docs:verify |

### Document Types Supported
- Marksheets (Board exams, university)
- Certificates (completion, merit)
- Degrees (undergraduate, postgraduate)
- Transfer Certificates
- Migration Certificates
- Identity Documents (for verification)

### Security Controls
- PKCE (S256) for OAuth2 authorization code flow
- State parameter for CSRF protection with 10-minute expiry
- Access tokens stored encrypted in DynamoDB (TTL-based expiry)
- Refresh tokens rotated on each use
- Consent verification before every document operation
- Document hashes validated for integrity

## Academic Bank of Credits (ABC)

### Purpose
ABC enables credit accumulation, storage, and transfer across institutions, supporting India's multiple entry/exit policy in higher education.

### Integration Points

| Operation | Endpoint | Consent Required | Data Categories |
|-----------|----------|-----------------|-----------------|
| Get Account | GET /dpi/abc/account/{id} | Yes | academic_records |
| Deposit Credits | POST /dpi/abc/credits/deposit | Yes | academic_records |
| Withdraw Credits | POST /dpi/abc/credits/withdraw | Yes | academic_records |
| Transfer Credits | POST /dpi/abc/credits/transfer | Yes | academic_records |
| Generate Transcript | POST /dpi/abc/transcript | Yes | academic_records, personal_identity |

### Credit Lifecycle
```
Course Completion
    |
    v
Assessment Graded (internal)
    |
    v
Credit Deposit to ABC (with consent)
    |
    v
Credits Available in Student's ABC Account
    |
    +--> Transfer to another institution (on request)
    +--> Generate transcript (on request)
    +--> Withdraw for correction (admin only)
```

### Security Controls
- ABC account ID validated before operations
- APAAR ID cross-verification for identity assurance
- Institution ID included in all requests
- Digital signatures on transcripts
- Transfer requires destination institution approval
- All operations require explicit consent

## DPDP Act Compliance

### Compliance Matrix

| DPDP Requirement | Implementation | Status |
|-----------------|----------------|--------|
| Notice (Section 5) | Multi-version consent notices served before data collection | Implemented |
| Consent (Section 6) | Granular consent per purpose/category with ConsentManager | Implemented |
| Purpose Limitation (Section 4) | Processing restricted to consented purposes only | Implemented |
| Data Minimization | Only required data categories collected per purpose | Implemented |
| Storage Limitation | Retention policies auto-delete/anonymize on expiry | Implemented |
| Right to Access (Section 11) | DSAR portal with automated data export | Implemented |
| Right to Erasure (Section 12) | Automated deletion with legal retention exceptions | Implemented |
| Right to Correction (Section 11) | Self-service profile correction with audit trail | Implemented |
| Data Portability | JSON/CSV/PDF export via DSAR | Implemented |
| Guardian Consent (Section 9) | Required for users under 18 with verification | Implemented |
| Breach Notification (Section 8) | Automated detection and 72-hour notification pipeline | Implemented |
| Grievance Redressal (Section 13) | In-app grievance mechanism with SLA tracking | Implemented |

### Consent Management

#### Consent Purposes
1. **education_delivery** - Core learning content delivery
2. **assessment** - Assessment creation and grading
3. **ai_personalization** - AI-powered content recommendations
4. **analytics** - Learning analytics and progress tracking
5. **communication** - Notifications and messaging
6. **dpi_integration** - APAAR/DigiLocker/ABC operations
7. **third_party_sharing** - Sharing with partner institutions
8. **research** - Anonymized research usage

#### Data Categories
1. **personal_identity** - Name, email, phone, APAAR ID
2. **academic_records** - Grades, certificates, enrollment
3. **learning_activity** - Session data, content interactions
4. **assessment_data** - Answers, scores, AI-generated feedback
5. **behavioral_data** - Usage patterns, preferences
6. **health_data** - Accessibility needs, accommodations
7. **biometric_data** - Exam authentication (if enabled)
8. **location_data** - For offline content sync
9. **communication_data** - Messages, notifications

### Data Retention Policies

| Category | Retention | Post-Withdrawal | Expiry Action |
|----------|-----------|-----------------|---------------|
| Personal Identity | 7 years | 180 days | Anonymize |
| Academic Records | 10 years | 10 years | Archive |
| Learning Activity | 1 year | Immediate delete | Anonymize |
| Assessment Data | 7 years | 1 year | Archive |
| Behavioral Data | 6 months | Immediate delete | Delete |
| Health Data | 5 years | 90 days | Delete |
| Biometric Data | 3 months | Immediate delete | Delete |
| Location Data | 1 month | Immediate delete | Delete |
| Communication Data | 1 year | Immediate delete | Anonymize |

### Data Subject Access Requests (DSAR)

#### Supported Request Types
- **Access**: Export all personal data in JSON/CSV/PDF format
- **Rectification**: Correct inaccurate personal data
- **Erasure**: Delete personal data (right to be forgotten)
- **Portability**: Export data in machine-readable format
- **Restriction**: Limit processing of specific data
- **Objection**: Object to specific processing purposes

#### Processing SLA
- Acknowledgment: Within 24 hours
- Identity verification: Required before processing
- Completion: Within 30 days (per DPDP Act)
- Extension: Up to 45 days for complex requests (with notification)

### Audit Trail

All data operations are logged with:
- Actor (user/system/admin) and their tenant context
- Action performed (read/write/update/delete/export/share)
- Data subject whose data was accessed
- Data categories involved
- Consent artifact authorizing the access
- Result (success/denied/error)
- Timestamp and IP address

Audit logs are:
- Immutable (append-only CloudWatch Logs)
- Retained for 2+ years
- Encrypted at rest
- Accessible only to platform administrators

## Minor User Protection

### Age Verification
- Date of birth collected during registration
- Users under 18 flagged as minors
- APAAR integration provides age verification

### Guardian Consent Flow
1. Minor attempts registration
2. Platform blocks until guardian identified
3. Guardian receives consent request
4. Guardian verifies identity (Aadhaar/DigiLocker/manual)
5. Guardian grants consent for specific purposes
6. Minor's account activated with guardian oversight

### Restrictions for Minors
- AI personalization requires guardian opt-in
- Behavioral data collection requires guardian consent
- Third-party sharing disabled by default
- Enhanced content filtering enabled
- Guardian can withdraw consent at any time
