import type { Context, MiddlewareHandler } from 'hono';
import type { Bindings } from '../types';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 100,
};

export const rateLimitByIp = (config: Partial<RateLimitConfig> = {}): MiddlewareHandler => {
  const { windowMs, maxRequests } = { ...DEFAULT_CONFIG, ...config };

  return async (c, next) => {
    const ip = c.req.header('x-forwarded-for')?.split(',')[0].trim() 
               || c.req.header('cf-connecting-ip')
               || 'unknown';
    const key = `ratelimit:ip:${ip}`;
    const now = Date.now();

    const kv = c.env.CACHE_KV;
    if (!kv) {
      return next();
    }

    const recordStr = await kv.get(key);
    let record: { count: number; resetAt: number } | null = recordStr ? JSON.parse(recordStr) : null;

    if (!record || record.resetAt < now) {
      record = { count: 1, resetAt: now + windowMs };
      await kv.put(key, JSON.stringify(record), { expirationTtl: Math.ceil(windowMs / 1000) });
      c.header('X-RateLimit-Limit', String(maxRequests));
      c.header('X-RateLimit-Remaining', String(maxRequests - 1));
      c.header('X-RateLimit-Reset', String(Math.ceil((now + windowMs) / 1000)));
      return next();
    }

    if (record.count >= maxRequests) {
      c.header('X-RateLimit-Limit', String(maxRequests));
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', String(Math.ceil(record.resetAt / 1000)));
      c.header('Retry-After', String(Math.ceil((record.resetAt - now) / 1000)));
      return c.json({ error: 'Too many requests. Please try again later.' }, 429);
    }

    record.count++;
    await kv.put(key, JSON.stringify(record), { expirationTtl: Math.ceil((record.resetAt - now) / 1000) });

    c.header('X-RateLimit-Limit', String(maxRequests));
    c.header('X-RateLimit-Remaining', String(Math.max(0, maxRequests - record.count)));
    c.header('X-RateLimit-Reset', String(Math.ceil(record.resetAt / 1000)));

    await next();
  };
};

export const rateLimitByUser = (config: Partial<RateLimitConfig> = {}): MiddlewareHandler => {
  const { windowMs, maxRequests } = { ...DEFAULT_CONFIG, ...config };

  return async (c, next) => {
    const user = c.get('user') as { id: string } | undefined;
    if (!user) {
      return next();
    }

    const key = `ratelimit:user:${user.id}`;
    const now = Date.now();

    const kv = c.env.CACHE_KV;
    if (!kv) {
      return next();
    }

    const recordStr = await kv.get(key);
    let record: { count: number; resetAt: number } | null = recordStr ? JSON.parse(recordStr) : null;

    if (!record || record.resetAt < now) {
      record = { count: 1, resetAt: now + windowMs };
      await kv.put(key, JSON.stringify(record), { expirationTtl: Math.ceil(windowMs / 1000) });
      c.header('X-RateLimit-Limit', String(maxRequests));
      c.header('X-RateLimit-Remaining', String(maxRequests - 1));
      c.header('X-RateLimit-Reset', String(Math.ceil((now + windowMs) / 1000)));
      return next();
    }

    if (record.count >= maxRequests) {
      c.header('X-RateLimit-Limit', String(maxRequests));
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', String(Math.ceil(record.resetAt / 1000)));
      c.header('Retry-After', String(Math.ceil((record.resetAt - now) / 1000)));
      return c.json({ error: 'Too many requests. Please try again later.' }, 429);
    }

    record.count++;
    await kv.put(key, JSON.stringify(record), { expirationTtl: Math.ceil((record.resetAt - now) / 1000) });

    c.header('X-RateLimit-Limit', String(maxRequests));
    c.header('X-RateLimit-Remaining', String(Math.max(0, maxRequests - record.count)));
    c.header('X-RateLimit-Reset', String(Math.ceil(record.resetAt / 1000)));

    await next();
  };
};
