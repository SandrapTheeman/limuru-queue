import type { Context, MiddlewareHandler } from 'hono';
import type { Bindings } from '../types';

export interface AuthOptions {
  roles?: string[];
  optional?: boolean;
}

export const authenticate = (options: AuthOptions = {}): MiddlewareHandler => {
  const { roles = [], optional = false } = options;

  return async (c, next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      if (optional) {
        return next();
      }
      return c.json({ error: 'Missing or invalid authorization header' }, 401);
    }

    const token = authHeader.slice(7);

    if (!token) {
      if (optional) {
        return next();
      }
      return c.json({ error: 'Invalid token' }, 401);
    }

    await next();
  };
};

export const requireAuth = (roles?: string[]) => authenticate({ roles });
export const optionalAuth = () => authenticate({ optional: true });
