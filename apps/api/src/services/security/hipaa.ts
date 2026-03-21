// HIPAA Compliance Features - Audit Logging, Data Masking, Session Timeout, RBAC
import { Context } from 'hono';
import { UserRole } from '../../types';

interface AuditLogEntry {
  timestamp?: string;
  userId?: string;
  userRole?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  phiAccessed?: boolean;
  details?: Record<string, unknown>;
}

interface RBACPermission {
  resource: string;
  actions: string[];
}

const RBAC_CONFIG: Record<UserRole, RBACPermission[]> = {
  super_admin: [
    { resource: '*', actions: ['*'] },
  ],
  admin: [
    { resource: '*', actions: ['*'] },
  ],
  doctor: [
    { resource: 'patients', actions: ['read', 'update'] },
    { resource: 'queue_tickets', actions: ['read', 'create', 'update'] },
    { resource: 'queue', actions: ['read', 'call', 'start', 'complete'] },
    { resource: 'medical_records', actions: ['read', 'create'] },
  ],
  nurse: [
    { resource: 'patients', actions: ['read'] },
    { resource: 'queue_tickets', actions: ['read', 'update'] },
    { resource: 'queue', actions: ['read', 'call'] },
  ],
  receptionist: [
    { resource: 'patients', actions: ['read', 'create', 'update'] },
    { resource: 'queue', actions: ['read', 'create', 'call'] },
  ],
  patient: [
    { resource: 'own_profile', actions: ['read', 'update'] },
    { resource: 'own_visits', actions: ['read'] },
    { resource: 'queue', actions: ['read'] },
  ],
  pharmacist: [
    { resource: 'prescriptions', actions: ['read', 'update'] },
    { resource: 'patients', actions: ['read'] },
  ],
  lab_tech: [
    { resource: 'lab_orders', actions: ['read', 'update'] },
    { resource: 'patients', actions: ['read'] },
  ],
  facility_manager: [
    { resource: 'rooms', actions: ['read', 'create', 'update'] },
    { resource: 'settings', actions: ['read', 'update'] },
  ],
  it_support: [
    { resource: '*', actions: ['read'] },
    { resource: 'system', actions: ['read', 'update'] },
  ],
};

export function logAuditEvent(
  db: D1Database,
  entry: Omit<AuditLogEntry, 'timestamp'>
): Promise<void> {
  // Apply PHI masking to sensitive data
  const maskedEntry = maskPHIInLog(entry);
  
  // Map to actual schema columns - include created_at explicitly
  const query = `
    INSERT INTO audit_logs (
      id, facility_id, user_id, action, entity_type, entity_id, 
      description, ip_address, user_agent, phi_accessed, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const id = generateId('audit');
  const facilityId = 'ddd49b309b9fd5449d47077c22ee2772'; // Default facility ID
  const userId = maskedEntry.userId || null;
  const action = maskedEntry.action || 'UNKNOWN';
  const entityType = maskedEntry.resource || 'system';
  const entityId = maskedEntry.resourceId || null;
  const description = maskedEntry.details ? JSON.stringify(maskedEntry.details) : null;
  const ipAddress = maskedEntry.ipAddress || null;
  const userAgent = maskedEntry.userAgent || null;
  const phiAccessed = maskedEntry.phiAccessed ? 1 : 0;
  const createdAt = new Date().toISOString();

  return db.prepare(query).bind(
    id, facilityId, userId, action, entityType, entityId,
    description, ipAddress, userAgent, phiAccessed, createdAt
  ).run().then(() => {});
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

function maskPHIInLog(entry: AuditLogEntry): AuditLogEntry {
  const masked = { ...entry };
  
  if (masked.details) {
    masked.details = maskObjectPHI(masked.details);
  }
  
  // Remove timestamp since it's not in the schema
  delete masked.timestamp;
  
  return masked;
}

function maskObjectPHI(obj: Record<string, unknown>): Record<string, unknown> {
  const masked: Record<string, unknown> = {};
  const phiFields = ['name', 'email', 'phone', 'dob', 'ssn', 'address', 'diagnosis', 'prescription', 'medical_history'];
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && phiFields.some(f => key.toLowerCase().includes(f))) {
      masked[key] = maskString(value);
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskObjectPHI(value as Record<string, unknown>);
    } else {
      masked[key] = value;
    }
  }
  
  return masked;
}

function maskString(value: string): string {
  if (value.length <= 4) return '***';
  return value.substring(0, 2) + '***' + value.substring(value.length - 2);
}

export function checkRBAC(userRole: UserRole, resource: string, action: string): boolean {
  const permissions = RBAC_CONFIG[userRole];
  
  if (!permissions) return false;
  
  for (const perm of permissions) {
    if (perm.resource === '*' && perm.actions.includes('*')) {
      return true;
    }
    if (perm.resource === resource && (perm.actions.includes('*') || perm.actions.includes(action))) {
      return true;
    }
  }
  
  return false;
}

export function requireRBAC(resource: string, action: string) {
  return async (c: Context, next: () => Promise<void>) => {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { verifyToken } = await import('../auth');
    const payload = await verifyToken(token, c.env);
    
    if (!payload) {
      return c.json({ success: false, error: 'Invalid token' }, 401);
    }
    
    const hasPermission = checkRBAC(payload.role as UserRole, resource, action);
    
    if (!hasPermission) {
      const ip = c.req.header('CF-Connecting-IP') || 'unknown';
      // Fire-and-forget audit log (don't block response on logging failure)
      logAuditEvent(c.env.DB, {
        userId: payload.sub as string,
        userRole: payload.role as string,
        action: 'ACCESS_DENIED',
        resource,
        ipAddress: ip,
        userAgent: c.req.header('User-Agent') || 'unknown',
        success: false,
        phiAccessed: false,
      }).catch(() => {}); // Ignore logging failures
      
      return c.json({ success: false, error: 'Forbidden' }, 403);
    }
    
    await next();
  };
}

export async function checkSessionTimeout(c: Context): Promise<boolean> {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) return false;
  
  const token = authHeader.replace('Bearer ', '');
  const sessionKey = `session:${token.substring(0, 32)}`;
  
  if (!c.env.SESSION_KV) return false;
  
  const sessionData = await c.env.SESSION_KV.get(sessionKey);
  if (!sessionData) return true;
  
  const session = JSON.parse(sessionData);
  const lastActivity = new Date(session.lastActivity).getTime();
  const now = Date.now();
  const timeout = 1800000;
  
  return (now - lastActivity) > timeout;
}

export async function updateSessionActivity(c: Context): Promise<void> {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !c.env.SESSION_KV) return;
  
  const token = authHeader.replace('Bearer ', '');
  const sessionKey = `session:${token.substring(0, 32)}`;
  
  await c.env.SESSION_KV.put(sessionKey, JSON.stringify({
    lastActivity: new Date().toISOString(),
  }), { expirationTtl: 86400 });
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

export function validatePatientData(data: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (data.name && typeof data.name === 'string') {
    if (data.name.length > 200) errors.push('Name too long');
    if (/[<>]/.test(data.name)) errors.push('Invalid characters in name');
  }
  
  if (data.email && typeof data.email === 'string') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push('Invalid email format');
  }
  
  if (data.phone && typeof data.phone === 'string') {
    if (!/^\+?[\d\s-]{10,}$/.test(data.phone)) errors.push('Invalid phone format');
  }
  
  return { valid: errors.length === 0, errors };
}