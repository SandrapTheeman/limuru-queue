import { Hono } from 'hono';
import { z } from 'zod';
import type { Bindings } from '../types';
import { generateId, hashPassword, successResponse, errorResponse, now } from '../utils';

const patients = new Hono<{ Bindings: Bindings }>();

const patientUpdateSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
  address: z.string().max(500).optional(),
  emergency_contact_name: z.string().optional(),
  emergency_phone: z.string().optional(),
  emergency_email: z.string().email().optional(),
  national_id: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
});

const quickRegisterSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  hmsPatientId: z.string().optional(),
});

const registerSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().max(500).optional(),
  emergencyContact: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
  }).optional(),
});

const searchSchema = z.object({
  query: z.string().min(1).max(100),
  limit: z.number().int().min(1).max(100).optional().default(10),
});

patients.get('/', async (c) => {
  const db = c.env.DB;
  const query = c.req.query();
  const search = query.search || '';
  const limit = parseInt(query.limit || '20');
  const offset = parseInt(query.offset || '0');
  const role = query.role;

  let sql = 'SELECT id, first_name, last_name, email, phone, created_at FROM patients WHERE 1=1';
  const params: unknown[] = [];

  if (search) {
    sql += ' AND (first_name LIKE ? OR last_name LIKE ? OR phone LIKE ? OR email LIKE ? OR national_id LIKE ?)';
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const result = await db.prepare(sql).bind(...params).all();
  
  // Map results to include combined name
  const patientsWithName = (result.results || []).map((p: any) => ({
    ...p,
    name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
  }));
  
  const countSql = sql.replace(/ORDER BY.*LIMIT.*OFFSET.*/, '').replace('SELECT id, first_name, last_name, email, phone, created_at', 'SELECT COUNT(*) as count');
  const countResult = await db.prepare(countSql).bind(...params.slice(0, -2)).first() as { count: number };

  return c.json(successResponse({
    patients: patientsWithName,
    total: countResult?.count || 0,
    limit,
    offset,
    hasMore: offset + limit < (countResult?.count || 0),
  }));
});

patients.get('/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  const patient = await db.prepare(`
    SELECT id, first_name, last_name, email, phone, date_of_birth, address, 
           emergency_contact_name, emergency_phone, emergency_email,
           national_id, hms_patient_id, created_at
    FROM patients WHERE id = ?
  `).bind(id).first();

  if (!patient) {
    return c.json(errorResponse('Patient not found'), 404);
  }

  const p: any = patient;
  return c.json(successResponse({
    ...patient,
    name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
  }));
});

patients.patch('/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => null);

  if (!body) {
    return c.json(errorResponse('Missing update data'), 400);
  }

  const validation = patientUpdateSchema.safeParse(body);
  if (!validation.success) {
    return c.json(errorResponse(validation.error.errors.map(e => e.message).join(', ')), 400);
  }

  const allowedFields = ['email', 'phone', 'date_of_birth', 'address', 'emergency_contact_name', 'emergency_phone', 'emergency_email', 'national_id', 'first_name', 'last_name'];
  const updates: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(validation.data)) {
    if (allowedFields.includes(key) && value !== undefined) {
      updates.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (updates.length === 0) {
    return c.json(errorResponse('No valid fields to update'), 400);
  }

  updates.push('updated_at = ?');
  values.push(now(), id);

  await db.prepare(`UPDATE patients SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

  const patient = await db.prepare('SELECT * FROM patients WHERE id = ?').bind(id).first();

  return c.json(successResponse(patient));
});

