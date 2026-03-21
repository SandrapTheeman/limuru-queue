// Comprehensive Notification Service
// Handles notification orchestration, preferences, scheduling, retries, and fallbacks

import type { D1Database } from '@cloudflare/workers-types';
import { createTwilioService } from './twilio';
import { createEmailService } from './email';
import { createPushService, PushNotificationPayload } from './push';
import { generateId, now } from '../../utils';

export type NotificationChannel = 'sms' | 'whatsapp' | 'email' | 'push' | 'voice';
export type NotificationStatus = 'pending' | 'queued' | 'scheduled' | 'sent' | 'delivered' | 'failed' | 'cancelled';
export type NotificationPriority = 'high' | 'normal' | 'low';

export interface NotificationRecipient {
  id: string;
  type: 'patient' | 'user';
  name: string;
  phone?: string;
  email?: string;
  pushSubscriptions?: string[];
}

export interface NotificationOptions {
  channel: NotificationChannel | NotificationChannel[];
  template?: string;
  templateVariables?: Record<string, string>;
  priority?: NotificationPriority;
  scheduledAt?: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
  skipPreferences?: boolean;
  fallbackToEmail?: boolean;
  maxRetries?: number;
}

export interface NotificationResult {
  success: boolean;
  notificationId?: string;
  channel?: NotificationChannel;
  sid?: string;
  messageId?: string;
  error?: string;
  fallbackUsed?: boolean;
  fallbackResult?: NotificationResult;
}

export interface NotificationPreferences {
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  voiceEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  preferredChannel?: NotificationChannel;
}

interface StoredPreferences extends NotificationPreferences {
  user_id: string;
  user_type: string;
}

interface Template {
  id: string;
  name: string;
  code: string;
  type: string;
  subject?: string;
  body: string;
  variables?: string;
}

export class NotificationService {
  private db: D1Database;
  private twilioService: ReturnType<typeof createTwilioService> | null = null;
  private emailService: ReturnType<typeof createEmailService> | null = null;
  private pushService: ReturnType<typeof createPushService> | null = null;

  constructor(
    db: D1Database,
    env?: {
      TWILIO_ACCOUNT_SID?: string;
      TWILIO_AUTH_TOKEN?: string;
      TWILIO_PHONE_NUMBER?: string;
      TWILIO_WHATSAPP_NUMBER?: string;
      RESEND_API_KEY?: string;
      RESEND_FROM_EMAIL?: string;
      VAPID_PUBLIC_KEY?: string;
      VAPID_PRIVATE_KEY?: string;
      VAPID_EMAIL?: string;
      EXPO_ACCESS_TOKEN?: string;
    }
  ) {
    this.db = db;
    
    if (env?.TWILIO_ACCOUNT_SID && env?.TWILIO_AUTH_TOKEN && env?.TWILIO_PHONE_NUMBER) {
      this.twilioService = createTwilioService({
        TWILIO_ACCOUNT_SID: env.TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN: env.TWILIO_AUTH_TOKEN,
        TWILIO_PHONE_NUMBER: env.TWILIO_PHONE_NUMBER,
        TWILIO_WHATSAPP_NUMBER: env.TWILIO_WHATSAPP_NUMBER || '',
      });
    }
    
    if (env?.RESEND_API_KEY && env?.RESEND_FROM_EMAIL) {
      this.emailService = createEmailService({
        apiKey: env.RESEND_API_KEY,
        fromEmail: env.RESEND_FROM_EMAIL,
      });
    }
    
    if (env?.VAPID_PUBLIC_KEY) {
      this.pushService = createPushService({
        vapidPublicKey: env.VAPID_PUBLIC_KEY,
        vapidPrivateKey: env.VAPID_PRIVATE_KEY || '',
        vapidEmail: env.VAPID_EMAIL || '',
        expoAccessToken: env.EXPO_ACCESS_TOKEN,
      });
    }
  }

  async sendNotification(
    recipient: NotificationRecipient,
    message: string,
    options: NotificationOptions
  ): Promise<NotificationResult> {
    const channels = Array.isArray(options.channel) ? options.channel : [options.channel];
    
    for (const channel of channels) {
      const result = await this.sendToChannel(recipient, message, channel, options);
      
      if (result.success) {
        return result;
      }
      
      if (options.fallbackToEmail && channel !== 'email' && result.error) {
        const emailResult = await this.sendToChannel(recipient, message, 'email', options);
        if (emailResult.success) {
          return {
            ...result,
            fallbackUsed: true,
            fallbackResult: emailResult,
          };
        }
      }
    }
    
    return {
      success: false,
      error: 'Failed to send notification through all channels',
    };
  }

