## Creating File: `.opencode/context/core/standards/04-security.md`

```markdown
# Security Standards
**Document ID:** CORE-STD-04
**Version:** 1.0
**Last Updated:** 2026-03-02
**Owner:** Security Lead

## Purpose

This document defines the security standards, best practices, and requirements for the Hospital Queuing System. Given the sensitive nature of healthcare data, security is paramount to protect patient information and maintain system integrity.

## 1. Security Principles

### 1.1 Core Tenets
- **Defense in Depth**: Multiple layers of security controls
- **Least Privilege**: Minimum necessary access for each role
- **Zero Trust**: Never trust, always verify
- **Security by Design**: Built-in, not bolt-on
- **Privacy by Default**: Patient data protected by default

### 1.2 Regulatory Compliance
| Regulation | Applicability | Key Requirements |
|------------|---------------|------------------|
| **GDPR** | EU patients | Data deletion, export, consent |
| **HIPAA** | US healthcare | PHI protection, audit trails |
| **PIPEDA** | Canadian patients | Consent, data handling |
| **Local Laws** | Kenya | Data protection act 2019 |

## 2. Authentication Standards

### 2.1 Password Policy

```typescript
// lib/auth/password-policy.ts
export const passwordPolicy = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommonPasswords: true,
  maxAgeDays: 90, // Force change every 90 days
  preventReuse: 5, // Cannot reuse last 5 passwords
  maxAttempts: 5, // Lock after 5 failed attempts
  lockoutDuration: 15 * 60 * 1000 // 15 minutes
};