patients.post('/quick-register', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json().catch(() => null);

  const validation = quickRegisterSchema.safeParse(body);
  if (!validation.success) {
    return c.json(errorResponse(validation.error.errors.map(e => e.message).join(', ')), 400);
  }

  const { name, phone, email, hmsPatientId } = validation.data;
  const nameParts = name.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  
  const id = generateId('patient');

  await db.prepare(`
    INSERT INTO patients (id, first_name, last_name, phone, email, hms_patient_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, firstName, lastName, phone || null, email || null, hmsPatientId || null, now()).run();

  const patient = await db.prepare('SELECT * FROM patients WHERE id = ?').bind(id).first();

  return c.json(successResponse(patient), 201);
});

patients.get('/:id/queue-position', async (c) => {
  const db = c.env.DB;
  const patientId = c.req.param('id');

  const activeVisit = await db.prepare(`
    SELECT v.id, v.ticket_number, v.department_id, v.status, v.priority, v.created_at,
           (SELECT COUNT(*) FROM queue_tickets v2 
            WHERE v2.department_id = v.department_id 
            AND v2.status = 'waiting' 
            AND v2.priority = 0
            AND v2.created_at < v.created_at) as position
    FROM queue_tickets v
    WHERE v.patient_id = ? AND v.status IN ('waiting', 'called', 'serving')
    ORDER BY v.created_at DESC
    LIMIT 1
  `).bind(patientId).first();

  if (!activeVisit) {
    return c.json(successResponse({ inQueue: false }));
  }

  return c.json(successResponse({
    inQueue: true,
    visitId: activeVisit.id,
    ticketNumber: activeVisit.ticket_number,
    department: activeVisit.department_id,
    status: activeVisit.status,
    priority: activeVisit.priority,
    position: (activeVisit.position as number) + 1,
    joinedAt: activeVisit.created_at,
  }));
});

patients.post('/search', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json().catch(() => null);
  
  const validation = searchSchema.safeParse(body);
  if (!validation.success) {
    return c.json(errorResponse(validation.error.errors.map(e => e.message).join(', ')), 400);
  }

  const { query, limit } = validation.data;
  const searchPattern = `%${query}%`;

  const result = await db.prepare(`
    SELECT id, first_name, last_name, email, phone, created_at
    FROM patients 
    WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ? OR national_id LIKE ?
    LIMIT ?
  `).bind(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, limit).all();

  const patientsWithName = (result.results || []).map((p: any) => ({
    ...p,
    name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
  }));

  return c.json(successResponse({
    results: patientsWithName,
    total: result.results?.length || 0,
  }));
});

patients.get('/:id/history', async (c) => {
  const db = c.env.DB;
  const patientId = c.req.param('id');
  const limit = parseInt(c.req.query('limit') || '10');
  const offset = parseInt(c.req.query('offset') || '0');

  const result = await db.prepare(`
    SELECT v.*, d.qualification as doctor_name
    FROM queue_tickets v
    LEFT JOIN doctors d ON v.doctor_id = d.id
    WHERE v.patient_id = ?
    ORDER BY v.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(patientId, limit, offset).all();

  const countResult = await db.prepare(
    'SELECT COUNT(*) as count FROM queue_tickets WHERE patient_id = ?'
  ).bind(patientId).first() as { count: number };

  return c.json(successResponse({
    queue_tickets: result.results,
    total: countResult?.count || 0,
    limit,
    offset,
    hasMore: offset + limit < (countResult?.count || 0),
  }));
});

patients.post('/register', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json().catch(() => null);

  const validation = registerSchema.safeParse(body);
  if (!validation.success) {
    return c.json(errorResponse(validation.error.errors.map(e => e.message).join(', ')), 400);
  }

  const { firstName, lastName, email, phone, dateOfBirth, address, emergencyContact } = validation.data;

  const existing = await db.prepare(
    'SELECT id FROM patients WHERE email = ?'
  ).bind(email).first();

  if (existing) {
    return c.json(errorResponse('Email already registered'), 409);
  }

  const id = generateId('patient');
  const defaultPassword = generateId('pass');
  const passwordHash = await hashPassword(defaultPassword);

  await db.prepare(`
    INSERT INTO patients (id, first_name, last_name, email, phone, date_of_birth, address, 
                          emergency_contact_name, emergency_phone, emergency_email,
                          password_hash, requires_password_change, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).bind(id, firstName, lastName, email, phone || null, dateOfBirth || null, address || null, 
          emergencyContact?.name || null, emergencyContact?.phone || null, emergencyContact?.email || null,
          passwordHash, now()).run();

  const patient = await db.prepare('SELECT id, first_name, last_name, email, phone, created_at FROM patients WHERE id = ?').bind(id).first();

  return c.json(successResponse({ ...patient, defaultPassword }), 201);
});

export { patients };