  private async sendToChannel(
    recipient: NotificationRecipient,
    message: string,
    channel: NotificationChannel,
    options: NotificationOptions
  ): Promise<NotificationResult> {
    if (!options.skipPreferences) {
      const preferences = await this.getPreferences(recipient.id, recipient.type);
      if (!this.isChannelEnabled(channel, preferences)) {
        return { success: false, error: `Channel ${channel} disabled by user preferences` };
      }
      
      if (this.isInQuietHours(preferences)) {
        if (channel !== 'email') {
          return { success: false, error: 'Quiet hours active' };
        }
      }
    }

    const notificationId = generateId('notif');
    let result: NotificationResult;

    switch (channel) {
      case 'sms':
        result = await this.sendSMS(recipient, message, notificationId, options);
        break;
      case 'whatsapp':
        result = await this.sendWhatsApp(recipient, message, notificationId, options);
        break;
      case 'email':
        result = await this.sendEmail(recipient, message, notificationId, options);
        break;
      case 'push':
        result = await this.sendPush(recipient, message, notificationId, options);
        break;
      case 'voice':
        result = await this.sendVoice(recipient, message, notificationId, options);
        break;
      default:
        result = { success: false, error: `Unsupported channel: ${channel}` };
    }

    return result;
  }

  private async sendSMS(
    recipient: NotificationRecipient,
    message: string,
    notificationId: string,
    options: NotificationOptions
  ): Promise<NotificationResult> {
    if (!this.twilioService) {
      return { success: false, error: 'Twilio SMS not configured' };
    }

    const phone = recipient.phone || await this.getPhoneFromDatabase(recipient.id, recipient.type);
    if (!phone) {
      return { success: false, error: 'No phone number available' };
    }

    let finalMessage = message;
    if (options.template) {
      const template = await this.getTemplate(options.template, 'sms');
      if (template) {
        finalMessage = this.applyTemplate(template.body, options.templateVariables || {});
      }
    }

    const twilioResult = await this.twilioService.sendSMS(phone, finalMessage);
    
    await this.logNotification({
      notificationId,
      patientId: recipient.type === 'patient' ? recipient.id : undefined,
      userId: recipient.type === 'user' ? recipient.id : undefined,
      type: 'sms',
      recipient: phone,
      recipientName: recipient.name,
      message: finalMessage,
      templateId: options.template,
      templateVariables: options.templateVariables,
      status: twilioResult.success ? 'sent' : 'failed',
      provider: 'twilio',
      providerMessageId: twilioResult.sid,
      providerResponse: twilioResult.error,
      scheduledAt: options.scheduledAt,
      expiresAt: options.expiresAt,
      metadata: options.metadata,
      priority: options.priority || 'normal',
    });

    if (!twilioResult.success && twilioResult.retryable) {
      await this.scheduleRetry(notificationId, options.maxRetries || 3);
    }

    return {
      success: twilioResult.success,
      notificationId,
      channel: 'sms',
      sid: twilioResult.sid,
      error: twilioResult.error,
    };
  }

  private async sendWhatsApp(
    recipient: NotificationRecipient,
    message: string,
    notificationId: string,
    options: NotificationOptions
  ): Promise<NotificationResult> {
    if (!this.twilioService) {
      return { success: false, error: 'Twilio WhatsApp not configured' };
    }

    const phone = recipient.phone || await this.getPhoneFromDatabase(recipient.id, recipient.type);
    if (!phone) {
      return { success: false, error: 'No phone number available for WhatsApp' };
    }

    let finalMessage = message;
    if (options.template) {
      const template = await this.getTemplate(options.template, 'whatsapp');
      if (template) {
        finalMessage = this.applyTemplate(template.body, options.templateVariables || {});
      }
    }

    const twilioResult = await this.twilioService.sendWhatsApp(phone, finalMessage);
    
    await this.logNotification({
      notificationId,
      patientId: recipient.type === 'patient' ? recipient.id : undefined,
      userId: recipient.type === 'user' ? recipient.id : undefined,
      type: 'whatsapp',
      recipient: phone,
      recipientName: recipient.name,
      message: finalMessage,
      templateId: options.template,
      templateVariables: options.templateVariables,
      status: twilioResult.success ? 'sent' : 'failed',
      provider: 'twilio',
      providerMessageId: twilioResult.sid,
      providerResponse: twilioResult.error,
      scheduledAt: options.scheduledAt,
      expiresAt: options.expiresAt,
      metadata: options.metadata,
      priority: options.priority || 'normal',
    });

    return {
      success: twilioResult.success,
      notificationId,
      channel: 'whatsapp',
      sid: twilioResult.sid,
      error: twilioResult.error,
    };
  }

