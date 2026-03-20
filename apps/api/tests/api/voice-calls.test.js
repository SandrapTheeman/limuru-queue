/**
 * Voice Calls API Tests
 * 
 * Tests for voice call initiation, answering, duration tracking,
 * and status transitions.
 */
const { describe, it, expect, beforeAll, afterAll } = require('vitest');
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const testPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hqs_test',
});

const createTestApp = () => {
  const app = express();
  app.use(express.json());

  const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: decoded.id, email: decoded.email, name: decoded.name, role: decoded.role };
      next();
    } catch (err) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
  };

  // Get all voice calls
  app.get('/api/voice/calls', authMiddleware, async (req, res) => {
    try {
      const result = await testPool.query(`
        SELECT * FROM voice_calls ORDER BY initiated_at DESC LIMIT 50
      `);
      res.json({ success: true, data: result.rows, total: result.rows.length });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Initiate call
  app.post('/api/voice/call', authMiddleware, async (req, res) => {
    try {
      const { callerId, callerName, recipientId, recipientName, callType = 'staff' } = req.body;

      if (!callerId || !recipientId) {
        return res.status(400).json({ success: false, error: 'Caller and recipient are required' });
      }

      const result = await testPool.query(`
        INSERT INTO voice_calls (caller_id, caller_name, recipient_id, recipient_name, call_type, status)
        VALUES ($1, $2, $3, $4, $5, 'initiated')
        RETURNING *
      `, [callerId, callerName || 'Unknown', recipientId, recipientName || 'Unknown', callType]);

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Accept call
  app.post('/api/voice/call/:id/accept', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await testPool.query(`
        UPDATE voice_calls SET status = 'answered', answered_at = NOW() WHERE id = $1 RETURNING *
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Call not found' });
      }
      res.json({ success: true, data: result.rows[0] });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Reject call
  app.post('/api/voice/call/:id/reject', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const result = await testPool.query(`
        UPDATE voice_calls SET status = 'rejected', ended_at = NOW() WHERE id = $1 RETURNING *
      `, [id]);

      res.json({ success: true, data: result.rows[0], reason: reason || 'declined' });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // End call
  app.post('/api/voice/call/:id/end', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await testPool.query(`
        UPDATE voice_calls 
        SET status = 'ended', ended_at = NOW(), 
            duration = EXTRACT(EPOCH FROM (NOW() - answered_at))::INTEGER
        WHERE id = $1 RETURNING *
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Call not found' });
      }
      res.json({ success: true, data: result.rows[0] });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Get active calls
  app.get('/api/voice/calls/active', authMiddleware, async (req, res) => {
    try {
      const result = await testPool.query(`
        SELECT * FROM voice_calls WHERE status IN ('initiated', 'answered') ORDER BY initiated_at DESC
      `);
      res.json({ success: true, data: result.rows, total: result.rows.length });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  return app;
};

const app = createTestApp();

async function createTestUser(role = 'receptionist') {
  const bcrypt = require('bcryptjs');
  const passwordHash = await bcrypt.hash('password123', 10);
  const result = await testPool.query(`
    INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
    VALUES ($1, $2, $3, $4, $5, 1)
    RETURNING id, email, first_name, last_name, role
  `, [`${role}_${Date.now()}@test.com`, passwordHash, role, 'User', role]);
  return result.rows[0];
}

function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.first_name, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
}

describe('Voice Calls API', () => {
  let doctorUser, nurseUser;
  let doctorToken, nurseToken;

  beforeAll(async () => {
    doctorUser = await createTestUser('doctor');
    doctorToken = generateToken(doctorUser);
    nurseUser = await createTestUser('nurse');
    nurseToken = generateToken(nurseUser);
  });

  afterAll(async () => {
    await testPool.query('DELETE FROM voice_calls');
    await testPool.query('DELETE FROM users WHERE email LIKE $1', ['%@test.com']);
    await testPool.end();
  });

  describe('POST /api/voice/call', () => {
    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should initiate call successfully', async () => {
      const res = await request(app)
        .post('/api/voice/call')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          callerId: doctorUser.id,
          callerName: 'Dr. Smith',
          recipientId: nurseUser.id,
          recipientName: 'Nurse Johnson',
          callType: 'staff'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('initiated');
      expect(res.body.data.call_type).toBe('staff');
    });

    it('should initiate call with default call type', async () => {
      const res = await request(app)
        .post('/api/voice/call')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          callerId: doctorUser.id,
          recipientId: nurseUser.id
        });

      expect(res.status).toBe(201);
      expect(res.body.data.call_type).toBe('staff');
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should reject missing caller', async () => {
      const res = await request(app)
        .post('/api/voice/call')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          recipientId: nurseUser.id
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Caller and recipient are required');
    });

    it('should reject missing recipient', async () => {
      const res = await request(app)
        .post('/api/voice/call')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          callerId: doctorUser.id
        });

      expect(res.status).toBe(400);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/voice/call')
        .send({
          callerId: doctorUser.id,
          recipientId: nurseUser.id
        });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/voice/call/:id/accept', () => {
    let callId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/voice/call')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          callerId: doctorUser.id,
          recipientId: nurseUser.id
        });
      callId = res.body.data.id;
    });

    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should accept call successfully', async () => {
      const res = await request(app)
        .post(`/api/voice/call/${callId}/accept`)
        .set('Authorization', `Bearer ${nurseToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('answered');
      expect(res.body.data.answered_at).toBeDefined();
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should return 404 for non-existent call', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .post(`/api/voice/call/${fakeId}/accept`)
        .set('Authorization', `Bearer ${nurseToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/voice/call/:id/reject', () => {
    let callId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/voice/call')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          callerId: doctorUser.id,
          recipientId: nurseUser.id
        });
      callId = res.body.data.id;
    });

    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should reject call successfully', async () => {
      const res = await request(app)
        .post(`/api/voice/call/${callId}/reject`)
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({ reason: 'Busy' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('rejected');
      expect(res.body.reason).toBe('Busy');
    });

    it('should reject call with default reason', async () => {
      const res = await request(app)
        .post(`/api/voice/call/${callId}/reject`)
        .set('Authorization', `Bearer ${nurseToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('rejected');
      expect(res.body.reason).toBe('declined');
    });
  });

  describe('POST /api/voice/call/:id/end', () => {
    let callId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/voice/call')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          callerId: doctorUser.id,
          recipientId: nurseUser.id
        });
      callId = res.body.data.id;

      // Accept the call first
      await request(app)
        .post(`/api/voice/call/${callId}/accept`)
        .set('Authorization', `Bearer ${nurseToken}`);
    });

    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should end call and calculate duration', async () => {
      const res = await request(app)
        .post(`/api/voice/call/${callId}/end`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ended');
      expect(res.body.data.ended_at).toBeDefined();
      expect(res.body.data.duration).toBeDefined();
      expect(typeof res.body.data.duration).toBe('number');
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should return 404 for non-existent call', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .post(`/api/voice/call/${fakeId}/end`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/voice/calls', () => {
    beforeAll(async () => {
      // Create test calls
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/voice/call')
          .set('Authorization', `Bearer ${doctorToken}`)
          .send({
            callerId: doctorUser.id,
            recipientId: nurseUser.id
          });
      }
    });

    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should list all voice calls', async () => {
      const res = await request(app)
        .get('/api/voice/calls')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/voice/calls');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/voice/calls/active', () => {
    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should get active calls', async () => {
      // Create an active call
      const createRes = await request(app)
        .post('/api/voice/call')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          callerId: doctorUser.id,
          recipientId: nurseUser.id
        });
      
      const callId = createRes.body.data.id;
      await request(app)
        .post(`/api/voice/call/${callId}/accept`)
        .set('Authorization', `Bearer ${nurseToken}`);

      const res = await request(app)
        .get('/api/voice/calls/active')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every(c => ['initiated', 'answered'].includes(c.status))).toBe(true);
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/voice/calls/active');

      expect(res.status).toBe(401);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent calls', async () => {
      const results = await Promise.all([
        request(app).post('/api/voice/call').set('Authorization', `Bearer ${doctorToken}`).send({ callerId: doctorUser.id, recipientId: nurseUser.id }),
        request(app).post('/api/voice/call').set('Authorization', `Bearer ${nurseToken}`).send({ callerId: nurseUser.id, recipientId: doctorUser.id })
      ]);

      results.forEach(res => {
        expect(res.status).toBe(201);
      });
    });

    it('should handle all call types', async () => {
      const callTypes = ['staff', 'patient', 'emergency'];

      for (const type of callTypes) {
        const res = await request(app)
          .post('/api/voice/call')
          .set('Authorization', `Bearer ${doctorToken}`)
          .send({
            callerId: doctorUser.id,
            recipientId: nurseUser.id,
            callType: type
          });

        expect(res.status).toBe(201);
      }
    });
  });
});
