// Utility functions for the API
// SECURITY: All cryptographic functions use industry-standard algorithms

import { nanoid } from 'nanoid';

// =====================================================
// SECURE RANDOM ID GENERATION
// =====================================================

// Generate unique ID with cryptographically secure random bytes
export function generateId(prefix = ''): string {
  const id = nanoid(16);
  return prefix ? `${prefix}-${id}` : id;
}

// Generate ticket number
export function generateTicketNumber(department: string, count: number): string {
  const deptCode = department.substring(0, 3).toUpperCase();
  const num = String(count + 1).padStart(3, '0');
  return `${deptCode}${num}`;
}

// =====================================================
// SECURE PASSWORD HASHING (bcrypt)
// =====================================================

// bcrypt is available via bcryptjs (already in package.json)
// This uses automatic salt generation embedded in the hash
const BCRYPT_ROUNDS = 12; // 12 rounds = ~250ms, good balance of security/speed

// Lazy-load bcrypt to avoid issues in some Cloudflare Workers contexts
let bcryptModule: typeof import('bcryptjs') | null = null;

async function getBcrypt() {
  if (!bcryptModule) {
    bcryptModule = await import('bcryptjs');
  }
  return bcryptModule;
}

// Hash password using bcrypt with automatic salt generation
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length === 0) {
    throw new Error('Password cannot be empty');
  }
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }
  
  const bcrypt = await getBcrypt();
  // bcrypt.auto-generates a random 128-bit salt and embeds it in the hash
  // The resulting hash format: $2a$12$<salt><hash> (60 characters total)
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

// Verify password against bcrypt hash
// Handles both bcrypt hashes and rejects legacy SHA-256 hashes
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }
  
  try {
    const bcrypt = await getBcrypt();
    
    // Check if this is a bcrypt hash (starts with $2a$, $2b$, or $2$)
    if (hash.startsWith('$2')) {
      // New bcrypt hash - use bcrypt.compare (timing-safe)
      return bcrypt.compareSync(password, hash);
    } else {
      // Legacy SHA-256 hash detected - REJECT for security
      // Users with legacy hashes MUST reset their password
      console.warn('[SECURITY] Legacy SHA-256 password hash detected. User must reset password.');
      return false;
    }
  } catch (err) {
    console.error('Password verification error:', err);
    return false;
  }
}

// Verify PIN using bcrypt
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  if (!pin || pin.length !== 4) {
    return false;
  }
  return verifyPassword(pin, hash);
}

// =====================================================
// CRYPTOGRAPHIC HELPERS
// =====================================================

// Generate a secure random token (for password resets, etc.)
export function generateSecureToken(byteLength = 32): string {
  const array = new Uint8Array(byteLength);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Create HMAC-SHA256 signature for webhook verification
export async function createHmacSignature(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );
  
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Verify HMAC-SHA256 signature (timing-safe comparison)
export async function verifyHmacSignature(
  secret: string,
  payload: string,
  signature: string
): Promise<boolean> {
  const expectedSignature = await createHmacSignature(secret, payload);
  
  if (signature.length !== expectedSignature.length) {
    return false;
  }
  
  // Timing-safe comparison to prevent timing attacks
  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  
  return result === 0;
}

// =====================================================
// DATA TRANSFORMATION
// =====================================================

// Format date
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString();
}

// Parse department from ticket
export function parseDepartment(ticketNumber: string): string {
  return ticketNumber.substring(0, 3);
}

// Calculate wait time in minutes
export function calculateWaitTime(createdAt: Date | string): number {
  const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
}

// =====================================================
// INPUT VALIDATION
// =====================================================

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate phone number (Kenyan format)
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^(\+254|254|0)?[1-9]\d{8}$/;
  return phoneRegex.test(phone);
}

// Sanitize input - prevent XSS and injection
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  return input.trim().replace(/["'`;\\]/g, '');
}

// Validate password strength
export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < 8) errors.push('Must be at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('Must contain an uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Must contain a lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('Must contain a number');
  return { valid: errors.length === 0, errors };
}

// =====================================================
// PAGINATION
// =====================================================

export function paginate<T>(items: T[], page: number, pageSize: number): {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
} {
  const total = items.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  
  return {
    items: items.slice(start, end),
    total,
    page,
    pageSize,
    hasMore: end < total,
  };
}

// =====================================================
// HELPERS
// =====================================================

export function now(): string {
  return new Date().toISOString();
}

export function getDepartments(): string[] {
  return ['MED', 'PED', 'GYN', 'OPH', 'DEN', 'ORTH'];
}

export function successResponse<T>(data: T, message?: string) {
  return { success: true, data, message };
}

export function errorResponse(error: string) {
  return { success: false, error };
}

// =====================================================
// PHI MASKING (for HIPAA compliance on public displays)
// =====================================================

// Mask phone: show only last 4 digits
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return '****';
  return '****' + phone.slice(-4);
}

// Mask email: j***@example.com
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '****';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return '**@' + domain;
  return local[0] + '*'.repeat(Math.min(local.length - 2, 4)) + '@' + domain;
}

// Mask name: "John Smith" -> "John S." (for TV display)
export function maskName(fullName: string): string {
  if (!fullName) return '***';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

// Mask patient ID: show first 4 chars only
export function maskPatientId(id: string): string {
  if (!id || id.length < 6) return '****';
  return id.slice(0, 4) + '*'.repeat(Math.min(id.length - 4, 8));
}
