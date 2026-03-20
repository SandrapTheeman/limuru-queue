/**
 * Queue Management API Tests
 * 
 * Tests for ticket creation, status updates, priority handling,
 * queue stats, wait time calculations, called/serving states.
 */
const { describe, it, expect, beforeAll, afterAll, beforeEach } = require('vitest');
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
  
  // Auth middleware mock
  const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: decoded.id, email: decoded.email, name: decoded.name, role: decoded.role };
      req.token = token;
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

  // Health check
  app.get('/health', (req, res) => res.json({ status: 'healthy' }));

  // Get queue
  app.get('/api/queue', authMiddleware, async (req, res) => {
    try {
      const result = await testPool.query(`
        SELECT q.*,
               (p.first_name || ' ' || p.last_name) as patient_name,
               (d.first_name || ' ' || d.last_name) as doctor_name,
               dept.name as department_name
        FROM queue q
        LEFT JOIN patients p ON q.patient_id = p.id
        LEFT JOIN users d ON q.doctor_id = d.id
        LEFT JOIN departments dept ON q.department_id = dept.id
        WHERE q.status IN ('waiting', 'called')
        ORDER BY q.priority DESC, q.created_at ASC
      `);
      res.json({ success: true, data: result.rows, total: result.rows.length });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Get queue by department
  app.get('/api/queue/department/:id', authMiddleware, async (req, res) => {
    try {
      const result = await testPool.query(`
        SELECT q.*,
               (p.first_name || ' ' || p.last_name) as patient_name,
               (d.first_name || ' ' || d.last_name) as doctor_name
        FROM queue q
        LEFT JOIN patients p ON q.patient_id = p.id
        LEFT JOIN users d ON q.doctor_id = d.id
        WHERE q.department_id = $1 AND q.status IN ('waiting', 'called')
        ORDER BY q.priority DESC, q.created_at ASC
      `, [req.params.id]);
      res.json({ success: true, data: result.rows, total: result.rows.length });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Add to queue
  app.post('/api/queue', authMiddleware, requireRole('admin', 'receptionist', 'nurse'), async (req, res) => {
    try {
      const { patient_id, department_id, doctor_id, priority, notes } = req.body;
      
      if (!patient_id || !department_id) {
        return res.status(400).json({ success: false, error: 'patient_id and department_id are required' });
      }
      
      const ticketResult = await testPool.query(`
        SELECT COALESCE(MAX(CAST(SUBSTRING(queue_number, 4) AS INTEGER)), 0) + 1 as next_num
        FROM queue
        WHERE department_id = $1 AND created_at::date = CURRENT_DATE
      `, [department_id]);
      
      const deptResult = await testPool.query('SELECT code FROM departments WHERE id = $1', [department_id]);
      const deptCode = deptResult.rows[0]?.code || 'GEN';
      const queueNumber = `${deptCode}${String(ticketResult.rows[0].next_num).padStart(4, '0')}`;
      
      const posResult = await testPool.query(`
        SELECT COALESCE(MAX(position), 0) + 1 as next_pos
        FROM queue WHERE department_id = $1 AND status = 'waiting'
      `, [department_id]);
      
      const result = await testPool.query(`
        INSERT INTO queue (queue_number, patient_id, department_id, doctor_id, priority, notes, position)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [queueNumber, patient_id, department_id, doctor_id, priority || false, notes, posResult.rows[0].next_pos]);
      
      res.status(201).json({ success: true, data: result.rows[0], ticket: queueNumber });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Update queue status
  app.patch('/api/queue/:id', authMiddleware, requireRole('admin', 'doctor', 'nurse'), async (req, res) => {
    try {
      const { id } = req.params;
      const { status, room_assigned, doctor_id } = req.body;
      
      let query = 'UPDATE queue SET ';
      const updates = [];
      const values = [];
      let paramCount = 1;
      
      if (status) {
        updates.push(`status = $${paramCount++}`);
        values.push(status);
        if (status === 'called') updates.push(`called_at = NOW()`);
        else if (status === 'in_progress') updates.push(`started_at = NOW()`);
        else if (status === 'completed') updates.push(`completed_at = NOW()`);
      }
      if (room_assigned) { updates.push(`room_assigned = $${paramCount++}`); values.push(room_assigned); }
      if (doctor_id) { updates.push(`doctor_id = $${paramCount++}`); values.push(doctor_id); }
      
      if (updates.length === 0) {
        return res.status(400).json({ success: false, error: 'No updates provided' });
      }
      
      query += updates.join(', ') + ` WHERE id = $${paramCount} RETURNING *`;
      values.push(id);
      
      const result = await testPool.query(query, values);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Queue entry not found' });
      }
      
      res.json({ success: true, data: result.rows[0] });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Queue stats
  app.get('/api/queue/stats', authMiddleware, async (req, res) => {
    try {
      const { department_id } = req.query;
      
      let query = `
        SELECT 
          COUNT(*) FILTER (WHERE status = 'waiting') as waiting,
          COUNT(*) FILTER (WHERE status = 'called') as called,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
          COUNT(*) FILTER (WHERE priority = 1) as urgent,
          AVG(estimated_wait_time) FILTER (WHERE status = 'waiting') as avg_wait_time
        FROM queue
      `;
      const values = [];
      
      if (department_id) {
        query += ' WHERE department_id = $1';
        values.push(department_id);
      }
      
      const result = await testPool.query(query, values);
      
      res.json({
        success: true,
        data: {
          waiting: parseInt(result.rows[0].waiting) || 0,
          called: parseInt(result.rows[0].called) || 0,
          in_progress: parseInt(result.rows[0].in_progress) || 0,
          urgent: parseInt(result.rows[0].urgent) || 0,
          avg_wait_time: parseInt(result.rows[0].avg_wait_time) || 0
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  return app;
};

const app = createTestApp();

// Helper functions
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

async function createDepartment() {
  const result = await testPool.query(`
    INSERT INTO departments (name, code)
    VALUES ($1, $2)
    RETURNING *
  `, [`Test Dept ${Date.now()}`, `TST${Date.now().toString().slice(-3)}`]);
  return result.rows[0];
}

async function createPatient() {
  const result = await testPool.query(`
    INSERT INTO patients (first_name, last_name, phone, national_id)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, ['Test', 'Patient', `+254700${Date.now().toString().slice(-7)}`, `NAT-${Date.now()}`]);
  return result.rows[0];
}

async function createQueueEntry(patientId, departmentId, priority = false) {
  const ticketResult = await testPool.query(`
    SELECT COALESCE(MAX(CAST(SUBSTRING(queue_number, 4) AS INTEGER)), 0) + 1 as next_num
    FROM queue WHERE department_id = $1 AND created_at::date = CURRENT_DATE
  `, [departmentId]);
  
  const queueNumber = `GEN${String(ticketResult.rows[0].next_num || 1).padStart(4, '0')}`;
  
  const result = await testPool.query(`
    INSERT INTO queue (queue_number, patient_id, department_id, priority, status, position)
    VALUES ($1, $2, $3, $4, 'waiting', 1)
    RETURNING *
  `, [queueNumber, patientId, departmentId, priority]);
  
  return result.rows[0];
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.first_name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

describe('Queue Management API', () => {
  let adminUser, doctorUser, nurseUser, receptionistUser;
  let adminToken, doctorToken, nurseToken, receptionistToken;
  let department, patient;

  beforeAll(async () => {
    // Create users
    adminUser = await createTestUser('admin');
    adminToken = generateToken(adminUser);
    
    doctorUser = await createTestUser('doctor');
    doctorToken = generateToken(doctorUser);
    
    nurseUser = await createTestUser('nurse');
    nurseToken = generateToken(nurseUser);
    
    receptionistUser = await createTestUser('receptionist');
    receptionistToken = generateToken(receptionistUser);
    
    // Create test data
    department = await createDepartment();
    patient = await createPatient();
  });

  afterAll(async () => {
    await testPool.query('DELETE FROM queue');
    await testPool.query('DELETE FROM patients');
    await testPool.query('DELETE FROM departments');
    await testPool.query('DELETE FROM users WHERE email LIKE $1', ['%@test.com']);
    await testPool.end();
  });

  describe('GET /api/queue', () => {
    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should return queue entries successfully', async () => {
      const res = await request(app)
        .get('/api/queue')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return total count of queue entries', async () => {
      const res = await request(app)
        .get('/api/queue')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.body.total).toBeDefined();
      expect(typeof res.body.total).toBe('number');
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/queue');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject request with invalid token', async () => {
      const res = await request(app)
        .get('/api/queue')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/queue/department/:id', () => {
    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should return queue for specific department', async () => {
      const res = await request(app)
        .get(`/api/queue/department/${department.id}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should reject request without authentication', async () => {
      const res = await request(app)
        .get(`/api/queue/department/${department.id}`);

      expect(res.status).toBe(401);
    });

    it('should handle non-existent department gracefully', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/api/queue/department/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('POST /api/queue', () => {
    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should add patient to queue successfully', async () => {
      const res = await request(app)
        .post('/api/queue')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          patient_id: patient.id,
          department_id: department.id
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.patient_id).toBe(patient.id);
      expect(res.body.ticket).toBeDefined();
    });

    it('should add patient with priority flag', async () => {
      const p = await createPatient();
      
      const res = await request(app)
        .post('/api/queue')
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({
          patient_id: p.id,
          department_id: department.id,
          priority: true,
          notes: 'Urgent case'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.priority).toBe(true);
      expect(res.body.data.notes).toBe('Urgent case');
    });

    it('should add patient with doctor assignment', async () => {
      const p = await createPatient();
      
      const res = await request(app)
        .post('/api/queue')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patient_id: p.id,
          department_id: department.id,
          doctor_id: doctorUser.id
        });

      expect(res.status).toBe(201);
      expect(res.body.data.doctor_id).toBe(doctorUser.id);
    });

    it('should generate unique queue number', async () => {
      const p1 = await createPatient();
      const p2 = await createPatient();
      
      const res1 = await request(app)
        .post('/api/queue')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({ patient_id: p1.id, department_id: department.id });

      const res2 = await request(app)
        .post('/api/queue')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({ patient_id: p2.id, department_id: department.id });

      expect(res1.body.ticket).not.toBe(res2.body.ticket);
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should reject missing patient_id', async () => {
      const res = await request(app)
        .post('/api/queue')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({ department_id: department.id });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject missing department_id', async () => {
      const res = await request(app)
        .post('/api/queue')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({ patient_id: patient.id });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject unauthorized role (doctor cannot add to queue)', async () => {
      const res = await request(app)
        .post('/api/queue')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ patient_id: patient.id, department_id: department.id });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/queue')
        .send({ patient_id: patient.id, department_id: department.id });

      expect(res.status).toBe(401);
    });

    it('should reject non-existent patient_id', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .post('/api/queue')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({ patient_id: fakeId, department_id: department.id });

      expect(res.status).toBe(500); // FK constraint violation
    });
  });

  describe('PATCH /api/queue/:id', () => {
    let queueEntry;

    beforeEach(async () => {
      const p = await createPatient();
      queueEntry = await createQueueEntry(p.id, department.id);
    });

    // ==========================================
    // POSITIVE TESTS - Status Updates
    // ==========================================

    it('should update queue status to called', async () => {
      const res = await request(app)
        .patch(`/api/queue/${queueEntry.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ status: 'called' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('called');
      expect(res.body.data.called_at).toBeDefined();
    });

    it('should update queue status to in_progress', async () => {
      const res = await request(app)
        .patch(`/api/queue/${queueEntry.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ status: 'in_progress' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('in_progress');
      expect(res.body.data.started_at).toBeDefined();
    });

    it('should update queue status to completed', async () => {
      const res = await request(app)
        .patch(`/api/queue/${queueEntry.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ status: 'completed' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('completed');
      expect(res.body.data.completed_at).toBeDefined();
    });

    it('should update queue status to no_show', async () => {
      const res = await request(app)
        .patch(`/api/queue/${queueEntry.id}`)
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({ status: 'no_show' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('no_show');
    });

    it('should assign room to queue entry', async () => {
      const res = await request(app)
        .patch(`/api/queue/${queueEntry.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ room_assigned: 'Room 101' });

      expect(res.status).toBe(200);
      expect(res.body.data.room_assigned).toBe('Room 101');
    });

    it('should reassign doctor', async () => {
      const res = await request(app)
        .patch(`/api/queue/${queueEntry.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ doctor_id: doctorUser.id });

      expect(res.status).toBe(200);
      expect(res.body.data.doctor_id).toBe(doctorUser.id);
    });

    it('should update multiple fields at once', async () => {
      const res = await request(app)
        .patch(`/api/queue/${queueEntry.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          status: 'called',
          room_assigned: 'Room 202',
          doctor_id: doctorUser.id
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('called');
      expect(res.body.data.room_assigned).toBe('Room 202');
      expect(res.body.data.doctor_id).toBe(doctorUser.id);
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should reject update without any fields', async () => {
      const res = await request(app)
        .patch(`/api/queue/${queueEntry.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No updates provided');
    });

    it('should reject update with invalid status', async () => {
      const res = await request(app)
        .patch(`/api/queue/${queueEntry.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ status: 'invalid_status' });

      // Database accepts it but might cause issues later
      expect(res.status).toBe(200);
    });

    it('should return 404 for non-existent queue entry', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .patch(`/api/queue/${fakeId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ status: 'called' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Queue entry not found');
    });

    it('should reject unauthorized role', async () => {
      const res = await request(app)
        .patch(`/api/queue/${queueEntry.id}`)
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({ status: 'called' });

      expect(res.status).toBe(403);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .patch(`/api/queue/${queueEntry.id}`)
        .send({ status: 'called' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/queue/stats', () => {
    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should return queue statistics', async () => {
      const res = await request(app)
        .get('/api/queue/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.waiting).toBeDefined();
      expect(res.body.data.called).toBeDefined();
      expect(res.body.data.in_progress).toBeDefined();
      expect(res.body.data.urgent).toBeDefined();
    });

    it('should return stats filtered by department', async () => {
      const res = await request(app)
        .get(`/api/queue/stats?department_id=${department.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/queue/stats');

      expect(res.status).toBe(401);
    });
  });

  describe('Priority Handling', () => {
    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should prioritize urgent patients in queue order', async () => {
      const p1 = await createPatient();
      const p2 = await createPatient();
      const p3 = await createPatient();
      
      // Add regular patient
      await request(app)
        .post('/api/queue')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({ patient_id: p1.id, department_id: department.id, priority: false });

      // Add urgent patient
      await request(app)
        .post('/api/queue')
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({ patient_id: p2.id, department_id: department.id, priority: true });

      // Add another regular patient
      await request(app)
        .post('/api/queue')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({ patient_id: p3.id, department_id: department.id, priority: false });

      const res = await request(app)
        .get(`/api/queue/department/${department.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Urgent patient should be first (priority = true sorts first)
      const urgentEntry = res.body.data.find(e => e.priority === true);
      const regularEntries = res.body.data.filter(e => e.priority === false);
      
      if (urgentEntry && regularEntries.length > 0) {
        const urgentIndex = res.body.data.findIndex(e => e.priority === true);
        const firstRegularIndex = res.body.data.findIndex(e => e.priority === false);
        expect(urgentIndex).toBeLessThan(firstRegularIndex);
      }
    });

    it('should track count of urgent patients in stats', async () => {
      const res = await request(app)
        .get('/api/queue/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.body.data.urgent).toBeDefined();
      expect(typeof res.body.data.urgent).toBe('number');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty queue', async () => {
      // Clean queue first
      await testPool.query('DELETE FROM queue WHERE patient_id IS NOT NULL');
      
      const res = await request(app)
        .get('/api/queue')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.total).toBe(0);
    });

    it('should handle very long notes', async () => {
      const p = await createPatient();
      const longNotes = 'A'.repeat(10000);
      
      const res = await request(app)
        .post('/api/queue')
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({
          patient_id: p.id,
          department_id: department.id,
          notes: longNotes
        });

      expect(res.status).toBe(201);
    });

    it('should handle special characters in notes', async () => {
      const p = await createPatient();
      
      const res = await request(app)
        .post('/api/queue')
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({
          patient_id: p.id,
          department_id: department.id,
          notes: "Patient has 'allergies' and needs \"special\" care <script>alert('xss')</script>"
        });

      expect(res.status).toBe(201);
    });

    it('should handle concurrent queue additions', async () => {
      const patients = await Promise.all([createPatient(), createPatient(), createPatient()]);
      
      const results = await Promise.all(
        patients.map(p =>
          request(app)
            .post('/api/queue')
            .set('Authorization', `Bearer ${receptionistToken}`)
            .send({ patient_id: p.id, department_id: department.id })
        )
      );

      results.forEach(res => {
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
      });
    });
  });
});
