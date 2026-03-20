/**
 * Messages API Tests
 * 
 * Tests for sending messages, broadcasting, marking as read,
 * unread count, and message search.
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

  const requireRole = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    next();
  };

  // Get messages
  app.get('/api/messages', authMiddleware, async (req, res) => {
    try {
      const { limit = 50, unread } = req.query;
      let query = `
        SELECT m.*,
               (s.first_name || ' ' || s.last_name) as sender_name,
               (r.first_name || ' ' || r.last_name) as recipient_name
        FROM messages m
        LEFT JOIN users s ON m.sender_id = s.id
        LEFT JOIN users r ON m.recipient_id = r.id
        WHERE m.recipient_id = $1 OR m.recipient_type = 'broadcast'
      `;
      const values = [req.user.id];

      if (unread === 'true') {
        query += ` AND m.is_read = 0`;
      }
      query += ` ORDER BY m.created_at DESC LIMIT $2`;
      values.push(parseInt(limit));

      const result = await testPool.query(query, values);
      res.json({ success: true, data: result.rows, total: result.rows.length });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Get unread count
  app.get('/api/messages/unread-count', authMiddleware, async (req, res) => {
    try {
      const result = await testPool.query(`
        SELECT COUNT(*) as count FROM messages WHERE recipient_id = $1 AND is_read = 0
      `, [req.user.id]);
      res.json({ success: true, data: parseInt(result.rows[0].count) });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Get single message
  app.get('/api/messages/:id', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await testPool.query(`
        SELECT m.*,
               (s.first_name || ' ' || s.last_name) as sender_name
        FROM messages m
        LEFT JOIN users s ON m.sender_id = s.id
        WHERE m.id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Message not found' });
      }

      const msg = result.rows[0];
      if (msg.recipient_id !== req.user.id && msg.sender_id !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      res.json({ success: true, data: msg });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Send message
  app.post('/api/messages', authMiddleware, async (req, res) => {
    try {
      const { recipient_id, message, message_type = 'text', priority = 'normal' } = req.body;

      if (!message || message.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Message content is required' });
      }

      if (!recipient_id) {
        return res.status(400).json({ success: false, error: 'Recipient is required' });
      }

      const result = await testPool.query(`
        INSERT INTO messages (sender_id, recipient_id, message, message_type, priority, recipient_type)
        VALUES ($1, $2, $3, $4, $5, 'user')
        RETURNING *
      `, [req.user.id, recipient_id, message.trim(), message_type, priority]);

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Mark as read
  app.patch('/api/messages/:id/read', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await testPool.query(`
        UPDATE messages SET is_read = 1, read_at = NOW() WHERE id = $1 AND recipient_id = $2 RETURNING *
      `, [id, req.user.id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Message not found' });
      }
      res.json({ success: true, data: result.rows[0] });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Broadcast
  app.post('/api/messages/broadcast', authMiddleware, requireRole('admin', 'doctor', 'nurse'), async (req, res) => {
    try {
      const { message, priority = 'normal' } = req.body;

      if (!message) {
        return res.status(400).json({ success: false, error: 'Message content is required' });
      }

      const result = await testPool.query(`
        INSERT INTO messages (sender_id, recipient_id, message, message_type, priority, recipient_type)
        VALUES ($1, 'broadcast', $2, 'alert', $3, 'system')
        RETURNING *
      `, [req.user.id, message.trim(), priority]);

      res.status(201).json({ success: true, data: result.rows[0] });
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

describe('Messages API', () => {
  let adminUser, doctorUser, nurseUser, receptionistUser;
  let adminToken, doctorToken, nurseToken, receptionistToken;

  beforeAll(async () => {
    adminUser = await createTestUser('admin');
    adminToken = generateToken(adminUser);
    doctorUser = await createTestUser('doctor');
    doctorToken = generateToken(doctorUser);
    nurseUser = await createTestUser('nurse');
    nurseToken = generateToken(nurseUser);
    receptionistUser = await createTestUser('receptionist');
    receptionistToken = generateToken(receptionistUser);
  });

  afterAll(async () => {
    await testPool.query('DELETE FROM messages');
    await testPool.query('DELETE FROM users WHERE email LIKE $1', ['%@test.com']);
    await testPool.end();
  });

  describe('POST /api/messages', () => {
    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should send message successfully', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          recipient_id: doctorUser.id,
          message: 'Test message content'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sender_id).toBe(adminUser.id);
      expect(res.body.data.recipient_id).toBe(doctorUser.id);
      expect(res.body.data.message).toBe('Test message content');
    });

    it('should send message with custom type', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          recipient_id: nurseUser.id,
          message: 'Urgent message',
          message_type: 'urgent',
          priority: 'high'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.message_type).toBe('urgent');
      expect(res.body.data.priority).toBe('high');
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should reject empty message', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          recipient_id: doctorUser.id,
          message: ''
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Message content is required');
    });

    it('should reject whitespace-only message', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          recipient_id: doctorUser.id,
          message: '   '
        });

      expect(res.status).toBe(400);
    });

    it('should reject missing recipient', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          message: 'Test message'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Recipient is required');
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/messages')
        .send({
          recipient_id: doctorUser.id,
          message: 'Test'
        });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/messages', () => {
    beforeAll(async () => {
      // Create test messages
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/messages')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            recipient_id: doctorUser.id,
            message: `Message ${i + 1}`
          });
      }
    });

    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should get all messages for user', async () => {
      const res = await request(app)
        .get('/api/messages')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter unread messages', async () => {
      const res = await request(app)
        .get('/api/messages?unread=true')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every(m => m.is_read === 0 || m.is_read === false)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const res = await request(app)
        .get('/api/messages?limit=2')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/messages');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/messages/unread-count', () => {
    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should return unread count', async () => {
      const res = await request(app)
        .get('/api/messages/unread-count')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data).toBe('number');
      expect(res.body.data).toBeGreaterThanOrEqual(0);
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/messages/unread-count');

      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/messages/:id/read', () => {
    let messageId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          recipient_id: nurseUser.id,
          message: 'Mark as read test'
        });
      messageId = res.body.data.id;
    });

    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should mark message as read', async () => {
      const res = await request(app)
        .patch(`/api/messages/${messageId}/read`)
        .set('Authorization', `Bearer ${nurseToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.is_read).toBe(1);
      expect(res.body.data.read_at).toBeDefined();
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should return 404 for non-existent message', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .patch(`/api/messages/${fakeId}/read`)
        .set('Authorization', `Bearer ${nurseToken}`);

      expect(res.status).toBe(404);
    });

    it('should reject marking other users message as read', async () => {
      const res = await request(app)
        .patch(`/api/messages/${messageId}/read`)
        .set('Authorization', `Bearer ${receptionistToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/messages/broadcast', () => {
    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should broadcast message as admin', async () => {
      const res = await request(app)
        .post('/api/messages/broadcast')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          message: 'System-wide announcement',
          priority: 'high'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.recipient_type).toBe('system');
      expect(res.body.data.message_type).toBe('alert');
    });

    it('should broadcast message as doctor', async () => {
      const res = await request(app)
        .post('/api/messages/broadcast')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          message: 'Department announcement'
        });

      expect(res.status).toBe(201);
    });

    it('should broadcast message as nurse', async () => {
      const res = await request(app)
        .post('/api/messages/broadcast')
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({
          message: 'Ward announcement'
        });

      expect(res.status).toBe(201);
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should reject broadcast from receptionist', async () => {
      const res = await request(app)
        .post('/api/messages/broadcast')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          message: 'Unauthorized broadcast'
        });

      expect(res.status).toBe(403);
    });

    it('should reject empty broadcast message', async () => {
      const res = await request(app)
        .post('/api/messages/broadcast')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          message: ''
        });

      expect(res.status).toBe(400);
    });

    it('should reject unauthenticated broadcast', async () => {
      const res = await request(app)
        .post('/api/messages/broadcast')
        .send({
          message: 'Test'
        });

      expect(res.status).toBe(401);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long messages', async () => {
      const longMessage = 'A'.repeat(10000);
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          recipient_id: doctorUser.id,
          message: longMessage
        });

      expect(res.status).toBe(201);
    });

    it('should handle special characters in messages', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          recipient_id: doctorUser.id,
          message: "Message with 'quotes' and \"double quotes\" and <special> chars & symbols"
        });

      expect(res.status).toBe(201);
    });

    it('should handle concurrent message sends', async () => {
      const results = await Promise.all([
        request(app).post('/api/messages').set('Authorization', `Bearer ${adminToken}`).send({ recipient_id: doctorUser.id, message: 'Msg 1' }),
        request(app).post('/api/messages').set('Authorization', `Bearer ${adminToken}`).send({ recipient_id: doctorUser.id, message: 'Msg 2' }),
        request(app).post('/api/messages').set('Authorization', `Bearer ${adminToken}`).send({ recipient_id: doctorUser.id, message: 'Msg 3' })
      ]);

      results.forEach(res => {
        expect(res.status).toBe(201);
      });
    });
  });
});
