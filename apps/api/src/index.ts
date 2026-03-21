// Main API Entry Point - Cloudflare Workers
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { verifyToken } from './services/auth';
import * as queue from './services/queue';
import { generateId, hashPassword, successResponse, errorResponse } from './utils';
import { createAIService } from './services/ai/llm';
import { triageService } from './services/ai/triage';
import { waitTimeService } from './services/ai/waitTime';
import { createTwilioService } from './services/notifications/twilio';
import { createSecurityMiddleware } from './services/security/middleware';
import { logAuditEvent, requireRBAC, checkSessionTimeout, sanitizeInput, validatePatientData } from './services/security/hipaa';
import { routes } from './routes';

type Bindings = {
  DB: D1Database;
  SESSION_KV: KVNamespace;
  CACHE_KV: KVNamespace;
  RATE_LIMIT_KV: KVNamespace;
  ASSETS_BUCKET: R2Bucket;
  BACKUP_BUCKET: R2Bucket;
  QUEUE_ROOM: DurableObjectNamespace;
  PATIENT_SYNC: DurableObjectNamespace;
  ENVIRONMENT: string;
  JWT_SECRET: string;
  DEFAULT_PASSWORD: string;
  OLLAMA_ENDPOINT?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;
  TWILIO_WHATSAPP_NUMBER?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Global middleware
app.use('*', logger());
app.use('*', secureHeaders());
app.use('*', cors({
  origin: ['https://app.limuruhospital.co.ke', 'http://localhost:3000'],
  credentials: true,
}));

// Security middleware
app.use('*', createSecurityMiddleware({
  rateLimit: {
    ip: { windowMs: 60000, maxRequests: 100 },
    user: { windowMs: 60000, maxRequests: 200 },
  },
  csrf: {
    enabled: false, // Disabled for API-only deployment
    cookieName: 'csrf_token',
  },
  sessionTimeout: 1800000,
}));

// Session validation for protected routes
app.use('/api/*', async (c, next) => {
  const path = c.req.path;
  const publicPaths = ['/api/auth/', '/health', '/api/ai/', '/api/queue/:department'];
  const isPublic = publicPaths.some(p => path.startsWith(p.replace(':department', '')));
  
  if (isPublic && !path.includes('/auth/')) {
    return next();
  }
  
  const authHeader = c.req.header('Authorization');
  if (authHeader && path.includes('/auth/')) {
    const timedOut = await checkSessionTimeout(c);
    if (timedOut) {
      return c.json(errorResponse('Session expired. Please login again.'), 401);
    }
  }
  
  await next();
});

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// =====================================================
// AUTH ROUTES (mounted via routes/index.ts)
// Auth routes are defined in apps/api/src/routes/auth.ts
// and mounted at /api/auth/* via app.route('/api', routes)
// =====================================================

// Register patient
app.post('/api/auth/register', async (c) => {
  const { name, email, phone, dob, password } = await c.req.json();
  
  if (!name || !password) {
    return c.json(errorResponse('Missing required fields'), 400);
  }

  const sanitizedName = sanitizeInput(name);
  const sanitizedEmail = email ? sanitizeInput(email) : undefined;
  const sanitizedPhone = phone ? sanitizeInput(phone) : undefined;
  
  const validation = validatePatientData({ name: sanitizedName, email: sanitizedEmail, phone: sanitizedPhone });
  if (!validation.valid) {
    return c.json(errorResponse(validation.errors.join(', ')), 400);
  }
  
  try {
    const patient = await import('./services/auth').then(m => 
      m.registerPatient(c.env.DB, { name: sanitizedName, email: sanitizedEmail, phone: sanitizedPhone, dob, password })
    );
    
    const p: any = patient;
    return c.json(successResponse({
      id: p.id,
      name: p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      email: p.email,
    }), 201);
  } catch (e: any) {
    if (e.message?.includes('UNIQUE constraint')) {
      return c.json(errorResponse('Email already registered'), 409);
    }
    throw e;
  }
});

// Change password
app.post('/api/auth/change-password', async (c) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    return c.json(errorResponse('Unauthorized'), 401);
  }
  
  const user = await verifyToken(token, c.env);
  if (!user) {
    return c.json(errorResponse('Invalid token'), 401);
  }
  
  const { currentPassword, newPassword } = await c.req.json();
  
  const result = await import('./services/auth').then(m =>
    m.changePassword(c.env.DB, user.sub, currentPassword, newPassword, user.role === 'patient')
  );
  
  if (!result) {
    return c.json(errorResponse('Current password is incorrect'), 401);
  }
  
  return c.json(successResponse({ message: 'Password changed successfully' }));
});

