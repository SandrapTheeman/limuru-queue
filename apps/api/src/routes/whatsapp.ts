// WhatsApp Business API Routes
import { Hono } from 'hono';
import { createWhatsAppService, type WhatsAppWebhookPayload } from '../services/whatsapp';
import type { Bindings } from '../types';

const whatsapp = new Hono<{ Bindings: Bindings }>();

// Webhook verification (GET) - required by WhatsApp Business API
whatsapp.get('/webhook', async (c) => {
  const env = c.env;
  const mode = c.req.query('hub.mode');
  const token = c.req.query('hub.verify_token');
  const challenge = c.req.query('hub.challenge');

  if (!mode || !token || !challenge) {
    return c.json({ error: 'Missing parameters' }, 400);
  }

  const service = createWhatsAppService(env);
  return service.verifyWebhook(mode, token, challenge);
});

// Handle incoming messages (POST)
whatsapp.post('/webhook', async (c) => {
  const env = c.env;
  const body = await c.req.json() as WhatsAppWebhookPayload;

  const service = createWhatsAppService(env);
  return service.handleIncomingMessage(body);
});

// Send proactive message (internal use)
whatsapp.post('/send', async (c) => {
  const env = c.env;
  const { phone, text, template } = await c.req.json() as {
    phone: string;
    text: string;
    template?: string;
  };

  if (!phone || !text) {
    return c.json({ error: 'Missing phone or text' }, 400);
  }

  const service = createWhatsAppService(env);
  const success = await service.sendProactiveMessage(phone, text, template);

  return c.json({ success });
});

// Send queue notification
whatsapp.post('/notify', async (c) => {
  const env = c.env;
  const { phone, ticketNumber, position, status } = await c.req.json() as {
    phone: string;
    ticketNumber: string;
    position: number;
    status: 'called' | 'reminder' | 'delayed';
  };

  if (!phone || !ticketNumber || position === undefined || !status) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  const service = createWhatsAppService(env);
  const success = await service.sendQueueNotification(phone, ticketNumber, position, status);

  return c.json({ success });
});

// Health check
whatsapp.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'whatsapp' });
});

export { whatsapp };
