import { Hono } from 'hono';
import type { Bindings } from '../types';
import { successResponse, errorResponse, now } from '../utils';

const doctors = new Hono<{ Bindings: Bindings }>();

doctors.get('/', async (c) => {
  const db = c.env.DB;
  const department = c.req.query('department');
  const availability = c.req.query('availability');

  let sql = 'SELECT id, name, email, department, room, is_available, created_at FROM doctors WHERE 1=1';
  const params: unknown[] = [];

  if (department) {
    sql += ' AND department = ?';
    params.push(department);
  }

  if (availability === 'available') {
    sql += ' AND is_available = 1';
  }

  sql += ' ORDER BY name ASC';

  const result = await db.prepare(sql).bind(...params).all();

  return c.json(successResponse(result.results || []));
});

doctors.get('/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  const doctor = await db.prepare(`
    SELECT d.*, 
           (SELECT COUNT(*) FROM queue_tickets v WHERE v.doctor_id = d.id AND v.status = 'in_progress') as active_visits
    FROM doctors d WHERE d.id = ?
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

  const { status, breakUntil } = body;
  const validStatuses = ['available', 'busy', 'away', 'offline'];

  if (!validStatuses.includes(status)) {
    return c.json(errorResponse('Invalid status'), 400);
  }

  await db.prepare(`
    UPDATE doctors SET is_available = ?, break_until = ? WHERE id = ?
  `).bind(status === 'available' ? 1 : 0, breakUntil || null, id).run();

  const doctor = await db.prepare('SELECT * FROM doctors WHERE id = ?').bind(id).first();

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
    SELECT v.*, p.name as patient_name, p.phone as patient_phone
    FROM queue_tickets v
    JOIN patients p ON v.patient_id = p.id
    WHERE v.doctor_id = ? AND v.status IN ('waiting', 'called', 'in_progress')
    ORDER BY v.priority DESC, v.created_at ASC
  `).bind(doctorId).all();

  return c.json(successResponse(result.results || []));
});

export { doctors };