// =====================================================
// QUEUE ROUTES
// =====================================================

// Get queue for department
app.get('/api/queue/:department', async (c) => {
  const department = c.req.param('department');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = parseInt(c.req.query('offset') || '0');
  
  const queueData = await queue.getQueue(c.env.DB, department, limit, offset);
  
  return c.json(successResponse(queueData));
});

// Add to queue (kiosk)
app.post('/api/queue', async (c) => {
  const { name, phone, email, department, priority, patientId } = await c.req.json();
  
  if (!name || !department) {
    return c.json(errorResponse('Missing required fields'), 400);
  }
  
  // Check if patient already in queue
  if (patientId) {
    const existing = await c.env.DB.prepare(`
      SELECT * FROM queue_tickets 
      WHERE patient_id = ? AND status IN ('waiting', 'called', 'in_progress')
    `).bind(patientId).first();
    
    if (existing) {
      return c.json(errorResponse('Patient already in queue'), 409);
    }
  }
  
  const result = await queue.addToQueue(c.env.DB, {
    name, phone, email, department, priority, patientId,
  });
  
  return c.json(successResponse({
    id: result.visit.id,
    ticketNumber: result.visit.ticket_number,
    patientId: result.visit.patient_id,
    position: result.position,
    estimatedWaitTime: result.estimatedWaitTime,
    status: result.visit.status,
    createdAt: result.visit.created_at,
  }), 201);
});

// Call patient
app.post('/api/queue/call/:visitId', requireRBAC('queue', 'call'), async (c) => {
  const visitId = c.req.param('visitId');
  const { room, doctorId } = await c.req.json();
  
  if (!room || !doctorId) {
    return c.json(errorResponse('Missing room or doctorId'), 400);
  }
  
  const visit = await queue.callPatient(c.env.DB, visitId, doctorId, room);
  
  if (!visit) {
    return c.json(errorResponse('Visit not found'), 404);
  }
  
  return c.json(successResponse({
    id: visit.id,
    ticketNumber: visit.ticket_number,
    patientName: visit.patient_name,
    room: visit.room_assigned,
    doctorId: visit.doctor_id,
    status: visit.status,
    calledAt: visit.called_at,
  }));
});

// Start consultation
app.post('/api/queue/start/:visitId', requireRBAC('queue', 'start'), async (c) => {
  const visitId = c.req.param('visitId');
  
  const visit = await queue.startConsultation(c.env.DB, visitId);
  
  return c.json(successResponse(visit));
});

// Complete visit (with audit logging)
app.post('/api/queue/complete/:visitId', requireRBAC('visits', 'update'), async (c) => {
  const visitId = c.req.param('visitId');
  const { diagnosis, prescription, doctorNotes } = await c.req.json();
  
  const visit = await queue.completeVisit(c.env.DB, visitId, undefined, doctorNotes || null);

  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const authHeader = c.req.header('Authorization');
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const payload = await verifyToken(token, c.env);
    if (payload) {
      await logAuditEvent(c.env.DB, {
        userId: payload.sub as string,
        userRole: payload.role as string,
        action: 'COMPLETE_VISIT',
        resource: 'visits',
        resourceId: visitId,
        ipAddress: ip,
        userAgent: c.req.header('User-Agent') || 'unknown',
        success: true,
        phiAccessed: true,
        details: { diagnosis: !!diagnosis, prescription: !!prescription },
      });
    }
  }
  
  return c.json(successResponse(visit));
});

// Mark as no-show
app.post('/api/queue/no-show/:visitId', requireRBAC('queue', 'update'), async (c) => {
  const visitId = c.req.param('visitId');
  
  const visit = await queue.markNoShow(c.env.DB, visitId);
  
  return c.json(successResponse(visit));
});

// Transfer patient
app.post('/api/queue/transfer/:visitId', requireRBAC('queue', 'transfer'), async (c) => {
  const visitId = c.req.param('visitId');
  const { department, actorId } = await c.req.json();
  
  if (!department) {
    return c.json(errorResponse('Missing department'), 400);
  }
  
  const visit = await queue.transferPatient(c.env.DB, visitId, department, actorId || 'system');
  
  return c.json(successResponse(visit));
});

