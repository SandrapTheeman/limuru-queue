import { Hono } from 'hono';
import type { Bindings } from '../types';
import { generateId, successResponse, errorResponse, now } from '../utils';
import { createTwilioService } from '../services/notifications/twilio';

const notifications = new Hono<{ Bindings: Bindings }>();

notifications.post('/sms', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json().catch(() => null);

  if (!body || !body.to || !body.message) {
    return c.json(errorResponse('Missing required fields: to, message'), 400);
  }

  const { to, message, patientId } = body;

  if (!c.env.TWILIO_ACCOUNT_SID || !c.env.TWILIO_AUTH_TOKEN || !c.env.TWILIO_PHONE_NUMBER) {
    return c.json(errorResponse('Twilio not configured'), 503);
  }

  const twilioService = createTwilioService({
    TWILIO_ACCOUNT_SID: c.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: c.env.TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER: c.env.TWILIO_PHONE_NUMBER,
    TWILIO_WHATSAPP_NUMBER: (c.env as any).TWILIO_WHATSAPP_NUMBER,
  });

  const result = await twilioService.sendSMS(to, message);

  if (result.success) {
    await db.prepare(`
      INSERT INTO notification_logs (id, patient_id, type, channel, status, sid, message, created_at)
      VALUES (?, ?, 'sms', 'outgoing', 'sent', ?, ?, ?)
    `).bind(generateId('notif'), patientId || null, result.sid, message, now()).run();
  }

  return c.json(successResponse(result));
});

notifications.post('/whatsapp', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json().catch(() => null);

  if (!body || !body.to || !body.message) {
    return c.json(errorResponse('Missing required fields: to, message'), 400);
  }

  const { to, message, patientId, template } = body;

  if (!c.env.TWILIO_ACCOUNT_SID || !c.env.TWILIO_AUTH_TOKEN || !c.env.TWILIO_PHONE_NUMBER) {
    return c.json(errorResponse('Twilio not configured'), 503);
  }

  const twilioService = createTwilioService({
    TWILIO_ACCOUNT_SID: c.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: c.env.TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER: c.env.TWILIO_PHONE_NUMBER,
    TWILIO_WHATSAPP_NUMBER: (c.env as any).TWILIO_WHATSAPP_NUMBER,
  });

  let result;
  if (template) {
    result = await twilioService.sendTemplatedMessage(to, 'whatsapp', template, {});
  } else {
    result = await twilioService.sendWhatsApp(to, message);
  }

  if (result.success) {
    await db.prepare(`
      INSERT INTO notification_logs (id, patient_id, type, channel, status, sid, message, created_at)
      VALUES (?, ?, 'whatsapp', 'outgoing', 'sent', ?, ?, ?)
    `).bind(generateId('notif'), patientId || null, result.sid, message, now()).run();
  }

  return c.json(successResponse(result));
});

notifications.post('/', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json().catch(() => null);

  if (!body || !body.type || !body.recipient || !body.message) {
    return c.json(errorResponse('Missing required fields: type, recipient, message'), 400);
  }

  const { type, recipient, message, patientId, template, variables } = body;
  const validTypes = ['sms', 'whatsapp', 'voice', 'email'];

  if (!validTypes.includes(type)) {
    return c.json(errorResponse('Invalid notification type'), 400);
  }

  if (type === 'email') {
    return c.json(successResponse({ success: true, message: 'Email notification queued' }));
  }

  if (!c.env.TWILIO_ACCOUNT_SID || !c.env.TWILIO_AUTH_TOKEN || !c.env.TWILIO_PHONE_NUMBER) {
    return c.json(errorResponse('Twilio not configured'), 503);
  }

  const twilioService = createTwilioService({
    TWILIO_ACCOUNT_SID: c.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: c.env.TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER: c.env.TWILIO_PHONE_NUMBER,
    TWILIO_WHATSAPP_NUMBER: (c.env as any).TWILIO_WHATSAPP_NUMBER,
  });

  let result;
  if (template) {
    result = await twilioService.sendTemplatedMessage(recipient, type, template, variables || {});
  } else if (type === 'sms') {
    result = await twilioService.sendSMS(recipient, message);
  } else if (type === 'whatsapp') {
    result = await twilioService.sendWhatsApp(recipient, message);
  } else if (type === 'voice') {
    const twiml = twilioService.generateTwiml(message);
    result = await twilioService.initiateVoiceCall(recipient, twiml);
  }

  if (result?.success) {
    await db.prepare(`
      INSERT INTO notification_logs (id, patient_id, type, channel, status, sid, message, created_at)
      VALUES (?, ?, ?, 'outgoing', 'sent', ?, ?, ?)
    `).bind(generateId('notif'), patientId || null, type, result.sid, message, now()).run();
  }

  return c.json(successResponse(result));
});

notifications.get('/', async (c) => {
  const db = c.env.DB;
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = parseInt(c.req.query('offset') || '0');
  const patientId = c.req.query('patientId');
  const type = c.req.query('type');

  let sql = 'SELECT * FROM notification_logs WHERE 1=1';
  const params: unknown[] = [];

  if (patientId) {
    sql += ' AND patient_id = ?';
    params.push(patientId);
  }

  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const result = await db.prepare(sql).bind(...params).all();

  const countSql = sql.replace(/ORDER BY.*LIMIT.*OFFSET.*/, '').replace('SELECT *', 'SELECT COUNT(*) as count');
  const countResult = await db.prepare(countSql).bind(...params.slice(0, -2)).first() as { count: number };

  return c.json(successResponse({
    notifications: result.results,
    total: countResult?.count || 0,
  }));
});

notifications.get('/templates', async (c) => {
  const db = c.env.DB;

  const templates = await db.prepare(`
    SELECT * FROM notification_templates WHERE is_active = 1 ORDER BY name
  `).all();

  return c.json(successResponse(templates.results || []));
});

export { notifications };
