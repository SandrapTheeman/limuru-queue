import { Hono } from 'hono';
import { z } from 'zod';
import type { Bindings } from '../types';
import { Message, MessageType, MessagePriority } from '../db/schema';
import { generateId, now, successResponse, errorResponse } from '../utils';

const messages = new Hono<{ Bindings: Bindings }>();

const createMessageSchema = z.object({
  recipientId: z.string(),
  recipientType: z.enum(['user', 'department', 'all', 'patient']),
  messageType: z.enum(['internal', 'broadcast', 'alert', 'reminder']),
  subject: z.string().optional(),
  content: z.string().min(1),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional().default('normal'),
  expiresIn: z.number().optional(),
  metadata: z.record(z.string()).optional(),
});

const updateMessageSchema = z.object({
  isRead: z.boolean().optional(),
  content: z.string().optional(),
});

const sendBroadcastSchema = z.object({
  recipientType: z.enum(['department', 'all', 'role']),
  recipientValue: z.string().optional(),
  subject: z.string().optional(),
  content: z.string().min(1),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional().default('normal'),
});

const listMessagesSchema = z.object({
  type: z.enum(['inbox', 'sent', 'all']).optional().default('inbox'),
  messageType: z.enum(['internal', 'broadcast', 'alert', 'reminder']).optional(),
  isRead: z.boolean().optional(),
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0),
});

messages.get('/', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  
  if (!user) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const query = c.req.query();
  const type = query.type || 'inbox';
  const messageType = query.messageType as MessageType | undefined;
  const isRead = query.isRead === 'true' ? true : query.isRead === 'false' ? false : undefined;
  const limit = parseInt(query.limit || '20');
  const offset = parseInt(query.offset || '0');

  let sql = `
    SELECT * FROM messages 
    WHERE 1=1
  `;
  const params: unknown[] = [];
  let paramIndex = 1;

  if (type === 'inbox') {
    if (user.role === 'patient') {
      sql += ` AND ((recipient_type = 'patient' AND recipient_id = ?) OR (recipient_type = 'all'))`;
      params.push(user.patientId);
    } else {
      sql += ` AND ((recipient_type IN ('user', 'department') AND recipient_id = ?) OR (recipient_type = 'all'))`;
      params.push(user.userId);
    }
  } else if (type === 'sent') {
    sql += ` AND sender_id = ? AND sender_type = ?`;
    params.push(user.userId, user.role === 'patient' ? 'patient' : 'user');
  }

  if (messageType) {
    sql += ` AND message_type = ?`;
    params.push(messageType);
  }

  if (isRead !== undefined) {
    sql += ` AND is_read = ?`;
    params.push(isRead ? 1 : 0);
  }

  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const result = await db.prepare(sql).bind(...params).all();
  
  const countSql = sql.replace(/ORDER BY.*LIMIT.*OFFSET.*/, '').replace('SELECT *', 'SELECT COUNT(*) as count');
  const countResult = await db.prepare(countSql).bind(...params.slice(0, -2)).first() as { count: number };

  return c.json(successResponse({
    messages: result.results,
    total: countResult?.count || 0,
    limit,
    offset,
    hasMore: offset + limit < (countResult?.count || 0),
  }));
});

messages.get('/:id', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  const messageId = c.req.param('id');

  if (!user) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const result = await db.prepare('SELECT * FROM messages WHERE id = ?').bind(messageId).first() as Message | undefined;

  if (!result) {
    return c.json(errorResponse('Message not found'), 404);
  }

  if (result.recipient_type === 'user' && result.recipient_id !== user.userId && 
      result.sender_id !== user.userId && ((c as any).get('user')?.role ?? '') === 'all') {
    return c.json(errorResponse('Access denied'), 403);
  }

  if (!result.is_read && result.recipient_id === user.userId) {
    await db.prepare(`
      UPDATE messages SET is_read = 1, read_at = ? WHERE id = ?
    `).bind(now(), messageId).run();
    result.is_read = true;
    result.read_at = now();
  }

  return c.json(successResponse(result));
});

