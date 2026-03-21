import { Hono } from 'hono';
import { z } from 'zod';
import type { Bindings } from '../types';
import { Visit, VitalSign, SoapNote, Prescription, Allergy, TriageLevel } from '../db/schema';
import { generateId, now, successResponse, errorResponse, calculateWaitTime } from '../utils';

const visits = new Hono<{ Bindings: Bindings }>();

const createVisitSchema = z.object({
  patientId: z.string(),
  department: z.string(),
  priority: z.boolean().optional().default(false),
  triageLevel: z.number().min(1).max(5).optional(),
  complaint: z.string().optional(),
  notes: z.string().optional(),
});

const updateVisitSchema = z.object({
  status: z.enum(['waiting', 'called', 'in_progress', 'completed', 'no_show', 'transferred']).optional(),
  roomAssigned: z.string().optional(),
  doctorNotes: z.string().optional(),
  diagnosis: z.string().optional(),
  prescription: z.string().optional(),
  triageLevel: z.number().min(1).max(5).optional(),
});

const recordVitalSignsSchema = z.object({
  bloodPressureSystolic: z.number().min(60).max(250).optional(),
  bloodPressureDiastolic: z.number().min(40).max(150).optional(),
  heartRate: z.number().min(30).max(220).optional(),
  temperature: z.number().min(30).max(45).optional(),
  respiratoryRate: z.number().min(5).max(50).optional(),
  oxygenSaturation: z.number().min(50).max(100).optional(),
  weight: z.number().min(0.5).max(500).optional(),
  height: z.number().min(20).max(250).optional(),
  notes: z.string().optional(),
});

const createSoapNoteSchema = z.object({
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
});

const createPrescriptionSchema = z.object({
  medication: z.string().min(1),
  dosage: z.string().min(1),
  frequency: z.string().min(1),
  duration: z.string().optional(),
  instructions: z.string().optional(),
});

const addAllergySchema = z.object({
  allergen: z.string().min(1),
  reaction: z.string().optional(),
  severity: z.enum(['mild', 'moderate', 'severe', 'life_threatening']),
});

const listVisitsSchema = z.object({
  status: z.enum(['waiting', 'called', 'in_progress', 'completed', 'no_show', 'transferred']).optional(),
  department: z.string().optional(),
  doctorId: z.string().optional(),
  patientId: z.string().optional(),
  date: z.string().optional(),
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0),
});

