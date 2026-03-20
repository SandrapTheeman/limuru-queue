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
}

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  whatsappNumber: string;
}

export class TwilioService {
  private accountSid: string;
  private authToken: string;
  private phoneNumber: string;
  private whatsappNumber: string;

  constructor(config: TwilioConfig) {
    this.accountSid = config.accountSid;
    this.authToken = config.authToken;
    this.phoneNumber = config.phoneNumber;
    this.whatsappNumber = config.whatsappNumber;
  }

  // Send SMS message
  async sendSMS(to: string, body: string): Promise<NotificationResult> {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${this.accountSid}:${this.authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: this.formatPhoneNumber(to),
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
      } else {
        return {
          success: false,
          error: data.message || 'Failed to send SMS',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Send WhatsApp message
  async sendWhatsApp(to: string, body: string): Promise<NotificationResult> {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${this.accountSid}:${this.authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: `whatsapp:${this.formatPhoneNumber(to)}`,
          From: `whatsapp:${this.whatsappNumber}`,
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
      } else {
        return {
          success: false,
          error: data.message || 'Failed to send WhatsApp',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Initiate voice call with TwiML
  async initiateVoiceCall(to: string, twiml: string): Promise<NotificationResult> {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Calls.json`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${this.accountSid}:${this.authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: this.formatPhoneNumber(to),
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
      } else {
        return {
          success: false,
          error: data.message || 'Failed to initiate call',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Send templated message
  async sendTemplatedMessage(
    to: string,
    type: 'sms' | 'whatsapp',
    templateName: string,
    variables: Record<string, string>
  ): Promise<NotificationResult> {
    const templates: Record<string, string> = {
      'queue_called': `Hello {{name}}, your turn has arrived! Please proceed to the reception/triage area. Your ticket: {{ticket}}`,
      'queue_reminder': `Hello {{name}}, you are #{{position}} in queue. Estimated wait: {{wait}} minutes.`,
      'no_show_warning': `Hello {{name}}, your ticket {{ticket}} will be cancelled in {{minutes}} minutes if you don't check in.`,
      'appointment_reminder': `Reminder: You have an appointment at Limuru Cottage Hospital on {{date}} at {{time}}.`,
      'survey_request': `Thank you for visiting Limuru Cottage Hospital. How was your experience? Rate from 1-5: {{link}}`,
      'welcome': `Welcome to Limuru Cottage Hospital, {{name}}! Your registration is complete.`,
    };

    let template = templates[templateName] || templateName;
    
    // Replace variables
    Object.entries(variables).forEach(([key, value]) => {
      template = template.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    if (type === 'whatsapp') {
      return this.sendWhatsApp(to, template);
    } else {
      return this.sendSMS(to, template);
    }
  }

  // Generate TwiML for voice call
  generateTwiml(message: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-GB">
    ${message}
  </Say>
  <Pause length="1"/>
  <Say voice="language">
    Thank you.
  </Say>
</Response>`;
  }

  // Format phone number to E.164 format
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // If already has country code
    if (digits.startsWith('254')) {
      return `+${digits}`;
    }
    
    // If starts with 0, remove it and add Kenya code
    if (digits.startsWith('0')) {
      return `+254${digits.slice(1)}`;
    }
    
    // Assume it's a local number without 0
    return `+254${digits}`;
  }

  // Validate phone number
  isValidPhoneNumber(phone: string): boolean {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 9 && digits.length <= 15;
  }
}

// Factory function
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
