// WhatsApp Business API Routes
// SECURITY: Implements X-Hub-Signature-256 verification for all incoming webhooks
import { Hono } from 'hono';
import { createWhatsAppService, type WhatsAppWebhookPayload } from '../services/whatsapp';
import type { Bindings } from '../types';

const whatsapp = new Hono<{ Bindings: Bindings }>();

// Webhook verification (GET) - required by WhatsApp Business API during setup
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

// Handle incoming messages (POST) - with signature verification
whatsapp.post('/webhook', async (c) => {
  const env = c.env;
  
  // SECURITY: Get the raw body as text for signature verification
  // We need the raw body because HMAC is computed over the exact bytes received
    const rawBody = await c.req.text();
  const signature = c.req.header('x-hub-signature-256') ?? null;
  
  // SECURITY: Verify signature BEFORE parsing JSON
  const service = createWhatsAppService(env);
  
  try {
    const payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
    return service.handleIncomingMessage(payload, signature, rawBody);
  } catch (err) {
    console.error('[WhatsApp Route] Failed to parse webhook payload:', err);
    return c.json({ error: 'Invalid payload' }, 400);
  }
});

// Send proactive message (internal use - authenticated)
whatsapp.post('/send', async (c) => {
  const env = c.env;
  const { phone, text } = await c.req.json() as {
    phone: string;
    text: string;
  };

  if (!phone || !text) {
    return c.json({ error: 'Missing phone or text' }, 400);
  }

  const service = createWhatsAppService(env);
  const success = await service.sendProactiveMessage(phone, text);

  return c.json({ success });
});

// Send queue notification (internal use - authenticated)
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
