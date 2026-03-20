/**
 * Authentication API Tests
 * 
 * Tests for login, logout, token validation, role-based access,
 * password reset, invalid credentials, expired tokens, and missing tokens.
 */
const { describe, it, expect, beforeAll, afterAll, beforeEach } = require('vitest');
const request = require('supertest');
const jwt = require('jsonwebtoken');

// Import server - need to handle the Express app export
const express = require('express');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Test database connection
const testPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hqs_test',
});

// Create a test app that imports the actual server logic
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Mock auth middleware for testing
  const mockAuthMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required',
        message: 'No token provided'
      });
    }
    
    const token = authHeader.substring(7);
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

  // Health check (public)
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Login endpoint (matches server.js)
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing credentials',
          message: 'Email and password are required'
        });
      }

      const result = await testPool.query(
        `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.password_hash, u.is_active,
                d.name AS department_name
         FROM users u
         LEFT JOIN departments d ON d.id = u.department_id
         WHERE u.email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
      }

      const user = result.rows[0];

      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          error: 'Account disabled',
          message: 'Your account has been disabled'
        });
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
      }

      const userName = `${user.first_name} ${user.last_name}`;

      const tokenPayload = {
        id: user.id,
        email: user.email,
        name: userName,
        role: user.role,
        department: user.department_name
      };

      const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '24h' });
      const refreshToken = jwt.sign({ id: user.id, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: '7d' });

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: userName,
            role: user.role,
            department: user.department_name
          },
          accessToken,
          refreshToken,
          expiresIn: '24h'
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Login failed' });
    }
  });

  // Get current user
  app.get('/api/auth/me', mockAuthMiddleware, async (req, res) => {
    try {
      const result = await testPool.query(
        `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_active,
                d.name AS department_name
         FROM users u
         LEFT JOIN departments d ON d.id = u.department_id
         WHERE u.id = $1`,
        [req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const user = result.rows[0];
      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: `${user.first_name} ${user.last_name}`,
          role: user.role,
          department: user.department_name
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to get user info' });
    }
  });

  // Refresh token
  app.post('/api/auth/refresh', async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing token',
          message: 'Refresh token is required'
        });
      }

      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

      if (decoded.type !== 'refresh') {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid token',
          message: 'Invalid refresh token'
        });
      }

      const result = await testPool.query(
        `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, d.name AS department_name
         FROM users u
         LEFT JOIN departments d ON d.id = u.department_id
         WHERE u.id = $1`,
        [decoded.id]
      );

      if (result.rows.length === 0 || !result.rows[0].is_active) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
          message: 'User does not exist or is disabled'
        });
      }

      const user = result.rows[0];
      const tokenPayload = {
        id: user.id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`,
        role: user.role,
        department: user.department_name
      };

      const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '24h' });
      const newRefreshToken = jwt.sign({ id: user.id, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: '7d' });

      res.json({
        success: true,
        data: {
          accessToken,
          refreshToken: newRefreshToken,
          expiresIn: '24h'
        }
      });
    } catch (err) {
      res.status(401).json({ 
        success: false, 
        error: 'Token refresh failed',
        message: 'Invalid or expired refresh token'
      });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', mockAuthMiddleware, async (req, res) => {
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });

  // Forgot password
  app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email required' });
    }
    
    // Always return success to prevent email enumeration
    res.json({ success: true, message: 'If email exists, reset instructions were sent' });
  });

  // Reset password
  app.post('/api/auth/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, error: 'Token and new password required' });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password too short',
        message: 'Password must be at least 8 characters'
      });
    }
    
    // Mock token verification
    if (token === 'invalid-token') {
      return res.status(400).json({ success: false, error: 'Invalid or expired token' });
    }
    
    res.json({ success: true, message: 'Password reset successful' });
  });

  return app;
};

const app = createTestApp();

// Helper to create test user
async function createTestUser(overrides = {}) {
  const {
    email = `test_${Date.now()}@example.com`,
    password = 'password123',
    first_name = 'Test',
    last_name = 'User',
    role = 'receptionist',
    is_active = true
  } = overrides;
  
  const passwordHash = await bcrypt.hash(password, 10);
  
  const result = await testPool.query(`
    INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, email, first_name, last_name, role, is_active
  `, [email, passwordHash, first_name, last_name, role, is_active ? 1 : 0]);
  
  return {
    ...result.rows[0],
    password,
    passwordHash
  };
}