// =====================================================
// PATIENT ROUTES
// =====================================================

// Get patient by ID (with audit logging)
app.get('/api/patients/:id', requireRBAC('patients', 'read'), async (c) => {
  const id = c.req.param('id');
  
  const patient = await c.env.DB.prepare(`
    SELECT * FROM patients WHERE id = ?
  `).bind(id).first();
  
  if (!patient) {
    return c.json(errorResponse('Patient not found'), 404);
  }

  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const authHeader = c.req.header('Authorization');
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const payload = await verifyToken(token, c.env);
    if (payload) {
      await logAuditEvent(c.env.DB, {
        userId: payload.sub as string,
        userRole: payload.role as string,
        action: 'READ_PATIENT',
        resource: 'patients',
        resourceId: id,
        ipAddress: ip,
        userAgent: c.req.header('User-Agent') || 'unknown',
        success: true,
        phiAccessed: true,
      });
    }
  }
  
  return c.json(successResponse(patient));
});

// Update patient (with audit logging and input sanitization)
app.put('/api/patients/:id', requireRBAC('patients', 'update'), async (c) => {
  const id = c.req.param('id');
  const updates = await c.req.json();
  
  const validation = validatePatientData(updates);
  if (!validation.valid) {
    return c.json(errorResponse(validation.errors.join(', ')), 400);
  }
  
  const sanitizedUpdates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (typeof value === 'string') {
      sanitizedUpdates[key] = sanitizeInput(value);
    } else {
      sanitizedUpdates[key] = value;
    }
  }
  
  const fields = Object.keys(sanitizedUpdates)
    .map(key => `${key} = ?`)
    .join(', ');
  const values = Object.values(sanitizedUpdates);
  
  await c.env.DB.prepare(`
    UPDATE patients SET ${fields}, updated_at = ? WHERE id = ?
  `).bind(...values, new Date().toISOString(), id).run();
  
  const patient = await c.env.DB.prepare('SELECT * FROM patients WHERE id = ?').bind(id).first();

  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const authHeader = c.req.header('Authorization');
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const payload = await verifyToken(token, c.env);
    if (payload) {
      await logAuditEvent(c.env.DB, {
        userId: payload.sub as string,
        userRole: payload.role as string,
        action: 'UPDATE_PATIENT',
        resource: 'patients',
        resourceId: id,
        ipAddress: ip,
        userAgent: c.req.header('User-Agent') || 'unknown',
        success: true,
        phiAccessed: true,
      });
    }
  }
  
  return c.json(successResponse(patient));
});

// Search patients
app.post('/api/patients/search', async (c) => {
  const { query, limit = 10 } = await c.req.json();
  
  if (!query) {
    return c.json(errorResponse('Missing search query'), 400);
  }
  
  const patients = await c.env.DB.prepare(`
    SELECT id, name, email, phone, created_at as lastVisit
    FROM patients 
    WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?
    LIMIT ?
  `).bind(`%${query}%`, `%${query}%`, `%${query}%`, limit).all();
  
  return c.json(successResponse({
    results: patients.results || [],
    total: patients.results?.length || 0,
  }));
});

// Get patient visit history
app.get('/api/patients/:id/history', async (c) => {
  const patientId = c.req.param('id');
  const limit = parseInt(c.req.query('limit') || '10');
  const offset = parseInt(c.req.query('offset') || '0');
  
  const result = await queue.getPatientVisits(c.env.DB, patientId, limit, offset);
  
  return c.json(successResponse({
    patientId,
    total: result.total,
    visits: result.queue_tickets,
  }));
});

// =====================================================
// DOCTOR ROUTES
// =====================================================

// Get all doctors
app.get('/api/doctors', async (c) => {
  const department = c.req.query('department');
  
  let query = 'SELECT * FROM doctors';
  const params: any[] = [];
  
  if (department) {
    query += ' WHERE department = ?';
    params.push(department);
  }
  
  query += ' ORDER BY created_at DESC';
  
  const doctors = await c.env.DB.prepare(query).bind(...params).all();
  
  return c.json(successResponse(doctors.results || []));
});

