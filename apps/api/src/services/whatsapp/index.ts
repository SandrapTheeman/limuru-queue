// WhatsApp Webhook Handler - Receives and processes incoming WhatsApp messages
// SECURITY: Implements X-Hub-Signature-256 verification for webhook security
import { chatbot, type ChatbotResponse, type WhatsAppOutgoingMessage } from './chatbot';
import type { Bindings } from '../../types';
import { verifyHmacSignature } from '../../utils';

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
  // WhatsApp verify token - MUST match what you configured in Meta Developer Portal
  // This should come from environment, with a default for local development
  private get verifyToken(): string {
    return this.env.WHATSAPP_VERIFY_TOKEN || 'limuru_whatsapp_verify_2026';
  }

  constructor(env: Bindings) {
    this.env = env;
  }

  // Verify webhook for WhatsApp Business API setup (GET request from Meta)
  async verifyWebhook(mode: string, token: string, challenge: string): Promise<Response> {
    if (mode === 'subscribe' && token === this.verifyToken) {
      // Challenge response confirms webhook is properly configured
      return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    console.warn('[WhatsApp] Webhook verification failed - token mismatch');
    return new Response('Forbidden', { status: 403 });
  }

  // Verify incoming webhook signature (POST requests from Meta/WhatsApp)
  // SECURITY: This MUST be called before processing any incoming message
  async verifyWebhookSignature(
    signature: string | null,
    rawBody: string
  ): Promise<boolean> {
    // If no App Secret configured, skip verification in development
    if (!this.env.WHATSAPP_APP_SECRET) {
      console.warn('[WhatsApp SECURITY] App secret not configured - skipping signature verification');
      return true; // Allow in dev, but log warning
    }

    if (!signature) {
      console.error('[WhatsApp SECURITY] Missing X-Hub-Signature-256 header');
      return false;
    }

    // The signature format is: sha256=<hex_digest>
    const expectedPrefix = 'sha256=';
    if (!signature.startsWith(expectedPrefix)) {
      console.error('[WhatsApp SECURITY] Invalid signature format - missing sha256= prefix');
      return false;
    }

    const providedSignature = signature.substring(expectedPrefix.length);

    // Use timing-safe HMAC verification
    const isValid = await verifyHmacSignature(
      this.env.WHATSAPP_APP_SECRET,
      rawBody,
      providedSignature
    );

    if (!isValid) {
      console.error('[WhatsApp SECURITY] Signature verification FAILED - possible spoofed request');
      return false;
    }

    return true;
  }

  // Process incoming WhatsApp message (with signature verification)
  async handleIncomingMessage(
    payload: WhatsAppWebhookPayload,
    signature: string | null,
    rawBody: string
  ): Promise<Response> {
    // SECURITY: Verify the webhook signature FIRST
    const sigValid = await this.verifyWebhookSignature(signature, rawBody);
    if (!sigValid) {
      return new Response('Unauthorized', { status: 401 });
    }

    try {
      // Parse the incoming message
      const from = this.normalizePhone(payload.From);
      const body = payload.Body?.trim() || '';

      // Ignore empty messages (but still return 200 to prevent retries)
      if (!body) {
        return new Response('OK', { status: 200 });
      }

      // Process with chatbot
      const response: ChatbotResponse = chatbot.processMessage(from, body);

      // Save session to KV for conversation continuity
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
      console.error('[WhatsApp] Webhook processing error:', error);
      return new Response('Error', { status: 500 });
    }
  }

  // Backward-compatible handler (for routes that don't provide raw body)
  async handleIncomingMessageLegacy(payload: WhatsAppWebhookPayload): Promise<Response> {
    try {
      const from = this.normalizePhone(payload.From);
      const body = payload.Body?.trim() || '';

      if (!body) {
        return new Response('OK', { status: 200 });
      }

      const response: ChatbotResponse = chatbot.processMessage(from, body);

      if (response.session && this.env.SESSION_KV) {
        await this.env.SESSION_KV.put(`wa_session:${from}`, JSON.stringify(response.session), {
          expirationTtl: 86400,
        });
      }

      if (response.messages.length > 0) {
        await this.sendMessages(response.messages);
      }

      return new Response('OK', { status: 200 });
    } catch (error) {
      console.error('[WhatsApp] Webhook processing error:', error);
      return new Response('Error', { status: 500 });
    }
  }

  private normalizePhone(phone: string): string {
    let clean = phone.replace(/^whatsapp:/, '');
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
    const phoneNumberId = this.env.FROM_NUMBER || '+254700000000';
    const recipient = message.to;

    if (this.env.WHATSAPP_API_TOKEN && this.env.WHATSAPP_PHONE_NUMBER) {
      await this.sendViaWhatsAppAPI(phoneNumberId, recipient, message);
    } else {
      // Mock mode - log to console (remove body content in production logs)
      console.log(`[WhatsApp Mock] To: ${recipient} | Type: ${message.type} | Has content: ${!!(message.text || message.body)}`);
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
      console.error('[WhatsApp] API error:', error);
    }
  }

  // Send a proactive message to a patient
  async sendProactiveMessage(phone: string, text: string): Promise<boolean> {
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
      console.error('[WhatsApp] Failed to send proactive message:', error);
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
        en: `Your turn! Ticket: ${ticketNumber}. Please proceed to your assigned room now. — Limuru Cottage Hospital`,
        sw: `Nafasi yako! Tiketi: ${ticketNumber}. Tafadhali nenda kwenye chumba chako sasa. — Limuru Cottage Hospital`,
      },
      reminder: {
        en: `Queue Reminder - Ticket: ${ticketNumber}. You're now at position #${position}. Please be ready. — Limuru Cottage Hospital`,
        sw: `Kikumbusho - Tiketi: ${ticketNumber}. Sasa uko kwenye nafasi #${position}. Jiandae tafadhali. — Limuru Cottage Hospital`,
      },
      delayed: {
        en: `Update - Ticket: ${ticketNumber}. There may be a slight delay. Your position is still #${position}. — Limuru Cottage Hospital`,
        sw: `Taarifa - Tiketi: ${ticketNumber}. Kunaweza kuwa na kuchelewa kidogo. Nafasi yako bado ni #${position}. — Limuru Cottage Hospital`,
      },
    };

    const msg = notifications[status];
    return this.sendProactiveMessage(phone, msg.en);
  }
}

export function createWhatsAppService(env: Bindings): WhatsAppService {
  return new WhatsAppService(env);
}
