/**
 * Appointments API Tests
 * 
 * Tests for appointment CRUD operations, patient search,
 * doctor availability, and date filtering.
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

  // Get all appointments
  app.get('/api/appointments', authMiddleware, async (req, res) => {
    try {
      const { status, date, doctor_id, patient_id } = req.query;
      let query = `
        SELECT a.*,
               (p.first_name || ' ' || p.last_name) as patient_name,
               (u.first_name || ' ' || u.last_name) as doctor_name,
               dept.name as department_name
        FROM appointments a
        LEFT JOIN patients p ON a.patient_id = p.id
        LEFT JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN users u ON d.user_id = u.id
        LEFT JOIN departments dept ON a.department_id = dept.id
        WHERE 1=1
      `;
      const values = [];
      let paramCount = 1;

      if (status) { query += ` AND a.status = $${paramCount++}`; values.push(status); }
      if (date) { query += ` AND a.appointment_date = $${paramCount++}`; values.push(date); }
      if (doctor_id) { query += ` AND a.doctor_id = $${paramCount++}`; values.push(doctor_id); }
      if (patient_id) { query += ` AND a.patient_id = $${paramCount++}`; values.push(patient_id); }

      query += ' ORDER BY a.appointment_date DESC LIMIT 100';
      const result = await testPool.query(query, values);
      res.json({ success: true, data: result.rows, total: result.rows.length });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Get appointment by ID
  app.get('/api/appointments/:id', authMiddleware, async (req, res) => {
    try {
      const result = await testPool.query(`
        SELECT a.*,
               (p.first_name || ' ' || p.last_name) as patient_name,
               (u.first_name || ' ' || u.last_name) as doctor_name
        FROM appointments a
        LEFT JOIN patients p ON a.patient_id = p.id
        LEFT JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN users u ON d.user_id = u.id
        WHERE a.id = $1
      `, [req.params.id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Appointment not found' });
      }
      res.json({ success: true, data: result.rows[0] });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Create appointment
  app.post('/api/appointments', authMiddleware, requireRole('admin', 'receptionist', 'doctor'), async (req, res) => {
    try {
      const { patient_id, doctor_id, department_id, appointment_date, appointment_time, notes } = req.body;

      if (!patient_id || !doctor_id || !department_id || !appointment_date || !appointment_time) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }

      const result = await testPool.query(`
        INSERT INTO appointments (patient_id, doctor_id, department_id, appointment_date, appointment_time, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [patient_id, doctor_id, department_id, appointment_date, appointment_time, notes]);

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Update appointment
  app.patch('/api/appointments/:id', authMiddleware, requireRole('admin', 'doctor'), async (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes, appointment_date, appointment_time } = req.body;

      const updates = ['updated_at = NOW()'];
      const values = [];
      let paramCount = 1;

      if (status) { updates.push(`status = $${paramCount++}`); values.push(status); }
      if (notes !== undefined) { updates.push(`notes = $${paramCount++}`); values.push(notes); }
      if (appointment_date) { updates.push(`appointment_date = $${paramCount++}`); values.push(appointment_date); }
      if (appointment_time) { updates.push(`appointment_time = $${paramCount++}`); values.push(appointment_time); }

      const query = `UPDATE appointments SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
      values.push(id);
      const result = await testPool.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Appointment not found' });
      }
      res.json({ success: true, data: result.rows[0] });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Cancel appointment
  app.delete('/api/appointments/:id', authMiddleware, requireRole('admin', 'receptionist'), async (req, res) => {
    try {
      const result = await testPool.query(`
        UPDATE appointments SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *
      `, [req.params.id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Appointment not found' });
      }
      res.json({ success: true, message: 'Appointment cancelled' });
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

async function createDepartment() {
  const result = await testPool.query(`
    INSERT INTO departments (name, code) VALUES ($1, $2) RETURNING *
  `, [`Dept ${Date.now()}`, `D${Date.now().toString().slice(-3)}`]);
  return result.rows[0];
}

async function createPatient() {
  const result = await testPool.query(`
    INSERT INTO patients (first_name, last_name, phone) VALUES ($1, $2, $3) RETURNING *
  `, ['Test', 'Patient', `+2547${Date.now().toString().slice(-7)}`]);
  return result.rows[0];
}

async function createDoctor(departmentId) {
  const user = await createTestUser('doctor');
  const result = await testPool.query(`
    INSERT INTO doctors (user_id, department_id, specialty, is_available) VALUES ($1, $2, $3, true) RETURNING *
  `, [user.id, departmentId, 'General']);
  return { ...result.rows[0], user };
}

function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.first_name, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
}

describe('Appointments API', () => {
  let adminUser, receptionistUser, doctorUser;
  let adminToken, receptionistToken, doctorToken;
  let department, patient, doctor;

  beforeAll(async () => {
    adminUser = await createTestUser('admin');
    adminToken = generateToken(adminUser);
    receptionistUser = await createTestUser('receptionist');
    receptionistToken = generateToken(receptionistUser);
    doctorUser = await createTestUser('doctor');
    doctorToken = generateToken(doctorUser);
    department = await createDepartment();
    patient = await createPatient();
    doctor = await createDoctor(department.id);
  });

  afterAll(async () => {
    await testPool.query('DELETE FROM appointments');
    await testPool.query('DELETE FROM doctors');
    await testPool.query('DELETE FROM patients');
    await testPool.query('DELETE FROM departments');
    await testPool.query('DELETE FROM users WHERE email LIKE $1', ['%@test.com']);
    await testPool.end();
  });

  describe('POST /api/appointments', () => {
    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should create appointment successfully', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          patient_id: patient.id,
          doctor_id: doctor.id,
          department_id: department.id,
          appointment_date: '2026-04-01',
          appointment_time: '09:00',
          notes: 'Regular checkup'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.patient_id).toBe(patient.id);
      expect(res.body.data.status).toBe('scheduled');
    });

    it('should create appointment with doctor token', async () => {
      const p = await createPatient();
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patient_id: p.id,
          doctor_id: doctor.id,
          department_id: department.id,
          appointment_date: '2026-04-02',
          appointment_time: '10:00'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should reject missing patient_id', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          doctor_id: doctor.id,
          department_id: department.id,
          appointment_date: '2026-04-01',
          appointment_time: '09:00'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing required fields');
    });

    it('should reject missing doctor_id', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          patient_id: patient.id,
          department_id: department.id,
          appointment_date: '2026-04-01',
          appointment_time: '09:00'
        });

      expect(res.status).toBe(400);
    });

    it('should reject missing department_id', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          patient_id: patient.id,
          doctor_id: doctor.id,
          appointment_date: '2026-04-01',
          appointment_time: '09:00'
        });

      expect(res.status).toBe(400);
    });

    it('should reject missing appointment_date', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          patient_id: patient.id,
          doctor_id: doctor.id,
          department_id: department.id,
          appointment_time: '09:00'
        });

      expect(res.status).toBe(400);
    });

    it('should reject missing appointment_time', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          patient_id: patient.id,
          doctor_id: doctor.id,
          department_id: department.id,
          appointment_date: '2026-04-01'
        });

      expect(res.status).toBe(400);
    });

    it('should reject unauthorized role (nurse cannot create)', async () => {
      const nurseUser = await createTestUser('nurse');
      const nurseToken = generateToken(nurseUser);

      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({
          patient_id: patient.id,
          doctor_id: doctor.id,
          department_id: department.id,
          appointment_date: '2026-04-01',
          appointment_time: '09:00'
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/appointments', () => {
    beforeAll(async () => {
      // Create test appointments
      for (let i = 0; i < 3; i++) {
        const p = await createPatient();
        await request(app)
          .post('/api/appointments')
          .set('Authorization', `Bearer ${receptionistToken}`)
          .send({
            patient_id: p.id,
            doctor_id: doctor.id,
            department_id: department.id,
            appointment_date: '2026-04-01',
            appointment_time: `${9 + i}:00`
          });
      }
    });

    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should list all appointments', async () => {
      const res = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter by status', async () => {
      const res = await request(app)
        .get('/api/appointments?status=scheduled')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every(a => a.status === 'scheduled')).toBe(true);
    });

    it('should filter by date', async () => {
      const res = await request(app)
        .get('/api/appointments?date=2026-04-01')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('should filter by doctor_id', async () => {
      const res = await request(app)
        .get(`/api/appointments?doctor_id=${doctor.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('should filter by patient_id', async () => {
      const res = await request(app)
        .get(`/api/appointments?patient_id=${patient.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/appointments');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/appointments/:id', () => {
    let appointmentId;

    beforeAll(async () => {
      const p = await createPatient();
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          patient_id: p.id,
          doctor_id: doctor.id,
          department_id: department.id,
          appointment_date: '2026-04-01',
          appointment_time: '11:00'
        });
      appointmentId = res.body.data.id;
    });

    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should get appointment by ID', async () => {
      const res = await request(app)
        .get(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(appointmentId);
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should return 404 for non-existent appointment', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/api/appointments/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/appointments/:id', () => {
    let appointmentId;

    beforeAll(async () => {
      const p = await createPatient();
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          patient_id: p.id,
          doctor_id: doctor.id,
          department_id: department.id,
          appointment_date: '2026-04-01',
          appointment_time: '12:00'
        });
      appointmentId = res.body.data.id;
    });

    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should update appointment status', async () => {
      const res = await request(app)
        .patch(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ status: 'confirmed' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('confirmed');
    });

    it('should update appointment notes', async () => {
      const res = await request(app)
        .patch(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ notes: 'Updated notes' });

      expect(res.status).toBe(200);
      expect(res.body.data.notes).toBe('Updated notes');
    });

    it('should reschedule appointment', async () => {
      const res = await request(app)
        .patch(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          appointment_date: '2026-04-05',
          appointment_time: '14:00'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.appointment_date).toBe('2026-04-05');
      expect(res.body.data.appointment_time).toBe('14:00');
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should reject unauthorized role (receptionist cannot update)', async () => {
      const res = await request(app)
        .patch(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({ status: 'completed' });

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent appointment', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .patch(`/api/appointments/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'confirmed' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/appointments/:id', () => {
    let appointmentId;

    beforeEach(async () => {
      const p = await createPatient();
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          patient_id: p.id,
          doctor_id: doctor.id,
          department_id: department.id,
          appointment_date: '2026-04-01',
          appointment_time: '15:00'
        });
      appointmentId = res.body.data.id;
    });

    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should cancel appointment successfully', async () => {
      const res = await request(app)
        .delete(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${receptionistToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Appointment cancelled');
    });

    it('should allow admin to cancel appointment', async () => {
      const res = await request(app)
        .delete(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should reject unauthorized role (doctor cannot cancel)', async () => {
      const res = await request(app)
        .delete(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent appointment', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .delete(`/api/appointments/${fakeId}`)
        .set('Authorization', `Bearer ${receptionistToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('Edge Cases', () => {
    it('should handle appointment in the past', async () => {
      const p = await createPatient();
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          patient_id: p.id,
          doctor_id: doctor.id,
          department_id: department.id,
          appointment_date: '2020-01-01',
          appointment_time: '09:00'
        });

      expect(res.status).toBe(201);
    });

    it('should handle various time formats', async () => {
      const times = ['09:00', '9:00', '09:30', '14:45', '8:30 AM', '3:00 PM'];

      for (const time of times) {
        const p = await createPatient();
        const res = await request(app)
          .post('/api/appointments')
          .set('Authorization', `Bearer ${receptionistToken}`)
          .send({
            patient_id: p.id,
            doctor_id: doctor.id,
            department_id: department.id,
            appointment_date: '2026-05-01',
            appointment_time: time
          });

        expect(res.status).toBe(201);
      }
    });
  });
});