  private async sendEmail(
    recipient: NotificationRecipient,
    message: string,
    notificationId: string,
    options: NotificationOptions
  ): Promise<NotificationResult> {
    if (!this.emailService) {
      return { success: false, error: 'Email service not configured' };
    }

    const email = recipient.email || await this.getEmailFromDatabase(recipient.id, recipient.type);
    if (!email) {
      return { success: false, error: 'No email address available' };
    }

    const template = options.template ? await this.getTemplate(options.template, 'email') : null;
    const subject = template?.subject || options.templateVariables?.subject || 'Notification from Limuru Cottage Hospital';
    const finalMessage = template ? this.applyTemplate(template.body, options.templateVariables || {}) : message;

    const emailResult = await this.emailService.sendEmail({
      to: email,
      subject,
      html: this.wrapEmailHtml(finalMessage, subject),
      text: finalMessage,
    });
    
    await this.logNotification({
      notificationId,
      patientId: recipient.type === 'patient' ? recipient.id : undefined,
      userId: recipient.type === 'user' ? recipient.id : undefined,
      type: 'email',
      recipient: email,
      recipientName: recipient.name,
      subject,
      message: finalMessage,
      templateId: options.template,
      templateVariables: options.templateVariables,
      status: emailResult.success ? 'sent' : 'failed',
      provider: 'resend',
      providerMessageId: emailResult.messageId,
      providerResponse: emailResult.error,
      scheduledAt: options.scheduledAt,
      expiresAt: options.expiresAt,
      metadata: options.metadata,
      priority: options.priority || 'normal',
    });

    return {
      success: emailResult.success,
      notificationId,
      channel: 'email',
      messageId: emailResult.messageId,
      error: emailResult.error,
    };
  }

  private async sendPush(
    recipient: NotificationRecipient,
    message: string,
    notificationId: string,
    options: NotificationOptions
  ): Promise<NotificationResult> {
    if (!this.pushService) {
      return { success: false, error: 'Push service not configured' };
    }

    const payload: PushNotificationPayload = {
      title: options.templateVariables?.title || 'Limuru Cottage Hospital',
      body: message,
      type: options.metadata?.notificationType as any || 'broadcast',
      data: options.metadata,
    };

    const pushResult = await this.pushService.sendQueueNotification(
      this.db,
      recipient.id,
      recipient.type,
      payload
    );
    
    await this.logNotification({
      notificationId,
      patientId: recipient.type === 'patient' ? recipient.id : undefined,
      userId: recipient.type === 'user' ? recipient.id : undefined,
      type: 'push',
      recipient: recipient.id,
      recipientName: recipient.name,
      message,
      templateId: options.template,
      templateVariables: options.templateVariables,
      status: pushResult.success ? 'sent' : 'failed',
      provider: 'web_push',
      providerResponse: pushResult.errors?.join(', '),
      scheduledAt: options.scheduledAt,
      expiresAt: options.expiresAt,
      metadata: options.metadata,
      priority: options.priority || 'normal',
    });

    return {
      success: pushResult.success,
      notificationId,
      channel: 'push',
      error: pushResult.errors?.join(', '),
    };
  }

