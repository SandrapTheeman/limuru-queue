import { Hono } from 'hono';
import { generateId, successResponse, errorResponse, now } from '../utils';
import type { Bindings } from '../types';

const rooms = new Hono<{ Bindings: Bindings }>();

rooms.get('/', async (c) => {
  const db = c.env.DB;
  const department = c.req.query('department');
  const status = c.req.query('status');

  let sql = 'SELECT * FROM rooms WHERE 1=1';
  const params: unknown[] = [];

  if (department) {
    sql += ' AND department = ?';
    params.push(department);
  }

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  sql += ' ORDER BY name ASC';

  const result = await db.prepare(sql).bind(...params).all();

  return c.json(successResponse({
    rooms: result.results || [],
    total: result.results?.length || 0,
  }));
});

rooms.get('/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  const room = await db.prepare('SELECT * FROM rooms WHERE id = ?').bind(id).first();

  if (!room) {
    return c.json(errorResponse('Room not found'), 404);
  }

  return c.json(successResponse(room));
});

rooms.post('/', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json().catch(() => null);

  if (!body || !body.name || !body.type || !body.department) {
    return c.json(errorResponse('Missing required fields'), 400);
  }

  const { name, type, department, capacity, equipment } = body;
  const id = generateId('room');

  await db.prepare(`
    INSERT INTO rooms (id, name, type, department, capacity, equipment, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'available', ?)
  `).bind(id, name, type, department, capacity || null, equipment ? JSON.stringify(equipment) : null, now()).run();

  const room = await db.prepare('SELECT * FROM rooms WHERE id = ?').bind(id).first();

  return c.json(successResponse(room, 'Room created'), 201);
});

rooms.patch('/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => null);

  if (!body) {
    return c.json(errorResponse('Missing update data'), 400);
  }

  const allowedFields = ['name', 'type', 'department', 'capacity', 'equipment', 'status'];
  const updates: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(body)) {
    if (allowedFields.includes(key)) {
      updates.push(`${key} = ?`);
      if (key === 'equipment' && typeof value === 'object') {
        values.push(JSON.stringify(value));
      } else {
        values.push(value);
      }
    }
  }

  if (updates.length === 0) {
    return c.json(errorResponse('No valid fields to update'), 400);
  }

  values.push(id);

  await db.prepare(`UPDATE rooms SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

  const room = await db.prepare('SELECT * FROM rooms WHERE id = ?').bind(id).first();

  return c.json(successResponse(room, 'Room updated'));
});

rooms.delete('/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  await db.prepare('DELETE FROM rooms WHERE id = ?').bind(id).run();

  return c.json(successResponse({ message: 'Room deleted' }));
});

export { rooms };
