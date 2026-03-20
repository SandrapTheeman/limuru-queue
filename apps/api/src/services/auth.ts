// Authentication Service
import { Context, User, Patient, AuthPayload, JWTPayload, UserRole } from '../types';
import { hashPassword, verifyPassword, generateId } from '../utils';
import * as jose from 'jose';

// Secret for JWT (should be from environment)
const JWT_SECRET = new TextEncoder().encode(
  'hospital-queue-secret-key-change-in-production'
);

// Create JWT token
export async function createToken(payload: AuthPayload): Promise<string> {
  const token = await new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
  return token;
}

// Verify JWT token
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

// Patient login
export async function patientLogin(
  db: D1Database,
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
  });
  
  return {
    token,
    user: patient as unknown as Patient,
    expiresIn: 86400,
  };
}

// Staff login
export async function staffLogin(
  db: D1Database,
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
  
  // Update last login
  await db.prepare(
    'UPDATE users SET last_login = ? WHERE id = ?'
  ).bind(new Date().toISOString(), result.id).run();
  
  const token = await createToken({
    userId: result.id as string,
    email: result.email as string,
    role: result.role as UserRole,
    doctorId: result.doctor_id as string | undefined,
  });
  
  return {
    token: token,
    user: result as unknown as User,
    expiresIn: 28800,
  };
}

// Doctor PIN login
export async function doctorPinLogin(
  db: D1Database,
  pin: string,
  stationId?: string
): Promise<{ token: string; doctor: any; expiresIn: number } | null> {
  const pinHash = await hashPassword(pin);
  
  const result: any = await db.prepare(
    'SELECT * FROM doctors WHERE pin_hash = ?'
  ).bind(pinHash).first();
  
  let doctor = result;
  if (!doctor) {
    const anyDoctor = await db.prepare('SELECT * FROM doctors LIMIT 1').first();
    if (anyDoctor) {
      return null;
    }
    doctor = {
      id: 'demo-doctor',
      name: 'Demo Doctor',
      email: 'doctor@hospital.co.ke',
      department: 'MED',
      room: '101',
      pin_hash: pinHash,
      is_available: 1,
    };
  }
  
  const token = await createToken({
    userId: doctor.id as string,
    email: doctor.email as string,
    role: 'doctor' as UserRole,
    doctorId: doctor.id as string,
  });
  
  return {
    token: token,
    doctor: doctor,
    expiresIn: 28800,
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
  
  await db.prepare(`
    INSERT INTO patients (id, name, email, phone, dob, password_hash, requires_password_change)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `).bind(id, data.name, data.email || null, data.phone || null, data.dob || null, passwordHash).run();
  
  const patient: any = await db.prepare('SELECT * FROM patients WHERE id = ?').bind(id).first();
  return patient as unknown as Patient;
}

// Change password
export async function changePassword(
  db: D1Database,
  userId: string,
  currentPassword: string,
  newPassword: string,
  isPatient: boolean
): Promise<boolean> {
  const table = isPatient ? 'patients' : 'users';
  const idField = isPatient ? 'id' : 'id';
  
  const user: any = await db.prepare(
    `SELECT * FROM ${table} WHERE ${idField} = ?`
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
    `UPDATE ${table} SET password_hash = ?, requires_password_change = 0 WHERE ${idField} = ?`
  ).bind(newHash, userId).run();
  
  return true;
}

// Get user from token
export async function getUserFromToken(
  db: D1Database,
  token: string
): Promise<AuthPayload | null> {
  const payload = await verifyToken(token);
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
