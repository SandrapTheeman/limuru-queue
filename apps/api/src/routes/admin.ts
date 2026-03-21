import { Hono } from 'hono';
import type { Bindings } from '../types';
import { generateId, hashPassword, successResponse, errorResponse, now } from '../utils';

const admin = new Hono<{ Bindings: Bindings }>();

admin.get('/stats', async (c) => {
  const db = c.env.DB;
  const today = new Date().toISOString().split('T')[0];

  const totalVisits = await db.prepare(`
    SELECT COUNT(*) as count FROM queue_tickets WHERE date(created_at) = date(?)
  `).bind(today).first() as { count: number };

  const waitingCount = await db.prepare(`
    SELECT COUNT(*) as count FROM queue_tickets WHERE status = 'waiting'
  `).first() as { count: number };

  const completedCount = await db.prepare(`
    SELECT COUNT(*) as count FROM queue_tickets WHERE status = 'completed' AND date(completed_at) = date(?)
  `).bind(today).first() as { count: number };

  const totalPatients = await db.prepare(`
    SELECT COUNT(*) as count FROM patients
  `).first() as { count: number };

  const totalUsers = await db.prepare(`
    SELECT COUNT(*) as count FROM users WHERE is_active = 1
  `).first() as { count: number };

  const avgWaitTime = await db.prepare(`
    SELECT AVG(wait_time_minutes) as avg FROM queue_tickets WHERE date(created_at) = date(?) AND wait_time_minutes IS NOT NULL
  `).bind(today).first() as { avg: number | null };

  const deptStats = await db.prepare(`
    SELECT department_id as department, 
           COUNT(*) as total,
           SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) as waiting,
           SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM queue_tickets 
    WHERE date(created_at) = date(?)
    GROUP BY department_id
  `).bind(today).all();

  return c.json(successResponse({
    todayVisits: totalVisits?.count || 0,
    waiting: waitingCount?.count || 0,
    completed: completedCount?.count || 0,
    totalPatients: totalPatients?.count || 0,
    totalUsers: totalUsers?.count || 0,
    avgWaitTime: Math.round(avgWaitTime?.avg || 0),
    departmentStats: deptStats.results || [],
  }));
});

admin.get('/users', async (c) => {
  const db = c.env.DB;
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');
  const role = c.req.query('role');
  const search = c.req.query('search');

  let sql = 'SELECT id, email, first_name, last_name, role, is_active, last_login, created_at FROM users WHERE 1=1';
  const params: unknown[] = [];

  if (role) {
    sql += ' AND role = ?';
    params.push(role);
  }

  if (search) {
    sql += ' AND ((first_name || \' \' || last_name) LIKE ? OR email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const result = await db.prepare(sql).bind(...params).all();
  
  // Map results to include combined name
  const usersWithName = (result.results || []).map((u: any) => ({
    ...u,
    name: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
  }));
  
  const countSql = sql.replace(/ORDER BY.*LIMIT.*OFFSET.*/, '').replace('SELECT id, email, first_name, last_name, role, is_active, last_login, created_at', 'SELECT COUNT(*) as count');
  const countResult = await db.prepare(countSql).bind(...params.slice(0, -2)).first() as { count: number };

  return c.json(successResponse({
    users: usersWithName,
    total: countResult?.count || 0,
    limit,
    offset,
  }));
});

admin.get('/users/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  const user = await db.prepare(`
    SELECT id, email, first_name, last_name, role, is_active, last_login, created_at, doctor_id
    FROM users WHERE id = ?
  `).bind(id).first();

  if (!user) {
    return c.json(errorResponse('User not found'), 404);
  }

  const u: any = user;
  return c.json(successResponse({
    ...user,
    name: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
  }));
});

admin.post('/users', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json().catch(() => null);

  if (!body || !body.email || !body.password || !body.name || !body.role) {
    return c.json(errorResponse('Missing required fields'), 400);
  }

  const { email, password, name, role, doctorId } = body;
  // Split name into first_name and last_name
  const nameParts = name.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  
  const validRoles = ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_tech', 'facility', 'it_support', 'super_admin'];
  
  if (!validRoles.includes(role)) {
    return c.json(errorResponse('Invalid role'), 400);
  }

  const existing = await db.prepare(
    'SELECT id FROM users WHERE email = ?'
  ).bind(email).first();

  if (existing) {
    return c.json(errorResponse('Email already exists'), 409);
  }

  const id = generateId('user');
  const passwordHash = await hashPassword(password);

  await db.prepare(`
    INSERT INTO users (id, email, password_hash, first_name, last_name, role, doctor_id, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).bind(id, email, passwordHash, firstName, lastName, role, doctorId || null, now()).run();

  const user = await db.prepare('SELECT id, email, first_name, last_name, role FROM users WHERE id = ?').bind(id).first();
  const u: any = user;

  return c.json(successResponse({
    ...user,
    name: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
  }, 'User created successfully'), 201);
});

admin.patch('/users/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => null);

  if (!body) {
    return c.json(errorResponse('Missing update data'), 400);
  }

  const allowedFields = ['email', 'role', 'is_active', 'doctor_id', 'first_name', 'last_name'];
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

  values.push(id);

  await db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

  const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();

  return c.json(successResponse(user, 'User updated successfully'));
});

