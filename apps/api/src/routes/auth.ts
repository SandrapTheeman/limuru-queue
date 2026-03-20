import { Hono } from 'hono';
import { z } from 'zod';
import { generateId, hashPassword, successResponse, errorResponse, now, isValidEmail } from '../utils';
import type { Bindings } from '../types';

const auth = new Hono<{ Bindings: Bindings }>();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  password: z.string().min(6),
});

const changePasswordReqSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(6),
});

const resetPasswordRequestReqSchema = z.object({
  email: z.string().email(),
});

const resetPasswordConfirmReqSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(6),
});

const quickRegisterReqSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  hmsPatientId: z.string().optional(),
});

const pinLoginSchema = z.object({
  patientId: z.string(),
  pin: z.string().length(4),
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(6),
});

const resetPasswordRequestSchema = z.object({
  email: z.string().email(),
});

const resetPasswordConfirmSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(6),
});

auth.post('/patient/login', async (c) => {
  const db = c.env.DB;
  const sessionKV = c.env.SESSION_KV;
  
  const body = await c.req.json().catch(() => null);
  if (!body || !body.identifier || !body.password) {
    return c.json(errorResponse('Missing identifier or password'), 400);
  }

  const { identifier, password } = body;
  
  let patient = await db.prepare(
    'SELECT * FROM patients WHERE email = ? OR phone = ? OR id = ?'
  ).bind(identifier, identifier, identifier).first();

  if (!patient) {
    return c.json(errorResponse('Invalid credentials'), 401);
  }

  const passwordHash = await hashPassword(password);
  if (patient.password_hash !== passwordHash) {
    return c.json(errorResponse('Invalid credentials'), 401);
  }

  const token = generateId('token');
  const expiresAt = new Date(Date.now() + 86400000).toISOString();
  
  await sessionKV.put(
    `session:${token}`,
    JSON.stringify({
      userId: patient.id,
      email: patient.email,
      role: 'patient',
      patientId: patient.id,
      name: patient.name,
      expiresAt,
    }),
    { expirationTtl: 86400 }
  );

  return c.json(successResponse({
    token,
    expiresIn: 86400,
    user: {
      id: patient.id,
      name: patient.name,
      email: patient.email,
      requiresPasswordChange: patient.requires_password_change,
    },
  }));
});

auth.post('/staff/login', async (c) => {
  const db = c.env.DB;
  const sessionKV = c.env.SESSION_KV;
  
  const body = await c.req.json().catch(() => null);
  if (!body || !body.email || !body.password) {
    return c.json(errorResponse('Missing email or password'), 400);
  }

  const { email, password } = body;
  
  const user = await db.prepare(
    'SELECT * FROM users WHERE email = ? AND is_active = 1'
  ).bind(email).first();

  if (!user) {
    return c.json(errorResponse('Invalid credentials'), 401);
  }

  const passwordHash = await hashPassword(password);
  if (user.password_hash !== passwordHash) {
    return c.json(errorResponse('Invalid credentials'), 401);
  }

  const token = generateId('token');
  const expiresAt = new Date(Date.now() + 86400000).toISOString();
  
  await sessionKV.put(
    `session:${token}`,
    JSON.stringify({
      userId: user.id,
      email: user.email,
      role: user.role,
      doctorId: user.doctor_id,
      name: user.name,
      expiresAt,
    }),
    { expirationTtl: 86400 }
  );

  await db.prepare(
    'UPDATE users SET last_login = ? WHERE id = ?'
  ).bind(now(), user.id).run();

  return c.json(successResponse({
    token,
    expiresIn: 86400,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  }));
});