export function validatePasswordStrength(password: string): ValidationResult {
  const errors: string[] = [];
  
  if (password.length < passwordPolicy.minLength) {
    errors.push(`Password must be at least ${passwordPolicy.minLength} characters`);
  }
  
  if (passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (passwordPolicy.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (passwordPolicy.requireSpecialChars && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check against common passwords
  if (passwordPolicy.preventCommonPasswords && commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common. Choose a stronger password');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

### 2.2 Default Password Handling

```typescript
// lib/auth/default-password.ts
export const DEFAULT_PASSWORD = "#Limuru_Cottage_Hospital@2026";

// Hash default password on account creation
export async function hashDefaultPassword(): Promise<string> {
  const salt = await generateSalt();
  const hash = await pbkdf2(DEFAULT_PASSWORD, salt, 10000, 32, 'sha256');
  return `pbkdf2:sha256:10000:${salt}:${hash.toString('hex')}`;
}

// Force password change on first login
export async function handleFirstLogin(patientId: string): Promise<void> {
  await db
    .prepare('UPDATE patients SET requires_password_change = 1 WHERE id = ?')
    .bind(patientId)
    .run();
}
```

### 2.3 Multi-Factor Authentication (Staff)

```typescript
// lib/auth/mfa.ts
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

export class MFAHandler {
  async setupMFA(userId: string): Promise<{ secret: string; qrCode: string }> {
    // Generate secret
    const secret = authenticator.generateSecret();
    
    // Generate QR code
    const otpauth = authenticator.keyuri(userId, 'LimuruHospital', secret);
    const qrCode = await QRCode.toDataURL(otpauth);
    
    // Store secret temporarily
    await this.storePendingSecret(userId, secret);
    
    return { secret, qrCode };
  }
  
  async verifyAndEnableMFA(userId: string, token: string): Promise<boolean> {
    const secret = await this.getPendingSecret(userId);
    
    const isValid = authenticator.verify({
      token,
      secret
    });
    
    if (isValid) {
      await this.enableMFA(userId, secret);
      return true;
    }
    
    return false;
  }
  
  async validateMFAToken(userId: string, token: string): Promise<boolean> {
    const secret = await this.getUserMFASecret(userId);
    return authenticator.verify({ token, secret });
  }
}
```

## 3. Authorization Standards

### 3.1 Role-Based Access Control (RBAC)

```typescript
// lib/auth/roles.ts
export enum Role {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  NURSE = 'nurse',
  RECEPTIONIST = 'receptionist',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

export interface Permission {
  resource: string;
  actions: ('create' | 'read' | 'update' | 'delete' | 'call')[];
  conditions?: Record<string, any>;
}

export const rolePermissions: Record<Role, Permission[]> = {
  [Role.PATIENT]: [
    { resource: 'self', actions: ['read', 'update'] },
    { resource: 'queue', actions: ['read'], conditions: { own: true } },
    { resource: 'visits', actions: ['read'], conditions: { own: true } }
  ],
  
  [Role.DOCTOR]: [
    { resource: 'patients', actions: ['read', 'update'] },
    { resource: 'queue', actions: ['read', 'call'] },
    { resource: 'visits', actions: ['create', 'read', 'update'] },
    { resource: 'notes', actions: ['create', 'read', 'update'] }
  ],
  
  [Role.RECEPTIONIST]: [
    { resource: 'patients', actions: ['create', 'read', 'update'] },
    { resource: 'queue', actions: ['create', 'read'] },
    { resource: 'appointments', actions: ['create', 'read', 'update'] }
  ],
  
  [Role.ADMIN]: [
    { resource: '*', actions: ['create', 'read', 'update', 'delete'] }
  ]
};

// Authorization middleware
export function authorize(requiredRole: Role, resource?: string, action?: string) {
  return async (request: Request, env: Env, ctx: ExecutionContext) => {
    const user = request.user;
    
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    const userRole = user.role as Role;
    const permissions = rolePermissions[userRole] || [];
    
    // Check if user has required permission
    const hasPermission = permissions.some(perm => {
      if (perm.resource === '*' && !resource) return true;
      if (resource && perm.resource !== resource && perm.resource !== '*') return false;
      if (action && !perm.actions.includes(action)) return false;
      
      // Check conditions (e.g., own: true for self data)
      if (perm.conditions?.own && resource === 'self') {
        return user.id === request.params.id;
      }
      
      return true;
    });
    
    if (!hasPermission) {
      return new Response('Forbidden', { status: 403 });
    }
    
    return ctx.next();
  };
}
```

### 3.2 Row-Level Security

```typescript
// lib/db/row-level-security.ts
export function addRowLevelSecurity(query: string, user: User): string {
  switch (user.role) {
    case Role.PATIENT:
      // Patients can only see their own data
      return `${query} AND patient_id = '${user.id}'`;
      
    case Role.DOCTOR:
      // Doctors see patients in their department
      return `${query} AND department = '${user.department}'`;
      
    case Role.RECEPTIONIST:
      // Receptionists see all active patients
      return query;
      
    default:
      return query;
  }
}

// Usage in database queries
export async function getPatients(db: D1Database, user: User) {
  let query = 'SELECT * FROM patients WHERE 1=1';
  query = addRowLevelSecurity(query, user);
  
  return await db.prepare(query).all();
}
```

## 4. Data Protection

### 4.1 Encryption at Rest

```typescript
// lib/encryption/at-rest.ts
import { subtle } from 'crypto';

export class DataEncryption {
  private key: CryptoKey;
  
  async initialize(encryptionKey: string) {
    // Import encryption key
    const keyMaterial = await subtle.importKey(
      'raw',
      new TextEncoder().encode(encryptionKey),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    this.key = await subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
  
  async encrypt(data: string): Promise<EncryptedData> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(data);
    
    const encrypted = await subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.key,
      encoded
    );
    
    return {
      iv: Buffer.from(iv).toString('base64'),
      data: Buffer.from(encrypted).toString('base64')
    };
  }
  
  async decrypt(encrypted: EncryptedData): Promise<string> {
    const iv = Buffer.from(encrypted.iv, 'base64');
    const data = Buffer.from(encrypted.data, 'base64');
    
    const decrypted = await subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.key,
      data
    );
    
    return new TextDecoder().decode(decrypted);
  }
}
```

### 4.2 Encryption in Transit

```typescript
// middleware/https-redirect.ts
export function httpsRedirect(request: Request) {
  const url = new URL(request.url);
  
  // Always use HTTPS in production
  if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    url.protocol = 'https:';
    return Response.redirect(url.toString(), 301);
  }
  
  return null;
}

// HSTS headers
export function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Content-Security-Policy', "default-src 'self'");
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
```

### 4.3 Data Masking

```typescript
// lib/privacy/data-masking.ts
export function maskPatientData(patient: Patient, userRole: Role): MaskedPatient {
  const masked = { ...patient };
  
  if (userRole !== Role.DOCTOR && userRole !== Role.ADMIN) {
    // Mask sensitive data for non-medical staff
    if (masked.phone) {
      masked.phone = masked.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    }
    
    if (masked.email) {
      const [local, domain] = masked.email.split('@');
      masked.email = `${local.charAt(0)}***@${domain}`;
    }
    
    if (masked.dob) {
      // Only show year
      masked.dob = masked.dob.substring(0, 4);
    }
  }
  
  return masked;
}

// API response interceptor
export function maskApiResponse(response: any, user: User): any {
  if (Array.isArray(response)) {
    return response.map(item => maskResponseItem(item, user));
  }
  
  return maskResponseItem(response, user);
}

function maskResponseItem(item: any, user: User): any {
  if (item.patient) {
    item.patient = maskPatientData(item.patient, user.role);
  }
  
  return item;
}
```

## 5. Session Management

### 5.1 JWT Standards

```typescript
// lib/auth/jwt.ts
import { SignJWT, jwtVerify } from 'jose';

export interface JWTPayload {
  sub: string; // User ID
  role: Role;
  department?: string;
  exp: number;
  iat: number;
  jti: string; // Unique token ID
}

export class JWTManager {
  private secret: Uint8Array;
  private kv: KVNamespace;
  
  constructor(secret: string, kv: KVNamespace) {
    this.secret = new TextEncoder().encode(secret);
    this.kv = kv;
  }
  
  async createToken(user: User): Promise<string> {
    const jti = crypto.randomUUID();
    
    const token = await new SignJWT({
      role: user.role,
      department: user.department
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime('24h')
      .setJti(jti)
      .sign(this.secret);
    
    // Store token in KV for revocation
    await this.kv.put(`token:${jti}`, user.id, { expirationTtl: 86400 });
    
    return token;
  }
  
  async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      const { payload } = await jwtVerify(token, this.secret);
      
      // Check if token is revoked
      const exists = await this.kv.get(`token:${payload.jti}`);
      if (!exists) {
        return null;
      }
      
      return payload as JWTPayload;
    } catch (error) {
      return null;
    }
  }
  
  async revokeToken(token: string): Promise<void> {
    try {
      const { payload } = await jwtVerify(token, this.secret);
      await this.kv.delete(`token:${payload.jti}`);
    } catch (error) {
      // Token invalid, ignore
    }
  }
}
```

### 5.2 Session Storage

```typescript
// lib/auth/session.ts
export class SessionStore {
  constructor(private kv: KVNamespace) {}
  
  async createSession(userId: string, metadata: any): Promise<string> {
    const sessionId = crypto.randomUUID();
    
    await this.kv.put(
      `session:${sessionId}`,
      JSON.stringify({
        userId,
        metadata,
        createdAt: Date.now(),
        lastActivity: Date.now()
      }),
      { expirationTtl: 86400 } // 24 hours
    );
    
    return sessionId;
  }
  
  async getSession(sessionId: string): Promise<any | null> {
    const session = await this.kv.get(`session:${sessionId}`, 'json');
    
    if (session) {
      // Update last activity
      session.lastActivity = Date.now();
      await this.kv.put(`session:${sessionId}`, JSON.stringify(session));
    }
    
    return session;
  }
  
  async destroySession(sessionId: string): Promise<void> {
    await this.kv.delete(`session:${sessionId}`);
  }
  
  async cleanupInactiveSessions(): Promise<void> {
    // This would be run as a cron job
    const cutoff = Date.now() - 30 * 60 * 1000; // 30 minutes
    
    // List all sessions (simplified - would need pagination)
    const sessions = await this.kv.list({ prefix: 'session:' });
    
    for (const key of sessions.keys) {
      const session = await this.kv.get(key.name, 'json');
      if (session.lastActivity < cutoff) {
        await this.kv.delete(key.name);
      }
    }
  }
}
```

## 6. API Security

### 6.1 Rate Limiting

```typescript
// middleware/rate-limit.ts
export class RateLimiter {
  constructor(private kv: KVNamespace) {}
  
  async checkLimit(
    identifier: string,
    limit: number = 100,
    windowMs: number = 60000
  ): Promise<RateLimitResult> {
    const key = `ratelimit:${identifier}`;
    const now = Date.now();
    
    // Get current window
    const data = await this.kv.get<RateLimitData>(key, 'json');
    
    if (!data) {
      // First request
      await this.kv.put(
        key,
        JSON.stringify({
          count: 1,
          resetAt: now + windowMs
        }),
        { expirationTtl: Math.ceil(windowMs / 1000) }
      );
      
      return {
        limited: false,
        remaining: limit - 1,
        resetAt: now + windowMs
      };
    }
    
    if (now > data.resetAt) {
      // Window expired
      await this.kv.put(
        key,
        JSON.stringify({
          count: 1,
          resetAt: now + windowMs
        }),
        { expirationTtl: Math.ceil(windowMs / 1000) }
      );
      
      return {
        limited: false,
        remaining: limit - 1,
        resetAt: now + windowMs
      };
    }
    
    if (data.count >= limit) {
      // Rate limited
      return {
        limited: true,
        remaining: 0,
        resetAt: data.resetAt
      };
    }
    
    // Increment count
    data.count++;
    await this.kv.put(key, JSON.stringify(data));
    
    return {
      limited: false,
      remaining: limit - data.count,
      resetAt: data.resetAt
    };
  }
}

// Usage in middleware
export async function rateLimit(request: Request, env: Env) {
  const limiter = new RateLimiter(env.KV);
  
  // Identify by IP or user ID
  const identifier = request.headers.get('CF-Connecting-IP') || 'unknown';
  
  const result = await limiter.checkLimit(identifier, 100, 60000);
  
  if (result.limited) {
    return new Response('Too Many Requests', {
      status: 429,
      headers: {
        'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000).toString()
      }
    });
  }
  
  return null;
}
```

### 6.2 Input Validation

```typescript
// lib/validation/schemas.ts
import { z } from 'zod';

// Prevent NoSQL injection and XSS
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/[&]/, '&amp;')
    .replace(/["]/, '&quot;')
    .replace(/[']/, '&#x27;')
    .replace(/[/]/, '&#x2F;');
};

// Validation schemas
export const PatientInputSchema = z.object({
  name: z.string().min(1).max(100).transform(sanitizeInput),
  email: z.string().email().optional().transform(s => s ? sanitizeInput(s) : s),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  dob: z.string().datetime().optional(),
  department: z.enum(['MED', 'PED', 'CARD', 'EMER']),
  priority: z.boolean().default(false)
});

export const DoctorNoteSchema = z.object({
  patientId: z.string().uuid(),
  notes: z.string().min(1).max(5000).transform(sanitizeInput),
  diagnosis: z.string().optional().transform(s => s ? sanitizeInput(s) : s),
  prescription: z.string().optional().transform(s => s ? sanitizeInput(s) : s)
});

// Validation middleware
export function validateBody<T extends z.ZodSchema>(schema: T) {
  return async (request: Request): Promise<z.infer<T> | Response> => {
    try {
      const body = await request.json();
      const validated = await schema.parseAsync(body);
      return validated;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return new Response(
          JSON.stringify({
            error: 'Validation failed',
            details: error.errors
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      return new Response('Invalid request body', { status: 400 });
    }
  };
}
```

### 6.3 CORS Configuration

```typescript
// middleware/cors.ts
export function handleCORS(request: Request): Response | null {
  const origin = request.headers.get('Origin');
  
  // Allow only hospital domains
  const allowedOrigins = [
    'https://queue.limuruhospital.co.ke',
    'https://admin.limuruhospital.co.ke',
    'https://*.limuruhospital.co.ke'
  ];
  
  if (origin && allowedOrigins.some(allowed => origin.match(allowed))) {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400'
      }
    });
  }
  
  return null;
}

// Handle preflight requests
export function handlePreflight(request: Request): Response | null {
  if (request.method === 'OPTIONS') {
    const corsResponse = handleCORS(request);
    if (corsResponse) {
      return new Response(null, {
        status: 204,
        headers: corsResponse.headers
      });
    }
  }
  
  return null;
}
```

## 7. Audit Logging

### 7.1 Audit Log Structure

```typescript
// lib/audit/logger.ts
export interface AuditEvent {
  id: string;
  timestamp: string;
  userId: string;
  userRole: Role;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failure';
  metadata?: Record<string, any>;
}

export class AuditLogger {
  constructor(private db: D1Database) {}
  
  async log(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    await this.db
      .prepare(`
        INSERT INTO audit_log (
          id, timestamp, user_id, user_role, action,
          resource_type, resource_id, old_value, new_value,
          ip_address, user_agent, status, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        timestamp,
        event.userId,
        event.userRole,
        event.action,
        event.resourceType,
        event.resourceId,
        event.oldValue ? JSON.stringify(event.oldValue) : null,
        event.newValue ? JSON.stringify(event.newValue) : null,
        event.ipAddress,
        event.userAgent,
        event.status,
        event.metadata ? JSON.stringify(event.metadata) : null
      )
      .run();
  }
  
  async query(filters: AuditQuery): Promise<AuditEvent[]> {
    let query = 'SELECT * FROM audit_log WHERE 1=1';
    const params: any[] = [];
    
    if (filters.userId) {
      query += ' AND user_id = ?';
      params.push(filters.userId);
    }
    
    if (filters.action) {
      query += ' AND action = ?';
      params.push(filters.action);
    }
    
    if (filters.resourceType) {
      query += ' AND resource_type = ?';
      params.push(filters.resourceType);
    }
    
    if (filters.fromDate) {
      query += ' AND timestamp >= ?';
      params.push(filters.fromDate);
    }
    
    if (filters.toDate) {
      query += ' AND timestamp <= ?';
      params.push(filters.toDate);
    }
    
    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(filters.limit || 100, filters.offset || 0);
    
    const result = await this.db.prepare(query).bind(...params).all();
    return result.results as AuditEvent[];
  }
}
```

### 7.2 Critical Events to Log

```typescript
// lib/audit/events.ts
export const AuditEvents = {
  // Authentication
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILURE: 'login_failure',
  LOGOUT: 'logout',
  PASSWORD_CHANGE: 'password_change',
  PASSWORD_RESET: 'password_reset',
  MFA_ENABLED: 'mfa_enabled',
  MFA_DISABLED: 'mfa_disabled',
  
  // Patient operations
  PATIENT_CREATED: 'patient_created',
  PATIENT_UPDATED: 'patient_updated',
  PATIENT_DELETED: 'patient_deleted',
  PATIENT_VIEWED: 'patient_viewed',
  
  // Queue operations
  QUEUE_ADDED: 'queue_added',
  QUEUE_CALLED: 'queue_called',
  QUEUE_TRANSFERRED: 'queue_transferred',
  QUEUE_COMPLETED: 'queue_completed',
  QUEUE_NO_SHOW: 'queue_no_show',
  
  // Clinical
  NOTES_ADDED: 'notes_added',
  NOTES_UPDATED: 'notes_updated',
  DIAGNOSIS_ADDED: 'diagnosis_added',
  PRESCRIPTION_ADDED: 'prescription_added',
  
  // Admin
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  USER_DELETED: 'user_deleted',
  ROLE_CHANGED: 'role_changed',
  SYSTEM_CONFIG_CHANGED: 'system_config_changed',
  
  // Security
  PERMISSION_DENIED: 'permission_denied',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity'
};
```

## 8. Secure Development

### 8.1 Dependency Management

```json
// package.json security scripts
{
  "scripts": {
    "security:audit": "npm audit --audit-level=high",
    "security:outdated": "npm outdated",
    "security:snyk": "snyk test",
    "security:dependency-check": "dependency-check ./package.json",
    "security:all": "npm run security:audit && npm run security:snyk"
  }
}
```

### 8.2 Secret Management

```typescript
// lib/secrets/manager.ts
export class SecretManager {
  constructor(private kv: KVNamespace) {}
  
  async getSecret(key: string): Promise<string | null> {
    // Get from KV with encryption
    const encrypted = await this.kv.get(`secret:${key}`);
    if (!encrypted) return null;
    
    // Decrypt (implementation depends on encryption method)
    return this.decrypt(encrypted);
  }
  
  async setSecret(key: string, value: string): Promise<void> {
    // Encrypt before storing
    const encrypted = await this.encrypt(value);
    await this.kv.put(`secret:${key}`, encrypted);
  }
  
  async rotateSecret(key: string): Promise<string> {
    const newValue = this.generateSecureRandom();
    await this.setSecret(key, newValue);
    return newValue;
  }
  
  private generateSecureRandom(): string {
    return crypto.randomBytes(32).toString('base64');
  }
}

// Environment variable validation
export function validateEnvironment(env: Record<string, string>): void {
  const required = [
    'JWT_SECRET',
    'DATABASE_URL',
    'ENCRYPTION_KEY',
    'SMTP_PASSWORD',
    'ADMIN_EMAILS'
  ];
  
  const missing = required.filter(key => !env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Validate secret strength
  if (env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
}
```

### 8.3 Secure Headers

```typescript
// middleware/security-headers.ts
export const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://api.cloudflare.com wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),
  
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin'
};
```

## 9. Incident Response

### 9.1 Security Incident Response Plan

```typescript
// lib/security/incident-response.ts
export enum Severity {
  LOW = 1,      // Minor issue, no data exposure
  MEDIUM = 2,   // Limited impact, potential data exposure
  HIGH = 3,     // Significant breach, data exposed
  CRITICAL = 4  // Major breach, immediate action required
}

export interface SecurityIncident {
  id: string;
  detectedAt: string;
  severity: Severity;
  type: 'breach' | 'attempt' | 'vulnerability' | 'compliance';
  description: string;
  affectedUsers?: string[];
  affectedData?: string[];
  status: 'detected' | 'investigating' | 'contained' | 'resolved' | 'false_positive';
}

export class IncidentResponse {
  async detectIncident(event: any): Promise<SecurityIncident | null> {
    // Implement detection logic
    // This could be triggered by audit log analysis, intrusion detection, etc.
    return null;
  }
  
  async respondToIncident(incident: SecurityIncident): Promise<void> {
    // 1. Containment
    await this.containIncident(incident);
    
    // 2. Investigation
    await this.investigateIncident(incident);
    
    // 3. Notification
    await this.notifyStakeholders(incident);
    
    // 4. Recovery
    await this.recoverFromIncident(incident);
    
    // 5. Post-mortem
    await this.performPostMortem(incident);
  }
  
  private async containIncident(incident: SecurityIncident): Promise<void> {
    switch (incident.severity) {
      case Severity.CRITICAL:
        // Rotate all secrets
        await this.rotateAllSecrets();
        
        // Block affected IPs
        await this.blockIPs(incident);
        
        // Take system offline if necessary
        break;
        
      case Severity.HIGH:
        // Revoke affected tokens
        await this.revokeTokens(incident);
        
        // Isolate affected components
        break;
        
      default:
        // Monitor only
        break;
    }
  }
  
  private async notifyStakeholders(incident: SecurityIncident): Promise<void> {
    const notifications = {
      [Severity.LOW]: ['security-team'],
      [Severity.MEDIUM]: ['security-team', 'it-manager'],
      [Severity.HIGH]: ['security-team', 'it-manager', 'hospital-admin'],
      [Severity.CRITICAL]: ['security-team', 'it-manager', 'hospital-admin', 'legal', 'patients']
    };
    
    // Send notifications (email, SMS, etc.)
    for (const recipient of notifications[incident.severity]) {
      await this.sendNotification(recipient, incident);
    }
  }
}
```

### 9.2 Breach Notification Template

```typescript
// lib/security/breach-notification.ts
export function generateBreachNotification(
  incident: SecurityIncident,
  recipient: 'authority' | 'patient' | 'internal'
): string {
  const templates = {
    authority: `
SECURITY INCIDENT NOTIFICATION
Date: ${new Date().toISOString()}
Incident ID: ${incident.id}
Severity: ${Severity[incident.severity]}

Description: ${incident.description}

Affected Data: ${incident.affectedData?.join(', ') || 'Unknown'}
Affected Users: ${incident.affectedUsers?.length || 0}

Actions Taken:
- Incident contained at ${incident.detectedAt}
- Investigation ongoing
- Affected systems isolated

Contact: security@limuruhospital.co.ke
    `,
    
    patient: `
Dear Patient,

We are writing to inform you of a security incident that may have affected your data.

What happened: ${incident.description}

What data was involved: ${incident.affectedData?.join(', ') || 'Contact information'}

What we are doing: We have contained the incident and are investigating.

What you can do: Please contact us if you notice any suspicious activity.

We apologize for any concern this may cause.

Sincerely,
Limuru Cottage Hospital Security Team
    `
  };
  
  return templates[recipient];
}
```

## 10. Compliance Checklist

### 10.1 GDPR Compliance

```typescript
// lib/compliance/gdpr.ts
export class GDPRCompliance {
  async handleDataDeletionRequest(patientId: string): Promise<void> {
    // 1. Anonymize patient data
    await this.anonymizePatientData(patientId);
    
    // 2. Delete or anonymize all visits
    await this.anonymizeVisits(patientId);
    
    // 3. Remove from any active queues
    await this.removeFromQueue(patientId);
    
    // 4. Log the deletion request
    await this.logDeletionRequest(patientId);
    
    // 5. Provide confirmation to patient
    await this.sendDeletionConfirmation(patientId);
  }
  
  async handleDataExportRequest(patientId: string): Promise<PatientDataExport> {
    // Gather all patient data
    const patient = await this.getPatient(patientId);
    const visits = await this.getPatientVisits(patientId);
    const notes = await this.getPatientNotes(patientId);
    
    return {
      patient,
      visits,
      notes,
      exportDate: new Date().toISOString(),
      format: 'GDPR-compliant JSON'
    };
  }
  
  async getConsentStatus(patientId: string): Promise<ConsentStatus> {
    const consent = await this.db
      .prepare('SELECT * FROM consent_log WHERE patient_id = ? ORDER BY created_at DESC LIMIT 1')
      .bind(patientId)
      .first();
    
    return {
      marketing: consent?.marketing || false,
      dataProcessing: consent?.data_processing || false,
      thirdParty: consent?.third_party || false,
      lastUpdated: consent?.created_at,
      history: await this.getConsentHistory(patientId)
    };
  }
}
```

### 10.2 HIPAA Compliance (for US data)

```typescript
// lib/compliance/hipaa.ts
export class HIPAACompliance {
  // Business Associate Agreement tracking
  async validateBAA(partnerId: string): Promise<boolean> {
    const baa = await this.db
      .prepare('SELECT * FROM baa_agreements WHERE partner_id = ? AND expires_at > ?')
      .bind(partnerId, new Date().toISOString())
      .first();
    
    return !!baa;
  }
  
  // PHI access logging
  async logPHIAccess(access: PHIAccessEvent): Promise<void> {
    await this.db
      .prepare(`
        INSERT INTO phi_access_log (
          id, patient_id, user_id, access_type, purpose,
          timestamp, ip_address
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        crypto.randomUUID(),
        access.patientId,
        access.userId,
        access.accessType,
        access.purpose,
        new Date().toISOString(),
        access.ipAddress
      )
      .run();
  }
  
  // Minimum necessary rule enforcement
  enforceMinimumNecessary(user: User, requestedData: string[]): string[] {
    // Only return data necessary for user's role
    const allowedFields = roleDataFields[user.role] || [];
    return requestedData.filter(field => allowedFields.includes(field));
  }
}
```

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-02 | System | Initial version |

**Review Date:** 2026-06-02
```

**File created successfully: `.opencode/context/core/standards/04-security.md`**

Please confirm if I should proceed with the next file: `.opencode/context/core/standards/05-performance.md`