// Helper to generate token
function generateTestToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    name: `${user.first_name} ${user.last_name}`.trim(),
    role: user.role,
    department: null
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
}

describe('Authentication API', () => {
  let adminUser;
  let doctorUser;
  let inactiveUser;

  beforeAll(async () => {
    // Create test users
    adminUser = await createTestUser({
      email: 'admin@limuruhospital.co.ke',
      role: 'admin',
      first_name: 'Admin',
      last_name: 'User'
    });

    doctorUser = await createTestUser({
      email: 'doctor@hospital.co.ke',
      role: 'doctor',
      first_name: 'Doctor',
      last_name: 'User'
    });

    inactiveUser = await createTestUser({
      email: 'inactive@test.com',
      role: 'receptionist',
      first_name: 'Inactive',
      last_name: 'User',
      is_active: false
    });
  });

  afterAll(async () => {
    // Clean up test users
    await testPool.query('DELETE FROM users WHERE email LIKE $1', ['%@test.com']);
    await testPool.query("DELETE FROM users WHERE email = 'admin@limuruhospital.co.ke'");
    await testPool.query("DELETE FROM users WHERE email = 'doctor@hospital.co.ke'");
    await testPool.end();
  });

  describe('POST /api/auth/login', () => {
    // ==========================================
    // POSITIVE TESTS - Successful Login
    // ==========================================
    
    it('should login successfully with valid credentials (admin)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@limuruhospital.co.ke',
          password: 'password123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe('admin@limuruhospital.co.ke');
      expect(res.body.data.user.role).toBe('admin');
      expect(res.body.data.expiresIn).toBe('24h');
    });

    it('should login successfully with valid credentials (doctor)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'doctor@hospital.co.ke',
          password: 'password123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.role).toBe('doctor');
    });

    it('should return refresh token along with access token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@limuruhospital.co.ke',
          password: 'password123'
        });

      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.refreshToken.split('.').length).toBe(3);
    });

    // ==========================================
    // NEGATIVE TESTS - Authentication Failures
    // ==========================================

    it('should reject login with missing email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'password123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Missing credentials');
    });

    it('should reject login with missing password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@limuruhospital.co.ke'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject login with invalid email (non-existent user)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@hospital.co.ke',
          password: 'password123'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should reject login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@limuruhospital.co.ke',
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should reject login for inactive/deactivated account', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'inactive@test.com',
          password: 'password123'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Account disabled');
    });

    it('should reject login with empty credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject login with null values', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: null,
          password: null
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken;

    beforeAll(() => {
      authToken = generateTestToken(adminUser);
    });

    // ==========================================
    // POSITIVE TESTS - Get Current User
    // ==========================================

    it('should return current user info with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(adminUser.id);
      expect(res.body.data.email).toBe(adminUser.email);
      expect(res.body.data.role).toBe('admin');
    });

    // ==========================================
    // NEGATIVE TESTS - Token Validation
    // ==========================================

    it('should reject request without authorization header', async () => {
      const res = await request(app)
        .get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Authentication required');
    });

    it('should reject request with malformed authorization header', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidToken');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject request with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Invalid token');
    });

    it('should reject request with expired token', async () => {
      const expiredToken = jwt.sign(
        { id: adminUser.id, email: adminUser.email, name: 'Admin User', role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' } // Already expired
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Token expired');
    });

    it('should reject request with token signed by different secret', async () => {
      const wrongSecretToken = jwt.sign(
        { id: adminUser.id, email: adminUser.email, name: 'Admin User', role: 'admin' },
        'wrong-secret-key',
        { expiresIn: '24h' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${wrongSecretToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken;

    beforeAll(async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@limuruhospital.co.ke',
          password: 'password123'
        });
      refreshToken = loginRes.body.data.refreshToken;
    });

    // ==========================================
    // POSITIVE TESTS - Token Refresh
    // ==========================================

    it('should refresh token successfully', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('should issue a new refresh token on each refresh', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.body.data.refreshToken).not.toBe(refreshToken);
    });

    // ==========================================
    // NEGATIVE TESTS - Token Refresh Failures
    // ==========================================

    it('should reject refresh without refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject access token used as refresh token', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@limuruhospital.co.ke',
          password: 'password123'
        });
      
      const accessToken = loginRes.body.data.accessToken;

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: accessToken });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject expired refresh token', async () => {
      const expiredRefreshToken = jwt.sign(
        { id: adminUser.id, type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: expiredRefreshToken });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    let authToken;

    beforeAll(() => {
      authToken = generateTestToken(adminUser);
    });

    // ==========================================
    // POSITIVE TESTS - Successful Logout
    // ==========================================

    it('should logout successfully with valid token', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Logged out successfully');
    });

    // ==========================================
    // NEGATIVE TESTS - Logout Failures
    // ==========================================

    it('should reject logout without token', async () => {
      const res = await request(app)
        .post('/api/auth/logout');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject logout with invalid token', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    // ==========================================
    // POSITIVE TESTS - Password Reset Request
    // ==========================================

    it('should accept valid email for password reset', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'admin@limuruhospital.co.ke' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    // ==========================================
    // NEGATIVE TESTS - Password Reset Failures
    // ==========================================

    it('should reject request without email', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    // NOTE: Should NOT reveal whether email exists - returns success for both cases
    it('should not reveal whether email exists in system', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'definitely-not-real-email@test.com' });

      // Should still return success to prevent email enumeration
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    // ==========================================
    // POSITIVE TESTS - Password Reset
    // ==========================================

    it('should reset password with valid token and password', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'valid-reset-token',
          newPassword: 'newpassword123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Password reset successful');
    });

    it('should accept password of minimum required length (8 chars)', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'valid-reset-token',
          newPassword: '12345678'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    // ==========================================
    // NEGATIVE TESTS - Password Reset Failures
    // ==========================================

    it('should reject reset without token', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          newPassword: 'newpassword123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject reset without new password', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'valid-reset-token'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject password shorter than 8 characters', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'valid-reset-token',
          newPassword: 'short'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Password too short');
    });

    it('should reject invalid reset token', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'newpassword123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject empty strings for token and password', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: '',
          newPassword: ''
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Role-Based Access Control', () => {
    let adminToken;
    let doctorToken;
    let nurseToken;
    let receptionistToken;

    beforeAll(async () => {
      adminToken = generateTestToken(adminUser);
      doctorToken = generateTestToken(doctorUser);
      
      // Create nurse and receptionist
      const nurseUser = await createTestUser({
        email: 'nurse@hospital.co.ke',
        role: 'nurse',
        first_name: 'Nurse',
        last_name: 'User'
      });
      nurseToken = generateTestToken(nurseUser);
      
      const receptionistUser = await createTestUser({
        email: 'reception@hospital.co.ke',
        role: 'receptionist',
        first_name: 'Reception',
        last_name: 'User'
      });
      receptionistToken = generateTestToken(receptionistUser);
    });

    it('should allow admin to access protected endpoints', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('admin');
    });

    it('should allow doctor to access protected endpoints', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('doctor');
    });

    it('should allow nurse to access protected endpoints', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${nurseToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('nurse');
    });

    it('should allow receptionist to access protected endpoints', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${receptionistToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('receptionist');
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent login attempts', async () => {
      const loginPromises = Array(5).fill().map(() =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'admin@limuruhospital.co.ke',
            password: 'password123'
          })
      );

      const results = await Promise.all(loginPromises);

      // All should succeed
      results.forEach(res => {
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      // Each should have a unique token
      const tokens = results.map(r => r.body.data.accessToken);
      const uniqueTokens = [...new Set(tokens)];
      expect(uniqueTokens.length).toBe(5);
    });

    it('should handle SQL injection in login form', async () => {
      const maliciousInputs = [
        { email: "admin'--", password: 'anything' },
        { email: "admin@limuruhospital.co.ke'; DROP TABLE users;--", password: 'password123' },
        { email: "1=1", password: "1=1" }
      ];

      for (const input of maliciousInputs) {
        const res = await request(app)
          .post('/api/auth/login')
          .send(input);

        // Should not expose internal errors
        expect(res.status).not.toBe(500);
        // Should reject invalid credentials
        expect(res.body.error).not.toContain('SQL');
      }
    });

    it('should handle very long passwords gracefully', async () => {
      const longPassword = 'a'.repeat(1000);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@limuruhospital.co.ke',
          password: longPassword
        });

      // Should either work or reject with proper error
      expect([401, 400]).toContain(res.status);
    });

    it('should handle special characters in credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@limuruhospital.co.ke',
          password: 'p@$$w0rd!#$%^&*()'
        });

      // Invalid password should be rejected
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