visits.get('/', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  
  if (!user) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const query = c.req.query();
  const status = query.status;
  const department = query.department;
  const doctorId = query.doctorId;
  const patientId = query.patientId;
  const date = query.date;
  const limit = parseInt(query.limit || '20');
  const offset = parseInt(query.offset || '0');

  let sql = `
    SELECT v.*, p.first_name || ' ' || p.last_name as patient_name, p.phone as patient_phone, p.email as patient_email,
           d.qualification as doctor_name
    FROM queue_tickets v
    LEFT JOIN patients p ON v.patient_id = p.id
    LEFT JOIN doctors d ON v.doctor_id = d.id
    WHERE 1=1
  `;
  const params: unknown[] = [];
  let paramIndex = 1;

  if (status) {
    sql += ` AND v.status = ?`;
    params.push(status);
  }

  if (department) {
    sql += ` AND v.department_id = ?`;
    params.push(department);
  }

  if (doctorId) {
    sql += ` AND v.doctor_id = ?`;
    params.push(doctorId);
  }

  if (patientId) {
    sql += ` AND v.patient_id = ?`;
    params.push(patientId);
  }

  if (date) {
    sql += ` AND date(v.created_at) = ?`;
    params.push(date);
  }

  if (user.role === 'doctor' && user.doctorId) {
    sql += ` AND (v.doctor_id = ? OR v.department_id = (SELECT department_id FROM users WHERE id = ?))`;
    params.push(user.doctorId, user.doctorId);
  }

  sql += ` ORDER BY v.priority DESC, v.created_at ASC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const result = await db.prepare(sql).bind(...params).all();

  let countSql = sql.replace(/ORDER BY.*LIMIT.*OFFSET.*/, '').replace(/LEFT JOIN.*ON.*/, 'WHERE 1=1').split('LIMIT')[0];
  const countParams = params.slice(0, -2);
  const countResult = await db.prepare(`SELECT COUNT(*) as count FROM queue_tickets v WHERE 1=1 ${status ? ' AND v.status = ?' : ''}${department ? ' AND v.department_id = ?' : ''}${doctorId ? ' AND v.doctor_id = ?' : ''}${patientId ? ' AND v.patient_id = ?' : ''}${date ? ' AND date(v.created_at) = ?' : ''}`).bind(...countParams).first() as { count: number };

  return c.json(successResponse({
    queue_tickets: result.results,
    total: countResult?.count || 0,
    limit,
    offset,
    hasMore: offset + limit < (countResult?.count || 0),
  }));
});

visits.get('/:id', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  const visitId = c.req.param('id');

  if (!user) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const visit = await db.prepare(`
    SELECT v.*, p.first_name || ' ' || p.last_name as patient_name, p.phone as patient_phone, p.email as patient_email,
           p.dob as patient_dob, p.allergies as patient_allergies,
           d.qualification as doctor_name, d.department_id as doctor_department
    FROM queue_tickets v
    LEFT JOIN patients p ON v.patient_id = p.id
    LEFT JOIN doctors d ON v.doctor_id = d.id
    WHERE v.id = ?
  `).bind(visitId).first() as Visit | undefined;

  if (!visit) {
    return c.json(errorResponse('Visit not found'), 404);
  }

  return c.json(successResponse(visit));
});

visits.post('/', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  const body = await c.req.json().catch(() => null) as any;

  if (!user) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  if (!['admin', 'doctor', 'nurse', 'receptionist'].includes(user.role)) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const countResult = await db.prepare(`
    SELECT COUNT(*) as count FROM queue_tickets 
    WHERE department_id = ? AND status IN ('waiting', 'called', 'in_progress')
    AND date(created_at) = date('now')
  `).bind(body.department).first() as { count: number };

  const ticketNumber = generateId(body.department.substring(0, 3).toUpperCase() + String((countResult?.count || 0) + 1).padStart(3, '0'));
  const id = generateId('visit');
  const createdAt = now();

  await db.prepare(`
    INSERT INTO queue_tickets (id, patient_id, ticket_number, department_id, priority, triage_level, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'waiting', ?)
  `).bind(
    id,
    body.patientId,
    ticketNumber,
    body.department,
    body.priority ? 1 : 0,
    body.triageLevel || null,
    createdAt
  ).run();

  await db.prepare(`
    INSERT INTO queue_history (id, visit_id, action, actor_id, actor_type, timestamp, metadata)
    VALUES (?, ?, 'created', ?, ?, ?, ?)
  `).bind(
    generateId('hist'),
    id,
    user.userId,
    user.role,
    createdAt,
    JSON.stringify({ complaint: body.complaint, notes: body.notes })
  ).run();

  const visit = await db.prepare(`
    SELECT v.*, p.first_name || ' ' || p.last_name as patient_name 
    FROM queue_tickets v
    LEFT JOIN patients p ON v.patient_id = p.id
    WHERE v.id = ?
  `).bind(id).first();

  return c.json(successResponse(visit, 'Visit created'), 201);
});

visits.put('/:id', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  const visitId = c.req.param('id');
  const body = await c.req.json().catch(() => null) as any;

  if (!user) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const visit = await db.prepare('SELECT * FROM queue_tickets WHERE id = ?').bind(visitId).first() as Visit | undefined;

  if (!visit) {
    return c.json(errorResponse('Visit not found'), 404);
  }

  const updates: string[] = [];
  const params: unknown[] = [];

  if (body.status) {
    updates.push(`status = ?`);
    params.push(body.status);

    if (body.status === 'called') {
      updates.push(`called_at = ?`);
      params.push(now());
    } else if (body.status === 'in_progress') {
      updates.push(`started_at = ?`);
      params.push(now());
    } else if (body.status === 'completed') {
      updates.push(`completed_at = ?`);
      params.push(now());
      
      let waitTime = 0;
      if (visit.called_at) {
        waitTime = calculateWaitTime(visit.called_at);
      }
      updates.push(`wait_time_minutes = ?`);
      params.push(waitTime);
    }
  }

  if (body.roomAssigned !== undefined) {
    updates.push(`room_assigned = ?`);
    params.push(body.roomAssigned);
  }

  if (body.doctorNotes !== undefined) {
    updates.push(`doctor_notes = ?`);
    params.push(body.doctorNotes);
  }

  if (body.diagnosis !== undefined) {
    updates.push(`diagnosis = ?`);
    params.push(body.diagnosis);
  }

  if (body.prescription !== undefined) {
    updates.push(`prescription = ?`);
    params.push(body.prescription);
  }

  if (body.triageLevel !== undefined) {
    updates.push(`triage_level = ?`);
    params.push(body.triageLevel);
  }

  if (updates.length === 0) {
    return c.json(errorResponse('No fields to update'), 400);
  }

  params.push(visitId);
  await db.prepare(`UPDATE queue_tickets SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();

  await db.prepare(`
    INSERT INTO queue_history (id, visit_id, action, actor_id, actor_type, timestamp, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    generateId('hist'),
    visitId,
    'updated',
    user.userId,
    user.role,
    now(),
    JSON.stringify(body)
  ).run();

  const updated = await db.prepare(`
    SELECT v.*, p.first_name || ' ' || p.last_name as patient_name 
    FROM queue_tickets v
    LEFT JOIN patients p ON v.patient_id = p.id
    WHERE v.id = ?
  `).bind(visitId).first();

  return c.json(successResponse(updated, 'Visit updated'));
});

visits.post('/:id/start', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  const visitId = c.req.param('id');

  if (!user || !['admin', 'doctor', 'nurse'].includes(user.role)) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const visit = await db.prepare('SELECT * FROM queue_tickets WHERE id = ?').bind(visitId).first() as Visit | undefined;

  if (!visit) {
    return c.json(errorResponse('Visit not found'), 404);
  }

  if (visit.status !== 'called' && visit.status !== 'waiting') {
    return c.json(errorResponse('Visit cannot be started'), 400);
  }

  const startedAt = now();

  await db.prepare(`
    UPDATE queue_tickets SET status = 'in_progress', started_at = ?, doctor_id = ?
    WHERE id = ?
  `).bind(startedAt, user.doctorId || null, visitId).run();

  await db.prepare(`
    INSERT INTO queue_history (id, visit_id, action, actor_id, actor_type, timestamp)
    VALUES (?, ?, 'started', ?, ?, ?)
  `).bind(generateId('hist'), visitId, user.userId, user.role, startedAt).run();

  const updated = await db.prepare(`
    SELECT v.*, p.first_name || ' ' || p.last_name as patient_name 
    FROM queue_tickets v
    LEFT JOIN patients p ON v.patient_id = p.id
    WHERE v.id = ?
  `).bind(visitId).first();

  return c.json(successResponse(updated, 'Visit started'));
});

visits.post('/:id/complete', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  const visitId = c.req.param('id');
  const body = await c.req.json().catch(() => null) as any;

  if (!user || !['admin', 'doctor'].includes(user.role)) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const visit = await db.prepare('SELECT * FROM queue_tickets WHERE id = ?').bind(visitId).first() as Visit | undefined;

  if (!visit) {
    return c.json(errorResponse('Visit not found'), 404);
  }

  const completedAt = now();
  let waitTime = 0;
  if (visit.called_at) {
    waitTime = calculateWaitTime(visit.called_at);
  }

  await db.prepare(`
    UPDATE queue_tickets 
    SET status = 'completed', completed_at = ?, wait_time_minutes = ?,
        diagnosis = ?, prescription = ?, doctor_notes = ?
    WHERE id = ?
  `).bind(
    completedAt,
    waitTime,
    body.diagnosis || null,
    body.prescription || null,
    body.doctorNotes || null,
    visitId
  ).run();

  await db.prepare(`
    INSERT INTO queue_history (id, visit_id, action, actor_id, actor_type, timestamp)
    VALUES (?, ?, 'completed', ?, ?, ?)
  `).bind(generateId('hist'), visitId, user.userId, user.role, completedAt).run();

  const updated = await db.prepare(`
    SELECT v.*, p.first_name || ' ' || p.last_name as patient_name 
    FROM queue_tickets v
    LEFT JOIN patients p ON v.patient_id = p.id
    WHERE v.id = ?
  `).bind(visitId).first();

  return c.json(successResponse(updated, 'Visit completed'));
});

visits.get('/:id/vital-signs', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  const visitId = c.req.param('id');

  if (!user) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const result = await db.prepare(`
    SELECT vs.*, u.first_name || ' ' || u.last_name as recorded_by_name
    FROM vital_signs vs
    LEFT JOIN users u ON vs.recorded_by = u.id
    WHERE vs.visit_id = ?
    ORDER BY vs.recorded_at DESC
  `).bind(visitId).all();

  return c.json(successResponse(result.results));
});

visits.post('/:id/vital-signs', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  const visitId = c.req.param('id');
  const body = c.req.json().catch(() => null) as any;

  if (!user || !['admin', 'doctor', 'nurse'].includes(user.role)) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const visit = await db.prepare('SELECT * FROM queue_tickets WHERE id = ?').bind(visitId).first();
  if (!visit) {
    return c.json(errorResponse('Visit not found'), 404);
  }

  const id = generateId('vs');
  const recordedAt = now();

  await db.prepare(`
    INSERT INTO vital_signs (id, visit_id, recorded_by, blood_pressure_systolic, blood_pressure_diastolic,
      heart_rate, temperature, respiratory_rate, oxygen_saturation, weight, height, notes, recorded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    visitId,
    user.userId,
    body.bloodPressureSystolic || null,
    body.bloodPressureDiastolic || null,
    body.heartRate || null,
    body.temperature || null,
    body.respiratoryRate || null,
    body.oxygenSaturation || null,
    body.weight || null,
    body.height || null,
    body.notes || null,
    recordedAt
  ).run();

  const vitalSign = await db.prepare('SELECT * FROM vital_signs WHERE id = ?').bind(id).first();

  return c.json(successResponse(vitalSign, 'Vital signs recorded'), 201);
});

