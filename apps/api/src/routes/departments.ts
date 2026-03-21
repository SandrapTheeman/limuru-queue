import { Hono } from 'hono';
import { successResponse, errorResponse } from '../utils';
import type { Bindings } from '../types';

const departments = new Hono<{ Bindings: Bindings }>();

departments.get('/', async (c) => {
  const db = c.env.DB;
  
  const result = await db.prepare(`
    SELECT d.*,
           (SELECT COUNT(*) FROM queue_tickets v WHERE v.department_id = d.id AND v.status = 'waiting') as waiting_count,
           (SELECT COUNT(*) FROM doctors doc JOIN users u ON doc.user_id = u.id WHERE u.department_id = d.id AND doc.is_available = 1) as available_doctors
    FROM departments d
    WHERE d.is_active = 1
    ORDER BY d.display_order ASC
  `).all();

  return c.json(successResponse(result.results || []));
});

departments.get('/:code', async (c) => {
  const db = c.env.DB;
  const code = c.req.param('code');

  const department = await db.prepare(`
    SELECT d.*,
           (SELECT COUNT(*) FROM queue_tickets v WHERE v.department_id = d.id AND v.status = 'waiting') as waiting_count,
           (SELECT COUNT(*) FROM doctors doc JOIN users u ON doc.user_id = u.id WHERE u.department_id = d.id AND doc.is_available = 1) as available_doctors
    FROM departments d
    WHERE d.code = ? AND d.is_active = 1
  `).bind(code).first();

  if (!department) {
    return c.json(errorResponse('Department not found'), 404);
  }

  const rooms = await db.prepare(`
    SELECT r.*, d.name as department_name
    FROM rooms r
    JOIN departments d ON r.department_id = d.id
    WHERE r.department_id = ? AND r.is_active = 1
    ORDER BY r.room_name ASC
  `).bind(department.id).all();

  return c.json(successResponse({
    ...department,
    rooms: rooms.results || [],
  }));
});

departments.post('/', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  const { name, code, description, color, icon, average_service_time, max_daily_patients, consultation_fee, followup_fee, is_emergency, requires_appointment, allows_walkins, display_order, floor, contact_phone, contact_email } = body;

  if (!name || !code) {
    return c.json(errorResponse('Name and code are required'), 400);
  }

  const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  await db.prepare(`
    INSERT INTO departments (id, name, code, description, color, icon, average_service_time, max_daily_patients, consultation_fee, followup_fee, is_emergency, requires_appointment, allows_walkins, display_order, floor, contact_phone, contact_email)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, name, code, description || null, color || '#3B82F6', icon || null, average_service_time || 15, max_daily_patients || 100, consultation_fee || 0, followup_fee || 0, is_emergency ? 1 : 0, requires_appointment ? 1 : 1, allows_walkins ? 1 : 1, display_order || 0, floor || 1, contact_phone || null, contact_email || null).run();

  const dept = await db.prepare('SELECT * FROM departments WHERE id = ?').bind(id).first();
  return c.json(successResponse(dept), 201);
});

export { departments };