// Get doctor by ID
app.get('/api/doctors/:id', async (c) => {
  const id = c.req.param('id');
  
  const doctor = await c.env.DB.prepare('SELECT * FROM doctors WHERE id = ?').bind(id).first();
  
  if (!doctor) {
    return c.json(errorResponse('Doctor not found'), 404);
  }
  
  return c.json(successResponse(doctor));
});

// Update doctor availability
app.put('/api/doctors/:id/status', async (c) => {
  const id = c.req.param('id');
  const { isAvailable, breakUntil } = await c.req.json();
  
  await c.env.DB.prepare(`
    UPDATE doctors SET is_available = ?, break_until = ? WHERE id = ?
  `).bind(isAvailable ? 1 : 0, breakUntil || null, id).run();
  
  const doctor = await c.env.DB.prepare('SELECT * FROM doctors WHERE id = ?').bind(id).first();
  
  return c.json(successResponse(doctor));
});

// =====================================================
// ADMIN ROUTES
// =====================================================

// Get statistics (admin only)
app.get('/api/admin/stats', requireRBAC('admin_stats', 'read'), async (c) => {
  const today = new Date().toISOString().split('T')[0];
  
  // Get today's stats
  const totalVisits = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM queue_tickets WHERE date(created_at) = date(?)
  `).bind(today).first() as { count: number };
  
  const waitingCount = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM queue_tickets WHERE status = 'waiting'
  `).first() as { count: number };
  
  const completedCount = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM queue_tickets WHERE status = 'completed' AND date(completed_at) = date(?)
  `).bind(today).first() as { count: number };
  
  const totalPatients = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM patients
  `).first() as { count: number };
  
  return c.json(successResponse({
    todayVisits: totalVisits?.count || 0,
    waiting: waitingCount?.count || 0,
    completed: completedCount?.count || 0,
    totalPatients: totalPatients?.count || 0,
  }));
});

// Get settings (admin only)
app.get('/api/admin/settings', requireRBAC('settings', 'read'), async (c) => {
  const settings = await c.env.DB.prepare('SELECT * FROM settings').all();
  
  const settingsObj: Record<string, string> = {};
  for (const s of settings.results || []) {
    settingsObj[s.key as string] = s.value as string;
  }
  
  return c.json(successResponse(settingsObj));
});

