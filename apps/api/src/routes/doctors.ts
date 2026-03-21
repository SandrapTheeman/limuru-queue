import { Hono } from 'hono';
import type { Bindings } from '../types';
import { successResponse, errorResponse, now } from '../utils';

const doctors = new Hono<{ Bindings: Bindings }>();

doctors.get('/', async (c) => {
  const db = c.env.DB;
  const specialty = c.req.query('specialty');
  const department = c.req.query('department');
  const availability = c.req.query('availability');

  let sql = `
    SELECT d.*, u.first_name, u.last_name, u.email, u.phone,
           d.specialty, d.qualification, d.is_available, d.rating, d.review_count,
           d.consultation_fee, d.max_daily_patients,
           dep.name as department_name, dep.code as department_code,
           (SELECT COUNT(*) FROM queue_tickets v WHERE v.doctor_id = d.id AND v.status IN ('waiting','called','in_progress')) as active_visits
    FROM doctors d
    JOIN users u ON d.user_id = u.id
    JOIN departments dep ON u.department_id = dep.id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (specialty) {
    sql += ' AND d.specialty = ?';
    params.push(specialty);
  }

  if (department) {
    sql += ' AND u.department_id = ?';
    params.push(department);
  }

  if (availability === 'available') {
    sql += ' AND d.is_available = 1 AND d.on_leave = 0';
  }

  sql += ' ORDER BY d.is_available DESC, d.rating DESC';

  const result = await db.prepare(sql).bind(...params).all();

  return c.json(successResponse(result.results || []));
});

doctors.get('/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  const doctor = await db.prepare(`
    SELECT d.*, u.first_name, u.last_name, u.email, u.phone,
           dep.name as department_name, dep.code as department_code,
           (SELECT COUNT(*) FROM queue_tickets v WHERE v.doctor_id = d.id AND v.status = 'in_progress') as active_visits
    FROM doctors d
    JOIN users u ON d.user_id = u.id
    JOIN departments dep ON u.department_id = dep.id
    WHERE d.id = ?
  `).bind(id).first();

  if (!doctor) {
    return c.json(errorResponse('Doctor not found'), 404);
  }

  return c.json(successResponse(doctor));
});

doctors.patch('/:id/status', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => null);

  if (!body || !body.status) {
    return c.json(errorResponse('Missing status'), 400);
  }

  const { status, availability_notes } = body;
  const validStatuses = ['available', 'busy', 'away', 'offline'];

  if (!validStatuses.includes(status)) {
    return c.json(errorResponse('Invalid status'), 400);
  }

  const isAvailable = status === 'available' ? 1 : 0;
  const onLeave = status === 'offline' ? 1 : 0;

  await db.prepare(`
    UPDATE doctors SET is_available = ?, on_leave = ?, availability_notes = ?, updated_at = ?
    WHERE id = ?
  `).bind(isAvailable, onLeave, availability_notes || null, now(), id).run();

  const doctor = await db.prepare(`
    SELECT d.*, u.first_name, u.last_name
    FROM doctors d
    JOIN users u ON d.user_id = u.id
    WHERE d.id = ?
  `).bind(id).first();

  return c.json(successResponse(doctor));
});

doctors.get('/doctor/queue', async (c) => {
  const db = c.env.DB;
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const sessionKV = c.env.SESSION_KV;
  const token = authHeader.replace('Bearer ', '');
  const sessionData = await sessionKV.get(`session:${token}`);
  
  if (!sessionData) {
    return c.json(errorResponse('Invalid session'), 401);
  }

  const session = JSON.parse(sessionData);
  const doctorId = session.doctorId || session.userId;

  const result = await db.prepare(`
    SELECT v.*, 
           p.first_name || ' ' || p.last_name as patient_name,
           p.phone as patient_phone,
           p.date_of_birth as patient_dob,
           p.gender as patient_gender
    FROM queue_tickets v
    JOIN patients p ON v.patient_id = p.id
    WHERE v.doctor_id = ? AND v.status IN ('waiting', 'called', 'in_progress')
    ORDER BY v.priority DESC, v.created_at ASC
  `).bind(doctorId).all();

  return c.json(successResponse(result.results || []));
});

export { doctors };
