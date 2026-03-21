# Security Architecture

## 1. Overview

The Limuru Cottage Hospital Queue Management System implements a comprehensive security architecture designed to protect Protected Health Information (PHI) and meet HIPAA-equivalent standards for healthcare applications.

---

## 2. Authentication Architecture

### 2.1 JWT-Based Authentication

```typescript
// Token Structure
interface JWTPayload {
  sub: string;           // User ID
  email: string;         // User email
  role: UserRole;       // Role (admin, doctor, nurse, etc.)
  patientId?: string;    // Patient ID (for patient logins)
  facilityId: string;    // Facility identifier
  iat: number;           // Issued at timestamp
  exp: number;           // Expiration timestamp
}

// Token Configuration
const JWT_CONFIG = {
  algorithm: 'HS256',
  expiresIn: '24h',      // 24 hours for staff
  refreshExpiresIn: '7d' // 7 days for refresh tokens
};
```

### 2.2 Session Management

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Client    │────▶│   API Auth    │────▶│   SESSION_KV  │
│              │     │   Middleware  │     │   (Storage)   │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   Validate   │
                     │   Session    │
                     │   (TTL: 24h) │
                     └──────────────┘
```

### 2.3 Authentication Flows

| Login Type | Endpoint | Use Case |
|------------|----------|----------|
| Staff Login | `POST /api/auth/staff/login` | Doctor, Nurse, Admin login |
| Patient Login | `POST /api/auth/patient/login` | Patient portal access |
| PIN Login | `POST /api/auth/pin/login` | Quick kiosk access |
| Logout | `POST /api/auth/logout` | Session termination |

---

## 3. Authorization (RBAC)

### 3.1 Role Hierarchy

```
                    ┌─────────────────┐
                    │   Super Admin   │
                    │   (system-wide) │
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
            ▼                ▼                ▼
    ┌───────────┐    ┌───────────┐    ┌───────────┐
    │   Admin   │    │  IT Sup   │    │  Facility │
    │(hospital) │    │  (tech)   │    │  Manager  │
    └───────────┘    └───────────┘    └───────────┘
            │
            ▼
    ┌───────────┬───────────┬───────────┬───────────┐
    │           │           │           │           │
    ▼           ▼           ▼           ▼           ▼
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│Doctor │ │ Nurse │ │Recept.│ │Pharmac│ │Lab Tech│
└───────┘ └───────┘ └───────┘ └───────┘ └───────┘
```

### 3.2 Permission Matrix

| Resource | Admin | Doctor | Nurse | Receptionist | Patient |
|----------|-------|--------|-------|--------------|---------|
| Queue Management | CRUD | CRUD | RU | CRU | R (own) |
| Patients | CRUD | RU | RU | CRU | R (own) |
| Appointments | CRUD | RU | RU | CRU | CRU (own) |
| Clinical Notes | R | CRU | R | - | R (own) |
| Messages | CRUD | CRU | CRU | CRU | CRU (own) |
| Admin Settings | CRUD | R | R | R | - |
| Users | CRUD | - | - | R | - |
| Analytics | R | R | R | R | R (own) |

### 3.3 Middleware Implementation

```typescript
// Role-based authorization middleware
const requireRole = (roles: string[]) => async (c, next) => {
  const userRole = c.get('userRole');
  
  if (!userRole || !roles.includes(userRole)) {
    return c.json(errorResponse('Insufficient permissions'), 403);
  }
  
  await next();
};

// Usage
queue.post('/call', requireRole(['admin', 'doctor', 'nurse', 'receptionist']), async (c) => {
  // Handler logic
});
```

---

## 4. Data Protection

### 4.1 PHI Protection

```typescript
// Privacy rules for patient data
const PHI_PROTECTION = {
  // Patient numbers shown instead of names on public displays
  displayPrivacy: {
    tvDisplay: ['patient_number', 'department', 'status', 'position'],
    kioskDisplay: ['patient_number', 'department'],
    allowedFields: ['patient_number', 'ticket_number']
  },
  
  // Audit logging for all PHI access
  auditRequired: [
    'patients/*',
    'queue/*',
    'notes/*',
    'vitals/*'
  ]
};
```

### 4.2 Data Encryption

| Layer | Protection | Implementation |
|-------|------------|----------------|
| Transit | TLS 1.3 | Cloudflare Edge HTTPS |
| Storage | Server-side | Cloudflare D1/R2 encryption |
| Sessions | Encrypted tokens | JWT with signature |

### 4.3 Input Validation

```typescript
// Zod schemas for input validation
const patientSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional(),
  phone: z.string().regex(/^\+?[0-9]{9,15}$/).optional(),
  dateOfBirth: z.string().refine(date => !isNaN(Date.parse(date))),
  nationalId: z.string().regex(/^[0-9]{6,10}$/).optional()
});

