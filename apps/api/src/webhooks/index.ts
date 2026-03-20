import { Hono } from 'hono';
import { handleTwilioWebhook } from './twilio';

const webhooks = new Hono();

webhooks.post('/twilio/status', async (c) => {
  return handleTwilioWebhook(c);
});

webhooks.post('/twilio/callback', async (c) => {
  return handleTwilioWebhook(c);
});

webhooks.get('/twilio/status', async (c) => {
  return c.json({ 
    endpoint: 'twilio-status-webhook',
    method: 'POST',
    description: 'Twilio SMS delivery status callback endpoint'
  });
});

webhooks.get('/health', async (c) => {
  return c.json({ 
    webhook_service: 'active',
    timestamp: new Date().toISOString()
  });
});

export { webhooks };
export type WebhookRoutes = typeof webhooks;
