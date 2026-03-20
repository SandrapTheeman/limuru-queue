import { Hono } from 'hono';
import { z } from 'zod';
import type { Bindings } from '../types';
import { DisplayType } from '../db/schema';
import { generateId, now, successResponse, errorResponse } from '../utils';

const display = new Hono<{ Bindings: Bindings }>();

const createDisplaySchema = z.object({
  displayType: z.enum(['queue', 'waiting_room', 'doctor_panel', 'lobby', 'waiting_hall']),
  displayName: z.string().min(1),
  location: z.string().optional(),
  departmentId: z.string().optional(),
  screenOrientation: z.enum(['landscape', 'portrait']).optional().default('landscape'),
  autoRefreshSeconds: z.number().min(5).max(300).optional().default(30),
  showIpTv: z.boolean().optional().default(false),
  ipTvChannelId: z.string().optional(),
  ipTvVolume: z.number().min(0).max(100).optional().default(50),
  theme: z.enum(['light', 'dark']).optional().default('light'),
  language: z.string().optional().default('en'),
});

const updateDisplaySchema = z.object({
  displayName: z.string().optional(),
  location: z.string().optional(),
  departmentId: z.string().optional(),
  screenOrientation: z.enum(['landscape', 'portrait']).optional(),
  autoRefreshSeconds: z.number().min(5).max(300).optional(),
  showIpTv: z.boolean().optional(),
  ipTvChannelId: z.string().optional(),
  ipTvVolume: z.number().min(0).max(100).optional(),
  theme: z.enum(['light', 'dark']).optional(),
  language: z.string().optional(),
  isActive: z.boolean().optional(),
});

const listDisplaysSchema = z.object({
  displayType: z.enum(['queue', 'waiting_room', 'doctor_panel', 'lobby', 'waiting_hall']).optional(),
  departmentId: z.string().optional(),
  isActive: z.boolean().optional(),
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0),
});

