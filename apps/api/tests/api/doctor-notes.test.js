/**
 * Doctor Notes (Clinical Notes) API Tests
 * 
 * Tests for SOAP notes, ICD-10 codes, templates, and history.
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

  // Get templates (public)
  app.get('/api/doctor-notes/templates', authMiddleware, requireRole('admin', 'doctor', 'nurse'), (req, res) => {
    const templates = [
      { id: 'checkup', name: 'General Check-up', category: 'General Medicine' },
      { id: 'hypertension', name: 'Hypertension Follow-up', category: 'Cardiology' },
      { id: 'uri', name: 'Upper Respiratory Infection', category: 'General Medicine' }
    ];
    res.json({ success: true, data: templates });
  });

  // List notes
  app.get('/api/doctor-notes', authMiddleware, requireRole('admin', 'doctor', 'nurse'), async (req, res) => {
    try {
      const { patient_id, limit = 50 } = req.query;
      let query = `
        SELECT cn.*,
               (u.first_name || ' ' || u.last_name) as doctor_name,
               (p.first_name || ' ' || p.last_name) as patient_name
        FROM clinical_notes cn
        LEFT JOIN users u ON cn.doctor_id = u.id
        LEFT JOIN patients p ON cn.patient_id = p.id
        WHERE 1=1
      `;
      const values = [];
      let paramIndex = 1;

      if (patient_id) {
        query += ` AND cn.patient_id = $${paramIndex++}`;
        values.push(patient_id);
      }

      query += ` ORDER BY cn.created_at DESC LIMIT $${paramIndex}`;
      values.push(limit);

      const result = await testPool.query(query, values);
      res.json({ success: true, data: result.rows, total: result.rows.length });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Get note by ID
  app.get('/api/doctor-notes/:id', authMiddleware, requireRole('admin', 'doctor', 'nurse'), async (req, res) => {
    try {
      const { id } = req.params;
      const noteResult = await testPool.query('SELECT * FROM clinical_notes WHERE id = $1', [id]);

      if (noteResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Note not found' });
      }

      const diagnoses = await testPool.query('SELECT * FROM diagnoses WHERE note_id = $1', [id]);
      const prescriptions = await testPool.query('SELECT * FROM prescriptions WHERE note_id = $1', [id]);

      res.json({
        success: true,
        data: { ...noteResult.rows[0], diagnoses: diagnoses.rows, prescriptions: prescriptions.rows }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Create note
  app.post('/api/doctor-notes', authMiddleware, requireRole('admin', 'doctor'), async (req, res) => {
    try {
      const { patient_id, subjective, objective, assessment, plan, status = 'draft', diagnoses = [], prescriptions = [] } = req.body;

      if (!patient_id) {
        return res.status(400).json({ success: false, error: 'patient_id is required' });
      }

      const noteResult = await testPool.query(`
        INSERT INTO clinical_notes (patient_id, doctor_id, doctor_name, subjective, objective, assessment, plan, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [patient_id, req.user.id, req.user.name, subjective || '', objective || '', assessment || '', plan || '', status]);

      const noteId = noteResult.rows[0].id;

      for (const dx of diagnoses) {
        await testPool.query(`
          INSERT INTO diagnoses (note_id, icd10_code, description, type)
          VALUES ($1, $2, $3, $4)
        `, [noteId, dx.code || '', dx.description || '', dx.type || 'primary']);
      }

      for (const rx of prescriptions) {
        await testPool.query(`
          INSERT INTO prescriptions (note_id, patient_id, doctor_id, medication, dosage, frequency, duration)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [noteId, patient_id, req.user.id, rx.medication, rx.dosage || '', rx.frequency || '', rx.duration || '']);
      }

      res.status(201).json({ success: true, data: noteResult.rows[0] });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Update note
  app.patch('/api/doctor-notes/:id', authMiddleware, requireRole('admin', 'doctor'), async (req, res) => {
    try {
      const { id } = req.params;
      const { subjective, objective, assessment, plan, status } = req.body;

      const existingNote = await testPool.query('SELECT * FROM clinical_notes WHERE id = $1', [id]);
      if (existingNote.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Note not found' });
      }

      if (req.user.role !== 'admin' && existingNote.rows[0].doctor_id !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Not authorized to edit this note' });
      }

      const updates = ['updated_at = NOW()'];
      const values = [];
      let paramCount = 1;

      if (subjective !== undefined) { updates.push(`subjective = $${paramCount++}`); values.push(subjective); }
      if (objective !== undefined) { updates.push(`objective = $${paramCount++}`); values.push(objective); }
      if (assessment !== undefined) { updates.push(`assessment = $${paramCount++}`); values.push(assessment); }
      if (plan !== undefined) { updates.push(`plan = $${paramCount++}`); values.push(plan); }
      if (status !== undefined) { updates.push(`status = $${paramCount++}`); values.push(status); }

      values.push(id);
      await testPool.query(`UPDATE clinical_notes SET ${updates.join(', ')} WHERE id = $${paramCount}`, values);

      const result = await testPool.query('SELECT * FROM clinical_notes WHERE id = $1', [id]);
      res.json({ success: true, data: result.rows[0] });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Delete note
  app.delete('/api/doctor-notes/:id', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const result = await testPool.query('DELETE FROM clinical_notes WHERE id = $1 RETURNING id', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Note not found' });
      }
      res.json({ success: true, message: 'Note deleted successfully' });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  return app;
};

const app = createTestApp();

async function createTestUser(role = 'doctor') {
  const bcrypt = require('bcryptjs');
  const passwordHash = await bcrypt.hash('password123', 10);
  const result = await testPool.query(`
    INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
    VALUES ($1, $2, $3, $4, $5, 1)
    RETURNING id, email, first_name, last_name, role
  `, [`${role}_${Date.now()}@test.com`, passwordHash, role, 'User', role]);
  return result.rows[0];
}

async function createPatient() {
  const result = await testPool.query(`
    INSERT INTO patients (first_name, last_name, phone) VALUES ($1, $2, $3) RETURNING *
  `, ['Test', 'Patient', `+2547${Date.now().toString().slice(-7)}`]);
  return result.rows[0];
}

function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.first_name, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
}

describe('Doctor Notes API', () => {
  let adminUser, doctorUser, nurseUser;
  let adminToken, doctorToken, nurseToken;
  let patient;

  beforeAll(async () => {
    adminUser = await createTestUser('admin');
    adminToken = generateToken(adminUser);
    doctorUser = await createTestUser('doctor');
    doctorToken = generateToken(doctorUser);
    nurseUser = await createTestUser('nurse');
    nurseToken = generateToken(nurseUser);
    patient = await createPatient();
  });

  afterAll(async () => {
    await testPool.query('DELETE FROM prescriptions');
    await testPool.query('DELETE FROM diagnoses');
    await testPool.query('DELETE FROM clinical_notes');
    await testPool.query('DELETE FROM patients');
    await testPool.query('DELETE FROM users WHERE email LIKE $1', ['%@test.com']);
    await testPool.end();
  });

  describe('GET /api/doctor-notes/templates', () => {
    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should return templates for doctor', async () => {
      const res = await request(app)
        .get('/api/doctor-notes/templates')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return templates for nurse', async () => {
      const res = await request(app)
        .get('/api/doctor-notes/templates')
        .set('Authorization', `Bearer ${nurseToken}`);

      expect(res.status).toBe(200);
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should reject receptionist access', async () => {
      const receptionistUser = await createTestUser('receptionist');
      const token = generateToken(receptionistUser);

      const res = await request(app)
        .get('/api/doctor-notes/templates')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/doctor-notes', () => {
    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should create SOAP note successfully', async () => {
      const res = await request(app)
        .post('/api/doctor-notes')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patient_id: patient.id,
          subjective: 'Patient reports headache for 3 days',
          objective: 'BP: 120/80, Temp: 37C',
          assessment: 'Tension headache',
          plan: 'Prescribe pain relief, follow up in 1 week'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.subjective).toBe('Patient reports headache for 3 days');
      expect(res.body.data.status).toBe('draft');
    });

    it('should create note with diagnoses', async () => {
      const res = await request(app)
        .post('/api/doctor-notes')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patient_id: patient.id,
          subjective: 'Follow-up visit',
          diagnoses: [
            { code: 'J06.9', description: 'Acute upper respiratory infection', type: 'primary' }
          ]
        });

      expect(res.status).toBe(201);
    });

    it('should create note with prescriptions', async () => {
      const res = await request(app)
        .post('/api/doctor-notes')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patient_id: patient.id,
          subjective: 'Patient needs medication',
          prescriptions: [
            { medication: 'Paracetamol', dosage: '500mg', frequency: '3 times daily', duration: '5 days' }
          ]
        });

      expect(res.status).toBe(201);
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should reject missing patient_id', async () => {
      const res = await request(app)
        .post('/api/doctor-notes')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          subjective: 'Test'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('patient_id is required');
    });

    it('should reject nurse from creating notes', async () => {
      const res = await request(app)
        .post('/api/doctor-notes')
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({
          patient_id: patient.id,
          subjective: 'Test'
        });

      expect(res.status).toBe(403);
    });

    it('should reject admin from creating notes', async () => {
      const res = await request(app)
        .post('/api/doctor-notes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patient_id: patient.id,
          subjective: 'Test'
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/doctor-notes', () => {
    beforeAll(async () => {
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/doctor-notes')
          .set('Authorization', `Bearer ${doctorToken}`)
          .send({ patient_id: patient.id, subjective: `Note ${i + 1}` });
      }
    });

    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should list all notes for doctor', async () => {
      const res = await request(app)
        .get('/api/doctor-notes')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter by patient_id', async () => {
      const res = await request(app)
        .get(`/api/doctor-notes?patient_id=${patient.id}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every(n => n.patient_id === patient.id)).toBe(true);
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should reject receptionist access', async () => {
      const receptionistUser = await createTestUser('receptionist');
      const token = generateToken(receptionistUser);

      const res = await request(app)
        .get('/api/doctor-notes')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/doctor-notes/:id', () => {
    let noteId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/doctor-notes')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patient_id: patient.id,
          subjective: 'Get test note',
          diagnoses: [{ code: 'A00', description: 'Test diagnosis' }]
        });
      noteId = res.body.data.id;
    });

    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should get note with diagnoses and prescriptions', async () => {
      const res = await request(app)
        .get(`/api/doctor-notes/${noteId}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.diagnoses).toBeDefined();
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should return 404 for non-existent note', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/api/doctor-notes/${fakeId}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/doctor-notes/:id', () => {
    let noteId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/doctor-notes')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patient_id: patient.id,
          subjective: 'Update test'
        });
      noteId = res.body.data.id;
    });

    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should update note status', async () => {
      const res = await request(app)
        .patch(`/api/doctor-notes/${noteId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ status: 'final' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('final');
    });

    it('should update SOAP sections', async () => {
      const res = await request(app)
        .patch(`/api/doctor-notes/${noteId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          subjective: 'Updated subjective',
          assessment: 'Updated assessment'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.subjective).toBe('Updated subjective');
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should not allow other doctor to edit note', async () => {
      const otherDoctor = await createTestUser('doctor');
      const otherToken = generateToken(otherDoctor);

      const res = await request(app)
        .patch(`/api/doctor-notes/${noteId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ status: 'final' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/doctor-notes/:id', () => {
    let noteId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/doctor-notes')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ patient_id: patient.id, subjective: 'Delete test' });
      noteId = res.body.data.id;
    });

    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should delete note as admin', async () => {
      const res = await request(app)
        .delete(`/api/doctor-notes/${noteId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Note deleted successfully');
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should reject doctor from deleting notes', async () => {
      const res = await request(app)
        .delete(`/api/doctor-notes/${noteId}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent note', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .delete(`/api/doctor-notes/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });
});
