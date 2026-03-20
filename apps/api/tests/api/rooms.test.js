/**
 * Rooms API Tests
 * 
 * Tests for room CRUD operations, active/inactive status, and availability.
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

  // Get all rooms
  app.get('/api/rooms', authMiddleware, async (req, res) => {
    try {
      const result = await testPool.query(`
        SELECT r.*, d.name as department_name
        FROM rooms r
        LEFT JOIN departments d ON r.department_id = d.id
        WHERE r.is_active = 1
        ORDER BY r.room_number
      `);
      res.json({ success: true, data: result.rows, total: result.rows.length });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Get room by ID
  app.get('/api/rooms/:id', authMiddleware, async (req, res) => {
    try {
      const result = await testPool.query(`
        SELECT r.*, d.name as department_name
        FROM rooms r
        LEFT JOIN departments d ON r.department_id = d.id
        WHERE r.id = $1
      `, [req.params.id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Room not found' });
      }
      res.json({ success: true, data: result.rows[0] });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Create room
  app.post('/api/rooms', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
      const { room_number, department_id, floor, capacity, room_type } = req.body;

      if (!room_number) {
        return res.status(400).json({ success: false, error: 'room_number is required' });
      }

      const result = await testPool.query(`
        INSERT INTO rooms (room_number, department_id, floor, capacity, room_type)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [room_number, department_id, floor, capacity || 1, room_type || 'consultation']);

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Update room
  app.patch('/api/rooms/:id', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const { room_number, department_id, floor, capacity, room_type } = req.body;

      const updates = [];
      const values = [];
      let paramCount = 1;

      if (room_number !== undefined) { updates.push(`room_number = $${paramCount++}`); values.push(room_number); }
      if (department_id !== undefined) { updates.push(`department_id = $${paramCount++}`); values.push(department_id); }
      if (floor !== undefined) { updates.push(`floor = $${paramCount++}`); values.push(floor); }
      if (capacity !== undefined) { updates.push(`capacity = $${paramCount++}`); values.push(capacity); }
      if (room_type !== undefined) { updates.push(`room_type = $${paramCount++}`); values.push(room_type); }

      if (updates.length === 0) {
        return res.status(400).json({ success: false, error: 'No updates provided' });
      }

      values.push(id);
      const query = `UPDATE rooms SET ${updates.join(', ')} WHERE id = $${paramCount} AND is_active = 1 RETURNING *`;
      const result = await testPool.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Room not found' });
      }
      res.json({ success: true, data: result.rows[0] });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Delete room (soft delete)
  app.delete('/api/rooms/:id', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
      const result = await testPool.query(`
        UPDATE rooms SET is_active = false WHERE id = $1 RETURNING *
      `, [req.params.id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Room not found' });
      }
      res.json({ success: true, message: 'Room deactivated' });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  return app;
};

const app = createTestApp();

async function createTestUser(role = 'admin') {
  const bcrypt = require('bcryptjs');
  const passwordHash = await bcrypt.hash('password123', 10);
  const result = await testPool.query(`
    INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
    VALUES ($1, $2, $3, $4, $5, 1)
    RETURNING id, email, first_name, last_name, role
  `, [`${role}_${Date.now()}@test.com`, passwordHash, role, 'User', role]);
  return result.rows[0];
}

async function createDepartment() {
  const result = await testPool.query(`
    INSERT INTO departments (name, code) VALUES ($1, $2) RETURNING *
  `, [`Dept ${Date.now()}`, `D${Date.now().toString().slice(-3)}`]);
  return result.rows[0];
}

function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.first_name, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
}

describe('Rooms API', () => {
  let adminUser, doctorUser;
  let adminToken, doctorToken;
  let department;

  beforeAll(async () => {
    adminUser = await createTestUser('admin');
    adminToken = generateToken(adminUser);
    doctorUser = await createTestUser('doctor');
    doctorToken = generateToken(doctorUser);
    department = await createDepartment();
  });

  afterAll(async () => {
    await testPool.query('DELETE FROM rooms');
    await testPool.query('DELETE FROM departments');
    await testPool.query('DELETE FROM users WHERE email LIKE $1', ['%@test.com']);
    await testPool.end();
  });

  describe('GET /api/rooms', () => {
    beforeAll(async () => {
      for (let i = 1; i <= 3; i++) {
        await request(app)
          .post('/api/rooms')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ room_number: `R${i}00`, department_id: department.id });
      }
    });

    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should list all active rooms', async () => {
      const res = await request(app)
        .get('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should not include inactive rooms', async () => {
      const res = await request(app)
        .get('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.body.data.every(r => r.is_active === 1 || r.is_active === true)).toBe(true);
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/rooms');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/rooms', () => {
    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should create room with minimal fields', async () => {
      const res = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ room_number: 'R101' });

      expect(res.status).toBe(201);
      expect(res.body.data.room_number).toBe('R101');
    });

    it('should create room with all fields', async () => {
      const res = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          room_number: 'R202',
          department_id: department.id,
          floor: 2,
          capacity: 2,
          room_type: 'examination'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.floor).toBe(2);
      expect(res.body.data.capacity).toBe(2);
      expect(res.body.data.room_type).toBe('examination');
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should reject missing room_number', async () => {
      const res = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ floor: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('room_number is required');
    });

    it('should reject doctor from creating rooms', async () => {
      const res = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ room_number: 'R303' });

      expect(res.status).toBe(403);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/rooms')
        .send({ room_number: 'R404' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/rooms/:id', () => {
    let roomId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ room_number: 'R500' });
      roomId = res.body.data.id;
    });

    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should get room by ID', async () => {
      const res = await request(app)
        .get(`/api/rooms/${roomId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(roomId);
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should return 404 for non-existent room', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/api/rooms/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/rooms/:id', () => {
    let roomId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ room_number: `R${Date.now().toString().slice(-3)}` });
      roomId = res.body.data.id;
    });

    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should update room number', async () => {
      const res = await request(app)
        .patch(`/api/rooms/${roomId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ room_number: 'R999' });

      expect(res.status).toBe(200);
      expect(res.body.data.room_number).toBe('R999');
    });

    it('should update multiple fields', async () => {
      const res = await request(app)
        .patch(`/api/rooms/${roomId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          floor: 3,
          capacity: 3,
          room_type: 'surgery'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.floor).toBe(3);
      expect(res.body.data.room_type).toBe('surgery');
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should reject no updates', async () => {
      const res = await request(app)
        .patch(`/api/rooms/${roomId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No updates provided');
    });

    it('should reject doctor from updating rooms', async () => {
      const res = await request(app)
        .patch(`/api/rooms/${roomId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ floor: 1 });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/rooms/:id', () => {
    let roomId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ room_number: `DEL${Date.now().toString().slice(-3)}` });
      roomId = res.body.data.id;
    });

    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should soft delete room', async () => {
      const res = await request(app)
        .delete(`/api/rooms/${roomId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Room deactivated');
    });

    it('should not appear in active rooms list', async () => {
      await request(app)
        .delete(`/api/rooms/${roomId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const res = await request(app)
        .get('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.body.data.find(r => r.id === roomId)).toBeUndefined();
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should return 404 for non-existent room', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .delete(`/api/rooms/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should reject doctor from deleting rooms', async () => {
      const res = await request(app)
        .delete(`/api/rooms/${roomId}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Edge Cases', () => {
    it('should handle various room types', async () => {
      const roomTypes = ['consultation', 'examination', 'surgery', 'emergency', 'waiting'];

      for (const type of roomTypes) {
        const res = await request(app)
          .post('/api/rooms')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ room_number: `R${type}`, room_type: type });

        expect(res.status).toBe(201);
        expect(res.body.data.room_type).toBe(type);
      }
    });

    it('should handle various floor numbers', async () => {
      const floors = [-1, 0, 1, 5, 10, 100];

      for (const floor of floors) {
        const res = await request(app)
          .post('/api/rooms')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ room_number: `F${floor}`, floor });

        expect(res.status).toBe(201);
      }
    });
  });
});