  private async sendVoice(
    recipient: NotificationRecipient,
    message: string,
    notificationId: string,
    options: NotificationOptions
  ): Promise<NotificationResult> {
    if (!this.twilioService) {
      return { success: false, error: 'Twilio Voice not configured' };
    }

    const phone = recipient.phone || await this.getPhoneFromDatabase(recipient.id, recipient.type);
    if (!phone) {
      return { success: false, error: 'No phone number available for voice call' };
    }

    const twiml = this.twilioService.generateTwiml(message);
    const twilioResult = await this.twilioService.initiateVoiceCall(phone, twiml);
    
    await this.logNotification({
      notificationId,
      patientId: recipient.type === 'patient' ? recipient.id : undefined,
      userId: recipient.type === 'user' ? recipient.id : undefined,
      type: 'voice',
      recipient: phone,
      recipientName: recipient.name,
      message,
      templateId: options.template,
      templateVariables: options.templateVariables,
      status: twilioResult.success ? 'sent' : 'failed',
      provider: 'twilio',
      providerMessageId: twilioResult.sid,
      providerResponse: twilioResult.error,
      scheduledAt: options.scheduledAt,
      expiresAt: options.expiresAt,
      metadata: options.metadata,
      priority: options.priority || 'normal',
    });

    return {
      success: twilioResult.success,
      notificationId,
      channel: 'voice',
      sid: twilioResult.sid,
      error: twilioResult.error,
    };
  }

  private async getPhoneFromDatabase(userId: string, userType: string): Promise<string | null> {
    if (userType === 'patient') {
      const result = await this.db.prepare('SELECT phone FROM patients WHERE id = ?').bind(userId).first() as { phone: string } | undefined;
      return result?.phone || null;
    } else {
      const result = await this.db.prepare('SELECT phone FROM users WHERE id = ?').bind(userId).first() as { phone: string } | undefined;
      return result?.phone || null;
    }
  }

  private async getEmailFromDatabase(userId: string, userType: string): Promise<string | null> {
    if (userType === 'patient') {
      const result = await this.db.prepare('SELECT email FROM patients WHERE id = ?').bind(userId).first() as { email: string } | undefined;
      return result?.email || null;
    } else {
      const result = await this.db.prepare('SELECT email FROM users WHERE id = ?').bind(userId).first() as { email: string } | undefined;
      return result?.email || null;
    }
  }

  private async getTemplate(templateIdOrCode: string, channel: string): Promise<Template | null> {
    const result = await this.db.prepare(`
      SELECT * FROM notification_templates 
      WHERE (id = ? OR code = ?) AND type = ? AND is_active = 1
    `).bind(templateIdOrCode, templateIdOrCode, channel).first() as Template | undefined;
    return result || null;
  }

  private applyTemplate(template: string, variables: Record<string, string>): string {
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return result;
  }

