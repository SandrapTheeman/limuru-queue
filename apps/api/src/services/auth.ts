// Authentication Service
// SECURITY: JWT secrets come from environment variables only
import type { Context, User, Patient, AuthPayload, JWTPayload, UserRole, Bindings } from '../types';
import { hashPassword, verifyPassword, generateId } from '../utils';
import * as jose from 'jose';

// Token expiration times (in seconds)
const TOKEN_EXPIRY = {
  patient: 86400,   // 24 hours
  staff: 28800,     // 8 hours (hospital shift)
  refresh: 604800,  // 7 days for refresh tokens
};

// Get JWT secret from environment - MUST be set in production
function getJwtSecret(env: Bindings): string {
  const secret = env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET environment variable is not set');
  }
  if (secret.length < 32) {
    console.warn('[SECURITY] JWT_SECRET is shorter than recommended (32+ chars)');
  }
  return secret;
}

// Create JWT token - accepts env for secret
export async function createToken(payload: AuthPayload, env: Bindings): Promise<string> {
  const secret = getJwtSecret(env);
  const jwtSecret = new TextEncoder().encode(secret);
  
  // Determine expiration based on role
  let expiresIn = TOKEN_EXPIRY.staff;
  if (payload.role === 'patient') {
    expiresIn = TOKEN_EXPIRY.patient;
  }
  
  const token = await new jose.SignJWT({
    ...payload,
    // Store userId as 'sub' (subject) claim for JWT spec compliance
    sub: payload.userId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expiresIn}s`)
    .sign(jwtSecret);
    
  return token;
}

// Verify JWT token - accepts env for secret
export async function verifyToken(token: string, env: Bindings): Promise<JWTPayload | null> {
  try {
    const secret = getJwtSecret(env);
    const jwtSecret = new TextEncoder().encode(secret);
    
    const { payload } = await jose.jwtVerify(token, jwtSecret);
    
    // Extract standard claims + custom fields
    const result: JWTPayload = {
      sub: payload.sub as string,
      userId: payload.sub as string,
      email: (payload.email as string) || '',
      role: payload.role as UserRole,
      patientId: payload.patientId as string | undefined,
      doctorId: payload.doctorId as string | undefined,
      exp: payload.exp,
      iat: payload.iat,
    };
    
    return result;
  } catch (err: any) {
    // Log specific error types for debugging (not the token itself)
    if (err.code === 'ERR_JWT_EXPIRED') {
      console.warn('[AUTH] Token expired');
    } else if (err.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
      console.warn('[AUTH] Invalid token signature');
    } else {
      console.error('[AUTH] Token verification failed:', err.message);
    }
    return null;
  }
}

// Patient login
export async function patientLogin(
  db: D1Database,
  env: Bindings,
  identifier: string,
  password: string
): Promise<{ token: string; user: Patient; expiresIn: number } | null> {
  let patient: any = null;
  
  if (identifier.includes('@')) {
    const result = await db.prepare(
      'SELECT * FROM patients WHERE email = ?'
    ).bind(identifier).first();
    patient = result;
  } else {
    const result = await db.prepare(
      'SELECT * FROM patients WHERE id = ?'
    ).bind(identifier).first();
    patient = result;
  }
  
  if (!patient || !patient.password_hash) {
    return null;
  }
  
  const isValid = await verifyPassword(password, patient.password_hash as string);
  if (!isValid) {
    return null;
  }
  
  const token = await createToken({
    userId: patient.id as string,
    email: patient.email as string || '',
    role: 'patient' as UserRole,
    patientId: patient.id as string,
  }, env);
  
  // Construct name from first_name + last_name or use existing name
  const patientWithName = {
    ...patient,
    name: patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Patient',
  };
  
  return {
    token,
    user: patientWithName as unknown as Patient,
    expiresIn: TOKEN_EXPIRY.patient,
  };
}

// Staff login
export async function staffLogin(
  db: D1Database,
  env: Bindings,
  email: string,
  password: string
): Promise<{ token: string; user: User; expiresIn: number } | null> {
  const result: any = await db.prepare(
    'SELECT * FROM users WHERE email = ? AND is_active = 1'
  ).bind(email).first();
  
  if (!result) {
    return null;
  }
  
  const isValid = await verifyPassword(password, result.password_hash as string);
  if (!isValid) {
    return null;
  }
  
  // Update last login timestamp
  await db.prepare(
    'UPDATE users SET last_login = ? WHERE id = ?'
  ).bind(new Date().toISOString(), result.id).run();
  
  const token = await createToken({
    userId: result.id as string,
    email: result.email as string,
    role: result.role as UserRole,
    doctorId: result.doctor_id as string | undefined,
  }, env);
  
  // Construct name from first_name + last_name or use existing name
  const userWithName = {
    ...result,
    name: result.name || `${result.first_name || ''} ${result.last_name || ''}`.trim() || 'Staff',
  };
  
  return {
    token,
    user: userWithName as unknown as User,
    expiresIn: TOKEN_EXPIRY.staff,
  };
}

// Doctor PIN login
export async function doctorPinLogin(
  db: D1Database,
  env: Bindings,
  pin: string,
  stationId?: string
): Promise<{ token: string; doctor: any; expiresIn: number } | null> {
  const pinHash = await hashPassword(pin);
  
  const result: any = await db.prepare(
    'SELECT * FROM doctors WHERE pin_hash = ?'
  ).bind(pinHash).first();
  
  let doctor = result;
  if (!doctor) {
    // PIN not found - fail securely (no fallback)
    return null;
  }
  
  // Check if doctor is available (unless stationId is provided for break mode)
  if (doctor.is_available === 0 && !stationId) {
    return null;
  }
  
  const token = await createToken({
    userId: doctor.id as string,
    email: doctor.email as string,
    role: 'doctor' as UserRole,
    doctorId: doctor.id as string,
  }, env);
  
  // Construct name from qualification (doctors don't have first_name/last_name)
  const doctorWithName = {
    ...doctor,
    name: doctor.qualification || doctor.department_id || 'Doctor',
  };
  
  return {
    token,
    doctor: doctorWithName,
    expiresIn: TOKEN_EXPIRY.staff,
  };
}

// Register new patient
export async function registerPatient(
  db: D1Database,
  data: {
    name: string;
    email?: string;
    phone?: string;
    dob?: string;
    password: string;
  }
): Promise<Patient> {
  const id = generateId('patient');
  const passwordHash = await hashPassword(data.password);
  
  // Split name into first_name and last_name
  const nameParts = data.name.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  
  await db.prepare(`
    INSERT INTO patients (id, first_name, last_name, email, phone, date_of_birth, password_hash, requires_password_change)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).bind(id, firstName, lastName, data.email || null, data.phone || null, data.dob || null, passwordHash).run();
  
  const patient: any = await db.prepare('SELECT * FROM patients WHERE id = ?').bind(id).first();
  return patient as unknown as Patient;
}

// Change password (authenticated)
export async function changePassword(
  db: D1Database,
  userId: string,
  currentPassword: string,
  newPassword: string,
  isPatient: boolean
): Promise<boolean> {
  const table = isPatient ? 'patients' : 'users';
  
  const user: any = await db.prepare(
    `SELECT * FROM ${table} WHERE id = ?`
  ).bind(userId).first();
  
  if (!user) {
    return false;
  }
  
  const isValid = await verifyPassword(currentPassword, user.password_hash as string);
  if (!isValid) {
    return false;
  }
  
  const newHash = await hashPassword(newPassword);
  await db.prepare(
    `UPDATE ${table} SET password_hash = ?, requires_password_change = 0 WHERE id = ?`
  ).bind(newHash, userId).run();
  
  return true;
}

// Get user from token (for session validation)
export async function getUserFromToken(
  db: D1Database,
  env: Bindings,
  token: string
): Promise<AuthPayload | null> {
  const payload = await verifyToken(token, env);
  if (!payload) {
    return null;
  }
  
  return {
    userId: payload.sub as string,
    email: payload.email as string,
    role: payload.role as UserRole,
    patientId: payload.patientId as string | undefined,
    doctorId: payload.doctorId as string | undefined,
  };
}
