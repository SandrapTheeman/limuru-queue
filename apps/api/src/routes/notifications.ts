import { Hono } from 'hono';
import type { Bindings } from '../types';
import { generateId, successResponse, errorResponse, now } from '../utils';
import { createTwilioService } from '../services/notifications/twilio';
import { createEmailService } from '../services/notifications/email';
import { createNotificationService } from '../services/notifications';

const notifications = new Hono<{ Bindings: Bindings }>();

notifications.post('/sms', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json().catch(() => null);

  if (!body || !body.to || !body.message) {
    return c.json(errorResponse('Missing required fields: to, message'), 400);
  }

  const { to, message, patientId, template, variables } = body;

  if (!c.env.TWILIO_ACCOUNT_SID || !c.env.TWILIO_AUTH_TOKEN || !c.env.TWILIO_PHONE_NUMBER) {
    return c.json(errorResponse('Twilio not configured'), 503);
  }

  const twilioService = createTwilioService({
    TWILIO_ACCOUNT_SID: c.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: c.env.TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER: c.env.TWILIO_PHONE_NUMBER,
    TWILIO_WHATSAPP_NUMBER: (c.env as any).TWILIO_WHATSAPP_NUMBER || '',
  });

  let result;
  if (template) {
    result = await twilioService.sendTemplatedMessage(to, 'sms', template, variables || {});
  } else {
    result = await twilioService.sendSMS(to, message);
  }

  const notificationId = generateId('notif');
  
  await db.prepare(`
    INSERT INTO notifications (id, facility_id, patient_id, notification_type, recipient, recipient_name, message, 
      template_id, template_variables, status, provider, provider_message_id, provider_response, created_at)
    VALUES (?, ?, ?, 'sms', ?, ?, ?, ?, ?, ?, 'twilio', ?, ?, ?)
  `).bind(
    notificationId,
    (c.env as any).FACILITY_ID || 'default',
    patientId || null,
    to,
    null,
    message,
    template || null,
    variables ? JSON.stringify(variables) : null,
    result.success ? 'sent' : 'failed',
    result.sid || null,
    result.error || null,
    now()
  ).run();

  return c.json(successResponse({
    success: result.success,
    notificationId,
    sid: result.sid,
    status: result.status,
    error: result.error,
  }));
});

notifications.post('/whatsapp', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json().catch(() => null);

  if (!body || !body.to || !body.message) {
    return c.json(errorResponse('Missing required fields: to, message'), 400);
  }

  const { to, message, patientId, template, variables } = body;

  if (!c.env.TWILIO_ACCOUNT_SID || !c.env.TWILIO_AUTH_TOKEN || !c.env.TWILIO_PHONE_NUMBER) {
    return c.json(errorResponse('Twilio not configured'), 503);
  }

  if (!(c.env as any).TWILIO_WHATSAPP_NUMBER) {
    return c.json(errorResponse('WhatsApp number not configured'), 503);
  }

  const twilioService = createTwilioService({
    TWILIO_ACCOUNT_SID: c.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: c.env.TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER: c.env.TWILIO_PHONE_NUMBER,
    TWILIO_WHATSAPP_NUMBER: (c.env as any).TWILIO_WHATSAPP_NUMBER,
  });

  let result;
  if (template) {
    result = await twilioService.sendTemplatedMessage(to, 'whatsapp', template, variables || {});
  } else {
    result = await twilioService.sendWhatsApp(to, message);
  }

  const notificationId = generateId('notif');
  
  await db.prepare(`
    INSERT INTO notifications (id, facility_id, patient_id, notification_type, recipient, recipient_name, message,
      template_id, template_variables, status, provider, provider_message_id, provider_response, created_at)
    VALUES (?, ?, ?, 'whatsapp', ?, ?, ?, ?, ?, ?, 'twilio', ?, ?, ?)
  `).bind(
    notificationId,
    (c.env as any).FACILITY_ID || 'default',
    patientId || null,
    to,
    null,
    message,
    template || null,
    variables ? JSON.stringify(variables) : null,
    result.success ? 'sent' : 'failed',
    result.sid || null,
    result.error || null,
    now()
  ).run();

  return c.json(successResponse({
    success: result.success,
    notificationId,
    sid: result.sid,
    status: result.status,
    error: result.error,
  }));
});

