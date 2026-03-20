import { Hono } from 'hono';
import { createHmac } from 'crypto';

export interface TwilioWebhookPayload {
  MessageSid: string;
  MessageStatus: TwilioMessageStatus;
  To: string;
  From: string;
  ErrorCode?: string;
  ErrorMessage?: string;
  SmsSid: string;
  SmsStatus: TwilioMessageStatus;
  AccountSid: string;
  FromCity?: string;
  FromState?: string;
  FromCountry?: string;
  ToCity?: string;
  ToState?: string;
  ToCountry?: string;
}

export type TwilioMessageStatus = 
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'undelivered'
  | 'failed'
  | 'receiving'
  | 'received';

export interface WebhookLogEntry {
  timestamp: string;
  messageSid: string;
  status: TwilioMessageStatus;
  to: string;
  from: string;
  errorCode?: string;
  errorMessage?: string;
  rawPayload: TwilioWebhookPayload;
}

export class TwilioWebhookHandler {
  private authToken: string;
  private accountSid: string;
  private webhookLogs: WebhookLogEntry[] = [];

  constructor(authToken: string, accountSid: string) {
    this.authToken = authToken;
    this.accountSid = accountSid;
  }

  verifySignature(
    signature: string,
    url: string,
    params: Record<string, string>
  ): boolean {
    if (!signature || !this.authToken) {
      return false;
    }

    const sortedKeys = Object.keys(params).sort();
    const dataToSign = url + sortedKeys.map(key => key + params[key]).join('');

    const hmac = createHmac('sha1', this.authToken);
    hmac.update(dataToSign);
    const expectedSignature = hmac.digest('base64');

    return signature === expectedSignature;
  }

  parseWebhookParams(params: URLSearchParams | Record<string, string>): Record<string, string> {
    const result: Record<string, string> = {};
    if (params instanceof URLSearchParams) {
      for (const [key, value] of params) {
        result[key] = value;
      }
    } else {
      for (const [key, value] of Object.entries(params)) {
        result[key] = value;
      }
    }
    return result;
  }

  processDeliveryStatus(payload: TwilioWebhookPayload): {
    success: boolean;
    logEntry: WebhookLogEntry;
  } {
    const logEntry: WebhookLogEntry = {
      timestamp: new Date().toISOString(),
      messageSid: payload.MessageSid || payload.SmsSid,
      status: payload.MessageStatus || payload.SmsStatus,
      to: payload.To,
      from: payload.From,
      errorCode: payload.ErrorCode,
      errorMessage: payload.ErrorMessage,
      rawPayload: payload,
    };

    this.webhookLogs.push(logEntry);

    if (this.webhookLogs.length > 1000) {
      this.webhookLogs = this.webhookLogs.slice(-500);
    }

    const isFailed = payload.MessageStatus === 'failed' || payload.SmsStatus === 'failed';
    const isUndelivered = payload.MessageStatus === 'undelivered' || payload.SmsStatus === 'undelivered';

    return {
      success: !isFailed && !isUndelivered,
      logEntry,
    };
  }

  getLogs(): WebhookLogEntry[] {
    return [...this.webhookLogs];
  }

  clearLogs(): void {
    this.webhookLogs = [];
  }
}

export function createTwilioWebhookHandler(env: {
  TWILIO_AUTH_TOKEN: string;
  TWILIO_ACCOUNT_SID: string;
}): TwilioWebhookHandler {
  return new TwilioWebhookHandler(
    env.TWILIO_AUTH_TOKEN,
    env.TWILIO_ACCOUNT_SID
  );
}

export async function handleTwilioWebhook(c: any): Promise<Response> {
  const authToken = process.env['TWILIO_AUTH_TOKEN'];
  const accountSid = process.env['TWILIO_ACCOUNT_SID'];

  if (!authToken || !accountSid) {
    console.error('[Webhook] Missing Twilio credentials');
    return c.json({ error: 'Server configuration error' }, 500);
  }

  const signature = c.req.header('X-Twilio-Signature');

  const url = `${c.req.protocol}://${c.req.host}${c.req.path}`;
  const params = c.req.query();

  const handler = new TwilioWebhookHandler(authToken, accountSid);

  if (signature && !handler.verifySignature(signature, url, params)) {
    console.warn('[Webhook] Invalid signature from IP:', c.req.header('CF-Connecting-IP') || 'unknown');
    return c.json({ error: 'Invalid signature' }, 403);
  }

  const body = await c.req.parseBody();
  const payload = handler.parseWebhookParams(body as Record<string, string>);

  const webhookPayload: TwilioWebhookPayload = {
    MessageSid: payload['MessageSid'] || payload['SmsSid'] || '',
    MessageStatus: (payload['MessageStatus'] || payload['SmsStatus'] || 'queued') as TwilioMessageStatus,
    To: payload['To'] || '',
    From: payload['From'] || '',
    ErrorCode: payload['ErrorCode'],
    ErrorMessage: payload['ErrorMessage'],
    SmsSid: payload['SmsSid'] || '',
    SmsStatus: (payload['SmsStatus'] || 'queued') as TwilioMessageStatus,
    AccountSid: payload['AccountSid'] || accountSid,
    FromCity: payload['FromCity'],
    FromState: payload['FromState'],
    FromCountry: payload['FromCountry'],
    ToCity: payload['ToCity'],
    ToState: payload['ToState'],
    ToCountry: payload['ToCountry'],
  };

  if (payload['AccountSid'] && payload['AccountSid'] !== accountSid) {
    console.warn('[Webhook] AccountSid mismatch:', payload['AccountSid']);
    return c.json({ error: 'Account mismatch' }, 400);
  }

  const result = handler.processDeliveryStatus(webhookPayload);

  if (result.logEntry.errorCode) {
    console.error('[Webhook] SMS delivery failed:', {
      messageSid: result.logEntry.messageSid,
      errorCode: result.logEntry.errorCode,
      errorMessage: result.logEntry.errorMessage,
      to: result.logEntry.to,
    });
  } else {
    console.log('[Webhook] SMS status update:', {
      messageSid: result.logEntry.messageSid,
      status: result.logEntry.status,
      to: result.logEntry.to,
    });
  }

  return c.json({ 
    received: true,
    messageSid: result.logEntry.messageSid,
    status: result.logEntry.status,
  });
}
