// Security Middleware - Rate Limiting, Security Headers, Request Validation, CSRF Protection
import { Context, Next } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface SecurityConfig {
  rateLimit: {
    ip: RateLimitConfig;
    user: RateLimitConfig;
  };
  csrf: {
    enabled: boolean;
    cookieName: string;
  };
  sessionTimeout: number;
}

const DEFAULT_CONFIG: SecurityConfig = {
  rateLimit: {
    ip: { windowMs: 60000, maxRequests: 100 },
    user: { windowMs: 60000, maxRequests: 200 },
  },
  csrf: {
    enabled: true,
    cookieName: 'csrf_token',
  },
  sessionTimeout: 1800000,
};

export function createSecurityMiddleware(config: Partial<SecurityConfig> = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  return async (c: Context, next: Next) => {
    const start = Date.now();
    const ip = c.req.header('CF-Connecting-IP') || 
               c.req.header('X-Forwarded-For')?.split(',')[0] || 
               'unknown';

    const allowed = await rateLimitByIP(c, ip, cfg.rateLimit.ip);
    if (!allowed) return c.json({ success: false, error: 'Too many requests', code: 'RATE_LIMITED' }, 429);

    const authHeader = c.req.header('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const userAllowed = await rateLimitByUser(c, token, cfg.rateLimit.user);
      if (!userAllowed) return c.json({ success: false, error: 'Too many requests', code: 'RATE_LIMITED' }, 429);
    }

    if (cfg.csrf.enabled && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(c.req.method)) {
      const csrfValid = await csrfProtection(c, cfg.csrf);
      if (!csrfValid) {
        c.status(403);
        return c.json({ success: false, error: 'CSRF token required' });
      }
    }

    await next();

    const duration = Date.now() - start;
    c.res.headers.set('X-Response-Time', `${duration}ms`);
  };
}

async function rateLimitByIP(c: Context, ip: string, config: RateLimitConfig): Promise<boolean> {
  const kv = c.env.RATE_LIMIT_KV;
  if (!kv) return true;

  const key = `ratelimit:ip:${ip}`;
  const current = await kv.get(key);
  
  let count = current ? parseInt(current) : 0;
  
  if (count >= config.maxRequests) {
    c.status(429);
    c.header('Retry-After', Math.ceil(config.windowMs / 1000).toString());
    c.json({
      success: false,
      error: 'Too many requests',
      retryAfter: Math.ceil(config.windowMs / 1000),
    });
    return false;
  }

  count++;
  await kv.put(key, count.toString(), { expirationTtl: Math.ceil(config.windowMs / 1000) });
  return true;
}

async function rateLimitByUser(c: Context, token: string, config: RateLimitConfig): Promise<boolean> {
  const kv = c.env.RATE_LIMIT_KV;
  if (!kv || !token) return true;

  const key = `ratelimit:user:${token.substring(0, 32)}`;
  const current = await kv.get(key);
  
  let count = current ? parseInt(current) : 0;
  
  if (count >= config.maxRequests) {
    c.status(429);
    c.header('Retry-After', Math.ceil(config.windowMs / 1000).toString());
    c.json({
      success: false,
      error: 'Too many requests',
      retryAfter: Math.ceil(config.windowMs / 1000),
    });
    return false;
  }

  count++;
  await kv.put(key, count.toString(), { expirationTtl: Math.ceil(config.windowMs / 1000) });
  return true;
}

async function csrfProtection(c: Context, config: { enabled: boolean; cookieName: string }): Promise<boolean> {
  const cookie = getCookie(c, config.cookieName);
  const csrfHeader = c.req.header('X-CSRF-Token');

  if (!cookie && !csrfHeader) {
    const token = generateCsrfToken();
    setCookie(c, config.cookieName, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: 3600,
      path: '/',
    });
    return false;
  }

  if (cookie && csrfHeader && cookie !== csrfHeader) {
    return false;
  }
  
  return true;
}

function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

export function validateRequest(schema: Record<string, ValidationRule>) {
  return async (c: Context, next: Next) => {
    const body = await c.req.json().catch(() => ({}));
    const query = c.req.query();
    const params = c.req.param();

    for (const [field, rules] of Object.entries(schema)) {
      const value = body[field] ?? query[field] ?? params[field];
      
      if (rules.required && (value === undefined || value === null || value === '')) {
        c.status(400);
        c.json({ success: false, error: `Missing required field: ${field}` });
        return;
      }

      if (value !== undefined && value !== null && value !== '') {
        if (rules.type && !validateType(value, rules.type)) {
          c.status(400);
          c.json({ success: false, error: `Invalid type for field: ${field}` });
          return;
        }
        if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
          c.status(400);
          c.json({ success: false, error: `Invalid format for field: ${field}` });
          return;
        }
        if (rules.minLength && value.length < rules.minLength) {
          c.status(400);
          c.json({ success: false, error: `Field ${field} too short` });
          return;
        }
        if (rules.maxLength && value.length > rules.maxLength) {
          c.status(400);
          c.json({ success: false, error: `Field ${field} too long` });
          return;
        }
      }
    }

    await next();
  };
}

function validateType(value: unknown, type: string): boolean {
  switch (type) {
    case 'string': return typeof value === 'string';
    case 'number': return typeof value === 'number' && !isNaN(value);
    case 'boolean': return typeof value === 'boolean';
    case 'email': return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value as string);
    case 'phone': return /^\+?[\d\s-]{10,}$/.test(value as string);
    case 'uuid': return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value as string);
    default: return true;
  }
}

interface ValidationRule {
  required?: boolean;
  type?: string;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
}