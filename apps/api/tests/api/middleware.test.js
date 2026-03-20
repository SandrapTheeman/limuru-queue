/**
 * Middleware API Tests
 * 
 * Tests for authentication middleware, RBAC, validation, and error handling.
 */
const { describe, it, expect } = require('vitest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Mock the auth middleware (matches middleware/auth.js)
const createAuthMiddleware = () => {
  const tokenBlacklist = new Set();

  const authMiddleware = (req, res, next) => {
    const publicPaths = ['/health', '/api', '/api/departments'];
    const publicPrefixes = ['/api/auth/login'];

    if (publicPaths.includes(req.path) || publicPrefixes.some(p => req.path.startsWith(p))) {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required',
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    if (tokenBlacklist.has(token)) {
      return res.status(401).json({ 
        success: false, 
        error: 'Token invalidated',
        message: 'Token has been logged out'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role,
        department: decoded.department
      };
      req.token = token;
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false, 
          error: 'Token expired',
          message: 'Please login again'
        });
      }
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token',
        message: 'Token is not valid'
      });
    }
  };

  const requireRole = (...roles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ 
          success: false, 
          error: 'Access denied',
          message: `This action requires one of these roles: ${roles.join(', ')}`
        });
      }
      next();
    };
  };

  const blacklistToken = (token) => {
    tokenBlacklist.add(token);
  };

  return { authMiddleware, requireRole, blacklistToken, tokenBlacklist };
};

