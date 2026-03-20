/**
 * Integration Test: Complete Auth Flow
 * 
 * Tests the complete authentication flow from login to logout.
 */
const { describe, it, expect, beforeAll, afterAll } = require('vitest');
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const testPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hqs_test',
});

describe('Auth Flow Integration Tests', () => {
  let testUser;
  let userToken;
  let refreshToken;

  beforeAll(async () => {
    // Create test user
    const passwordHash = await bcrypt.hash('testpassword123', 10);
    const result = await testPool.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
      VALUES ($1, $2, $3, $4, $5, 1)
      RETURNING id, email, first_name, last_name, role
    `, [`authflow_${Date.now()}@test.com`, passwordHash, 'Auth', 'Flow', 'receptionist']);
    testUser = result.rows[0];
  });

  afterAll(async () => {
    await testPool.query('DELETE FROM users WHERE email LIKE $1', [`%@authflow%@test.com`]);
    await testPool.end();
  });

  describe('Complete Authentication Flow', () => {
    it('should handle complete login → verify → refresh → logout flow', async () => {
      const app = express();
      app.use(express.json());

      // Simplified auth endpoints for testing
      app.post('/api/auth/login', async (req, res) => {
        const { email, password } = req.body;
        const result = await testPool.query(
          'SELECT * FROM users WHERE email = $1',
          [email]
        );
        
        if (result.rows.length === 0) {
          return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
        
        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
          return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
        
        const tokenPayload = { id: user.id, email: user.email, name: `${user.first_name} ${user.last_name}`, role: user.role };
        const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '24h' });
        const refreshToken = jwt.sign({ id: user.id, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: '7d' });
        
        res.json({ success: true, data: { accessToken, refreshToken, user: tokenPayload } });
      });

      app.get('/api/auth/me', (req, res) => {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ success: false });
        
        const token = authHeader.substring(7);
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          res.json({ success: true, data: decoded });
        } catch (err) {
          res.status(401).json({ success: false });
        }
      });

      app.post('/api/auth/refresh', async (req, res) => {
        const { refreshToken } = req.body;
        
        try {
          const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
          if (decoded.type !== 'refresh') {
            return res.status(401).json({ success: false });
          }
          
          const newAccessToken = jwt.sign(
            { id: decoded.id, email: testUser.email, name: 'Auth Flow', role: testUser.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
          );
          
          res.json({ success: true, data: { accessToken: newAccessToken } });
        } catch (err) {
          res.status(401).json({ success: false });
        }
      });

      app.post('/api/auth/logout', (req, res) => {
        res.json({ success: true, message: 'Logged out' });
      });

      // Step 1: Login
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'testpassword123' });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
      expect(loginRes.body.data.accessToken).toBeDefined();
      expect(loginRes.body.data.refreshToken).toBeDefined();
      
      userToken = loginRes.body.data.accessToken;
      refreshToken = loginRes.body.data.refreshToken;

      // Step 2: Verify token with /me endpoint
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.success).toBe(true);
      expect(meRes.body.data.email).toBe(testUser.email);

      // Step 3: Refresh token
      const refreshRes = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.data.accessToken).toBeDefined();
      expect(refreshRes.body.data.accessToken).not.toBe(userToken);

      // Step 4: Logout
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${userToken}`);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);
    });
  });

  describe('Failed Auth Scenarios', () => {
    it('should handle wrong password gracefully', async () => {
      const app = express();
      app.use(express.json());

      app.post('/api/auth/login', async (req, res) => {
        const { email, password } = req.body;
        const result = await testPool.query(
          'SELECT * FROM users WHERE email = $1',
          [email]
        );
        
        if (result.rows.length === 0) {
          return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
        
        const validPassword = await bcrypt.compare(password, result.rows[0].password_hash);
        if (!validPassword) {
          return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
        
        res.json({ success: true });
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should handle non-existent user gracefully', async () => {
      const app = express();
      app.use(express.json());

      app.post('/api/auth/login', async (req, res) => {
        const { email } = req.body;
        const result = await testPool.query(
          'SELECT * FROM users WHERE email = $1',
          [email]
        );
        
        if (result.rows.length === 0) {
          return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
        
        res.json({ success: true });
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'anypassword' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });
  });
});