display.get('/', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');

  if (!user || !['admin', 'receptionist'].includes(user.role)) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const query = c.req.query();
  const displayType = query.displayType as DisplayType | undefined;
  const departmentId = query.departmentId;
  const isActive = query.isActive === 'true' ? true : query.isActive === 'false' ? false : undefined;
  const limit = parseInt(query.limit || '20');
  const offset = parseInt(query.offset || '0');

  let sql = `
    SELECT d.*, dept.name as department_name
    FROM display_configs d
    LEFT JOIN departments dept ON d.department_id = dept.id
    WHERE 1=1
  `;
  const params: unknown[] = [];
  let paramIndex = 1;

  if (displayType) {
    sql += ` AND d.display_type = ?`;
    params.push(displayType);
  }

  if (departmentId) {
    sql += ` AND d.department_id = ?`;
    params.push(departmentId);
  }

  if (isActive !== undefined) {
    sql += ` AND d.is_active = ?`;
    params.push(isActive ? 1 : 0);
  }

  sql += ` ORDER BY d.display_name ASC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const result = await db.prepare(sql).bind(...params).all();

  let countSql = sql.replace(/ORDER BY.*LIMIT.*OFFSET.*/, '');
  const countParams = params.slice(0, -2);
  const countResult = await db.prepare(`SELECT COUNT(*) as count FROM display_configs d WHERE 1=1 ${displayType ? ' AND d.display_type = ?' : ''}${departmentId ? ' AND d.department_id = ?' : ''}${isActive !== undefined ? ' AND d.is_active = ?' : ''}`).bind(...countParams).first() as { count: number };

  return c.json(successResponse({
    displays: result.results,
    total: countResult?.count || 0,
    limit,
    offset,
    hasMore: offset + limit < (countResult?.count || 0),
  }));
});

display.get('/:id', async (c) => {
  const db = c.env.DB;
  const displayId = c.req.param('id');

  const result = await db.prepare(`
    SELECT d.*, dept.name as department_name
    FROM display_configs d
    LEFT JOIN departments dept ON d.department_id = dept.id
    WHERE d.id = ?
  `).bind(displayId).first();

  if (!result) {
    return c.json(errorResponse('Display not found'), 404);
  }

  await db.prepare(`
    UPDATE display_configs SET last_seen = ? WHERE id = ?
  `).bind(now(), displayId).run();

  return c.json(successResponse(result));
});

display.get('/:id/data', async (c) => {
  const db = c.env.DB;
  const displayId = c.req.param('id');
  const query = c.req.query();
  const department = query.department;

  const display = await db.prepare('SELECT * FROM display_configs WHERE id = ?').bind(displayId).first();

  if (!display) {
    return c.json(errorResponse('Display not found'), 404);
  }

  await db.prepare(`
    UPDATE display_configs SET last_seen = ? WHERE id = ?
  `).bind(now(), displayId).run();

  const displayType = (display as { display_type: DisplayType }).display_type;

  let queueData: unknown = null;
  let ipTvChannel: unknown = null;

  if (['queue', 'waiting_room', 'lobby', 'waiting_hall'].includes(displayType)) {
    const deptFilter = department || (display as { department_id?: string }).department_id;
    
    let sql = `
      SELECT v.id, v.ticket_number, v.status, v.priority, v.created_at,
             p.name as patient_name,
             d.name as doctor_name, d.room as doctor_room
      FROM visits v
      LEFT JOIN patients p ON v.patient_id = p.id
      LEFT JOIN doctors d ON v.doctor_id = d.id
      WHERE v.status IN ('waiting', 'called', 'in_progress')
    `;
    const params: unknown[] = [];

    if (deptFilter) {
      sql += ` AND v.department = ?`;
      params.push(deptFilter);
    }

    sql += ` ORDER BY v.priority DESC, v.created_at ASC LIMIT 20`;

    const queueResult = await db.prepare(sql).bind(...params).all();
    
    const waitingCount = await db.prepare(`
      SELECT COUNT(*) as count FROM visits 
      WHERE status = 'waiting' ${deptFilter ? ' AND department = ?' : ''}
    `).bind(...(deptFilter ? [deptFilter] : [])).first() as { count: number };

    const calledPatient = await db.prepare(`
      SELECT v.*, p.name as patient_name, d.name as doctor_name, d.room as doctor_room
      FROM visits v
      LEFT JOIN patients p ON v.patient_id = p.id
      LEFT JOIN doctors d ON v.doctor_id = d.id
      WHERE v.status = 'called' ${deptFilter ? ' AND v.department = ?' : ''}
      ORDER BY v.called_at ASC
      LIMIT 1
    `).bind(...(deptFilter ? [deptFilter] : [])).first();

    queueData = {
      currentQueue: queueResult.results,
      waitingCount: waitingCount?.count || 0,
      calledPatient,
    };
  }

  if ((display as { show_ip_tv?: boolean }).show_ip_tv && (display as { ip_tv_channel_id?: string }).ip_tv_channel_id) {
    ipTvChannel = await db.prepare('SELECT * FROM iptv_channels WHERE id = ? AND is_active = 1')
      .bind((display as { ip_tv_channel_id: string }).ip_tv_channel_id).first();
  }

  const settings = await db.prepare(`
    SELECT key, value FROM settings WHERE key IN ('clinic_name', 'clinic_address', 'departments')
  `).all();

  const settingsMap: Record<string, string> = {};
  for (const s of settings.results as { key: string; value: string }[]) {
    settingsMap[s.key] = s.value;
  }

  return c.json(successResponse({
    display,
    queueData,
    ipTvChannel,
    settings: settingsMap,
    lastUpdated: now(),
  }));
});

display.get('/:id/queue', async (c) => {
  const db = c.env.DB;
  const displayId = c.req.param('id');
  const query = c.req.query();
  const department = query.department;

  const display = await db.prepare('SELECT * FROM display_configs WHERE id = ?').bind(displayId).first();

  if (!display) {
    return c.json(errorResponse('Display not found'), 404);
  }

  await db.prepare(`
    UPDATE display_configs SET last_seen = ? WHERE id = ?
  `).bind(now(), displayId).run();

  const deptFilter = department || (display as { department_id?: string }).department_id;

  const waitingPatients = await db.prepare(`
    SELECT v.id, v.ticket_number, v.status, v.priority, v.created_at,
           p.name as patient_name
    FROM visits v
    LEFT JOIN patients p ON v.patient_id = p.id
    WHERE v.status = 'waiting'
    ${deptFilter ? ' AND v.department = ?' : ''}
    ORDER BY v.priority DESC, v.created_at ASC
    LIMIT 50
  `).bind(...(deptFilter ? [deptFilter] : [])).all();

  const calledPatient = await db.prepare(`
    SELECT v.ticket_number, p.name as patient_name, d.name as called_by_name, d.room as room
    FROM visits v
    LEFT JOIN patients p ON v.patient_id = p.id
    LEFT JOIN doctors d ON v.doctor_id = d.id
    WHERE v.status = 'called'
    ${deptFilter ? ' AND v.department = ?' : ''}
    ORDER BY v.called_at DESC
    LIMIT 1
  `).bind(...(deptFilter ? [deptFilter] : [])).first();

  const inProgressPatients = await db.prepare(`
    SELECT v.id, v.ticket_number, v.started_at,
           p.name as patient_name, d.name as doctor_name, d.room
    FROM visits v
    LEFT JOIN patients p ON v.patient_id = p.id
    LEFT JOIN doctors d ON v.doctor_id = d.id
    WHERE v.status = 'in_progress'
    ${deptFilter ? ' AND v.department = ?' : ''}
    ORDER BY v.started_at ASC
    LIMIT 10
  `).bind(...(deptFilter ? [deptFilter] : [])).all();

  const stats = await db.prepare(`
    SELECT 
      COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting,
      COUNT(CASE WHEN status = 'called' THEN 1 END) as called,
      COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
    FROM visits
    WHERE date(created_at) = date('now')
    ${deptFilter ? ' AND department = ?' : ''}
  `).bind(...(deptFilter ? [deptFilter] : [])).first();

  return c.json(successResponse({
    waitingPatients: waitingPatients.results,
    calledPatient,
    inProgressPatients: inProgressPatients.results,
    stats,
    lastUpdated: now(),
  }));
});

display.post('/', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  const body = await c.req.json().catch(() => null) as any;

  if (!user || !['admin'].includes(user.role)) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const id = generateId('disp');
  const createdAt = now();

  await db.prepare(`
    INSERT INTO display_configs (id, display_type, display_name, location, department_id,
      screen_orientation, auto_refresh_seconds, show_ip_tv, ip_tv_channel_id, ip_tv_volume,
      theme, language, is_active, last_seen, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
  `).bind(
    id,
    body.displayType,
    body.displayName,
    body.location || null,
    body.departmentId || null,
    body.screenOrientation,
    body.autoRefreshSeconds,
    body.showIpTv ? 1 : 0,
    body.ipTvChannelId || null,
    body.ipTvVolume,
    body.theme,
    body.language,
    now(),
    createdAt,
    createdAt
  ).run();

  const display = await db.prepare('SELECT * FROM display_configs WHERE id = ?').bind(id).first();

  return c.json(successResponse(display, 'Display created'), 201);
});

display.put('/:id', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  const displayId = c.req.param('id');
  const body = await c.req.json().catch(() => null) as any;

  if (!user || !['admin'].includes(user.role)) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const display = await db.prepare('SELECT * FROM display_configs WHERE id = ?').bind(displayId).first();

  if (!display) {
    return c.json(errorResponse('Display not found'), 404);
  }

  const updates: string[] = [];
  const params: unknown[] = [];

  if (body.displayName !== undefined) {
    updates.push(`display_name = ?`);
    params.push(body.displayName);
  }
  if (body.location !== undefined) {
    updates.push(`location = ?`);
    params.push(body.location);
  }
  if (body.departmentId !== undefined) {
    updates.push(`department_id = ?`);
    params.push(body.departmentId);
  }
  if (body.screenOrientation !== undefined) {
    updates.push(`screen_orientation = ?`);
    params.push(body.screenOrientation);
  }
  if (body.autoRefreshSeconds !== undefined) {
    updates.push(`auto_refresh_seconds = ?`);
    params.push(body.autoRefreshSeconds);
  }
  if (body.showIpTv !== undefined) {
    updates.push(`show_ip_tv = ?`);
    params.push(body.showIpTv ? 1 : 0);
  }
  if (body.ipTvChannelId !== undefined) {
    updates.push(`ip_tv_channel_id = ?`);
    params.push(body.ipTvChannelId);
  }
  if (body.ipTvVolume !== undefined) {
    updates.push(`ip_tv_volume = ?`);
    params.push(body.ipTvVolume);
  }
  if (body.theme !== undefined) {
    updates.push(`theme = ?`);
    params.push(body.theme);
  }
  if (body.language !== undefined) {
    updates.push(`language = ?`);
    params.push(body.language);
  }
  if (body.isActive !== undefined) {
    updates.push(`is_active = ?`);
    params.push(body.isActive ? 1 : 0);
  }

  if (updates.length === 0) {
    return c.json(errorResponse('No fields to update'), 400);
  }

  updates.push(`updated_at = ?`);
  params.push(now());
  params.push(displayId);

  await db.prepare(`UPDATE display_configs SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();

  const updated = await db.prepare('SELECT * FROM display_configs WHERE id = ?').bind(displayId).first();

  return c.json(successResponse(updated, 'Display updated'));
});

