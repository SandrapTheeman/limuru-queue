// Hospital Queue System - Notification Services (SMS/WhatsApp)
// Twilio-compatible integration for Kenyan phone numbers

const https = require('https');

// SMS Service (Twilio-compatible)
class SMSService {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
    this.enabled = !!(this.accountSid && this.authToken && this.fromNumber);
  }

  /**
   * Send SMS to a phone number
   * @param {string} phone - Recipient phone number
   * @param {string} message - SMS message content
   * @returns {Promise<{success: boolean, sid?: string, status?: string, error?: string, mock?: boolean}>}
   */
  async send(phone, message) {
    if (!this.enabled) {
      console.log('[SMS] Twilio not configured, logging message:', { phone: this.maskPhone(phone), message: message.substring(0, 50) });
      return { success: true, mock: true, message: 'SMS logged (Twilio not configured)' };
    }

    const formattedPhone = this.formatPhone(phone);
    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

    const data = new URLSearchParams({
      To: formattedPhone,
      From: this.fromNumber,
      Body: message
    }).toString();

    const options = {
      hostname: 'api.twilio.com',
      port: 443,
      path: `/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(body);
            if (res.statusCode === 201) {
              resolve({ success: true, sid: result.sid, status: result.status });
            } else {
              resolve({ success: false, error: result.message || 'Failed to send SMS' });
            }
          } catch (e) {
            resolve({ success: false, error: 'Invalid response from Twilio' });
          }
        });
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  /**
   * Format phone number to Kenyan E.164 format
   * @param {string} phone - Raw phone number
   * @returns {string} Formatted phone number (e.g., +254712345678)
   */
  formatPhone(phone) {
    let num = phone.replace(/\D/g, '');
    // Convert 07xx to 254xx format
    if (num.startsWith('0')) num = '254' + num.slice(1);
    // Add + if not present
    if (!num.startsWith('+')) num = '+' + num;
    return num;
  }

  /**
   * Mask phone number for logging (privacy)
   * @param {string} phone - Phone number
   * @returns {string} Masked phone (e.g., ****5678)
   */
  maskPhone(phone) {
    const num = phone.replace(/\D/g, '');
    return '****' + num.slice(-4);
  }
}

// WhatsApp Service (Twilio WhatsApp)
class WhatsAppService {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER;
    this.enabled = !!(this.accountSid && this.authToken && this.fromNumber);
  }

  /**
   * Send WhatsApp message to a phone number
   * @param {string} phone - Recipient phone number
   * @param {string} message - WhatsApp message content
   * @returns {Promise<{success: boolean, sid?: string, status?: string, error?: string, mock?: boolean}>}
   */
  async send(phone, message) {
    if (!this.enabled) {
      console.log('[WhatsApp] Twilio WhatsApp not configured, logging message:', { phone: this.maskPhone(phone), message: message.substring(0, 50) });
      return { success: true, mock: true, message: 'WhatsApp logged (not configured)' };
    }

    const formattedPhone = this.formatPhone(phone);
    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

    const data = new URLSearchParams({
      To: `whatsapp:${formattedPhone}`,
      From: `whatsapp:${this.fromNumber}`,
      Body: message
    }).toString();

    const options = {
      hostname: 'api.twilio.com',
      port: 443,
      path: `/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(body);
            if (res.statusCode === 201) {
              resolve({ success: true, sid: result.sid, status: result.status });
            } else {
              resolve({ success: false, error: result.message || 'Failed to send WhatsApp' });
            }
          } catch (e) {
            resolve({ success: false, error: 'Invalid response from Twilio' });
          }
        });
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  /**
   * Format phone number to Kenyan E.164 format
   * @param {string} phone - Raw phone number
   * @returns {string} Formatted phone number
   */
  formatPhone(phone) {
    let num = phone.replace(/\D/g, '');
    if (num.startsWith('0')) num = '254' + num.slice(1);
    if (!num.startsWith('254')) num = '254' + num;
    if (!num.startsWith('+')) num = '+' + num;
    return num;
  }

  /**
   * Mask phone number for logging
   * @param {string} phone - Phone number
   * @returns {string} Masked phone
   */
  maskPhone(phone) {
    const num = phone.replace(/\D/g, '');
    return '****' + num.slice(-4);
  }
}

// Message Templates
const templates = {
  queue_called: {
    sms: (data) => `Dear ${data.name}, your number ${data.ticket} at ${data.department} is being called. Please proceed to ${data.room}. - Limuru Cottage Hospital`,
    whatsapp: (data) => `🏥 *Limuru Cottage Hospital*\n\nDear ${data.name},\n\nYour number *${data.ticket}* at *${data.department}* is being called!\n\n📍 Please proceed to: *${data.room}*\n\n_Welcome to quality healthcare_`
  },
  queue_position: {
    sms: (data) => `Queue update: You are now #${data.position} in ${data.department}. Estimated wait: ${data.waitTime} mins. - Limuru Cottage Hospital`,
    whatsapp: (data) => `📊 *Queue Update*\n\n${data.name}, your position: *#${data.position}*\nDepartment: ${data.department}\nEstimated wait: ${data.waitTime} mins`
  },
  appointment_reminder: {
    sms: (data) => `Reminder: You have an appointment at Limuru Cottage Hospital on ${data.date} at ${data.time}. - Limuru Cottage Hospital`,
    whatsapp: (data) => `📅 *Appointment Reminder*\n\nDear ${data.name},\n\nThis is a reminder of your upcoming appointment:\n\n📆 Date: ${data.date}\n⏰ Time: ${data.time}\n🏥 Department: ${data.department}\n\nSee you soon!`
  },
  appointment_confirmed: {
    sms: (data) => `Your appointment at Limuru Cottage Hospital on ${data.date} at ${data.time} has been confirmed. Ref: ${data.ref}. - Limuru Cottage Hospital`,
    whatsapp: (data) => `✅ *Appointment Confirmed*\n\nDear ${data.name},\n\nYour appointment has been confirmed:\n\n📆 Date: ${data.date}\n⏰ Time: ${data.time}\n🏥 Department: ${data.department}\n\nConfirmation #: ${data.ref}`
  }
};

