import type { Context, MiddlewareHandler } from 'hono';

export interface SecurityConfig {
  cors?: {
    origin?: string | string[];
    methods?: string[];
    headers?: string[];
    credentials?: boolean;
  };
  csrf?: {
    enabled?: boolean;
    headerName?: string;
    methods?: string[];
  };
}

const DEFAULT_CORS = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  headers: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false,
};

export const securityHeaders: MiddlewareHandler = async (c, next) => {
  c.header('X-DNS-Prefetch-Control', 'on');
  c.header('X-Frame-Options', 'SAMEORIGIN');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  c.header('X-Permitted-Cross-Domain-Policies', 'none');

  await next();
};

export const corsMiddleware = (config: SecurityConfig['cors'] = {}): MiddlewareHandler => {
  const { origin, methods, headers, credentials } = { ...DEFAULT_CORS, ...config };

  return async (c, next) => {
    const reqOrigin = c.req.header('Origin');

    if (reqOrigin) {
      const allowedOrigins = Array.isArray(origin) ? origin : [origin];
      const isAllowed = allowedOrigins.includes(reqOrigin) || allowedOrigins.includes('*');

      if (isAllowed) {
        c.header('Access-Control-Allow-Origin', reqOrigin);
      }

      if (credentials && isAllowed) {
        c.header('Access-Control-Allow-Credentials', 'true');
      }
    }

    if (c.req.method === 'OPTIONS') {
      c.header('Access-Control-Allow-Methods', methods.join(', '));
      c.header('Access-Control-Allow-Headers', headers.join(', '));
      c.header('Access-Control-Max-Age', '86400');
      return c.text('', { status: 204 } as any);
    }

    await next();
  };
};

export const csrfProtection = (config: SecurityConfig['csrf'] = {}): MiddlewareHandler => {
  const { enabled = true, headerName = 'X-CSRF-Token', methods = ['POST', 'PUT', 'PATCH', 'DELETE'] } = config;

  return async (c, next) => {
    if (!enabled || !methods.includes(c.req.method)) {
      return next();
    }

    const csrfToken = c.req.header(headerName);
    const origin = c.req.header('Origin');

    if (!origin) {
      return c.json({ error: 'CSRF validation failed: Missing origin' }, 403);
    }

    if (!csrfToken) {
      return c.json({ error: 'CSRF validation failed: Missing token' }, 403);
    }

    const validOrigins = ['http://localhost:3000', 'https://hospital-queue.app'];
    if (!validOrigins.includes(origin)) {
      return c.json({ error: 'CSRF validation failed: Invalid origin' }, 403);
    }

    await next();
  };
};

export const security = (config: SecurityConfig = {}): MiddlewareHandler => {
  return async (c, next) => {
    await securityHeaders(c, next);
  };
};
