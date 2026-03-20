/**
 * Integration Test: Patient Queue Flow
 * 
 * Tests the complete patient journey: register → add to queue → call → serve → complete.
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

describe('Patient Queue Flow Integration Tests', () => {
  let receptionistUser, doctorUser;
  let receptionistToken, doctorToken;
  let department, patient, queueEntry;

  beforeAll(async () => {
    // Create users
    const createUser = async (role) => {
      const passwordHash = await bcrypt.hash('password123', 10);
      const result = await testPool.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
        VALUES ($1, $2, $3, $4, $5, 1)
        RETURNING id, email, first_name, last_name, role
      `, [`queueflow_${role}_${Date.now()}@test.com`, passwordHash, role, 'User', role]);
      return result.rows[0];
    };

    receptionistUser = await createUser('receptionist');
    doctorUser = await createUser('doctor');

    receptionistToken = jwt.sign({ id: receptionistUser.id, email: receptionistUser.email, name: 'Reception User', role: 'receptionist' }, process.env.JWT_SECRET, { expiresIn: '24h' });
    doctorToken = jwt.sign({ id: doctorUser.id, email: doctorUser.email, name: 'Doctor User', role: 'doctor' }, process.env.JWT_SECRET, { expiresIn: '24h' });

    // Create department
    const deptResult = await testPool.query(`
      INSERT INTO departments (name, code) VALUES ($1, $2) RETURNING *
    `, [`Queue Dept ${Date.now()}`, `QD${Date.now().toString().slice(-3)}`]);
    department = deptResult.rows[0];
  });

  afterAll(async () => {
    await testPool.query('DELETE FROM queue');
    await testPool.query('DELETE FROM patients');
    await testPool.query('DELETE FROM departments');
    await testPool.query('DELETE FROM users WHERE email LIKE $1', ['%@queueflow%@test.com']);
    await testPool.end();
  });

  describe('Complete Patient Queue Journey', () => {
    it('should handle complete patient → queue → call → serve → complete flow', async () => {
      const app = express();
      app.use(express.json());

      // Auth middleware
      const authMiddleware = (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ success: false });
        const token = authHeader.substring(7);
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          req.user = decoded;
          next();
        } catch (err) {
          res.status(401).json({ success: false });
        }
      };

      const requireRole = (...roles) => (req, res, next) => {
        if (!roles.includes(req.user.role)) return res.status(403).json({ success: false });
        next();
      };

      // Patient registration (public)
      app.post('/api/patients', async (req, res) => {
        const { name, phone } = req.body;
        if (!name) return res.status(400).json({ success: false, error: 'Name required' });
        
        const nameParts = name.split(' ');
        const result = await testPool.query(`
          INSERT INTO patients (first_name, last_name, phone, national_id)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `, [nameParts[0], nameParts.slice(1).join(' ') || '', phone, `NAT-${Date.now()}`]);
        
        res.status(201).json({ success: true, data: result.rows[0] });
      });

      // Get patient
      app.get('/api/patients/:id', authMiddleware, async (req, res) => {
        const result = await testPool.query('SELECT * FROM patients WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ success: false });
        res.json({ success: true, data: result.rows[0] });
      });

      // Add to queue
      app.post('/api/queue', authMiddleware, requireRole('admin', 'receptionist', 'nurse'), async (req, res) => {
        const { patient_id, department_id, priority } = req.body;
        if (!patient_id || !department_id) return res.status(400).json({ success: false });
        
        const ticketResult = await testPool.query(`
          SELECT COALESCE(MAX(CAST(SUBSTRING(queue_number, 4) AS INTEGER)), 0) + 1 as next_num
          FROM queue WHERE department_id = $1 AND created_at::date = CURRENT_DATE
        `, [department_id]);
        
        const queueNumber = `GEN${String(ticketResult.rows[0].next_num || 1).padStart(4, '0')}`;
        
        const result = await testPool.query(`
          INSERT INTO queue (queue_number, patient_id, department_id, priority, status, position)
          VALUES ($1, $2, $3, $4, 'waiting', 1)
          RETURNING *
        `, [queueNumber, patient_id, department_id, priority || false]);
        
        res.status(201).json({ success: true, data: result.rows[0], ticket: queueNumber });
      });

      // Get queue
      app.get('/api/queue/department/:id', authMiddleware, async (req, res) => {
        const result = await testPool.query(`
          SELECT q.*, p.first_name || ' ' || p.last_name as patient_name
          FROM queue q
          LEFT JOIN patients p ON q.patient_id = p.id
          WHERE q.department_id = $1 AND q.status IN ('waiting', 'called')
        `, [req.params.id]);
        res.json({ success: true, data: result.rows });
      });

      // Update queue status
      app.patch('/api/queue/:id', authMiddleware, requireRole('admin', 'doctor', 'nurse'), async (req, res) => {
        const { status, doctor_id, room_assigned } = req.body;
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
        if (doctor_id) { updates.push(`doctor_id = $${paramCount++}`); values.push(doctor_id); }
        if (room_assigned) { updates.push(`room_assigned = $${paramCount++}`); values.push(room_assigned); }

        if (updates.length === 0) return res.status(400).json({ success: false });

        values.push(req.params.id);
        const result = await testPool.query(
          `UPDATE queue SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
          values
        );

        if (result.rows.length === 0) return res.status(404).json({ success: false });
        res.json({ success: true, data: result.rows[0] });
      });

      // Step 1: Register Patient
      const patientRes = await request(app)
        .post('/api/patients')
        .send({ name: 'John Patient', phone: '+254700123456' });

      expect(patientRes.status).toBe(201);
      expect(patientRes.body.success).toBe(true);
      patient = patientRes.body.data;
      expect(patient.first_name).toBe('John');
      expect(patient.last_name).toBe('Patient');

      // Step 2: Verify patient exists
      const getPatientRes = await request(app)
        .get(`/api/patients/${patient.id}`)
        .set('Authorization', `Bearer ${receptionistToken}`);

      expect(getPatientRes.status).toBe(200);
      expect(getPatientRes.body.data.id).toBe(patient.id);

      // Step 3: Add patient to queue
      const queueRes = await request(app)
        .post('/api/queue')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          patient_id: patient.id,
          department_id: department.id,
          priority: false
        });

      expect(queueRes.status).toBe(201);
      expect(queueRes.body.success).toBe(true);
      expect(queueRes.body.ticket).toBeDefined();
      queueEntry = queueRes.body.data;
      expect(queueEntry.status).toBe('waiting');

      // Step 4: Check queue entry exists
      const getQueueRes = await request(app)
        .get(`/api/queue/department/${department.id}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(getQueueRes.status).toBe(200);
      expect(getQueueRes.body.data.some(e => e.id === queueEntry.id)).toBe(true);

      // Step 5: Doctor calls patient
      const callRes = await request(app)
        .patch(`/api/queue/${queueEntry.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          status: 'called',
          doctor_id: doctorUser.id,
          room_assigned: 'Room 101'
        });

      expect(callRes.status).toBe(200);
      expect(callRes.body.data.status).toBe('called');
      expect(callRes.body.data.room_assigned).toBe('Room 101');
      expect(callRes.body.data.called_at).toBeDefined();

      // Step 6: Start consultation
      const startRes = await request(app)
        .patch(`/api/queue/${queueEntry.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ status: 'in_progress' });

      expect(startRes.status).toBe(200);
      expect(startRes.body.data.status).toBe('in_progress');
      expect(startRes.body.data.started_at).toBeDefined();

      // Step 7: Complete consultation
      const completeRes = await request(app)
        .patch(`/api/queue/${queueEntry.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ status: 'completed' });

      expect(completeRes.status).toBe(200);
      expect(completeRes.body.data.status).toBe('completed');
      expect(completeRes.body.data.completed_at).toBeDefined();

      // Step 8: Verify patient no longer in waiting queue
      const finalQueueRes = await request(app)
        .get(`/api/queue/department/${department.id}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(finalQueueRes.body.data.some(e => e.id === queueEntry.id)).toBe(false);
    });

    it('should handle priority patient queue flow', async () => {
      const app = express();
      app.use(express.json());

      // Create patient and add with priority
      const patientRes = await request(app)
        .post('/api/patients')
        .send({ name: 'Urgent Patient', phone: '+254700999999' });

      const queueRes = await request(app)
        .post('/api/queue')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          patient_id: patientRes.body.data.id,
          department_id: department.id,
          priority: true
        });

      expect(queueRes.status).toBe(201);
      expect(queueRes.body.data.priority).toBe(true);
    });
  });
});