notifications.post('/', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json().catch(() => null);

  if (!body || !body.type || !body.recipient || !body.message) {
    return c.json(errorResponse('Missing required fields: type, recipient, message'), 400);
  }

  const { type, recipient, message, patientId, userId, template, variables, scheduledAt, fallbackToEmail, priority } = body;
  const validTypes = ['sms', 'whatsapp', 'voice', 'email', 'push'];

  if (!validTypes.includes(type)) {
    return c.json(errorResponse('Invalid notification type'), 400);
  }

  const notificationService = createNotificationService(db, {
    TWILIO_ACCOUNT_SID: c.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: c.env.TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER: c.env.TWILIO_PHONE_NUMBER,
    TWILIO_WHATSAPP_NUMBER: (c.env as any).TWILIO_WHATSAPP_NUMBER,
    RESEND_API_KEY: (c.env as any).RESEND_API_KEY,
    RESEND_FROM_EMAIL: (c.env as any).RESEND_FROM_EMAIL,
    VAPID_PUBLIC_KEY: (c.env as any).VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: (c.env as any).VAPID_PRIVATE_KEY,
    VAPID_EMAIL: (c.env as any).VAPID_EMAIL,
    EXPO_ACCESS_TOKEN: (c.env as any).EXPO_ACCESS_TOKEN,
  });

  let recipientData;
  if (patientId) {
    const patient = await db.prepare('SELECT * FROM patients WHERE id = ?').bind(patientId).first();
    if (!patient) {
      return c.json(errorResponse('Patient not found'), 404);
    }
    recipientData = {
      id: (patient as any).id,
      type: 'patient' as const,
      name: `${(patient as any).first_name} ${(patient as any).last_name}`,
      phone: (patient as any).phone,
      email: (patient as any).email,
    };
  } else if (userId) {
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
    if (!user) {
      return c.json(errorResponse('User not found'), 404);
    }
    recipientData = {
      id: (user as any).id,
      type: 'user' as const,
      name: `${(user as any).first_name} ${(user as any).last_name}`,
      phone: (user as any).phone,
      email: (user as any).email,
    };
  } else {
    recipientData = {
      id: 'unknown',
      type: 'user' as const,
      name: recipient,
    };
  }

  const result = await notificationService.sendNotification(recipientData, message, {
    channel: type as any,
    template,
    templateVariables: variables,
    scheduledAt,
    fallbackToEmail,
    priority: priority || 'normal',
  });

  return c.json(successResponse(result), result.success ? 200 : 500);
});

notifications.get('/', async (c) => {
  const db = c.env.DB;
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');
  const patientId = c.req.query('patientId');
  const userId = c.req.query('userId');
  const type = c.req.query('type');
  const status = c.req.query('status');

  let sql = 'SELECT * FROM notifications WHERE 1=1';
  const params: unknown[] = [];

  if (patientId) {
    sql += ' AND patient_id = ?';
    params.push(patientId);
  }

  if (userId) {
    sql += ' AND user_id = ?';
    params.push(userId);
  }

  if (type) {
    sql += ' AND notification_type = ?';
    params.push(type);
  }

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  const countSql = `SELECT COUNT(*) as count FROM (${sql})`;
  const countResult = await db.prepare(countSql).bind(...params).first() as { count: number };

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const result = await db.prepare(sql).bind(...params).all();

  return c.json(successResponse({
    notifications: result.results,
    total: countResult?.count || 0,
    limit,
    offset,
  }));
});

notifications.get('/templates', async (c) => {
  const db = c.env.DB;
  const facilityId = c.req.query('facilityId');
  const type = c.req.query('type');

  let sql = 'SELECT * FROM notification_templates WHERE is_active = 1';
  const params: unknown[] = [];

  if (facilityId) {
    sql += ' AND facility_id = ?';
    params.push(facilityId);
  }

  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }

  sql += ' ORDER BY name';

  const templates = await db.prepare(sql).bind(...params).all();

  return c.json(successResponse(templates.results || []));
});

