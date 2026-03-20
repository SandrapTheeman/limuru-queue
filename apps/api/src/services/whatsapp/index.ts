// WhatsApp Webhook Handler - Receives and processes incoming WhatsApp messages
// Uses Twilio WhatsApp API format
import { chatbot, type ChatbotResponse, type WhatsAppOutgoingMessage } from './chatbot';
import type { Bindings } from '../../types';

export interface WhatsAppWebhookPayload {
  To: string;
  From: string;
  Body: string;
  MessageSid: string;
  AccountSid: string;
  MessagingServiceSid: string;
  NumMedia: string;
  NumSegments: string;
  FromCity: string;
  FromState: string;
  FromCountry: string;
  FromZip: string;
  ProfileName: string;
  timestamp?: string;
}

export class WhatsAppService {
  private env: Bindings;
  private verifyToken: string = 'limuru_whatsapp_verify_2026';

  constructor(env: Bindings) {
    this.env = env;
  }

  // Verify webhook for WhatsApp Business API setup
  async verifyWebhook(mode: string, token: string, challenge: string): Promise<Response> {
    if (mode === 'subscribe' && token === this.verifyToken) {
      return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    return new Response('Forbidden', { status: 403 });
  }

  // Process incoming WhatsApp message
  async handleIncomingMessage(payload: WhatsAppWebhookPayload): Promise<Response> {
    try {
      // Parse the incoming message
      const from = this.normalizePhone(payload.From);
      const body = payload.Body?.trim() || '';

      if (!body) {
        return new Response('OK', { status: 200 }); // Ignore empty messages
      }

      // Process with chatbot
      const response: ChatbotResponse = chatbot.processMessage(from, body);

      // Save session to KV
      if (response.session && this.env.SESSION_KV) {
        await this.env.SESSION_KV.put(`wa_session:${from}`, JSON.stringify(response.session), {
          expirationTtl: 86400,
        });
      }

      // Send response messages
      if (response.messages.length > 0) {
        await this.sendMessages(response.messages);
      }

      return new Response('OK', { status: 200 });
    } catch (error) {
      console.error('WhatsApp webhook error:', error);
      return new Response('Error', { status: 500 });
    }
  }

  private normalizePhone(phone: string): string {
    // Remove 'whatsapp:' prefix if present
    let clean = phone.replace(/^whatsapp:/, '');
    // Ensure +254 format for Kenya
    if (clean.startsWith('0')) {
      clean = '+254' + clean.substring(1);
    } else if (clean.startsWith('254') && !clean.startsWith('+')) {
      clean = '+' + clean;
    }
    return clean;
  }

  // Send messages via WhatsApp API
  private async sendMessages(messages: WhatsAppOutgoingMessage[]): Promise<void> {
    for (const msg of messages) {
      await this.sendMessage(msg);
    }
  }

  private async sendMessage(message: WhatsAppOutgoingMessage): Promise<void> {
    // In production, this calls the Twilio WhatsApp API
    // For now, we'll use a mock or log the message
    const phoneNumberId = this.env.FROM_NUMBER || '+254700000000';
    const recipient = message.to;

    if (this.env.WHATSAPP_API_TOKEN && this.env.WHATSAPP_PHONE_NUMBER) {
      // Real WhatsApp Business API call
      await this.sendViaWhatsAppAPI(phoneNumberId, recipient, message);
    } else {
      // Mock mode - log to console
      console.log(`[WhatsApp Mock] To: ${recipient}`);
      console.log(`[WhatsApp Mock] Type: ${message.type}`);
      console.log(`[WhatsApp Mock] Body: ${message.text || message.body || JSON.stringify(message)}`);
    }
  }

  private async sendViaWhatsAppAPI(
    from: string,
    to: string,
    message: WhatsAppOutgoingMessage
  ): Promise<void> {
    const url = `https://graph.facebook.com/v18.0/${from}/messages`;
    const token = this.env.WHATSAPP_API_TOKEN!;

    let payload: Record<string, unknown> = {};

    if (message.type === 'text') {
      payload = {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message.text! },
      };
    } else if (message.type === 'interactive') {
      payload = {
        messaging_product: 'whatsapp',
        to,
        type: 'interactive',
        interactive: {
          type: 'list',
          header: message.header ? { type: 'text', text: message.header } : undefined,
          body: { text: message.body! },
          footer: message.footer ? { text: message.footer } : undefined,
          action: {
            button: 'Select Department',
            sections: message.sections,
          },
        },
      };
    } else if (message.type === 'template') {
      payload = {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: message.template,
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('WhatsApp API error:', error);
    }
  }

  // Send a proactive message to a patient
  async sendProactiveMessage(
    phone: string,
    text: string,
    template?: string
  ): Promise<boolean> {
    try {
      const normalizedPhone = this.normalizePhone(phone);
      const message: WhatsAppOutgoingMessage = {
        to: normalizedPhone,
        type: 'text',
        text,
      };
      await this.sendMessage(message);
      return true;
    } catch (error) {
      console.error('Failed to send proactive message:', error);
      return false;
    }
  }

  // Send queue notification
  async sendQueueNotification(
    phone: string,
    ticketNumber: string,
    position: number,
    status: 'called' | 'reminder' | 'delayed'
  ): Promise<boolean> {
    const notifications = {
      called: {
        en: `🎉 *Your turn!*\n\nTicket: *${ticketNumber}*\n\nPlease proceed to your assigned room now.\n\n— Limuru Cottage Hospital`,
        sw: `🎉 *Nafasi yako!*\n\nTiketi: *${ticketNumber}*\n\nTafadhali nenda kwenye chumba chako sasa.\n\n— Limuru Cottage Hospital`,
      },
      reminder: {
        en: `⏰ *Queue Reminder*\n\nTicket: *${ticketNumber}*\n\nYou're now at position *#${position}*. Please be ready.\n\n— Limuru Cottage Hospital`,
        sw: `⏰ *Kikumbusho cha Foleni*\n\nTiketi: *${ticketNumber}*\n\nSasa uko kwenye nafasi *#${position}*. Jiandae tafadhali.\n\n— Limuru Cottage Hospital`,
      },
      delayed: {
        en: `⚠️ *Update*\n\nTicket: *${ticketNumber}*\n\nThere may be a slight delay. Your position is still *#${position}*.\n\n— Limuru Cottage Hospital`,
        sw: `⚠️ *Taarifa*\n\nTiketi: *${ticketNumber}*\n\nKunaweza kuwa na kuchelewa kidogo. Nafasi yako bado ni *#${position}*.\n\n— Limuru Cottage Hospital`,
      },
    };

    const msg = notifications[status];
    const text = msg.en; // Could detect language from session
    return this.sendProactiveMessage(phone, text);
  }
}

export function createWhatsAppService(env: Bindings): WhatsAppService {
  return new WhatsAppService(env);
}
