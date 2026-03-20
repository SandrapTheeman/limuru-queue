import { D1Database } from '@cloudflare/workers-types';
import { Message, MessageType, MessagePriority } from '../db/schema';
import { generateId, now } from '../utils';

export interface CreateMessageParams {
  senderId: string;
  senderType: 'user' | 'system' | 'patient';
  senderName: string;
  recipientId: string | null;
  recipientType: 'user' | 'department' | 'all' | 'patient';
  messageType: MessageType;
  subject?: string;
  content: string;
  priority?: MessagePriority;
  expiresIn?: number;
  metadata?: Record<string, unknown>;
}

export interface MessageFilters {
  type?: 'inbox' | 'sent' | 'all';
  messageType?: MessageType;
  isRead?: boolean;
  limit?: number;
  offset?: number;
}

export async function sendMessage(
  db: D1Database,
  params: CreateMessageParams
): Promise<Message> {
  const id = generateId('msg');
  const createdAt = now();
  const expiresAt = params.expiresIn
    ? new Date(Date.now() + params.expiresIn * 1000).toISOString()
    : null;

  await db.prepare(`
    INSERT INTO messages (
      id, sender_id, sender_type, sender_name, recipient_id, recipient_type,
      message_type, subject, content, priority, is_read, read_at, expires_at, metadata, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?, ?)
  `).bind(
    id,
    params.senderId,
    params.senderType,
    params.senderName,
    params.recipientId,
    params.recipientType,
    params.messageType,
    params.subject || null,
    params.content,
    params.priority || 'normal',
    expiresAt,
    params.metadata ? JSON.stringify(params.metadata) : null,
    createdAt
  ).run();

  const message = await db.prepare('SELECT * FROM messages WHERE id = ?').bind(id).first() as Message;
  return message;
}

export async function getMessage(
  db: D1Database,
  messageId: string,
  userId?: string
): Promise<Message | null> {
  const message = await db.prepare('SELECT * FROM messages WHERE id = ?').bind(messageId).first() as Message | undefined;

  if (!message) {
    return null;
  }

  if (userId) {
    const canAccess =
      message.recipient_type === 'all' ||
      message.recipient_id === userId ||
      message.sender_id === userId;

    if (!canAccess) {
      return null;
    }

    if (!message.is_read && message.recipient_id === userId) {
      await db.prepare(`
        UPDATE messages SET is_read = 1, read_at = ? WHERE id = ?
      `).bind(now(), messageId).run();
      message.is_read = true;
      message.read_at = now();
    }
  }

  return message;
}

export async function getMessages(
  db: D1Database,
  userId: string,
  userRole: string,
  filters: MessageFilters
): Promise<{ messages: Message[]; total: number }> {
  const { type = 'inbox', messageType, isRead, limit = 20, offset = 0 } = filters;

  let sql = 'SELECT * FROM messages WHERE 1=1';
  const params: unknown[] = [];
  let paramIndex = 1;

  if (type === 'inbox') {
    if (userRole === 'patient') {
      sql += ` AND ((recipient_type = 'patient' AND recipient_id = ?) OR (recipient_type = 'all'))`;
      params.push(userId);
    } else {
      sql += ` AND ((recipient_type IN ('user', 'department') AND recipient_id = ?) OR (recipient_type = 'all'))`;
      params.push(userId);
    }
  } else if (type === 'sent') {
    sql += ` AND sender_id = ? AND sender_type = ?`;
    params.push(userId, userRole === 'patient' ? 'patient' : 'user');
  }

  if (messageType) {
    sql += ` AND message_type = ?`;
    params.push(messageType);
  }

  if (isRead !== undefined) {
    sql += ` AND is_read = ?`;
    params.push(isRead ? 1 : 0);
  }

  sql += ` AND (expires_at IS NULL OR expires_at > ?)`;
  params.push(now());

  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
  const countResult = await db.prepare(countSql).bind(...params).first() as { count: number };

  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const result = await db.prepare(sql).bind(...params).all();

  return {
    messages: (result.results as unknown) as Message[],
    total: countResult?.count || 0,
  };
}

export async function markAsRead(
  db: D1Database,
  messageId: string,
  userId: string
): Promise<boolean> {
  const message = await db.prepare('SELECT * FROM messages WHERE id = ?').bind(messageId).first() as Message | undefined;

  if (!message || message.recipient_id !== userId) {
    return false;
  }

  await db.prepare(`
    UPDATE messages SET is_read = 1, read_at = ? WHERE id = ?
  `).bind(now(), messageId).run();

  return true;
}

export async function markAllAsRead(
  db: D1Database,
  userId: string,
  userRole: string
): Promise<number> {
  let sql = `UPDATE messages SET is_read = 1, read_at = ? WHERE is_read = 0 AND (`;
  const params: unknown[] = [now()];

  if (userRole === 'patient') {
    sql += `(recipient_type = 'patient' AND recipient_id = ?) OR (recipient_type = 'all')`;
    params.push(userId);
  } else {
    sql += `(recipient_type IN ('user', 'department') AND recipient_id = ?) OR (recipient_type = 'all')`;
    params.push(userId);
  }

  sql += `)`;

  const result = await db.prepare(sql).bind(...params).run();
  return result.meta.changes || 0;
}