messages.post('/', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  const body = await c.req.json().catch(() => null) as any;

  if (!user) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const id = generateId('msg');
  const createdAt = now();
  const senderType = user.role === 'patient' ? 'patient' : 'user';
  const senderName = user.role === 'patient' ? 'Patient' : user.email;
  const expiresAt = body.expiresIn ? new Date(Date.now() + body.expiresIn * 1000).toISOString() : null;

  await db.prepare(`
    INSERT INTO messages (id, sender_id, sender_type, sender_name, recipient_id, recipient_type, 
      message_type, subject, content, priority, is_read, expires_at, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
  `).bind(
    id,
    user.userId,
    senderType,
    senderName,
    body.recipientId,
    body.recipientType,
    body.messageType,
    body.subject || null,
    body.content,
    body.priority,
    expiresAt,
    body.metadata ? JSON.stringify(body.metadata) : null,
    createdAt
  ).run();

  const message = await db.prepare('SELECT * FROM messages WHERE id = ?').bind(id).first();

  return c.json(successResponse(message, 'Message sent'), 201);
});

messages.post('/broadcast', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  const body = await c.req.json().catch(() => null) as any;

  if (!user || !['admin', 'doctor', 'receptionist'].includes(user.role)) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  let recipientId = body.recipientValue || '';
  let recipientType = body.recipientType;

  if (body.recipientType === 'role' && body.recipientValue) {
    const usersResult = await db.prepare(`
      SELECT id FROM users WHERE role = ? AND is_active = 1
    `).bind(body.recipientValue).all();
    
    const messages = [];
    for (const u of usersResult.results as { id: string }[]) {
      const id = generateId('msg');
      const createdAt = now();
      messages.push({
        id,
        sender_id: user.userId,
        sender_type: 'user',
        sender_name: user.email,
        recipient_id: u.id,
        recipient_type: 'user',
        message_type: body.messageType,
        subject: body.subject || null,
        content: body.content,
        priority: body.priority,
        is_read: 0,
        read_at: null,
        expires_at: null,
        metadata: null,
        created_at: createdAt,
      });
    }

    if (messages.length > 0) {
      const placeholders = messages.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, NULL, ?)').join(', ');
      const values = messages.flatMap(m => [
        m.id, m.sender_id, m.sender_type, m.sender_name, m.recipient_id, m.recipient_type,
        m.message_type, m.subject, m.content, m.priority, m.created_at
      ]);
      
      await db.prepare(`
        INSERT INTO messages (id, sender_id, sender_type, sender_name, recipient_id, recipient_type,
          message_type, subject, content, priority, is_read, read_at, expires_at, metadata, created_at)
        VALUES ${placeholders}
      `).bind(...values).run();
    }

    return c.json(successResponse({ sent: messages.length }, `Broadcast sent to ${messages.length} recipients`));
  }

  const id = generateId('msg');
  const createdAt = now();

  await db.prepare(`
    INSERT INTO messages (id, sender_id, sender_type, sender_name, recipient_id, recipient_type,
      message_type, subject, content, priority, is_read, expires_at, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, ?)
  `).bind(
    id,
    user.userId,
    'user',
    user.email,
    recipientId,
    recipientType,
    body.messageType,
    body.subject || null,
    body.content,
    body.priority,
    createdAt
  ).run();

  return c.json(successResponse({ id }, 'Broadcast sent'));
});

messages.put('/:id', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  const messageId = c.req.param('id');
  const body = await c.req.json().catch(() => null) as any;

  if (!user) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const message = await db.prepare('SELECT * FROM messages WHERE id = ?').bind(messageId).first() as Message | undefined;

  if (!message) {
    return c.json(errorResponse('Message not found'), 404);
  }

  if (message.recipient_id !== user.userId && message.sender_id !== user.userId) {
    return c.json(errorResponse('Access denied'), 403);
  }

  if (body.isRead !== undefined) {
    await db.prepare(`
      UPDATE messages SET is_read = ?, read_at = ? WHERE id = ?
    `).bind(body.isRead ? 1 : 0, body.isRead ? now() : null, messageId).run();
  }

  if (body.content !== undefined && message.sender_id === user.userId) {
    await db.prepare(`
      UPDATE messages SET content = ? WHERE id = ?
    `).bind(body.content, messageId).run();
  }

  const updated = await db.prepare('SELECT * FROM messages WHERE id = ?').bind(messageId).first();

  return c.json(successResponse(updated, 'Message updated'));
});

