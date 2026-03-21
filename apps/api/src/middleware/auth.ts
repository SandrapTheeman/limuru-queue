import type { MiddlewareHandler } from 'hono';
import type { Bindings } from '../types';
import * as jose from 'jose';

export interface AuthOptions {
  roles?: string[];
  optional?: boolean;
}

// Role hierarchy: super_admin > admin > doctor > nurse > receptionist > pharmacist > lab_tech > facility_manager > it_support > patient
const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 100,
  admin: 80,
  doctor: 60,
  nurse: 50,
  receptionist: 40,
  pharmacist: 35,
  lab_tech: 30,
  facility_manager: 25,
  it_support: 20,
  patient: 10,
};

// Check if user has required role (or higher in hierarchy for admin actions)
function hasRequiredRole(userRole: string, requiredRoles: string[]): boolean {
  if (requiredRoles.length === 0) return true;
  return requiredRoles.includes(userRole);
}

// Check if user has sufficient privilege level
function hasMinimumPrivilege(userRole: string, minimumRole: string): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[minimumRole] ?? 0;
  return userLevel >= requiredLevel;
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
      return c.json({ error: 'Invalid token format' }, 401);
    }

    // Get JWT secret from environment
    const jwtSecret = c.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('FATAL: JWT_SECRET environment variable is not set');
      return c.json({ error: 'Server configuration error' }, 500);
    }

    try {
      // Verify the JWT token using jose
      const secretKey = new TextEncoder().encode(jwtSecret);
      const { payload } = await jose.jwtVerify(token, secretKey);

      // Extract user data from JWT payload
      const userId = payload.sub as string;
      const email = payload.email as string | undefined;
      const role = (payload.role as string) || 'patient';
      const patientId = payload.patientId as string | undefined;
      const doctorId = payload.doctorId as string | undefined;

      // Validate role
      if (!userId || !role) {
        return c.json({ error: 'Invalid token payload' }, 401);
      }

      // Check role requirements if specified
      if (roles.length > 0 && !hasRequiredRole(role, roles)) {
        return c.json({ error: 'Insufficient permissions' }, 403);
      }

      // Attach user info to context for downstream handlers
      c.set('userId', userId);
      c.set('userRole', role);
      c.set('userEmail', email);
      c.set('patientId', patientId);
      c.set('doctorId', doctorId);
      c.set('authToken', token);

      await next();
    } catch (err: any) {
      // Handle specific JWT errors
      if (err.code === 'ERR_JWT_EXPIRED') {
        return c.json({ error: 'Token has expired. Please login again.' }, 401);
      }
      if (err.code === 'ERR_JWT_CLAIM_VALIDATION_FAILED') {
        return c.json({ error: 'Token validation failed' }, 401);
      }
      if (err.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
        return c.json({ error: 'Invalid token signature' }, 401);
      }
      
      console.error('Auth middleware error:', err?.message ?? err);
      
      if (optional) {
        return next();
      }
      return c.json({ error: 'Authentication failed' }, 401);
    }
  };
};

// Middleware: require specific roles
export const requireRole = (...allowedRoles: string[]): MiddlewareHandler => {
  return authenticate({ roles: allowedRoles });
};

// Middleware: require minimum privilege level
export const requirePrivilege = (minimumRole: string): MiddlewareHandler => {
  return async (c, next) => {
    const userRole = c.get('userRole') as string | undefined;
    
    if (!userRole || !hasMinimumPrivilege(userRole, minimumRole)) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }
    
    await next();
  };
};

// Helper: get current user from context
export function getCurrentUser(c: any): { userId: string; role: string; email?: string; patientId?: string; doctorId?: string } | null {
  const userId = c.get('userId') as string | undefined;
  const role = c.get('userRole') as string | undefined;
  if (!userId || !role) return null;
  
  return {
    userId,
    role,
    email: c.get('userEmail') as string | undefined,
    patientId: c.get('patientId') as string | undefined,
    doctorId: c.get('doctorId') as string | undefined,
  };
}

// Export for convenience
export const requireAuth = (roles?: string[]) => {
  if (roles && roles.length > 0) {
    return authenticate({ roles });
  }
  return authenticate({});
};
export const optionalAuth = () => authenticate({ optional: true });
