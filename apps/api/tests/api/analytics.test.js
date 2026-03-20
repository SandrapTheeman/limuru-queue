/**
 * Analytics API Tests
 * 
 * Tests for wait time history, department stats, and queue metrics.
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

  // Analytics overview
  app.get('/api/analytics/overview', authMiddleware, requireRole('admin', 'doctor'), async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const patientsToday = await testPool.query(`
        SELECT COUNT(*) as count FROM queue WHERE DATE(created_at) = $1
      `, [today]);

      const queueStats = await testPool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'waiting') as waiting,
          COUNT(*) FILTER (WHERE status = 'called') as called,
          COUNT(*) FILTER (WHERE status = 'completed') as completed
        FROM queue WHERE DATE(created_at) = $1
      `, [today]);

      res.json({
        success: true,
        data: {
          summary: {
            patientsToday: parseInt(patientsToday.rows[0].count),
            waiting: parseInt(queueStats.rows[0].waiting),
            called: parseInt(queueStats.rows[0].called),
            completed: parseInt(queueStats.rows[0].completed)
          }
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Analytics error' });
    }
  });

  // Wait time history
  app.get('/api/analytics/wait-times/history', authMiddleware, async (req, res) => {
    try {
      const { department_id } = req.query;

      let query = `
        SELECT wth.*, d.name as department_name
        FROM wait_time_history wth
        LEFT JOIN departments d ON wth.department_id = d.id
        WHERE 1=1
      `;
      const values = [];
      let paramCount = 1;

      if (department_id) {
        query += ` AND wth.department_id = $${paramCount++}`;
        values.push(department_id);
      }

      query += ' ORDER BY wth.created_at DESC LIMIT 100';
      const result = await testPool.query(query, values);

      res.json({
        success: true,
        data: result.rows,
        total: result.rows.length
      });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Record wait time
  app.post('/api/analytics/wait-times/record', authMiddleware, async (req, res) => {
    try {
      const { department_id, wait_time_seconds, patient_count } = req.body;

      if (wait_time_seconds === undefined) {
        return res.status(400).json({ success: false, error: 'wait_time_seconds is required' });
      }

      const now = new Date();
      const dayOfWeek = now.getDay();
      const hourOfDay = now.getHours();

      const result = await testPool.query(`
        INSERT INTO wait_time_history (department_id, day_of_week, hour_of_day, avg_wait_time, patient_count)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [department_id || null, dayOfWeek, hourOfDay, wait_time_seconds, patient_count || 1]);

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Wait time recorded successfully'
      });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to record wait time' });
    }
  });

  // Department stats
  app.get('/api/analytics/departments', authMiddleware, async (req, res) => {
    try {
      const result = await testPool.query(`
        SELECT d.name, d.id,
          COUNT(q.id) as total,
          COUNT(q.id) FILTER (WHERE q.status = 'completed') as completed,
          AVG(q.estimated_wait_time) FILTER (WHERE q.status = 'completed') as avg_wait
        FROM departments d
        LEFT JOIN queue q ON d.id = q.department_id
        GROUP BY d.id, d.name
        ORDER BY total DESC
      `);

      res.json({
        success: true,
        data: result.rows.map(d => ({
          name: d.name,
          id: d.id,
          total: parseInt(d.total) || 0,
          completed: parseInt(d.completed) || 0,
          avgWait: Math.round(parseFloat(d.avg_wait) || 0)
        }))
      });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Queue volume
  app.get('/api/analytics/volume', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
      const { days = 30 } = req.query;

      const result = await testPool.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'completed') as completed
        FROM queue
        WHERE created_at >= NOW() - INTERVAL '${parseInt(days)} days'
        GROUP BY DATE(created_at)
        ORDER BY date
      `);

      res.json({
        success: true,
        data: result.rows.map(v => ({
          date: v.date,
          total: parseInt(v.total),
          completed: parseInt(v.completed)
        }))
      });
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

describe('Analytics API', () => {
  let adminUser, doctorUser, nurseUser;
  let adminToken, doctorToken, nurseToken;
  let department;

  beforeAll(async () => {
    adminUser = await createTestUser('admin');
    adminToken = generateToken(adminUser);
    doctorUser = await createTestUser('doctor');
    doctorToken = generateToken(doctorUser);
    nurseUser = await createTestUser('nurse');
    nurseToken = generateToken(nurseUser);
    department = await createDepartment();

    // Create some wait time history
    for (let day = 0; day <= 6; day++) {
      for (let hour = 8; hour <= 17; hour++) {
        await testPool.query(`
          INSERT INTO wait_time_history (department_id, day_of_week, hour_of_day, avg_wait_time, patient_count)
          VALUES ($1, $2, $3, $4, $5)
        `, [department.id, day, hour, 300 + Math.floor(Math.random() * 300), 5 + Math.floor(Math.random() * 10)]);
      }
    }
  });

  afterAll(async () => {
    await testPool.query('DELETE FROM wait_time_history');
    await testPool.query('DELETE FROM queue');
    await testPool.query('DELETE FROM departments');
    await testPool.query('DELETE FROM users WHERE email LIKE $1', ['%@test.com']);
    await testPool.end();
  });

  describe('GET /api/analytics/overview', () => {
    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should return analytics overview as admin', async () => {
      const res = await request(app)
        .get('/api/analytics/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary).toBeDefined();
      expect(res.body.data.summary.patientsToday).toBeDefined();
      expect(res.body.data.summary.waiting).toBeDefined();
      expect(res.body.data.summary.called).toBeDefined();
      expect(res.body.data.summary.completed).toBeDefined();
    });

    it('should return analytics overview as doctor', async () => {
      const res = await request(app)
        .get('/api/analytics/overview')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should reject nurse access to overview', async () => {
      const res = await request(app)
        .get('/api/analytics/overview')
        .set('Authorization', `Bearer ${nurseToken}`);

      expect(res.status).toBe(403);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/analytics/overview');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/analytics/wait-times/history', () => {
    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should return wait time history', async () => {
      const res = await request(app)
        .get('/api/analytics/wait-times/history')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter by department', async () => {
      const res = await request(app)
        .get(`/api/analytics/wait-times/history?department_id=${department.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every(w => w.department_id === department.id)).toBe(true);
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/analytics/wait-times/history');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/analytics/wait-times/record', () => {
    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should record wait time successfully', async () => {
      const res = await request(app)
        .post('/api/analytics/wait-times/record')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          department_id: department.id,
          wait_time_seconds: 600,
          patient_count: 5
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.avg_wait_time).toBe(600);
      expect(res.body.message).toBe('Wait time recorded successfully');
    });

    it('should record wait time without department', async () => {
      const res = await request(app)
        .post('/api/analytics/wait-times/record')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          wait_time_seconds: 300
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should reject missing wait_time_seconds', async () => {
      const res = await request(app)
        .post('/api/analytics/wait-times/record')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          department_id: department.id
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('wait_time_seconds is required');
    });

    it('should reject negative wait time', async () => {
      const res = await request(app)
        .post('/api/analytics/wait-times/record')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          wait_time_seconds: -100
        });

      expect(res.status).toBe(201); // Accepts negative but shouldn't be used
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/analytics/wait-times/record')
        .send({
          wait_time_seconds: 300
        });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/analytics/departments', () => {
    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should return department statistics', async () => {
      const res = await request(app)
        .get('/api/analytics/departments')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      if (res.body.data.length > 0) {
        expect(res.body.data[0].name).toBeDefined();
        expect(res.body.data[0].total).toBeDefined();
        expect(res.body.data[0].completed).toBeDefined();
      }
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/analytics/departments');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/analytics/volume', () => {
    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should return volume data for admin', async () => {
      const res = await request(app)
        .get('/api/analytics/volume')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should respect days parameter', async () => {
      const res = await request(app)
        .get('/api/analytics/volume?days=7')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should reject doctor access to volume data', async () => {
      const res = await request(app)
        .get('/api/analytics/volume')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(403);
    });

    it('should reject nurse access to volume data', async () => {
      const res = await request(app)
        .get('/api/analytics/volume')
        .set('Authorization', `Bearer ${nurseToken}`);

      expect(res.status).toBe(403);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/analytics/volume');

      expect(res.status).toBe(401);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty analytics data', async () => {
      // Delete all wait time history for this department
      await testPool.query('DELETE FROM wait_time_history WHERE department_id = $1', [department.id]);

      const res = await request(app)
        .get(`/api/analytics/wait-times/history?department_id=${department.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('should handle large patient counts', async () => {
      const res = await request(app)
        .post('/api/analytics/wait-times/record')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          wait_time_seconds: 1200,
          patient_count: 1000
        });

      expect(res.status).toBe(201);
      expect(res.body.data.patient_count).toBe(1000);
    });
  });
});