visits.get('/:id/soap-notes', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  const visitId = c.req.param('id');

  if (!user) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const result = await db.prepare(`
    SELECT sn.*, u.first_name || ' ' || u.last_name as recorded_by_name
    FROM soap_notes sn
    LEFT JOIN users u ON sn.recorded_by = u.id
    WHERE sn.visit_id = ?
    ORDER BY sn.created_at DESC
  `).bind(visitId).all();

  return c.json(successResponse(result.results));
});

visits.post('/:id/soap-notes', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  const visitId = c.req.param('id');
  const body = c.req.json().catch(() => null) as any;

  if (!user || !['admin', 'doctor', 'nurse'].includes(user.role)) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const visit = await db.prepare('SELECT * FROM queue_tickets WHERE id = ?').bind(visitId).first();
  if (!visit) {
    return c.json(errorResponse('Visit not found'), 404);
  }

  const existing = await db.prepare('SELECT * FROM soap_notes WHERE visit_id = ?').bind(visitId).first();
  
  if (existing) {
    const updatedAt = now();
    await db.prepare(`
      UPDATE soap_notes SET subjective = ?, objective = ?, assessment = ?, plan = ?, updated_at = ?
      WHERE visit_id = ?
    `).bind(
      body.subjective || null,
      body.objective || null,
      body.assessment || null,
      body.plan || null,
      updatedAt,
      visitId
    ).run();

    const updated = await db.prepare(`
      SELECT sn.*, u.first_name || ' ' || u.last_name as recorded_by_name
      FROM soap_notes sn
      LEFT JOIN users u ON sn.recorded_by = u.id
      WHERE sn.visit_id = ?
    `).bind(visitId).first();

    return c.json(successResponse(updated, 'SOAP note updated'));
  }

  const id = generateId('soap');
  const createdAt = now();

  await db.prepare(`
    INSERT INTO soap_notes (id, visit_id, recorded_by, subjective, objective, assessment, plan, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    visitId,
    user.userId,
    body.subjective || null,
    body.objective || null,
    body.assessment || null,
    body.plan || null,
    createdAt,
    createdAt
  ).run();

  const soapNote = await db.prepare(`
    SELECT sn.*, u.first_name || ' ' || u.last_name as recorded_by_name
    FROM soap_notes sn
    LEFT JOIN users u ON sn.recorded_by = u.id
    WHERE sn.id = ?
  `).bind(id).first();

  return c.json(successResponse(soapNote, 'SOAP note created'), 201);
});

visits.get('/:id/prescriptions', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  const visitId = c.req.param('id');

  if (!user) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const result = await db.prepare(`
    SELECT p.*, u.first_name || ' ' || u.last_name as prescribed_by_name
    FROM prescriptions p
    LEFT JOIN users u ON p.prescribed_by = u.id
    WHERE p.visit_id = ?
    ORDER BY p.created_at DESC
  `).bind(visitId).all();

  return c.json(successResponse(result.results));
});

visits.post('/:id/prescriptions', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  const visitId = c.req.param('id');
  const body = c.req.json().catch(() => null) as any;

  if (!user || !['admin', 'doctor'].includes(user.role)) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const visit = await db.prepare('SELECT * FROM queue_tickets WHERE id = ?').bind(visitId).first();
  if (!visit) {
    return c.json(errorResponse('Visit not found'), 404);
  }

  const id = generateId('rx');
  const createdAt = now();

  await db.prepare(`
    INSERT INTO prescriptions (id, visit_id, prescribed_by, medication, dosage, frequency, duration, instructions, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    visitId,
    user.userId,
    body.medication,
    body.dosage,
    body.frequency,
    body.duration || null,
    body.instructions || null,
    createdAt
  ).run();

  const prescription = await db.prepare(`
    SELECT p.*, u.first_name || ' ' || u.last_name as prescribed_by_name
    FROM prescriptions p
    LEFT JOIN users u ON p.prescribed_by = u.id
    WHERE p.id = ?
  `).bind(id).first();

  return c.json(successResponse(prescription, 'Prescription added'), 201);
});