display.delete('/:id', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  const displayId = c.req.param('id');

  if (!user || !['admin'].includes(user.role)) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const display = await db.prepare('SELECT * FROM display_configs WHERE id = ?').bind(displayId).first();

  if (!display) {
    return c.json(errorResponse('Display not found'), 404);
  }

  await db.prepare('DELETE FROM display_configs WHERE id = ?').bind(displayId).run();

  return c.json(successResponse(null, 'Display deleted'));
});

display.get('/channels', async (c) => {
  const db = c.env.DB;

  const result = await db.prepare(`
    SELECT * FROM iptv_channels WHERE is_active = 1 ORDER BY display_order ASC
  `).all();

  return c.json(successResponse(result.results));
});

display.post('/channels', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  const body = await c.req.json().catch(() => null) as any;

  if (!user || !['admin'].includes(user.role)) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const id = generateId('ch');
  const createdAt = now();

  await db.prepare(`
    INSERT INTO iptv_channels (id, name, url, category, logo, is_active, display_order, created_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `).bind(id, body.name, body.url, body.category || null, body.logo || null, body.displayOrder, createdAt).run();

  const channel = await db.prepare('SELECT * FROM iptv_channels WHERE id = ?').bind(id).first();

  return c.json(successResponse(channel, 'Channel created'), 201);
});

export { display };