const queueEntrySchema = z.object({
  patientId: z.string().uuid(),
  departmentId: z.string().uuid(),
  priority: z.enum(['1', '2', '3', '4']),
  complaint: z.string().max(500).optional()
});
```

---

## 5. Rate Limiting

### 5.1 Rate Limit Configuration

```typescript
const RATE_LIMITS = {
  // General API limits
  api: {
    windowMs: 60 * 1000,      // 1 minute window
    max: 100,                  // 100 requests per minute
    message: 'Too many requests, please try again later'
  },
  
  // Authentication limits (stricter)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minute window
    max: 5,                    // 5 attempts per window
    lockoutMs: 30 * 60 * 1000 // 30 minute lockout
  },
  
  // Patient-facing limits
  public: {
    windowMs: 60 * 1000,
    max: 30
  }
};
```

### 5.2 Implementation

```typescript
// Rate limit middleware using KV
const rateLimit = async (c, next) => {
  const kv = c.env.RATE_LIMIT_KV;
  const ip = c.req.header('CF-Connecting-IP');
  const key = `ratelimit:${ip}:${Date.now()}`;
  
  const current = await kv.get(key);
  const count = parseInt(current || '0') + 1;
  
  if (count > RATE_LIMITS.api.max) {
    return c.json(errorResponse(RATE_LIMITS.api.message), 429);
  }
  
  await kv.put(key, count.toString(), { expirationTtl: 60 });
  await next();
};
```

---

## 6. Audit Logging

### 6.1 Audit Events

```typescript
const AUDIT_EVENTS = {
  // Authentication
  LOGIN: 'auth.login',
  LOGOUT: 'auth.logout',
  LOGIN_FAILED: 'auth.login_failed',
  PASSWORD_CHANGE: 'auth.password_change',
  
  // Patient Data
  PATIENT_VIEW: 'patient.view',
  PATIENT_CREATE: 'patient.create',
  PATIENT_UPDATE: 'patient.update',
  PATIENT_DELETE: 'patient.delete',
  
  // Queue Operations
  QUEUE_CREATE: 'queue.create',
  QUEUE_CALL: 'queue.call',
  QUEUE_COMPLETE: 'queue.complete',
  QUEUE_TRANSFER: 'queue.transfer',
  
  // Clinical
  NOTE_CREATE: 'clinical.note_create',
  NOTE_UPDATE: 'clinical.note_update',
  VITALS_RECORD: 'clinical.vitals_record'
};
```

### 6.2 Audit Log Schema

```sql
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSON,
  ip_address TEXT,
  user_agent TEXT,
  facility_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
```

---

## 7. Security Headers

### 7.1 Required Headers

```typescript
const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
};
```

### 7.2 CORS Configuration

```typescript
const CORS_CONFIG = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://limuruhospital.co.ke', 'https://www.limuruhospital.co.ke']
    : ['http://localhost:3000', 'http://localhost:3001'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Role'],
  exposedHeaders: ['X-Total-Count'],
  credentials: true,
  maxAge: 86400
};
```

---

## 8. Secrets Management

### 8.1 Required Secrets

| Secret | Purpose | Rotation |
|--------|---------|----------|
| JWT_SECRET | JWT signing key | Every 90 days |
| DEFAULT_PASSWORD | Default user password | After initial setup |
| TWILIO_* | SMS/WhatsApp | Every 180 days |
| DATABASE_URL | Database connection | As needed |

### 8.2 Secret Storage

```bash
# Using Wrangler secrets (Cloudflare Workers)
wrangler secret put JWT_SECRET
wrangler secret put DEFAULT_PASSWORD

# Never commit secrets to version control
# .gitignore should include:
# .env
# .env.local
# .env.production
```

---

## 9. Security Checklist

### 9.1 Pre-Deployment

- [ ] JWT_SECRET is set and secure (minimum 32 characters)
- [ ] DEFAULT_PASSWORD is changed immediately after first login
- [ ] All secrets are set via `wrangler secret`
- [ ] CORS is configured for production domains only
- [ ] Rate limiting is enabled
- [ ] Security headers are set
- [ ] Input validation schemas are in place
- [ ] Audit logging is active

### 9.2 Post-Deployment

- [ ] SSL/TLS is enforced (HTTPS only)
- [ ] Custom domain is configured
- [ ] Monitoring is set up (Sentry)
- [ ] Backup procedures are tested
- [ ] Incident response plan is documented

### 9.3 Ongoing

- [ ] Review audit logs weekly
- [ ] Rotate secrets quarterly
- [ ] Update dependencies monthly
- [ ] Conduct security assessments quarterly
- [ ] Test incident response annually

---

## 10. Incident Response

### 10.1 Security Incident Types

| Severity | Examples | Response Time |
|----------|---------|---------------|
| Critical | Data breach, unauthorized access | 1 hour |
| High | Service disruption, suspicious activity | 4 hours |
| Medium | Performance issues, failed logins | 24 hours |
| Low | Minor bugs, feature requests | 72 hours |

### 10.2 Response Procedure

1. **Detect:** Identify the incident (alerts, logs, reports)
2. **Contain:** Isolate affected systems
3. **Eradicate:** Remove the threat
4. **Recover:** Restore normal operations
5. **Document:** Record incident details and lessons learned

### 10.3 Contact Information

| Role | Contact | Responsibility |
|------|---------|----------------|
| IT Security | security@limuruhospital.co.ke | Incident response coordination |
| IT Support | it-support@limuruhospital.co.ke | Technical investigation |
| Hospital Administration | admin@limuruhospital.co.ke | Business impact assessment |
| Legal/Compliance | legal@limuruhospital.co.ke | Regulatory notification |