visits.get('/patient/:patientId/allergies', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  const patientId = c.req.param('patientId');

  if (!user) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const result = await db.prepare(`
    SELECT a.*, u.first_name || ' ' || u.last_name as recorded_by_name
    FROM allergies a
    LEFT JOIN users u ON a.recorded_by = u.id
    WHERE a.patient_id = ? AND a.is_active = 1
    ORDER BY a.created_at DESC
  `).bind(patientId).all();

  return c.json(successResponse(result.results));
});

visits.post('/patient/:patientId/allergies', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  const patientId = c.req.param('patientId');
  const body = c.req.json().catch(() => null) as any;

  if (!user || !['admin', 'doctor', 'nurse'].includes(user.role)) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const existing = await db.prepare(`
    SELECT * FROM allergies WHERE patient_id = ? AND allergen = ? AND is_active = 1
  `).bind(patientId, body.allergen).first();

  if (existing) {
    return c.json(errorResponse('Allergy already exists'), 400);
  }

  const id = generateId('allergy');
  const createdAt = now();

  await db.prepare(`
    INSERT INTO allergies (id, patient_id, allergen, reaction, severity, recorded_by, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
  `).bind(
    id,
    patientId,
    body.allergen,
    body.reaction || null,
    body.severity,
    user.userId,
    createdAt
  ).run();

  const allergy = await db.prepare('SELECT * FROM allergies WHERE id = ?').bind(id).first();

  return c.json(successResponse(allergy, 'Allergy added'), 201);
});