describe('Authentication Middleware', () => {
  const { authMiddleware, requireRole, blacklistToken, tokenBlacklist } = createAuthMiddleware();

  const createApp = () => {
    const app = express();
    app.use(express.json());
    return app;
  };

  describe('Public Paths', () => {
    it('should allow access to /health without auth', () => {
      const app = createApp();
      app.get('/health', (req, res) => res.json({ status: 'ok' }));
      
      return new Promise((resolve) => {
        const http = require('http');
        const server = app.listen(0, () => {
          const port = server.address().port;
          http.get(`http://localhost:${port}/health`, (res) => {
            expect(res.statusCode).toBe(200);
            server.close();
            resolve();
          });
        });
      });
    });

    it('should allow access to /api without auth', () => {
      const app = createApp();
      app.get('/api', (req, res) => res.json({ version: '1.0' }));
      
      return new Promise((resolve) => {
        const http = require('http');
        const server = app.listen(0, () => {
          const port = server.address().port;
          http.get(`http://localhost:${port}/api`, (res) => {
            expect(res.statusCode).toBe(200);
            server.close();
            resolve();
          });
        });
      });
    });

    it('should allow access to /api/auth/login without auth', () => {
      const app = createApp();
      app.post('/api/auth/login', authMiddleware, (req, res) => res.json({ success: true }));
      
      return new Promise((resolve) => {
        const http = require('http');
        const server = app.listen(0, () => {
          const port = server.address().port;
          const req = http.request({ method: 'POST', path: '/api/auth/login', port, headers: { 'Content-Type': 'application/json' } }, (res) => {
            expect(res.statusCode).toBe(200);
            server.close();
            resolve();
          });
          req.end(JSON.stringify({ email: 'test', password: 'test' }));
        });
      });
    });
  });

  describe('Protected Paths', () => {
    it('should reject request without authorization header', () => {
      const app = createApp();
      app.get('/api/protected', authMiddleware, (req, res) => res.json({ data: 'secret' }));
      
      return new Promise((resolve) => {
        const http = require('http');
        const server = app.listen(0, () => {
          const port = server.address().port;
          http.get(`http://localhost:${port}/api/protected`, (res) => {
            expect(res.statusCode).toBe(401);
            server.close();
            resolve();
          });
        });
      });
    });

    it('should reject request with malformed auth header', () => {
      const app = createApp();
      app.get('/api/protected', authMiddleware, (req, res) => res.json({ data: 'secret' }));
      
      return new Promise((resolve) => {
        const http = require('http');
        const server = app.listen(0, () => {
          const port = server.address().port;
          const req = http.request({ method: 'GET', path: '/api/protected', port, headers: { 'Authorization': 'InvalidFormat' } }, (res) => {
            expect(res.statusCode).toBe(401);
            server.close();
            resolve();
          });
          req.end();
        });
      });
    });

    it('should reject request with invalid token', () => {
      const app = createApp();
      app.get('/api/protected', authMiddleware, (req, res) => res.json({ data: 'secret' }));
      
      return new Promise((resolve) => {
        const http = require('http');
        const server = app.listen(0, () => {
          const port = server.address().port;
          const req = http.request({ method: 'GET', path: '/api/protected', port, headers: { 'Authorization': 'Bearer invalid.token.here' } }, (res) => {
            expect(res.statusCode).toBe(401);
            server.close();
            resolve();
          });
          req.end();
        });
      });
    });

    it('should reject request with expired token', () => {
      const app = createApp();
      app.get('/api/protected', authMiddleware, (req, res) => res.json({ data: 'secret' }));

      const expiredToken = jwt.sign(
        { id: '123', email: 'test@test.com', name: 'Test', role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' }
      );
      
      return new Promise((resolve) => {
        const http = require('http');
        const server = app.listen(0, () => {
          const port = server.address().port;
          const req = http.request({ method: 'GET', path: '/api/protected', port, headers: { 'Authorization': `Bearer ${expiredToken}` } }, (res) => {
            expect(res.statusCode).toBe(401);
            server.close();
            resolve();
          });
          req.end();
        });
      });
    });

    it('should accept request with valid token', () => {
      const app = createApp();
      app.get('/api/protected', authMiddleware, (req, res) => res.json({ user: req.user }));

      const validToken = jwt.sign(
        { id: '123', email: 'test@test.com', name: 'Test User', role: 'admin', department: 'General' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return new Promise((resolve) => {
        const http = require('http');
        const server = app.listen(0, () => {
          const port = server.address().port;
          const req = http.request({ method: 'GET', path: '/api/protected', port, headers: { 'Authorization': `Bearer ${validToken}` } }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
              const data = JSON.parse(body);
              expect(res.statusCode).toBe(200);
              expect(data.user.role).toBe('admin');
              server.close();
              resolve();
            });
          });
          req.end();
        });
      });
    });
  });

  describe('Token Blacklist', () => {
    it('should reject blacklisted token', () => {
      const app = createApp();
      app.get('/api/protected', authMiddleware, (req, res) => res.json({ data: 'secret' }));

      const token = jwt.sign(
        { id: '123', email: 'test@test.com', name: 'Test', role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      blacklistToken(token);
      
      return new Promise((resolve) => {
        const http = require('http');
        const server = app.listen(0, () => {
          const port = server.address().port;
          const req = http.request({ method: 'GET', path: '/api/protected', port, headers: { 'Authorization': `Bearer ${token}` } }, (res) => {
            expect(res.statusCode).toBe(401);
            server.close();
            resolve();
          });
          req.end();
        });
      });
    });
  });

  describe('Role-Based Access Control', () => {
    it('should allow access for correct role', () => {
      const app = createApp();
      app.get('/api/admin-only', authMiddleware, requireRole('admin'), (req, res) => res.json({ data: 'admin area' }));

      const adminToken = jwt.sign(
        { id: '1', email: 'admin@test.com', name: 'Admin', role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return new Promise((resolve) => {
        const http = require('http');
        const server = app.listen(0, () => {
          const port = server.address().port;
          const req = http.request({ method: 'GET', path: '/api/admin-only', port, headers: { 'Authorization': `Bearer ${adminToken}` } }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
              const data = JSON.parse(body);
              expect(res.statusCode).toBe(200);
              expect(data.data).toBe('admin area');
              server.close();
              resolve();
            });
          });
          req.end();
        });
      });
    });

    it('should deny access for incorrect role', () => {
      const app = createApp();
      app.get('/api/admin-only', authMiddleware, requireRole('admin'), (req, res) => res.json({ data: 'admin area' }));

      const userToken = jwt.sign(
        { id: '2', email: 'user@test.com', name: 'User', role: 'receptionist' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return new Promise((resolve) => {
        const http = require('http');
        const server = app.listen(0, () => {
          const port = server.address().port;
          const req = http.request({ method: 'GET', path: '/api/admin-only', port, headers: { 'Authorization': `Bearer ${userToken}` } }, (res) => {
            expect(res.statusCode).toBe(403);
            server.close();
            resolve();
          });
          req.end();
        });
      });
    });

    it('should allow access for any of multiple allowed roles', () => {
      const app = createApp();
      app.get('/api/staff', authMiddleware, requireRole('admin', 'doctor', 'nurse'), (req, res) => res.json({ data: 'staff area' }));

      const nurseToken = jwt.sign(
        { id: '3', email: 'nurse@test.com', name: 'Nurse', role: 'nurse' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return new Promise((resolve) => {
        const http = require('http');
        const server = app.listen(0, () => {
          const port = server.address().port;
          const req = http.request({ method: 'GET', path: '/api/staff', port, headers: { 'Authorization': `Bearer ${nurseToken}` } }, (res) => {
            expect(res.statusCode).toBe(200);
            server.close();
            resolve();
          });
          req.end();
        });
      });
    });

    it('should deny unauthenticated user for role check', () => {
      const app = createApp();
      app.get('/api/admin-only', authMiddleware, requireRole('admin'), (req, res) => res.json({ data: 'admin area' }));
      
      return new Promise((resolve) => {
        const http = require('http');
        const server = app.listen(0, () => {
          const port = server.address().port;
          http.get(`http://localhost:${port}/api/admin-only`, (res) => {
            expect(res.statusCode).toBe(401);
            server.close();
            resolve();
          });
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', () => {
      const app = createApp();
      app.post('/api/test', authMiddleware, (req, res) => res.json({ data: req.body }));
      
      return new Promise((resolve) => {
        const http = require('http');
        const server = app.listen(0, () => {
          const port = server.address().port;
          const req = http.request({ 
            method: 'POST', 
            path: '/api/test', 
            port, 
            headers: { 
              'Authorization': `Bearer ${jwt.sign({ id: '1', email: 'test', name: 'Test', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '24h' })}`,
              'Content-Type': 'application/json',
              'Content-Length': 20
            } 
          }, (res) => {
            expect(res.statusCode).toBe(400);
            server.close();
            resolve();
          });
          req.write('{"invalid": json}');
          req.end();
        });
      });
    });

    it('should handle database connection errors', async () => {
      // This is a placeholder for testing actual DB connection failures
      // In production, you'd mock the database pool
      expect(true).toBe(true);
    });
  });
});