notifications.post('/templates', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json().catch(() => null);

  if (!body || !body.name || !body.code || !body.type || !body.body) {
    return c.json(errorResponse('Missing required fields: name, code, type, body'), 400);
  }

  const { name, code, type, subject, body: templateBody, variables, category, facilityId } = body;

  const id = generateId('tmpl');
  const nowStr = now();

  await db.prepare(`
    INSERT INTO notification_templates (id, facility_id, name, code, type, subject, body, variables, category, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).bind(
    id,
    facilityId || (c.env as any).FACILITY_ID || 'default',
    name,
    code,
    type,
    subject || null,
    templateBody,
    variables ? JSON.stringify(variables) : null,
    category || null,
    nowStr,
    nowStr
  ).run();

  return c.json(successResponse({ id, message: 'Template created successfully' }), 201);
});

notifications.get('/preferences', async (c) => {
  const db = c.env.DB;
  const userId = c.req.query('userId');
  const userType = c.req.query('userType') || 'patient';

  if (!userId) {
    return c.json(errorResponse('Missing required query parameter: userId'), 400);
  }

  const preferences = await db.prepare(`
    SELECT * FROM notification_preferences WHERE user_id = ? AND user_type = ?
  `).bind(userId, userType).first();

  if (!preferences) {
    return c.json(successResponse({
      smsEnabled: true,
      whatsappEnabled: true,
      emailEnabled: true,
      pushEnabled: true,
      voiceEnabled: true,
    }));
  }

  return c.json(successResponse({
    smsEnabled: Boolean((preferences as any).sms_enabled),
    whatsappEnabled: Boolean((preferences as any).whatsapp_enabled),
    emailEnabled: Boolean((preferences as any).email_enabled),
    pushEnabled: Boolean((preferences as any).push_enabled),
    voiceEnabled: Boolean((preferences as any).voice_enabled),
    quietHoursStart: (preferences as any).quiet_hours_start,
    quietHoursEnd: (preferences as any).quiet_hours_end,
    preferredChannel: (preferences as any).preferred_channel,
  }));
});

notifications.put('/preferences', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json().catch(() => null);

  if (!body || !body.userId || !body.userType) {
    return c.json(errorResponse('Missing required fields: userId, userType'), 400);
  }

  const { userId, userType, smsEnabled, whatsappEnabled, emailEnabled, pushEnabled, voiceEnabled, quietHoursStart, quietHoursEnd, preferredChannel } = body;

  const existing = await db.prepare(`
    SELECT id FROM notification_preferences WHERE user_id = ? AND user_type = ?
  `).bind(userId, userType).first();

  if (existing) {
    await db.prepare(`
      UPDATE notification_preferences SET 
        sms_enabled = ?, whatsapp_enabled = ?, email_enabled = ?,
        push_enabled = ?, voice_enabled = ?, quiet_hours_start = ?,
        quiet_hours_end = ?, preferred_channel = ?, updated_at = ?
      WHERE user_id = ? AND user_type = ?
    `).bind(
      smsEnabled ? 1 : 0,
      whatsappEnabled ? 1 : 0,
      emailEnabled ? 1 : 0,
      pushEnabled ? 1 : 0,
      voiceEnabled ? 1 : 0,
      quietHoursStart || null,
      quietHoursEnd || null,
      preferredChannel || null,
      now(),
      userId,
      userType
    ).run();
  } else {
    await db.prepare(`
      INSERT INTO notification_preferences 
        (user_id, user_type, sms_enabled, whatsapp_enabled, email_enabled,
         push_enabled, voice_enabled, quiet_hours_start, quiet_hours_end, preferred_channel)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      userType,
      smsEnabled ? 1 : 0,
      whatsappEnabled ? 1 : 0,
      emailEnabled ? 1 : 0,
      pushEnabled ? 1 : 0,
      voiceEnabled ? 1 : 0,
      quietHoursStart || null,
      quietHoursEnd || null,
      preferredChannel || null
    ).run();
  }

  return c.json(successResponse({ message: 'Preferences updated successfully' }));
});

notifications.post('/schedule', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json().catch(() => null);

  if (!body || !body.recipient || !body.message || !body.scheduledAt) {
    return c.json(errorResponse('Missing required fields: recipient, message, scheduledAt'), 400);
  }

  const { recipient, message, type, patientId, userId, scheduledAt, template, variables, priority } = body;

  const id = generateId('notif');
  const facilityId = (c.env as any).FACILITY_ID || 'default';

  await db.prepare(`
    INSERT INTO notifications (id, facility_id, patient_id, user_id, notification_type, recipient, recipient_name, message,
      template_id, template_variables, status, scheduled_at, priority, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?)
  `).bind(
    id,
    facilityId,
    patientId || null,
    userId || null,
    type || 'sms',
    recipient,
    null,
    message,
    template || null,
    variables ? JSON.stringify(variables) : null,
    scheduledAt,
    priority || 'normal',
    now()
  ).run();

  return c.json(successResponse({
    notificationId: id,
    scheduledAt,
    message: 'Notification scheduled successfully'
  }), 201);
});

notifications.get('/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  const notification = await db.prepare('SELECT * FROM notifications WHERE id = ?').bind(id).first();

  if (!notification) {
    return c.json(errorResponse('Notification not found'), 404);
  }

  return c.json(successResponse(notification));
});