visits.get('/:id/history', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  const visitId = c.req.param('id');

  if (!user) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const visit = await db.prepare('SELECT * FROM queue_tickets WHERE id = ?').bind(visitId).first();
  if (!visit) {
    return c.json(errorResponse('Visit not found'), 404);
  }

  const history = await db.prepare(`
    SELECT qh.*, u.first_name || ' ' || u.last_name as actor_name
    FROM queue_history qh
    LEFT JOIN users u ON qh.actor_id = u.id
    WHERE qh.visit_id = ?
    ORDER BY qh.timestamp ASC
  `).bind(visitId).all();

  return c.json(successResponse(history.results));
});

visits.get('/stats/daily', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');

  if (!user) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const today = new Date().toISOString().split('T')[0];

  const stats = await db.prepare(`
    SELECT 
      COUNT(*) as total_visits,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) as waiting,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show,
      AVG(wait_time_minutes) as avg_wait_time
    FROM queue_tickets
    WHERE date(created_at) = ?
  `).bind(today).first() as {
    total_visits: number;
    completed: number;
    waiting: number;
    in_progress: number;
    no_show: number;
    avg_wait_time: number | null;
  };

  const byDepartment = await db.prepare(`
    SELECT 
      department_id as department,
      COUNT(*) as count,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM queue_tickets
    WHERE date(created_at) = ?
    GROUP BY department_id
  `).bind(today).all();

  return c.json(successResponse({
    date: today,
    stats,
    byDepartment: byDepartment.results,
  }));
});

export { visits };