/**
 * Notification Service - Facade for SMS and WhatsApp
 */
class NotificationService {
  constructor() {
    this.sms = new SMSService();
    this.whatsapp = new WhatsAppService();
  }

  /**
   * Send notification via specified channel
   * @param {string} channel - 'sms' or 'whatsapp'
   * @param {string} phone - Recipient phone
   * @param {string} message - Message content
   * @returns {Promise<{success: boolean, channel: string, result: any}>}
   */
  async send(channel, phone, message) {
    const service = channel === 'whatsapp' ? this.whatsapp : this.sms;
    const result = await service.send(phone, message);
    return { success: result.success, channel, result };
  }

  /**
   * Send notification using a template
   * @param {string} templateName - Name of the template
   * @param {string} channel - 'sms' or 'whatsapp'
   * @param {string} phone - Recipient phone
   * @param {object} data - Template variables
   * @returns {Promise<{success: boolean, channel: string, message: string, result: any}>}
   */
  async sendTemplate(templateName, channel, phone, data) {
    const template = templates[templateName];
    if (!template) {
      return { success: false, channel, error: `Unknown template: ${templateName}` };
    }

    const messageType = channel === 'whatsapp' ? 'whatsapp' : 'sms';
    const message = template[messageType] ? template[messageType](data) : template.sms(data);
    
    const service = channel === 'whatsapp' ? this.whatsapp : this.sms;
    const result = await service.send(phone, message);
    
    return { success: result.success, channel, message, result };
  }

  /**
   * Send queue called notification (both SMS and WhatsApp)
   * @param {object} params - Notification parameters
   * @param {string} params.phone - Patient phone
   * @param {string} params.name - Patient name
   * @param {string} params.ticket - Ticket number
   * @param {string} params.department - Department name
   * @param {string} params.room - Room assigned
   * @param {string} [params.channels] - Channels to use ('both', 'sms', 'whatsapp')
   */
  async sendQueueCalled({ phone, name, ticket, department, room, channels = 'both' }) {
    const results = [];

    if (channels === 'both' || channels === 'sms') {
      const msg = templates.queue_called.sms({ name, ticket, department, room });
      const result = await this.sms.send(phone, msg);
      results.push({ channel: 'sms', ...result });
    }

    if (channels === 'both' || channels === 'whatsapp') {
      const msg = templates.queue_called.whatsapp({ name, ticket, department, room });
      const result = await this.whatsapp.send(phone, msg);
      results.push({ channel: 'whatsapp', ...result });
    }

    return results;
  }

  /**
   * Send queue position update notification
   * @param {object} params - Notification parameters
   */
  async sendQueuePosition({ phone, name, position, department, waitTime }) {
    const results = [];

    // SMS
    const smsMsg = templates.queue_position.sms({ name, position, department, waitTime });
    const smsResult = await this.sms.send(phone, smsMsg);
    results.push({ channel: 'sms', ...smsResult });

    return results;
  }

  /**
   * Send appointment reminder notification
   * @param {object} params - Notification parameters
   */
  async sendAppointmentReminder({ phone, name, date, time, department }) {
    const results = [];

    // SMS
    const smsMsg = templates.appointment_reminder.sms({ name, date, time, department });
    const smsResult = await this.sms.send(phone, smsMsg);
    results.push({ channel: 'sms', ...smsResult });

    // WhatsApp
    const waMsg = templates.appointment_reminder.whatsapp({ name, date, time, department });
    const waResult = await this.whatsapp.send(phone, waMsg);
    results.push({ channel: 'whatsapp', ...waResult });

    return results;
  }

  /**
   * Send appointment confirmation notification
   * @param {object} params - Notification parameters
   */
  async sendAppointmentConfirmed({ phone, name, date, time, department, ref }) {
    const results = [];

    // SMS
    const smsMsg = templates.appointment_confirmed.sms({ name, date, time, department, ref });
    const smsResult = await this.sms.send(phone, smsMsg);
    results.push({ channel: 'sms', ...smsResult });

    // WhatsApp
    const waMsg = templates.appointment_confirmed.whatsapp({ name, date, time, department, ref });
    const waResult = await this.whatsapp.send(phone, waMsg);
    results.push({ channel: 'whatsapp', ...waResult });

    return results;
  }
}

// Export classes and templates
module.exports = { SMSService, WhatsAppService, NotificationService, templates };
