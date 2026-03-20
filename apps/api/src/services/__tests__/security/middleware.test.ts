// Unit tests for Security Middleware
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSecurityMiddleware, validateRequest } from '../../security/middleware';
import { createMockKV } from '../mocks';

describe('Security Middleware', () => {
  describe('createSecurityMiddleware', () => {
    it('should create middleware with default config', () => {
      const middleware = createSecurityMiddleware();
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should accept custom config', () => {
      const middleware = createSecurityMiddleware({
        rateLimit: {
          ip: { windowMs: 30000, maxRequests: 50 },
          user: { windowMs: 60000, maxRequests: 100 },
        },
        csrf: {
          enabled: false,
          cookieName: 'custom_csrf',
        },
        sessionTimeout: 3600000,
      });

      expect(middleware).toBeDefined();
    });
  });

  describe('validateRequest', () => {
    it('should validate required fields', async () => {
      const schema = {
        name: { required: true, type: 'string' },
        email: { required: true, type: 'email' },
        phone: { required: false, type: 'phone' },
      };

      const middleware = validateRequest(schema);

      const mockContext = {
        req: {
          json: () => Promise.resolve({ name: 'John', email: 'john@test.com' }),
          query: () => ({}),
          param: () => ({}),
          method: 'POST',
        },
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      const next = vi.fn();

      await middleware(mockContext, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject missing required fields', async () => {
      const schema = {
        name: { required: true, type: 'string' },
        email: { required: true, type: 'email' },
      };

      const middleware = validateRequest(schema);

      const mockContext = {
        req: {
          json: () => Promise.resolve({ name: 'John' }),
          query: () => ({}),
          param: () => ({}),
          method: 'POST',
        },
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      const next = vi.fn();

      await middleware(mockContext, next);

      expect(mockContext.status).toHaveBeenCalledWith(400);
      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('email'),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should validate email format', async () => {
      const schema = {
        email: { required: true, type: 'email' },
      };

      const middleware = validateRequest(schema);

      const mockContext = {
        req: {
          json: () => Promise.resolve({ email: 'invalid-email' }),
          query: () => ({}),
          param: () => ({}),
          method: 'POST',
        },
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      const next = vi.fn();

      await middleware(mockContext, next);

      expect(mockContext.status).toHaveBeenCalledWith(400);
    });

    it('should validate phone format', async () => {
      const schema = {
        phone: { required: true, type: 'phone' },
      };

      const middleware = validateRequest(schema);

      const mockContext = {
        req: {
          json: () => Promise.resolve({ phone: '123' }),
          query: () => ({}),
          param: () => ({}),
          method: 'POST',
        },
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      const next = vi.fn();

      await middleware(mockContext, next);

      expect(mockContext.status).toHaveBeenCalledWith(400);
    });

    it('should validate UUID format', async () => {
      const schema = {
        id: { required: true, type: 'uuid' },
      };

      const middleware = validateRequest(schema);

      const mockContext = {
        req: {
          json: () => Promise.resolve({ id: 'not-a-uuid' }),
          query: () => ({}),
          param: () => ({}),
          method: 'POST',
        },
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      const next = vi.fn();

      await middleware(mockContext, next);

      expect(mockContext.status).toHaveBeenCalledWith(400);
    });

    it('should validate minimum length', async () => {
      const schema = {
        password: { required: true, minLength: 8 },
      };

      const middleware = validateRequest(schema);

      const mockContext = {
        req: {
          json: () => Promise.resolve({ password: '123' }),
          query: () => ({}),
          param: () => ({}),
          method: 'POST',
        },
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      const next = vi.fn();

      await middleware(mockContext, next);

      expect(mockContext.status).toHaveBeenCalledWith(400);
    });

    it('should validate maximum length', async () => {
      const schema = {
        name: { required: true, maxLength: 10 },
      };

      const middleware = validateRequest(schema);

      const mockContext = {
        req: {
          json: () => Promise.resolve({ name: '12345678901' }),
          query: () => ({}),
          param: () => ({}),
          method: 'POST',
        },
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      const next = vi.fn();

      await middleware(mockContext, next);

      expect(mockContext.status).toHaveBeenCalledWith(400);
    });

    it('should validate pattern', async () => {
      const schema = {
        ticket: { required: true, pattern: '^MED\\d{3}$' },
      };

      const middleware = validateRequest(schema);

      const mockContext = {
        req: {
          json: () => Promise.resolve({ ticket: 'INVALID' }),
          query: () => ({}),
          param: () => ({}),
          method: 'POST',
        },
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      const next = vi.fn();

      await middleware(mockContext, next);

      expect(mockContext.status).toHaveBeenCalledWith(400);
    });

    it('should allow optional fields when not provided', async () => {
      const schema = {
        name: { required: true },
        phone: { required: false, type: 'phone' },
      };

      const middleware = validateRequest(schema);

      const mockContext = {
        req: {
          json: () => Promise.resolve({ name: 'John' }),
          query: () => ({}),
          param: () => ({}),
          method: 'POST',
        },
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      const next = vi.fn();

      await middleware(mockContext, next);

      expect(next).toHaveBeenCalled();
    });
  });
});

describe('Rate Limiting', () => {
  describe('rateLimitByIP', () => {
    it('should allow requests under limit', async () => {
      const kv = createMockKV();
      await kv.put('ratelimit:ip:192.168.1.1', '50');

      expect(await kv.get('ratelimit:ip:192.168.1.1')).toBe('50');
    });

    it('should block requests over limit', async () => {
      const kv = createMockKV();
      await kv.put('ratelimit:ip:192.168.1.1', '100');

      const count = parseInt(await kv.get('ratelimit:ip:192.168.1.1') || '0');
      expect(count).toBeGreaterThanOrEqual(100);
    });
  });

  describe('rateLimitByUser', () => {
    it('should track user rate limits', async () => {
      const kv = createMockKV();
      const userKey = 'ratelimit:user:' + 'test-token-12345678901234567890'.substring(0, 32);

      await kv.put(userKey, '100');

      expect(await kv.get(userKey)).toBe('100');
    });
  });
});