messages.delete('/:id', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  const messageId = c.req.param('id');

  if (!user) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const message = await db.prepare('SELECT * FROM messages WHERE id = ?').bind(messageId).first() as Message | undefined;

  if (!message) {
    return c.json(errorResponse('Message not found'), 404);
  }

  if (message.sender_id !== user.userId && user.role !== 'admin') {
    return c.json(errorResponse('Access denied'), 403);
  }

  await db.prepare('DELETE FROM messages WHERE id = ?').bind(messageId).run();

  return c.json(successResponse(null, 'Message deleted'));
});

messages.get('/stats/unread', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');

  if (!user) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  let sql = `SELECT COUNT(*) as count FROM messages WHERE is_read = 0 AND (`;
  const params: unknown[] = [];

  if (user.role === 'patient') {
    sql += `(recipient_type = 'patient' AND recipient_id = ?) OR (recipient_type = 'all')`;
    params.push(user.patientId);
  } else {
    sql += `(recipient_type IN ('user', 'department') AND recipient_id = ?) OR (recipient_type = 'all')`;
    params.push(user.userId);
  }

  sql += `)`;

  const result = await db.prepare(sql).bind(...params).first() as { count: number };

  return c.json(successResponse({ unreadCount: result?.count || 0 }));
});

messages.post('/mark-all-read', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');

  if (!user) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  let sql = `UPDATE messages SET is_read = 1, read_at = ? WHERE is_read = 0 AND (`;
  const params: unknown[] = [now()];

  if (user.role === 'patient') {
    sql += `(recipient_type = 'patient' AND recipient_id = ?) OR (recipient_type = 'all')`;
    params.push(user.patientId);
  } else {
    sql += `(recipient_type IN ('user', 'department') AND recipient_id = ?) OR (recipient_type = 'all')`;
    params.push(user.userId);
  }

  sql += `)`;

  const result = await db.prepare(sql).bind(...params).run();

  return c.json(successResponse({ updated: result.meta.changes }, 'All messages marked as read'));
});

messages.post('/alert', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  const body = await c.req.json().catch(() => null) as any;

  if (!user || !['admin', 'doctor', 'receptionist'].includes(user.role)) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const id = generateId('alert');
  const createdAt = now();

  const recipients: string[] = [];

  if (body.recipientType === 'all') {
    const users = await db.prepare('SELECT id FROM users WHERE is_active = 1').all();
    for (const u of users.results as { id: string }[]) {
      recipients.push(u.id);
    }
  } else if (body.recipientType === 'department' && body.recipientId) {
    const users = await db.prepare('SELECT id FROM users WHERE role = ? AND is_active = 1').bind(body.recipientId).all();
    for (const u of users.results as { id: string }[]) {
      recipients.push(u.id);
    }
  } else if (body.recipientId) {
    recipients.push(body.recipientId);
  }

  for (const recipientId of recipients) {
    await db.prepare(`
      INSERT INTO messages (id, sender_id, sender_type, sender_name, recipient_id, recipient_type,
        message_type, subject, content, priority, is_read, expires_at, metadata, created_at)
      VALUES (?, ?, 'user', ?, ?, 'user', 'alert', ?, ?, 'high', 0, NULL, ?, ?)
    `).bind(
      generateId('alert'),
      user.userId,
      user.email,
      recipientId,
      body.title,
      body.message,
      JSON.stringify({ severity: body.severity }),
      createdAt
    ).run();
  }

  return c.json(successResponse({ sent: recipients.length }, `Alert sent to ${recipients.length} recipients`));
});

export { messages };