notifications.put('/:id/status', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => null);

  if (!body || !body.status) {
    return c.json(errorResponse('Missing required field: status'), 400);
  }

  const { status, deliveredAt, readAt, failureReason, failureCode } = body;
  const validStatuses = ['pending', 'queued', 'scheduled', 'sent', 'delivered', 'failed', 'cancelled'];

  if (!validStatuses.includes(status)) {
    return c.json(errorResponse('Invalid status'), 400);
  }

  const updates: string[] = ['status = ?', 'updated_at = ?'];
  const values: unknown[] = [status, now()];

  if (deliveredAt) {
    updates.push('delivered_at = ?');
    values.push(deliveredAt);
  }
  if (readAt) {
    updates.push('read_at = ?');
    values.push(readAt);
  }
  if (failureReason) {
    updates.push('failure_reason = ?');
    values.push(failureReason);
  }
  if (failureCode) {
    updates.push('failure_code = ?');
    values.push(failureCode);
  }

  values.push(id);

  await db.prepare(`UPDATE notifications SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

  return c.json(successResponse({ message: 'Status updated successfully' }));
});

notifications.post('/:id/retry', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  const notification = await db.prepare('SELECT * FROM notifications WHERE id = ?').bind(id).first() as any;

  if (!notification) {
    return c.json(errorResponse('Notification not found'), 404);
  }

  if (notification.status !== 'failed') {
    return c.json(errorResponse('Can only retry failed notifications'), 400);
  }

  const notificationService = createNotificationService(db, {
    TWILIO_ACCOUNT_SID: c.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: c.env.TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER: c.env.TWILIO_PHONE_NUMBER,
    TWILIO_WHATSAPP_NUMBER: (c.env as any).TWILIO_WHATSAPP_NUMBER,
  });

  const result = await notificationService.sendNotification(
    {
      id: notification.user_id || notification.patient_id || 'unknown',
      type: notification.patient_id ? 'patient' as const : 'user' as const,
      name: notification.recipient_name || 'Unknown',
      phone: notification.notification_type !== 'email' ? notification.recipient : undefined,
      email: notification.notification_type === 'email' ? notification.recipient : undefined,
    },
    notification.message,
    {
      channel: notification.notification_type as any,
      templateVariables: notification.template_variables ? JSON.parse(notification.template_variables) : undefined,
    }
  );

  await db.prepare(`
    UPDATE notifications SET status = ?, retry_count = retry_count + 1, updated_at = ?
    WHERE id = ?
  `).bind(result.success ? 'sent' : 'failed', now(), id).run();

  return c.json(successResponse({
    success: result.success,
    error: result.error,
    messageId: result.sid || result.messageId,
  }));
});

notifications.post('/process-scheduled', async (c) => {
  const db = c.env.DB;

  const notificationService = createNotificationService(db, {
    TWILIO_ACCOUNT_SID: c.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: c.env.TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER: c.env.TWILIO_PHONE_NUMBER,
    TWILIO_WHATSAPP_NUMBER: (c.env as any).TWILIO_WHATSAPP_NUMBER,
  });

  const processed = await notificationService.checkAndProcessScheduledNotifications();

  return c.json(successResponse({
    processed,
    message: `Processed ${processed} scheduled notifications`,
  }));
});

notifications.get('/delivery-status/:sid', async (c) => {
  const db = c.env.DB;
  const sid = c.req.param('sid');

  if (!c.env.TWILIO_ACCOUNT_SID || !c.env.TWILIO_AUTH_TOKEN || !c.env.TWILIO_PHONE_NUMBER) {
    return c.json(errorResponse('Twilio not configured'), 503);
  }

  const twilioService = createTwilioService({
    TWILIO_ACCOUNT_SID: c.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: c.env.TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER: c.env.TWILIO_PHONE_NUMBER,
    TWILIO_WHATSAPP_NUMBER: (c.env as any).TWILIO_WHATSAPP_NUMBER || '',
  });

  const status = await twilioService.checkDeliveryStatus(sid);

  if (!status) {
    return c.json(errorResponse('Could not retrieve delivery status'), 500);
  }

  const notification = await db.prepare(`
    SELECT * FROM notifications WHERE provider_message_id = ? ORDER BY created_at DESC LIMIT 1
  `).bind(sid).first() as any;

  if (notification) {
    const newStatus = status.status === 'delivered' ? 'delivered' : status.status === 'failed' ? 'failed' : 'sent';
    await db.prepare(`
      UPDATE notifications SET status = ?, failure_reason = ?, failure_code = ?, updated_at = ?
      WHERE id = ?
    `).bind(newStatus, status.errorMessage || null, status.errorCode || null, now(), notification.id).run();
  }

  return c.json(successResponse(status));
});

export { notifications };