// Update settings (admin only)
app.put('/api/admin/settings', requireRBAC('settings', 'update'), async (c) => {
  const updates = await c.req.json();
  
  for (const [key, value] of Object.entries(updates)) {
    await c.env.DB.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
    `).bind(key, value, new Date().toISOString(), value, new Date().toISOString()).run();
  }
  
  return c.json(successResponse({ message: 'Settings updated' }));
});

// Get IPTV channels (admin only)
app.get('/api/admin/iptv', requireRBAC('iptv', 'read'), async (c) => {
  const channels = await c.env.DB.prepare(`
    SELECT * FROM iptv_channels ORDER BY display_order ASC
  `).all();
  
  return c.json(successResponse(channels.results || []));
});

// Add IPTV channel (admin only)
app.post('/api/admin/iptv', requireRBAC('iptv', 'create'), async (c) => {
  const { name, url, category, logo } = await c.req.json();
  
  if (!name || !url) {
    return c.json(errorResponse('Missing required fields'), 400);
  }
  
  const id = generateId('channel');
  
  await c.env.DB.prepare(`
    INSERT INTO iptv_channels (id, name, url, category, logo)
    VALUES (?, ?, ?, ?, ?)
  `).bind(id, name, url, category || null, logo || null).run();
  
  const channel = await c.env.DB.prepare('SELECT * FROM iptv_channels WHERE id = ?').bind(id).first();
  
  return c.json(successResponse(channel), 201);
});

// Get all users (admin only)
app.get('/api/admin/users', requireRBAC('users', 'read'), async (c) => {
  const users = await c.env.DB.prepare(`
    SELECT id, email, first_name || ' ' || last_name as name, role, is_active, last_login, created_at
    FROM users ORDER BY created_at DESC
  `).all();
  
  return c.json(successResponse(users.results || []));
});

// Create user (admin only)
app.post('/api/admin/users', requireRBAC('users', 'create'), async (c) => {
  const { email, password, name, role, doctorId } = await c.req.json();
  
  if (!email || !password || !name || !role) {
    return c.json(errorResponse('Missing required fields'), 400);
  }
  
  const id = generateId('user');
  const passwordHash = await hashPassword(password);
  
  await c.env.DB.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, doctor_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, email, passwordHash, name, role, doctorId || null).run();
  
  return c.json(successResponse({ id, email, name, role }), 201);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err?.message || 'Unknown error');
  const message = process.env.NODE_ENV === 'development' 
    ? err.message 
    : 'An unexpected error occurred';
  return c.json(errorResponse(message), 500);
});

// =====================================================
// PASSWORD RESET ROUTES
// =====================================================

// Request password reset
app.post('/api/auth/reset-password/request', async (c) => {
  const { identifier } = await c.req.json();
  
  if (!identifier) {
    return c.json(errorResponse('Missing identifier'), 400);
  }
  
  // Check if patient or staff
  let user: any = null;
  let userType: 'patient' | 'staff' | null = null;
  
  if (identifier.includes('@')) {
    // Try patient first
    const patient = await c.env.DB.prepare(
      'SELECT * FROM patients WHERE email = ?'
    ).bind(identifier).first();
    
    if (patient) {
      user = patient;
      userType = 'patient';
    } else {
      // Try staff
      const staff = await c.env.DB.prepare(
        'SELECT * FROM users WHERE email = ?'
      ).bind(identifier).first();
      
      if (staff) {
        user = staff;
        userType = 'staff';
      }
    }
  } else {
    // Try patient ID
    const patient = await c.env.DB.prepare(
      'SELECT * FROM patients WHERE id = ?'
    ).bind(identifier).first();
    
    if (patient) {
      user = patient;
      userType = 'patient';
    }
  }
  
  if (!user) {
    // Don't reveal if user exists
    return c.json(successResponse({ message: 'If an account exists, a reset link will be sent' }));
  }
  
  // Generate reset token (store in KV for simplicity)
  const resetToken = generateId('reset');
  const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour
  
  // Store token in KV (simplified - in production use proper token storage)
  await c.env.SESSION_KV.put(
    `reset:${resetToken}`,
    JSON.stringify({ userId: user.id, userType, expiresAt }),
    { expirationTtl: 3600 }
  );
  
  // SECURITY: Never expose reset tokens in responses or logs
  // In production, send the token via email instead of logging it
  
  return c.json(successResponse({ 
    message: 'If an account exists, a reset link will be sent'
  }));
});

// Confirm password reset
app.post('/api/auth/reset-password/confirm', async (c) => {
  const { token, newPassword } = await c.req.json();
  
  if (!token || !newPassword) {
    return c.json(errorResponse('Missing token or new password'), 400);
  }
  
  if (newPassword.length < 6) {
    return c.json(errorResponse('Password must be at least 6 characters'), 400);
  }
  
  // Get token data from KV
  const tokenData = await c.env.SESSION_KV.get(`reset:${token}`);
  
  if (!tokenData) {
    return c.json(errorResponse('Invalid or expired token'), 400);
  }
  
  const { userId, userType, expiresAt } = JSON.parse(tokenData);
  
  // Check if expired
  if (new Date(expiresAt) < new Date()) {
    return c.json(errorResponse('Token expired'), 400);
  }
  
  // Hash new password
  const newPasswordHash = await hashPassword(newPassword);
  
  // Update password based on user type
  if (userType === 'patient') {
    await c.env.DB.prepare(
      'UPDATE patients SET password_hash = ?, requires_password_change = 0 WHERE id = ?'
    ).bind(newPasswordHash, userId).run();
  } else {
    await c.env.DB.prepare(
      'UPDATE users SET password_hash = ? WHERE id = ?'
    ).bind(newPasswordHash, userId).run();
  }
  
  // Delete token
  await c.env.SESSION_KV.delete(`reset:${token}`);
  
  return c.json(successResponse({ message: 'Password reset successfully' }));
});

// =====================================================
// AI ROUTES
// =====================================================

// Smart triage assessment
app.post('/api/ai/triage', async (c) => {
  const input = await c.req.json();
  
  const requiredFields = ['chiefComplaint', 'symptoms', 'symptomDuration', 'painLevel', 'medicalHistory', 'allergies'];
  for (const field of requiredFields) {
    if (input[field] === undefined) {
      return c.json(errorResponse(`Missing required field: ${field}`), 400);
    }
  }
  
  const aiService = c.env.CLOUDFLARE_ACCOUNT_ID && c.env.CLOUDFLARE_API_TOKEN
    ? createAIService({ OLLAMA_ENDPOINT: c.env.OLLAMA_ENDPOINT, CLOUDFLARE_ACCOUNT_ID: c.env.CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN: c.env.CLOUDFLARE_API_TOKEN })
    : null;
  
  const result = await triageService.assess(input, aiService);
  
  return c.json(successResponse(result));
});

// Get wait time prediction
app.get('/api/ai/wait-time/:department', async (c) => {
  const department = c.req.param('department');
  
  if (!department) {
    return c.json(errorResponse('Missing department parameter'), 400);
  }
  
  const prediction = await waitTimeService.predict(c.env.DB, department);
  
  return c.json(successResponse(prediction));
});

// List available AI models
app.get('/api/ai/models', async (c) => {
  const aiService = createAIService({ 
    OLLAMA_ENDPOINT: c.env.OLLAMA_ENDPOINT, 
    CLOUDFLARE_ACCOUNT_ID: c.env.CLOUDFLARE_ACCOUNT_ID,
    CLOUDFLARE_API_TOKEN: c.env.CLOUDFLARE_API_TOKEN
  });
  
  const models = await aiService.getAvailableModels();
  
  return c.json(successResponse({
    models,
    configured: {
      ollama: c.env.OLLAMA_ENDPOINT ? true : false,
      cloudflare: c.env.CLOUDFLARE_ACCOUNT_ID && c.env.CLOUDFLARE_API_TOKEN ? true : false,
    },
  }));
});

// =====================================================
// NOTIFICATION ROUTES
// =====================================================

// Send notification
app.post('/api/notifications/send', async (c) => {
  if (!c.env.TWILIO_ACCOUNT_SID || !c.env.TWILIO_AUTH_TOKEN || !c.env.TWILIO_PHONE_NUMBER) {
    return c.json(errorResponse('Twilio not configured'), 503);
  }
  
  const { type, recipient, message, template, variables, priority } = await c.req.json();
  
  if (!type || !recipient || !message) {
    return c.json(errorResponse('Missing required fields: type, recipient, message'), 400);
  }
  
  const twilioService = createTwilioService({
    TWILIO_ACCOUNT_SID: c.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: c.env.TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER: c.env.TWILIO_PHONE_NUMBER,
    TWILIO_WHATSAPP_NUMBER: c.env.TWILIO_WHATSAPP_NUMBER || c.env.TWILIO_PHONE_NUMBER,
  });
  
  if (!twilioService.isValidPhoneNumber(recipient)) {
    return c.json(errorResponse('Invalid phone number'), 400);
  }
  
  let result;
  if (template) {
    result = await twilioService.sendTemplatedMessage(recipient, type, template, variables || {});
  } else if (type === 'sms') {
    result = await twilioService.sendSMS(recipient, message);
  } else if (type === 'whatsapp') {
    result = await twilioService.sendWhatsApp(recipient, message);
  } else if (type === 'voice') {
    const twiml = twilioService.generateTwiml(message);
    result = await twilioService.initiateVoiceCall(recipient, twiml);
  } else {
    return c.json(errorResponse('Invalid notification type'), 400);
  }
  
  // Log notification to database
  if (result.success) {
    await c.env.DB.prepare(`
      INSERT INTO notification_logs (id, patient_id, type, channel, status, sid, message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      generateId('notif'),
      null,
      'outgoing',
      type,
      'sent',
      result.sid,
      message,
      new Date().toISOString()
    ).run();
  }
  
  return c.json(successResponse(result));
});

// Get notification history
app.get('/api/notifications/log/:patientId', async (c) => {
  const patientId = c.req.param('patientId');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = parseInt(c.req.query('offset') || '0');
  
  const logs = await c.env.DB.prepare(`
    SELECT * FROM notification_logs 
    WHERE patient_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).bind(patientId, limit, offset).all();
  
  const total = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM notification_logs WHERE patient_id = ?
  `).bind(patientId).first() as { count: number };
  
  return c.json(successResponse({
    logs: logs.results || [],
    total: total?.count || 0,
  }));
});

// =====================================================
// Durable Objects (required by wrangler.toml)
// =====================================================
export { QueueRoomDO } from './realtime';
export { PatientSyncDO } from './realtime';

// Mount all route modules
app.route('/api', routes);

export default app;