admin.delete('/users/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();

  if (!user) {
    return c.json(errorResponse('User not found'), 404);
  }

  await db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').bind(id).run();

  return c.json(successResponse({ message: 'User deactivated' }));
});

admin.get('/iptv', async (c) => {
  const db = c.env.DB;
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  const result = await db.prepare(`
    SELECT * FROM iptv_channels ORDER BY display_order ASC LIMIT ? OFFSET ?
  `).bind(limit, offset).all();

  const countResult = await db.prepare(
    'SELECT COUNT(*) as count FROM iptv_channels'
  ).first() as { count: number };

  return c.json(successResponse({
    channels: result.results,
    total: countResult?.count || 0,
  }));
});

admin.post('/iptv', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json().catch(() => null);

  if (!body || !body.name || !body.url) {
    return c.json(errorResponse('Missing required fields'), 400);
  }

  const { name, url, category, logo } = body;
  const id = generateId('channel');

  await db.prepare(`
    INSERT INTO iptv_channels (id, name, url, category, logo, is_active, display_order, created_at)
    VALUES (?, ?, ?, ?, ?, 1, (SELECT COALESCE(MAX(display_order), 0) + 1 FROM iptv_channels), ?)
  `).bind(id, name, url, category || null, logo || null, now()).run();

  const channel = await db.prepare('SELECT * FROM iptv_channels WHERE id = ?').bind(id).first();

  return c.json(successResponse(channel, 'IPTV channel created'), 201);
});

admin.patch('/iptv/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => null);

  if (!body) {
    return c.json(errorResponse('Missing update data'), 400);
  }

  const allowedFields = ['name', 'url', 'category', 'logo', 'is_active', 'display_order'];
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

  values.push(id);

  await db.prepare(`UPDATE iptv_channels SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

  const channel = await db.prepare('SELECT * FROM iptv_channels WHERE id = ?').bind(id).first();

  return c.json(successResponse(channel));
});

admin.delete('/iptv/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  await db.prepare('DELETE FROM iptv_channels WHERE id = ?').bind(id).run();

  return c.json(successResponse({ message: 'IPTV channel deleted' }));
});

admin.get('/settings', async (c) => {
  const db = c.env.DB;

  const settings = await db.prepare('SELECT * FROM settings').all();
  
  const settingsObj: Record<string, string> = {};
  for (const s of settings.results || []) {
    settingsObj[s.key as string] = s.value as string;
  }

  return c.json(successResponse(settingsObj));
});

admin.patch('/settings', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json().catch(() => null);

  if (!body) {
    return c.json(errorResponse('Missing settings'), 400);
  }

  for (const [key, value] of Object.entries(body)) {
    await db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
    `).bind(key, value, now(), value, now()).run();
  }

  return c.json(successResponse({ message: 'Settings updated' }));
});

admin.get('/audit-logs', async (c) => {
  const db = c.env.DB;
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');
  const userId = c.req.query('userId');
  const action = c.req.query('action');

  let sql = 'SELECT * FROM audit_logs WHERE 1=1';
  const params: unknown[] = [];

  if (userId) {
    sql += ' AND user_id = ?';
    params.push(userId);
  }

  if (action) {
    sql += ' AND action = ?';
    params.push(action);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const result = await db.prepare(sql).bind(...params).all();

  const countSql = sql.replace(/ORDER BY.*LIMIT.*OFFSET.*/, '').replace('SELECT *', 'SELECT COUNT(*) as count');
  const countResult = await db.prepare(countSql).bind(...params.slice(0, -2)).first() as { count: number };

  return c.json(successResponse({
    logs: result.results,
    total: countResult?.count || 0,
  }));
});

admin.get('/backups', async (c) => {
  const db = c.env.DB;
  const backupBucket = c.env.BACKUP_BUCKET;

  const limit = parseInt(c.req.query('limit') || '20');
  const offset = parseInt(c.req.query('offset') || '0');

  const objects = await backupBucket.list({ limit, prefix: 'backups/', cursor: undefined });
  
  const backups = objects.objects.map(obj => ({
    key: obj.key,
    size: obj.size,
    uploaded: obj.uploaded,
  }));

  return c.json(successResponse({ backups }));
});

admin.post('/backups', async (c) => {
  const db = c.env.DB;
  const backupBucket = c.env.BACKUP_BUCKET;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupKey = `backups/backup-${timestamp}.sql`;

  const tables = ['patients', 'users', 'queue_tickets', 'doctors', 'departments', 'rooms', 'appointments', 'messages', 'clinical_notes', 'prescriptions', 'lab_orders'];
  let backupData = '';

  for (const table of tables) {
    const rows = await db.prepare(`SELECT * FROM ${table}`).all();
    backupData += `-- Table: ${table}\n`;
    for (const row of rows.results || []) {
      const columns = Object.keys(row).join(', ');
      const values = Object.values(row).map(v => typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v).join(', ');
      backupData += `INSERT INTO ${table} (${columns}) VALUES (${values});\n`;
    }
    backupData += '\n';
  }

  await backupBucket.put(backupKey, backupData);

  return c.json(successResponse({ key: backupKey, created: now() }), 201);
});

export { admin };
