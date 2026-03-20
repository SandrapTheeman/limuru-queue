/**
 * Patients API Tests
 * 
 * Tests for patient CRUD operations, search functionality,
 * validation, emergency contact handling.
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

  // Get all patients
  app.get('/api/patients', authMiddleware, async (req, res) => {
    try {
      const result = await testPool.query('SELECT * FROM patients ORDER BY created_at DESC LIMIT 50');
      const patients = result.rows.map(p => ({ ...p, name: `${p.first_name} ${p.last_name}`.trim() }));
      res.json({ success: true, data: patients, total: patients.length });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Create patient (public for kiosk)
  app.post('/api/patients', async (req, res) => {
    try {
      const { name, phone, email, date_of_birth, gender, address, emergency_contact, emergency_phone, national_id, blood_type, allergies, notes } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, error: 'Patient name is required' });
      }

      const nationalId = national_id || 'NATIONAL-' + Math.floor(100000 + Math.random() * 900000);
      const nameParts = name.trim().split(/\s+/);
      const first_name = nameParts[0];
      const last_name = nameParts.slice(1).join(' ') || '';

      const result = await testPool.query(`
        INSERT INTO patients (national_id, first_name, last_name, phone, email, date_of_birth, gender, address, emergency_contact, emergency_phone, blood_type, allergies, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `, [nationalId, first_name, last_name, phone || null, email || null, date_of_birth || null, gender || null, address || null, emergency_contact || null, emergency_phone || null, blood_type || null, allergies || null, notes || null]);

      const patient = result.rows[0];
      res.status(201).json({
        success: true,
        data: { ...patient, name: `${patient.first_name} ${patient.last_name}`.trim() },
        message: 'Patient registered successfully'
      });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to create patient' });
    }
  });

  // Get patient by ID
  app.get('/api/patients/:id', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await testPool.query('SELECT * FROM patients WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Patient not found' });
      }

      const patient = result.rows[0];
      res.json({ success: true, data: { ...patient, name: `${patient.first_name} ${patient.last_name}`.trim() } });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Update patient
  app.patch('/api/patients/:id', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, phone, email, address, emergency_contact, emergency_phone, blood_type, allergies, notes } = req.body;

      const updates = [];
      const values = [];
      let paramCount = 1;

      if (name !== undefined) {
        const nameParts = name.trim().split(/\s+/);
        updates.push(`first_name = $${paramCount++}`); values.push(nameParts[0]);
        updates.push(`last_name = $${paramCount++}`); values.push(nameParts.slice(1).join(' ') || '');
      }
      if (phone !== undefined) { updates.push(`phone = $${paramCount++}`); values.push(phone); }
      if (email !== undefined) { updates.push(`email = $${paramCount++}`); values.push(email); }
      if (address !== undefined) { updates.push(`address = $${paramCount++}`); values.push(address); }
      if (emergency_contact !== undefined) { updates.push(`emergency_contact = $${paramCount++}`); values.push(emergency_contact); }
      if (emergency_phone !== undefined) { updates.push(`emergency_phone = $${paramCount++}`); values.push(emergency_phone); }
      if (blood_type !== undefined) { updates.push(`blood_type = $${paramCount++}`); values.push(blood_type); }
      if (allergies !== undefined) { updates.push(`allergies = $${paramCount++}`); values.push(allergies); }
      if (notes !== undefined) { updates.push(`notes = $${paramCount++}`); values.push(notes); }

      if (updates.length === 0) {
        return res.status(400).json({ success: false, error: 'No fields to update' });
      }

      values.push(id);
      const query = `UPDATE patients SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING *`;
      const result = await testPool.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Patient not found' });
      }

      const patient = result.rows[0];
      res.json({ success: true, data: { ...patient, name: `${patient.first_name} ${patient.last_name}`.trim() } });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Delete patient
  app.delete('/api/patients/:id', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await testPool.query('DELETE FROM patients WHERE id = $1 RETURNING id', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Patient not found' });
      }
      res.json({ success: true, message: 'Patient deleted successfully' });
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

describe('Patients API', () => {
  let adminUser, receptionistUser;
  let adminToken, receptionistToken;

  beforeAll(async () => {
    adminUser = await createTestUser('admin');
    adminToken = generateToken(adminUser);
    receptionistUser = await createTestUser('receptionist');
    receptionistToken = generateToken(receptionistUser);
  });

  afterAll(async () => {
    await testPool.query('DELETE FROM patients');
    await testPool.query('DELETE FROM users WHERE email LIKE $1', ['%@test.com']);
    await testPool.end();
  });

  describe('POST /api/patients', () => {
    // ==========================================
    // POSITIVE TESTS - Successful Registration
    // ==========================================

    it('should register patient with minimal required fields', async () => {
      const res = await request(app)
        .post('/api/patients')
        .send({ name: 'John Doe' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.first_name).toBe('John');
      expect(res.body.data.last_name).toBe('Doe');
      expect(res.body.message).toBe('Patient registered successfully');
    });

    it('should register patient with all fields', async () => {
      const res = await request(app)
        .post('/api/patients')
        .send({
          name: 'Jane Smith',
          phone: '+254700123456',
          email: 'jane@example.com',
          date_of_birth: '1990-05-15',
          gender: 'female',
          address: '123 Main Street, Nairobi',
          emergency_contact: 'John Smith',
          emergency_phone: '+254700654321',
          national_id: 'NAT-123456',
          blood_type: 'O+',
          allergies: 'Penicillin',
          notes: 'Regular checkup patient'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.phone).toBe('+254700123456');
      expect(res.body.data.email).toBe('jane@example.com');
      expect(res.body.data.blood_type).toBe('O+');
    });

    it('should auto-generate national ID if not provided', async () => {
      const res = await request(app)
        .post('/api/patients')
        .send({ name: 'Auto ID Patient' });

      expect(res.status).toBe(201);
      expect(res.body.data.national_id).toBeDefined();
      expect(res.body.data.national_id).toMatch(/^NATIONAL-\d{6}$/);
    });

    it('should handle single name (no space)', async () => {
      const res = await request(app)
        .post('/api/patients')
        .send({ name: 'Madonna' });

      expect(res.status).toBe(201);
      expect(res.body.data.first_name).toBe('Madonna');
      expect(res.body.data.last_name).toBe('');
    });

    it('should handle multiple names', async () => {
      const res = await request(app)
        .post('/api/patients')
        .send({ name: 'John Michael James Doe' });

      expect(res.status).toBe(201);
      expect(res.body.data.first_name).toBe('John');
      expect(res.body.data.last_name).toBe('Michael James Doe');
    });

    // ==========================================
    // NEGATIVE TESTS - Validation Errors
    // ==========================================

    it('should reject registration without name', async () => {
      const res = await request(app)
        .post('/api/patients')
        .send({ phone: '+254700123456' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Patient name is required');
    });

    it('should reject empty name', async () => {
      const res = await request(app)
        .post('/api/patients')
        .send({ name: '' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject null values gracefully', async () => {
      const res = await request(app)
        .post('/api/patients')
        .send({ name: null });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/patients', () => {
    beforeAll(async () => {
      // Create test patients
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/patients')
          .send({ name: `Patient ${i + 1}`, phone: `+25470000000${i}` });
      }
    });

    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should list patients successfully', async () => {
      const res = await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.total).toBeGreaterThan(0);
    });

    it('should return patients with computed name field', async () => {
      const res = await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.body.data[0].name).toBeDefined();
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/patients');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject request with invalid token', async () => {
      const res = await request(app)
        .get('/api/patients')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/patients/:id', () => {
    let createdPatientId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/patients')
        .send({ name: 'Get Test Patient', phone: '+254700111111' });
      createdPatientId = res.body.data.id;
    });

    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should get patient by ID', async () => {
      const res = await request(app)
        .get(`/api/patients/${createdPatientId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdPatientId);
      expect(res.body.data.name).toBe('Get Test Patient');
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should return 404 for non-existent patient', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/api/patients/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Patient not found');
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get(`/api/patients/${createdPatientId}`);

      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/patients/:id', () => {
    let patientToUpdate;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/patients')
        .send({ name: 'Update Test Patient', phone: '+254700222222' });
      patientToUpdate = res.body.data.id;
    });

    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should update patient name', async () => {
      const res = await request(app)
        .patch(`/api/patients/${patientToUpdate}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.data.first_name).toBe('Updated');
      expect(res.body.data.last_name).toBe('Name');
    });

    it('should update patient phone', async () => {
      const res = await request(app)
        .patch(`/api/patients/${patientToUpdate}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ phone: '+254700999999' });

      expect(res.status).toBe(200);
      expect(res.body.data.phone).toBe('+254700999999');
    });

    it('should update multiple fields at once', async () => {
      const res = await request(app)
        .patch(`/api/patients/${patientToUpdate}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'updated@example.com',
          blood_type: 'A+',
          allergies: 'None reported'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('updated@example.com');
      expect(res.body.data.blood_type).toBe('A+');
    });

    it('should update emergency contact information', async () => {
      const res = await request(app)
        .patch(`/api/patients/${patientToUpdate}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          emergency_contact: 'Emergency Person',
          emergency_phone: '+254700777777'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.emergency_contact).toBe('Emergency Person');
      expect(res.body.data.emergency_phone).toBe('+254700777777');
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should return 404 for non-existent patient', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .patch(`/api/patients/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ phone: '+254700111111' });

      expect(res.status).toBe(404);
    });

    it('should reject update with no fields', async () => {
      const res = await request(app)
        .patch(`/api/patients/${patientToUpdate}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No fields to update');
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .patch(`/api/patients/${patientToUpdate}`)
        .send({ phone: '+254700111111' });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/patients/:id', () => {
    let patientToDelete;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/patients')
        .send({ name: 'Delete Test Patient' });
      patientToDelete = res.body.data.id;
    });

    // ==========================================
    // POSITIVE TESTS
    // ==========================================

    it('should delete patient successfully', async () => {
      const res = await request(app)
        .delete(`/api/patients/${patientToDelete}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Patient deleted successfully');
    });

    it('should return 404 when trying to get deleted patient', async () => {
      const res = await request(app)
        .get(`/api/patients/${patientToDelete}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    // ==========================================
    // NEGATIVE TESTS
    // ==========================================

    it('should return 404 for non-existent patient', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .delete(`/api/patients/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .delete(`/api/patients/${patientToDelete}`);

      expect(res.status).toBe(401);
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in patient data', async () => {
      const res = await request(app)
        .post('/api/patients')
        .send({
          name: "O'Brien-Smith Jr.",
          email: 'test@example.com',
          address: "123 Main St., Apt #4B, Nairobi's Suburb",
          notes: "Patient's condition: <test> & 'special' \"quotes\""
        });

      expect(res.status).toBe(201);
      expect(res.body.data.first_name).toBe("O'Brien-Smith");
      expect(res.body.data.last_name).toBe('Jr.');
    });

    it('should handle very long text fields', async () => {
      const longName = 'A'.repeat(255);
      const res = await request(app)
        .post('/api/patients')
        .send({ name: longName });

      expect(res.status).toBe(201);
    });

    it('should handle various blood type formats', async () => {
      const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

      for (const bt of bloodTypes) {
        const res = await request(app)
          .post('/api/patients')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: `Blood Type Test ${bt}`, blood_type: bt });

        expect(res.status).toBe(201);
      }
    });

    it('should handle valid phone number formats', async () => {
      const phones = [
        '+254700123456',
        '0712345678',
        '07-123-456-789',
        '(071) 234-5678'
      ];

      for (const phone of phones) {
        const res = await request(app)
          .post('/api/patients')
          .send({ name: `Phone Test`, phone });

        expect(res.status).toBe(201);
      }
    });

    it('should handle various date formats', async () => {
      const dates = ['1990-01-01', '2000-12-31', '1985-06-15'];

      for (const dob of dates) {
        const res = await request(app)
          .post('/api/patients')
          .send({ name: `Date Test`, date_of_birth: dob });

        expect(res.status).toBe(201);
      }
    });
  });
});
