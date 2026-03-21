import { Hono } from 'hono';
import type { Bindings } from '../types';
import { generateId, hashPassword, successResponse, errorResponse, now } from '../utils';

const patients = new Hono<{ Bindings: Bindings }>();

patients.get('/', async (c) => {
  const db = c.env.DB;
  const query = c.req.query();
  const search = query.search || '';
  const limit = parseInt(query.limit || '20');
  const offset = parseInt(query.offset || '0');
  const role = query.role;

  let sql = 'SELECT id, name, email, phone, created_at FROM patients WHERE 1=1';
  const params: unknown[] = [];

  if (search) {
    sql += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ? OR national_id LIKE ?)';
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const result = await db.prepare(sql).bind(...params).all();
  
  const countSql = sql.replace(/ORDER BY.*LIMIT.*OFFSET.*/, '').replace('SELECT id, name, email, phone, created_at', 'SELECT COUNT(*) as count');
  const countResult = await db.prepare(countSql).bind(...params.slice(0, -2)).first() as { count: number };

  return c.json(successResponse({
    patients: result.results,
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
    SELECT id, name, email, phone, date_of_birth, address, emergency_contact, 
           national_id, hms_patient_id, created_at
    FROM patients WHERE id = ?
  `).bind(id).first();

  if (!patient) {
    return c.json(errorResponse('Patient not found'), 404);
  }

  return c.json(successResponse(patient));
});

patients.patch('/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => null);

  if (!body) {
    return c.json(errorResponse('Missing update data'), 400);
  }

  const allowedFields = ['name', 'email', 'phone', 'date_of_birth', 'address', 'emergency_contact', 'national_id'];
  const updates: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(body)) {
    if (allowedFields.includes(key)) {
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

  if (!body || !body.name) {
    return c.json(errorResponse('Missing required fields'), 400);
  }

  const { name, phone, email, hmsPatientId } = body;
  const id = generateId('patient');

  await db.prepare(`
    INSERT INTO patients (id, name, phone, email, hms_patient_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, name, phone || null, email || null, hmsPatientId || null, now()).run();

  const patient = await db.prepare('SELECT * FROM patients WHERE id = ?').bind(id).first();

  return c.json(successResponse(patient), 201);
});

patients.get('/:id/queue-position', async (c) => {
  const db = c.env.DB;
  const patientId = c.req.param('id');

  const activeVisit = await db.prepare(`
    SELECT v.id, v.ticket_number, v.department, v.status, v.priority, v.created_at,
           (SELECT COUNT(*) FROM queue_tickets v2 
            WHERE v2.department = v.department 
            AND v2.status = 'waiting' 
            AND v2.priority = 0
            AND v2.created_at < v.created_at) as position
    FROM queue_tickets v
    WHERE v.patient_id = ? AND v.status IN ('waiting', 'called', 'in_progress')
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
    department: activeVisit.department,
    status: activeVisit.status,
    priority: activeVisit.priority,
    position: (activeVisit.position as number) + 1,
    joinedAt: activeVisit.created_at,
  }));
});

patients.post('/search', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json().catch(() => null);
  
  if (!body || !body.query) {
    return c.json(errorResponse('Missing search query'), 400);
  }

  const { query, limit = 10 } = body;
  const searchPattern = `%${query}%`;

  const result = await db.prepare(`
    SELECT id, name, email, phone, created_at
    FROM patients 
    WHERE name LIKE ? OR email LIKE ? OR phone LIKE ? OR national_id LIKE ?
    LIMIT ?
  `).bind(searchPattern, searchPattern, searchPattern, searchPattern, limit).all();

  return c.json(successResponse({
    results: result.results,
    total: result.results?.length || 0,
  }));
});

patients.get('/:id/history', async (c) => {
  const db = c.env.DB;
  const patientId = c.req.param('id');
  const limit = parseInt(c.req.query('limit') || '10');
  const offset = parseInt(c.req.query('offset') || '0');

  const result = await db.prepare(`
    SELECT v.*, d.name as doctor_name
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

  if (!body || !body.firstName || !body.lastName || !body.email) {
    return c.json(errorResponse('Missing required fields'), 400);
  }

  const { firstName, lastName, email, phone, dateOfBirth, address, emergencyContact } = body;
  const name = `${firstName} ${lastName}`;

  const existing = await db.prepare(
    'SELECT id FROM patients WHERE email = ?'
  ).bind(email).first();

  if (existing) {
    return c.json(errorResponse('Email already registered'), 409);
  }

  const id = generateId('patient');
  const defaultPassword = 'patient123';
  const passwordHash = await hashPassword(defaultPassword);

  await db.prepare(`
    INSERT INTO patients (id, name, email, phone, date_of_birth, address, emergency_contact, 
                          password_hash, requires_password_change, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).bind(id, name, email, phone || null, dateOfBirth || null, address || null, 
          emergencyContact || null, passwordHash, now()).run();

  const patient = await db.prepare('SELECT * FROM patients WHERE id = ?').bind(id).first();

  return c.json(successResponse(patient, 'Patient registered successfully'), 201);
});

export { patients };