auth.post('/pin/login', async (c) => {
  const db = c.env.DB;
  const sessionKV = c.env.SESSION_KV;
  
  const body = await c.req.json().catch(() => null);
  if (!body || !body.pin) {
    return c.json(errorResponse('Missing PIN'), 400);
  }

  const { pin, stationId } = body;
  const pinHash = await hashPassword(pin);
  
  let doctor = await db.prepare(
    'SELECT * FROM doctors WHERE pin_hash = ?'
  ).bind(pinHash).first();

  if (!doctor) {
    return c.json(errorResponse('Invalid PIN'), 401);
  }

  if (doctor.is_available === 0 && !stationId) {
    return c.json(errorResponse('Doctor not available'), 400);
  }

  const token = generateId('token');
  const expiresAt = new Date(Date.now() + 28800000).toISOString();
  
  await sessionKV.put(
    `session:${token}`,
    JSON.stringify({
      userId: doctor.id,
      email: doctor.email,
      role: 'doctor',
      doctorId: doctor.id,
      name: doctor.name,
      department: doctor.department,
      room: doctor.room,
      expiresAt,
    }),
    { expirationTtl: 28800 }
  );

  return c.json(successResponse({
    token,
    expiresIn: 28800,
    user: {
      id: doctor.id,
      name: doctor.name,
      role: 'doctor',
      department: doctor.department,
      room: doctor.room,
    },
  }));
});

auth.post('/logout', async (c) => {
  const sessionKV = c.env.SESSION_KV;
  const authHeader = c.req.header('Authorization');
  
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    await sessionKV.delete(`session:${token}`);
  }

  return c.json(successResponse({ message: 'Logged out successfully' }));
});

auth.post('/refresh', async (c) => {
  const sessionKV = c.env.SESSION_KV;
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader) {
    return c.json(errorResponse('Missing token'), 401);
  }

  const token = authHeader.replace('Bearer ', '');
  const sessionData = await sessionKV.get(`session:${token}`);
  
  if (!sessionData) {
    return c.json(errorResponse('Invalid session'), 401);
  }

  const session = JSON.parse(sessionData);
  
  if (new Date(session.expiresAt) < new Date()) {
    await sessionKV.delete(`session:${token}`);
    return c.json(errorResponse('Session expired'), 401);
  }

  const newToken = generateId('token');
  const newExpiresAt = new Date(Date.now() + 86400000).toISOString();
  
  await sessionKV.put(
    `session:${newToken}`,
    JSON.stringify({
      ...session,
      expiresAt: newExpiresAt,
    }),
    { expirationTtl: 86400 }
  );

  await sessionKV.delete(`session:${token}`);

  return c.json(successResponse({
    token: newToken,
    expiresIn: 86400,
  }));
});

auth.get('/me', async (c) => {
  const sessionKV = c.env.SESSION_KV;
  const db = c.env.DB;
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const token = authHeader.replace('Bearer ', '');
  const sessionData = await sessionKV.get(`session:${token}`);
  
  if (!sessionData) {
    return c.json(errorResponse('Invalid session'), 401);
  }

  const session = JSON.parse(sessionData);
  
  if (session.role === 'patient') {
    const patient = await db.prepare(
      'SELECT id, name, email, phone, created_at FROM patients WHERE id = ?'
    ).bind(session.userId).first();
    
    return c.json(successResponse({
      ...session,
      user: patient,
    }));
  } else {
    const user = await db.prepare(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?'
    ).bind(session.userId).first();
    
    return c.json(successResponse({
      ...session,
      user,
    }));
  }
});

auth.post('/change-password', async (c) => {
  const body = await c.req.json().catch(() => null);
  // TODO: Implement change password
  return c.json({ message: 'Change password endpoint', data: body });
});

auth.post('/forgot-password', async (c) => {
  const db = c.env.DB;
  const sessionKV = c.env.SESSION_KV;
  
  const body = await c.req.json().catch(() => null);
  if (!body || !body.identifier) {
    return c.json(errorResponse('Missing identifier'), 400);
  }

  const { identifier } = body;
  
  let patient = await db.prepare(
    'SELECT * FROM patients WHERE email = ? OR phone = ?'
  ).bind(identifier, identifier).first();
  
  let user = null;
  let userType = 'patient';
  
  if (!patient) {
    user = await db.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).bind(identifier).first();
    userType = 'staff';
  }

  if (!patient && !user) {
    return c.json(successResponse({ message: 'If an account exists, a reset link will be sent' }));
  }

  const resetToken = generateId('reset');
  const expiresAt = new Date(Date.now() + 3600000).toISOString();
  
  const userId = patient ? patient.id : (user as { id: string }).id;
  
  await sessionKV.put(
    `reset:${resetToken}`,
    JSON.stringify({ userId, userType, expiresAt }),
    { expirationTtl: 3600 }
  );

  console.log(`Password reset token for ${identifier}: ${resetToken}`);

  return c.json(successResponse({ 
    message: 'If an account exists, a reset link will be sent',
    debugToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
  }));
});

