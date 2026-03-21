// Twilio Notification Service
// Multi-channel notifications: SMS, WhatsApp, Voice

export interface NotificationPayload {
  type: 'sms' | 'whatsapp' | 'voice';
  recipient: string;
  message: string;
  template?: string;
  variables?: Record<string, string>;
  priority?: 'high' | 'normal' | 'low';
}

export interface NotificationResult {
  success: boolean;
  sid?: string;
  status?: string;
  error?: string;
  errorCode?: string;
  retryable?: boolean;
}

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  whatsappNumber: string;
}

export interface DeliveryStatus {
  sid: string;
  status: 'queued' | 'sent' | 'delivered' | 'undelivered' | 'failed';
  errorCode?: string;
  errorMessage?: string;
}

export class TwilioService {
  private accountSid: string;
  private authToken: string;
  private phoneNumber: string;
  private whatsappNumber: string;
  private maxRetries = 3;
  private retryDelayMs = 1000;

  constructor(config: TwilioConfig) {
    this.accountSid = config.accountSid;
    this.authToken = config.authToken;
    this.phoneNumber = config.phoneNumber;
    this.whatsappNumber = config.whatsappNumber;
  }

  private getAuthHeader(): string {
    return 'Basic ' + btoa(`${this.accountSid}:${this.authToken}`);
  }

