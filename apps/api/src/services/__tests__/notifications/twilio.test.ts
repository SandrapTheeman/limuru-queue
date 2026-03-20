// Unit tests for Twilio Notification Service
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TwilioService, createTwilioService, NotificationResult } from '../../notifications/twilio';

describe('TwilioService', () => {
  let twilioService: TwilioService;

  const mockConfig = {
    accountSid: 'AC_TEST_ACCOUNT',
    authToken: 'test_auth_token',
    phoneNumber: '+254712345678',
    whatsappNumber: '+254798765432',
  };

  beforeEach(() => {
    twilioService = new TwilioService(mockConfig);
  });

  describe('constructor', () => {
    it('should initialize with config', () => {
      expect(twilioService).toBeDefined();
      expect((twilioService as any).accountSid).toBe('AC_TEST_ACCOUNT');
      expect((twilioService as any).authToken).toBe('test_auth_token');
      expect((twilioService as any).phoneNumber).toBe('+254712345678');
    });
  });

  describe('sendSMS', () => {
    it('should send SMS successfully', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ sid: 'SM123', status: 'queued' }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const result = await twilioService.sendSMS('+254712345678', 'Test message');

      expect(result.success).toBe(true);
      expect(result.sid).toBe('SM123');
      expect(result.status).toBe('queued');
    });

    it('should handle SMS failure', async () => {
      const mockResponse = {
        ok: false,
        json: () => Promise.resolve({ message: 'Invalid phone number' }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const result = await twilioService.sendSMS('invalid', 'Test message');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid phone number');
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await twilioService.sendSMS('+254712345678', 'Test message');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('sendWhatsApp', () => {
    it('should send WhatsApp message successfully', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ sid: 'WA123', status: 'queued' }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const result = await twilioService.sendWhatsApp('+254712345678', 'Hello via WhatsApp');

      expect(result.success).toBe(true);
      expect(result.sid).toBe('WA123');
    });

    it('should format WhatsApp number correctly', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sid: 'WA123', status: 'queued' }),
      });

      global.fetch = fetchMock;

      await twilioService.sendWhatsApp('0712345678', 'Test');

      expect(fetchMock).toHaveBeenCalled();
      const callBody = fetchMock.mock.calls[0][1].body;
      expect(callBody.toString()).toContain('whatsapp:+254712345678');
    });
  });

  describe('initiateVoiceCall', () => {
    it('should initiate voice call successfully', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ sid: 'CA123', status: 'queued' }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const twiml = '<?xml><Response><Say>Test message</Say></Response>';
      const result = await twilioService.initiateVoiceCall('+254712345678', twiml);

      expect(result.success).toBe(true);
      expect(result.sid).toBe('CA123');
    });
  });

  describe('sendTemplatedMessage', () => {
    it('should send queue_called template', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sid: 'SM123', status: 'queued' }),
      });

      global.fetch = fetchMock;

      const result = await twilioService.sendTemplatedMessage(
        '+254712345678',
        'sms',
        'queue_called',
        { name: 'John Doe', ticket: 'MED001' }
      );

      expect(result.success).toBe(true);
    });

    it('should send queue_reminder template', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sid: 'SM123', status: 'queued' }),
      });

      global.fetch = fetchMock;

      const result = await twilioService.sendTemplatedMessage(
        '+254712345678',
        'whatsapp',
        'queue_reminder',
        { name: 'Jane', position: '3', wait: '45' }
      );

      expect(result.success).toBe(true);
    });

    it('should replace template variables correctly', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sid: 'SM123', status: 'queued' }),
      });

      global.fetch = fetchMock;

      await twilioService.sendTemplatedMessage(
        '+254712345678',
        'sms',
        'queue_called',
        { name: 'John Doe', ticket: 'MED001' }
      );

      const callBody = fetchMock.mock.calls[0][1].body;
      expect(callBody.toString()).toContain('John Doe');
      expect(callBody.toString()).toContain('MED001');
    });
  });

  describe('generateTwiml', () => {
    it('should generate valid TwiML', () => {
      const twiml = twilioService.generateTwiml('Your turn has arrived');

      expect(twiml).toContain('<?xml version="1.0"');
      expect(twiml).toContain('<Response>');
      expect(twiml).toContain('<Say');
      expect(twiml).toContain('Your turn has arrived');
      expect(twiml).toContain('</Response>');
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format number starting with 0', () => {
      const formatted = (twilioService as any).formatPhoneNumber('0712345678');
      expect(formatted).toBe('+254712345678');
    });

    it('should format number without country code', () => {
      const formatted = (twilioService as any).formatPhoneNumber('712345678');
      expect(formatted).toBe('+254712345678');
    });

    it('should keep number with country code', () => {
      const formatted = (twilioService as any).formatPhoneNumber('254712345678');
      expect(formatted).toBe('+254712345678');
    });

    it('should handle +254 format', () => {
      const formatted = (twilioService as any).formatPhoneNumber('+254712345678');
      expect(formatted).toBe('+254712345678');
    });
  });

  describe('isValidPhoneNumber', () => {
    it('should validate correct Kenyan number', () => {
      expect(twilioService.isValidPhoneNumber('+254712345678')).toBe(true);
      expect(twilioService.isValidPhoneNumber('0712345678')).toBe(true);
      expect(twilioService.isValidPhoneNumber('712345678')).toBe(true);
    });

    it('should reject invalid numbers', () => {
      expect(twilioService.isValidPhoneNumber('123')).toBe(false);
      expect(twilioService.isValidPhoneNumber('')).toBe(false);
      expect(twilioService.isValidPhoneNumber('abc')).toBe(false);
    });
  });

  describe('createTwilioService', () => {
    it('should create service from environment', () => {
      const service = createTwilioService({
        TWILIO_ACCOUNT_SID: 'AC_TEST',
        TWILIO_AUTH_TOKEN: 'token',
        TWILIO_PHONE_NUMBER: '+254712345678',
        TWILIO_WHATSAPP_NUMBER: '+254798765432',
      });

      expect(service).toBeDefined();
    });

    it('should use phone number as whatsapp number when not provided', () => {
      const service = createTwilioService({
        TWILIO_ACCOUNT_SID: 'AC_TEST',
        TWILIO_AUTH_TOKEN: 'token',
        TWILIO_PHONE_NUMBER: '+254712345678',
        TWILIO_WHATSAPP_NUMBER: '',
      });

      expect(service).toBeDefined();
    });
  });
});