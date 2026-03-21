import { Hono } from 'hono';
import { successResponse, errorResponse } from '../utils';
import type { Bindings } from '../types';

const departments = new Hono<{ Bindings: Bindings }>();

departments.get('/', async (c) => {
  const db = c.env.DB;
  
  const result = await db.prepare(`
    SELECT * FROM departments ORDER BY display_order ASC
  `).all();

  return c.json(successResponse(result.results || []));
});

departments.get('/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  const department = await db.prepare(`
    SELECT d.*, 
           (SELECT COUNT(*) FROM queue_tickets v WHERE v.department = d.code AND v.status = 'waiting') as waiting_count,
           (SELECT COUNT(*) FROM doctors WHERE department = d.code AND is_available = 1) as available_doctors
    FROM departments d WHERE d.code = ?
  `).bind(id).first();

  if (!department) {
    return c.json(errorResponse('Department not found'), 404);
  }

  const rooms = await db.prepare(`
    SELECT * FROM rooms WHERE department = ? ORDER BY name ASC
  `).bind(id).all();

  return c.json(successResponse({
    ...department,
    rooms: rooms.results || [],
  }));
});

export { departments };