  private async retryableFetch(
    url: string,
    options: RequestInit,
    retries = this.maxRetries
  ): Promise<{ ok: boolean; status: number; json: () => Promise<any>; text: () => Promise<string> }> {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        await this.delay(this.retryDelayMs * (this.maxRetries - retries + 1));
        return this.retryableFetch(url, options, retries - 1);
      }
      throw error;
    }
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const retryablePatterns = [
        'ECONNRESET',
        'ETIMEDOUT',
        'ECONNREFUSED',
        'network',
        'timeout'
      ];
      return retryablePatterns.some(p => error.message.toLowerCase().includes(p.toLowerCase()));
    }
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async sendSMS(to: string, body: string): Promise<NotificationResult> {
    const formattedTo = this.formatPhoneNumber(to);
    
    if (!this.isValidPhoneNumber(formattedTo)) {
      return {
        success: false,
        error: 'Invalid phone number format',
        errorCode: 'INVALID_PHONE',
        retryable: false
      };
    }

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': this.getAuthHeader(),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: formattedTo,
            From: this.phoneNumber,
            Body: body,
          }),
        });

        const data = await response.json() as any;
        
        if (response.ok) {
          return {
            success: true,
            sid: data.sid,
            status: data.status,
          };
        }

        const retryable = this.isRetryableErrorCode(data.code);
        
        if (retryable && attempt < this.maxRetries) {
          await this.delay(this.retryDelayMs * attempt);
          continue;
        }

        return {
          success: false,
          error: data.message || 'Failed to send SMS',
          errorCode: data.code?.toString(),
          retryable,
        };
      } catch (error) {
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelayMs * attempt);
          continue;
        }
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          retryable: this.isRetryableError(error),
        };
      }
    }

    return {
      success: false,
      error: 'Max retries exceeded',
      retryable: false,
    };
  }

  async sendWhatsApp(to: string, body: string): Promise<NotificationResult> {
    const formattedTo = this.formatWhatsAppNumber(to);
    
    if (!this.isValidPhoneNumber(formattedTo)) {
      return {
        success: false,
        error: 'Invalid phone number format for WhatsApp',
        errorCode: 'INVALID_PHONE',
        retryable: false
      };
    }

    const fromNumber = this.formatWhatsAppFrom();
    if (!fromNumber) {
      return {
        success: false,
        error: 'WhatsApp number not configured',
        errorCode: 'WHATSAPP_NOT_CONFIGURED',
        retryable: false
      };
    }

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': this.getAuthHeader(),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: formattedTo,
            From: fromNumber,
            Body: body,
          }),
        });

        const data = await response.json() as any;
        
        if (response.ok) {
          return {
            success: true,
            sid: data.sid,
            status: data.status,
          };
        }

        const retryable = this.isRetryableErrorCode(data.code);
        
        if (retryable && attempt < this.maxRetries) {
          await this.delay(this.retryDelayMs * attempt);
          continue;
        }

        return {
          success: false,
          error: data.message || 'Failed to send WhatsApp message',
          errorCode: data.code?.toString(),
          retryable,
        };
      } catch (error) {
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelayMs * attempt);
          continue;
        }
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          retryable: this.isRetryableError(error),
        };
      }
    }

    return {
      success: false,
      error: 'Max retries exceeded',
      retryable: false,
    };
  }

  async initiateVoiceCall(to: string, twiml: string): Promise<NotificationResult> {
    const formattedTo = this.formatPhoneNumber(to);
    
    if (!this.isValidPhoneNumber(formattedTo)) {
      return {
        success: false,
        error: 'Invalid phone number format',
        errorCode: 'INVALID_PHONE',
        retryable: false
      };
    }

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Calls.json`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': this.getAuthHeader(),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: formattedTo,
            From: this.phoneNumber,
            Twiml: twiml,
          }),
        });

        const data = await response.json() as any;
        
        if (response.ok) {
          return {
            success: true,
            sid: data.sid,
            status: data.status,
          };
        }

        const retryable = this.isRetryableErrorCode(data.code);
        
        if (retryable && attempt < this.maxRetries) {
          await this.delay(this.retryDelayMs * attempt);
          continue;
        }

        return {
          success: false,
          error: data.message || 'Failed to initiate call',
          errorCode: data.code?.toString(),
          retryable,
        };
      } catch (error) {
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelayMs * attempt);
          continue;
        }
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          retryable: this.isRetryableError(error),
        };
      }
    }

    return {
      success: false,
      error: 'Max retries exceeded',
      retryable: false,
    };
  }

  async checkDeliveryStatus(sid: string): Promise<DeliveryStatus | null> {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages/${sid}.json`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json() as any;
      
      return {
        sid: data.sid,
        status: this.mapTwilioStatus(data.status),
        errorCode: data.error_code?.toString(),
        errorMessage: data.error_message,
      };
    } catch (error) {
      return null;
    }
  }

  private mapTwilioStatus(status: string): DeliveryStatus['status'] {
    const statusMap: Record<string, DeliveryStatus['status']> = {
      'queued': 'queued',
      'sent': 'sent',
      'delivered': 'delivered',
      'undelivered': 'undelivered',
      'failed': 'failed',
    };
    return statusMap[status.toLowerCase()] || 'failed';
  }

  async sendTemplatedMessage(
    to: string,
    type: 'sms' | 'whatsapp',
    templateName: string,
    variables: Record<string, string>
  ): Promise<NotificationResult> {
    const template = this.getTemplate(templateName);
    
    if (!template) {
      return {
        success: false,
        error: `Template '${templateName}' not found`,
        errorCode: 'TEMPLATE_NOT_FOUND',
        retryable: false,
      };
    }
    
    let message = template;
    Object.entries(variables).forEach(([key, value]) => {
      message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    if (type === 'whatsapp') {
      return this.sendWhatsApp(to, message);
    }
    return this.sendSMS(to, message);
  }

  getTemplate(templateName: string): string | null {
    const templates: Record<string, string> = {
      'queue_called': 'Hello {{name}}, your turn has arrived! Please proceed to the reception/triage area. Your ticket: {{ticket}}',
      'queue_reminder': 'Hello {{name}}, you are #{{position}} in queue. Estimated wait: {{wait}} minutes.',
      'no_show_warning': 'Hello {{name}}, your ticket {{ticket}} will be cancelled in {{minutes}} minutes if you don\'t check in.',
      'appointment_reminder': 'Reminder: You have an appointment at Limuru Cottage Hospital on {{date}} at {{time}}.',
      'survey_request': 'Thank you for visiting Limuru Cottage Hospital. How was your experience? Rate from 1-5: {{link}}',
      'welcome': 'Welcome to Limuru Cottage Hospital, {{name}}! Your registration is complete.',
      'queue_position': 'Hello {{name}}, your current position is #{{position}}. Estimated wait: {{wait}} minutes.',
      'turn_warning': 'Hello {{name}}, your turn is coming up in approximately {{minutes}} minutes. Please be near the reception area.',
      'appointment_cancelled': 'Hello {{name}}, your appointment on {{date}} at {{time}} has been cancelled. Please contact us to reschedule.',
      'queue_completed': 'Hello {{name}}, your visit has been completed. Thank you for choosing Limuru Cottage Hospital.',
    };

    return templates[templateName] || null;
  }

  generateTwiml(message: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-GB">
    ${this.escapeXml(message)}
  </Say>
  <Pause length="1"/>
  <Say voice="alice" language="en-GB">
    Thank you. Please stay on the line if you need assistance.
  </Say>
</Response>`;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private formatPhoneNumber(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    
    if (digits.startsWith('254')) {
      return `+${digits}`;
    }
    
    if (digits.startsWith('0')) {
      return `+254${digits.slice(1)}`;
    }
    
    if (digits.startsWith('254')) {
      return `+${digits}`;
    }
    
    if (digits.length === 9) {
      return `+254${digits}`;
    }
    
    if (digits.length > 9) {
      return `+${digits}`;
    }
    
    return `+254${digits}`;
  }

  private formatWhatsAppNumber(phone: string): string {
    const formatted = this.formatPhoneNumber(phone);
    if (formatted.startsWith('whatsapp:')) {
      return formatted;
    }
    return `whatsapp:${formatted}`;
  }

  private formatWhatsAppFrom(): string {
    if (!this.whatsappNumber) {
      return '';
    }
    if (this.whatsappNumber.startsWith('whatsapp:')) {
      return this.whatsappNumber;
    }
    const formatted = this.formatPhoneNumber(this.whatsappNumber);
    return `whatsapp:${formatted}`;
  }

  isValidPhoneNumber(phone: string): boolean {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 9 && digits.length <= 15;
  }

  private isRetryableErrorCode(code?: number): boolean {
    if (!code) return false;
    const retryableCodes = [
      20429, // Throttled
      30001, // Queue full
      30002, // Account limit reached
      30003, // Unreachable destination handset
      30004, // Message blocked
      30005, // Unknown destination handset
      30006, // Landline or unreachable carrier
      30007, // Carriage return
      30008, // Unknown scheduler error
      30009, // Invalid scheduled date
    ];
    return retryableCodes.includes(code);
  }
}

export function createTwilioService(env: {
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_PHONE_NUMBER: string;
  TWILIO_WHATSAPP_NUMBER: string;
}): TwilioService {
  return new TwilioService({
    accountSid: env.TWILIO_ACCOUNT_SID,
    authToken: env.TWILIO_AUTH_TOKEN,
    phoneNumber: env.TWILIO_PHONE_NUMBER,
    whatsappNumber: env.TWILIO_WHATSAPP_NUMBER,
  });
}