  private wrapEmailHtml(body: string, subject: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background: #2563eb; color: white; padding: 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 24px; background: white; }
          .content p { margin: 0 0 16px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; background: #f9fafb; }
          .footer a { color: #2563eb; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Limuru Cottage Hospital</h1>
          </div>
          <div class="content">
            ${body.split('\n').map(line => `<p>${line}</p>`).join('')}
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Limuru Cottage Hospital. All rights reserved.</p>
            <p>This is an automated message. Please do not reply directly to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async getPreferences(userId: string, userType: string): Promise<NotificationPreferences> {
    const result = await this.db.prepare(`
      SELECT * FROM notification_preferences WHERE user_id = ? AND user_type = ?
    `).bind(userId, userType).first() as StoredPreferences | undefined;

    if (result) {
      return {
        smsEnabled: Boolean(result.smsEnabled),
        whatsappEnabled: Boolean(result.whatsappEnabled),
        emailEnabled: Boolean(result.emailEnabled),
        pushEnabled: Boolean(result.pushEnabled),
        voiceEnabled: Boolean(result.voiceEnabled),
        quietHoursStart: result.quietHoursStart || undefined,
        quietHoursEnd: result.quietHoursEnd || undefined,
        preferredChannel: result.preferredChannel as NotificationChannel || undefined,
      };
    }

    return {
      smsEnabled: true,
      whatsappEnabled: true,
      emailEnabled: true,
      pushEnabled: true,
      voiceEnabled: true,
    };
  }

  async updatePreferences(
    userId: string,
    userType: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<boolean> {
    const existing = await this.db.prepare(`
      SELECT id FROM notification_preferences WHERE user_id = ? AND user_type = ?
    `).bind(userId, userType).first();

    const values = {
      smsEnabled: preferences.smsEnabled ? 1 : 0,
      whatsappEnabled: preferences.whatsappEnabled ? 1 : 0,
      emailEnabled: preferences.emailEnabled ? 1 : 0,
      pushEnabled: preferences.pushEnabled ? 1 : 0,
      voiceEnabled: preferences.voiceEnabled ? 1 : 0,
      quietHoursStart: preferences.quietHoursStart || null,
      quietHoursEnd: preferences.quietHoursEnd || null,
      preferredChannel: preferences.preferredChannel || null,
    };

    if (existing) {
      await this.db.prepare(`
        UPDATE notification_preferences SET 
          sms_enabled = ?, whatsapp_enabled = ?, email_enabled = ?,
          push_enabled = ?, voice_enabled = ?, quiet_hours_start = ?,
          quiet_hours_end = ?, preferred_channel = ?, updated_at = ?
        WHERE user_id = ? AND user_type = ?
      `).bind(
        values.smsEnabled, values.whatsappEnabled, values.emailEnabled,
        values.pushEnabled, values.voiceEnabled, values.quietHoursStart,
        values.quietHoursEnd, values.preferredChannel, now(),
        userId, userType
      ).run();
    } else {
      await this.db.prepare(`
        INSERT INTO notification_preferences 
          (user_id, user_type, sms_enabled, whatsapp_enabled, email_enabled,
           push_enabled, voice_enabled, quiet_hours_start, quiet_hours_end, preferred_channel)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        userId, userType, values.smsEnabled, values.whatsappEnabled, values.emailEnabled,
        values.pushEnabled, values.voiceEnabled, values.quietHoursStart,
        values.quietHoursEnd, values.preferredChannel
      ).run();
    }

    return true;
  }

  private isChannelEnabled(channel: NotificationChannel, preferences: NotificationPreferences): boolean {
    switch (channel) {
      case 'sms': return preferences.smsEnabled;
      case 'whatsapp': return preferences.whatsappEnabled;
      case 'email': return preferences.emailEnabled;
      case 'push': return preferences.pushEnabled;
      case 'voice': return preferences.voiceEnabled;
      default: return false;
    }
  }

  private isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    return currentTime >= preferences.quietHoursStart && currentTime <= preferences.quietHoursEnd;
  }

  private async logNotification(params: {
    notificationId: string;
    patientId?: string;
    userId?: string;
    type: string;
    recipient: string;
    recipientName?: string;
    subject?: string;
    message: string;
    templateId?: string;
    templateVariables?: Record<string, string>;
    status: NotificationStatus;
    provider?: string;
    providerMessageId?: string;
    providerResponse?: string;
    scheduledAt?: string;
    expiresAt?: string;
    metadata?: Record<string, unknown>;
    priority?: NotificationPriority;
  }): Promise<void> {
    const facilityId = await this.getDefaultFacilityId();
    
    await this.db.prepare(`
      INSERT INTO notifications (
        id, facility_id, user_id, patient_id, notification_type, recipient, recipient_name,
        subject, message, template_id, template_variables, status, provider, provider_message_id,
        external_id, provider_response, scheduled_at, expires_at, metadata, priority, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      params.notificationId,
      facilityId,
      params.userId || null,
      params.patientId || null,
      params.type,
      params.recipient,
      params.recipientName || null,
      params.subject || null,
      params.message,
      params.templateId || null,
      params.templateVariables ? JSON.stringify(params.templateVariables) : null,
      params.status,
      params.provider || null,
      params.providerMessageId || null,
      params.providerMessageId || null,
      params.providerResponse || null,
      params.scheduledAt || null,
      params.expiresAt || null,
      params.metadata ? JSON.stringify(params.metadata) : null,
      params.priority || 'normal',
      now()
    ).run();
  }

  private async getDefaultFacilityId(): Promise<string> {
    const result = await this.db.prepare('SELECT id FROM facilities LIMIT 1').first() as { id: string } | undefined;
    return result?.id || 'default';
  }

  async updateNotificationStatus(
    notificationId: string,
    status: NotificationStatus,
    additionalData?: {
      deliveredAt?: string;
      readAt?: string;
      failureReason?: string;
      failureCode?: string;
    }
  ): Promise<boolean> {
    const updates: string[] = ['status = ?', 'updated_at = ?'];
    const values: unknown[] = [status, now()];

    if (additionalData?.deliveredAt) {
      updates.push('delivered_at = ?');
      values.push(additionalData.deliveredAt);
    }
    if (additionalData?.readAt) {
      updates.push('read_at = ?');
      values.push(additionalData.readAt);
    }
    if (additionalData?.failureReason) {
      updates.push('failure_reason = ?');
      values.push(additionalData.failureReason);
    }
    if (additionalData?.failureCode) {
      updates.push('failure_code = ?');
      values.push(additionalData.failureCode);
    }

    values.push(notificationId);

    await this.db.prepare(`
      UPDATE notifications SET ${updates.join(', ')} WHERE id = ?
    `).bind(...values).run();

    return true;
  }

  private async scheduleRetry(notificationId: string, maxRetries: number): Promise<void> {
    const notification = await this.db.prepare(`
      SELECT retry_count FROM notifications WHERE id = ?
    `).bind(notificationId).first() as { retry_count: number } | undefined;

    const retryCount = notification?.retry_count || 0;

    if (retryCount < maxRetries) {
      const nextRetry = new Date(Date.now() + Math.pow(2, retryCount) * 60000);
      await this.db.prepare(`
        UPDATE notifications SET 
          status = 'scheduled', 
          scheduled_at = ?, 
          retry_count = ?
        WHERE id = ?
      `).bind(nextRetry.toISOString(), retryCount + 1, notificationId).run();
    } else {
      await this.updateNotificationStatus(notificationId, 'failed', {
        failureReason: 'Max retries exceeded',
      });
    }
  }

  async getNotificationHistory(
    userId: string,
    userType: string,
    filters?: {
      type?: string;
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ notifications: any[]; total: number }> {
    const { type, status, limit = 50, offset = 0 } = filters || {};
    
    let sql = 'SELECT * FROM notifications WHERE ';
    const params: unknown[] = [];

    if (userType === 'patient') {
      sql += 'patient_id = ?';
    } else {
      sql += 'user_id = ?';
    }
    params.push(userId);

    if (type) {
      sql += ' AND notification_type = ?';
      params.push(type);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countResult = await this.db.prepare(countSql).bind(...params).first() as { count: number };

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await this.db.prepare(sql).bind(...params).all();

    return {
      notifications: result.results || [],
      total: countResult?.count || 0,
    };
  }

  async checkAndProcessScheduledNotifications(): Promise<number> {
    const scheduled = await this.db.prepare(`
      SELECT * FROM notifications 
      WHERE status = 'scheduled' AND scheduled_at <= ?
    `).bind(now()).all() as { results: any[] };

    let processed = 0;

    for (const notification of scheduled.results || []) {
      try {
        await this.updateNotificationStatus(notification.id, 'queued');
        processed++;
      } catch (error) {
        console.error(`Failed to process scheduled notification ${notification.id}:`, error);
      }
    }

    return processed;
  }

  async checkDeliveryStatus(notificationId: string): Promise<NotificationStatus | null> {
    const notification = await this.db.prepare(`
      SELECT * FROM notifications WHERE id = ?
    `).bind(notificationId).first();

    if (!notification || !(notification as any).provider_message_id) {
      return null;
    }

    const provider = (notification as any).provider;
    
    if (provider === 'twilio' && this.twilioService) {
      const status = await this.twilioService.checkDeliveryStatus((notification as any).provider_message_id);
      if (status) {
        const newStatus = this.mapProviderStatusToNotificationStatus(status.status);
        await this.updateNotificationStatus(notificationId, newStatus, {
          failureReason: status.errorMessage,
          failureCode: status.errorCode,
          deliveredAt: status.status === 'delivered' ? now() : undefined,
        });
        return newStatus;
      }
    }

    return (notification as any).status;
  }

  private mapProviderStatusToNotificationStatus(providerStatus: string): NotificationStatus {
    const statusMap: Record<string, NotificationStatus> = {
      'queued': 'queued',
      'sent': 'sent',
      'delivered': 'delivered',
      'undelivered': 'failed',
      'failed': 'failed',
    };
    return statusMap[providerStatus] || 'pending';
  }
}

export function createNotificationService(
  db: D1Database,
  env?: Parameters<NotificationService['constructor']>[1]
): NotificationService {
  return new NotificationService(db, env);
}