export async function deleteMessage(
  db: D1Database,
  messageId: string,
  userId: string,
  isAdmin: boolean
): Promise<boolean> {
  const message = await db.prepare('SELECT * FROM messages WHERE id = ?').bind(messageId).first() as Message | undefined;

  if (!message) {
    return false;
  }

  if (message.sender_id !== userId && !isAdmin) {
    return false;
  }

  await db.prepare('DELETE FROM messages WHERE id = ?').bind(messageId).run();
  return true;
}

export async function sendBroadcast(
  db: D1Database,
  senderId: string,
  senderName: string,
  recipientType: 'department' | 'all' | 'role',
  recipientValue: string | null,
  messageType: MessageType,
  subject: string | null,
  content: string,
  priority: MessagePriority = 'normal'
): Promise<number> {
  let recipientIds: string[] = [];

  if (recipientType === 'all') {
    const users = await db.prepare('SELECT id FROM users WHERE is_active = 1').all();
    recipientIds = (users.results as { id: string }[]).map(u => u.id);

    const patients = await db.prepare('SELECT id FROM patients').all();
    recipientIds.push(...(patients.results as { id: string }[]).map(p => p.id));
  } else if (recipientType === 'department') {
    const users = await db.prepare(
      'SELECT id FROM users WHERE role = ? AND is_active = 1'
    ).bind(recipientValue).all();
    recipientIds = (users.results as { id: string }[]).map(u => u.id);
  } else if (recipientType === 'role') {
    const users = await db.prepare(
      'SELECT id FROM users WHERE role = ? AND is_active = 1'
    ).bind(recipientValue).all();
    recipientIds = (users.results as { id: string }[]).map(u => u.id);
  }

  for (const recipientId of recipientIds) {
    await sendMessage(db, {
      senderId,
      senderType: 'user',
      senderName,
      recipientId,
      recipientType: 'user',
      messageType,
      subject: subject || undefined,
      content,
      priority,
    });
  }

  return recipientIds.length;
}

export async function sendAlert(
  db: D1Database,
  senderId: string,
  senderName: string,
  recipientType: 'user' | 'department' | 'all',
  recipientId: string | null,
  title: string,
  message: string,
  severity: 'info' | 'warning' | 'critical' = 'info'
): Promise<number> {
  let recipientIds: string[] = [];

  if (recipientType === 'all') {
    const users = await db.prepare('SELECT id FROM users WHERE is_active = 1').all();
    recipientIds = (users.results as { id: string }[]).map(u => u.id);
  } else if (recipientType === 'department' && recipientId) {
    const users = await db.prepare('SELECT id FROM users WHERE role = ? AND is_active = 1').bind(recipientId).all();
    recipientIds = (users.results as { id: string }[]).map(u => u.id);
  } else if (recipientType === 'user' && recipientId) {
    recipientIds = [recipientId];
  }

  for (const rid of recipientIds) {
    await sendMessage(db, {
      senderId,
      senderType: 'user',
      senderName,
      recipientId: rid,
      recipientType: 'user',
      messageType: 'alert',
      subject: title,
      content: message,
      priority: severity === 'critical' ? 'urgent' : severity === 'warning' ? 'high' : 'normal',
      metadata: { severity },
    });
  }

  return recipientIds.length;
}

export async function getUnreadCount(
  db: D1Database,
  userId: string,
  userRole: string
): Promise<number> {
  let sql = `SELECT COUNT(*) as count FROM messages WHERE is_read = 0 AND (`;
  const params: unknown[] = [];

  if (userRole === 'patient') {
    sql += `(recipient_type = 'patient' AND recipient_id = ?) OR (recipient_type = 'all')`;
    params.push(userId);
  } else {
    sql += `(recipient_type IN ('user', 'department') AND recipient_id = ?) OR (recipient_type = 'all')`;
    params.push(userId);
  }

  sql += `) AND (expires_at IS NULL OR expires_at > ?)`;
  params.push(now());

  const result = await db.prepare(sql).bind(...params).first() as { count: number };
  return result?.count || 0;
}

export async function sendPatientNotification(
  db: D1Database,
  patientId: string,
  messageType: 'reminder' | 'alert' | 'internal',
  subject: string,
  content: string,
  priority: MessagePriority = 'normal'
): Promise<Message> {
  return sendMessage(db, {
    senderId: 'system',
    senderType: 'system',
    senderName: 'System',
    recipientId: patientId,
    recipientType: 'patient',
    messageType,
    subject,
    content,
    priority,
  });
}

export async function cleanupExpiredMessages(db: D1Database): Promise<number> {
  const result = await db.prepare(`
    DELETE FROM messages WHERE expires_at IS NOT NULL AND expires_at < ?
  `).bind(now()).run();

  return result.meta.changes || 0;
}

export async function getMessageThread(
  db: D1Database,
  userId: string,
  otherUserId: string
): Promise<Message[]> {
  const result = await db.prepare(`
    SELECT * FROM messages
    WHERE (sender_id = ? AND recipient_id = ?)
       OR (sender_id = ? AND recipient_id = ?)
    ORDER BY created_at ASC
  `).bind(userId, otherUserId, otherUserId, userId).all();

  return (result.results as unknown) as Message[];
}