auth.post('/reset-password', async (c) => {
  const db = c.env.DB;
  const sessionKV = c.env.SESSION_KV;
  
  const body = await c.req.json().catch(() => null);
  if (!body || !body.token || !body.newPassword) {
    return c.json(errorResponse('Missing token or new password'), 400);
  }

  const { token, newPassword } = body;
  
  if (newPassword.length < 6) {
    return c.json(errorResponse('Password must be at least 6 characters'), 400);
  }

  const tokenData = await sessionKV.get(`reset:${token}`);
  
  if (!tokenData) {
    return c.json(errorResponse('Invalid or expired token'), 400);
  }

  const { userId, userType, expiresAt } = JSON.parse(tokenData);
  
  if (new Date(expiresAt) < new Date()) {
    return c.json(errorResponse('Token expired'), 400);
  }

  const newPasswordHash = await hashPassword(newPassword);
  
  if (userType === 'patient') {
    await db.prepare(
      'UPDATE patients SET password_hash = ?, requires_password_change = 0 WHERE id = ?'
    ).bind(newPasswordHash, userId).run();
  } else {
    await db.prepare(
      'UPDATE users SET password_hash = ? WHERE id = ?'
    ).bind(newPasswordHash, userId).run();
  }

  await sessionKV.delete(`reset:${token}`);

  return c.json(successResponse({ message: 'Password reset successfully' }));
});

auth.post('/register', async (c) => {
  const db = c.env.DB;
  
  const body = await c.req.json().catch(() => null);
  if (!body || !body.name || !body.password) {
    return c.json(errorResponse('Missing required fields'), 400);
  }

  const { name, email, phone, dateOfBirth, password } = body;
  
  if (email) {
    const existing = await db.prepare(
      'SELECT id FROM patients WHERE email = ?'
    ).bind(email).first();
    
    if (existing) {
      return c.json(errorResponse('Email already registered'), 409);
    }
  }

  const id = generateId('patient');
  const passwordHash = await hashPassword(password);
  
  await db.prepare(`
    INSERT INTO patients (id, name, email, phone, date_of_birth, password_hash, requires_password_change, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
  `).bind(id, name, email || null, phone || null, dateOfBirth || null, passwordHash, now()).run();

  return c.json(successResponse({
    id,
    name,
    email,
  }), 201);
});

auth.post('/change-password', async (c) => {
  const db = c.env.DB;
  const sessionKV = c.env.SESSION_KV;
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const token = authHeader.replace('Bearer ', '');
  const sessionData = await sessionKV.get(`session:${token}`);
  
  if (!sessionData) {
    return c.json(errorResponse('Invalid session'), 401);
  }

  const session = JSON.parse(sessionData);
  const body = await c.req.json().catch(() => null);
  
  if (!body || !body.currentPassword || !body.newPassword) {
    return c.json(errorResponse('Missing current or new password'), 400);
  }

  const { currentPassword, newPassword } = body;
  
  if (newPassword.length < 6) {
    return c.json(errorResponse('New password must be at least 6 characters'), 400);
  }

  const currentHash = await hashPassword(currentPassword);
  let user;

  if (session.role === 'patient') {
    user = await db.prepare(
      'SELECT * FROM patients WHERE id = ?'
    ).bind(session.userId).first();
    
    if (!user || user.password_hash !== currentHash) {
      return c.json(errorResponse('Current password is incorrect'), 401);
    }
    
    const newHash = await hashPassword(newPassword);
    await db.prepare(
      'UPDATE patients SET password_hash = ?, requires_password_change = 0 WHERE id = ?'
    ).bind(newHash, session.userId).run();
  } else {
    user = await db.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).bind(session.userId).first();
    
    if (!user || user.password_hash !== currentHash) {
      return c.json(errorResponse('Current password is incorrect'), 401);
    }
    
    const newHash = await hashPassword(newPassword);
    await db.prepare(
      'UPDATE users SET password_hash = ? WHERE id = ?'
    ).bind(newHash, session.userId).run();
  }

  return c.json(successResponse({ message: 'Password changed successfully' }));
});

export { auth };
