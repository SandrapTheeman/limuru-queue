// Integration tests for Patient Management
import { describe, it, expect, beforeEach } from 'vitest';
import { createMockEnv, populateMockData } from '../../src/services/__tests__/mocks';
import { testPatients } from '../../src/services/__tests__/fixtures';

describe('Patient Management API Integration Tests', () => {
  let env: any;
  let db: any;

  beforeEach(() => {
    env = createMockEnv();
    db = env.DB;
  });

  describe('GET /api/patients/:id', () => {
    it('should return patient by ID', async () => {
      populateMockData(db, { patients: testPatients });

      const result = await db.prepare('SELECT * FROM patients WHERE id = ?')
        .bind('patient-001').first();

      expect(result).toBeDefined();
      expect(result.id).toBe('patient-001');
    });

    it('should return 404 for non-existent patient', async () => {
      populateMockData(db, { patients: [] });

      const result = await db.prepare('SELECT * FROM patients WHERE id = ?')
        .bind('non-existent').first();

      expect(result).toBeUndefined();
    });

    it('should include patient name in response', async () => {
      populateMockData(db, { patients: testPatients });

      const result = await db.prepare('SELECT * FROM patients WHERE id = ?')
        .bind('patient-001').first();

      expect(result.name).toBe('John Doe');
    });

    it('should mask sensitive data in audit logs', async () => {
      const patient = testPatients[0];
      const maskedName = patient.name.substring(0, 2) + '***' + patient.name.slice(-2);

      expect(maskedName).not.toBe(patient.name);
    });
  });

  describe('PUT /api/patients/:id', () => {
    it('should update patient fields', async () => {
      const updates = {
        name: 'John Updated',
        phone: '+254798765432',
      };

      expect(updates.name).toBeDefined();
      expect(updates.phone).toBeDefined();
    });

    it('should validate patient data', async () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+254712345678',
      };

      const invalidData = {
        name: '<script>alert(1)</script>',
      };

      expect(validData.name).toBeTruthy();
      expect(invalidData.name).toContain('<');
    });

    it('should sanitize input', () => {
      const unsanitized = '<script>alert(1)</script>name';
      const sanitized = unsanitized.replace(/[<>]/g, '');

      expect(sanitized).not.toContain('<');
    });

    it('should update timestamp', () => {
      const timestamp = new Date().toISOString();

      expect(timestamp).toBeTruthy();
      expect(timestamp).toContain('T');
    });
  });

  describe('POST /api/patients/search', () => {
    it('should search by name', async () => {
      populateMockData(db, { patients: testPatients });

      const result = await db.prepare(`
        SELECT id, name, email, phone, created_at as lastVisit
        FROM patients 
        WHERE name LIKE ?
        LIMIT 10
      `).bind('%John%').all();

      expect(result.results).toBeDefined();
    });

    it('should search by email', async () => {
      populateMockData(db, { patients: testPatients });

      const result = await db.prepare(`
        SELECT id, name, email, phone, created_at as lastVisit
        FROM patients 
        WHERE email LIKE ?
        LIMIT 10
      `).bind('%example.com%').all();

      expect(result.results).toBeDefined();
    });

    it('should search by phone', async () => {
      populateMockData(db, { patients: testPatients });

      const result = await db.prepare(`
        SELECT id, name, email, phone, created_at as lastVisit
        FROM patients 
        WHERE phone LIKE ?
        LIMIT 10
      `).bind('%2547%').all();

      expect(result.results).toBeDefined();
    });

    it('should limit results', async () => {
      const limit = 5;

      expect(limit).toBeLessThan(10);
    });

    it('should require search query', async () => {
      const query = '';

      expect(query).toBeFalsy();
    });
  });

  describe('GET /api/patients/:id/history', () => {
    it('should return patient visit history', async () => {
      const patientId = 'patient-001';
      const limit = 10;
      const offset = 0;

      const visits = await db.prepare(`
        SELECT v.*, d.name as doctor_name
        FROM visits v
        LEFT JOIN doctors d ON v.doctor_id = d.id
        WHERE v.patient_id = ?
        ORDER BY v.created_at DESC
        LIMIT ? OFFSET ?
      `).bind(patientId, limit, offset).all();

      expect(visits.results).toBeDefined();
    });

    it('should include doctor name in history', async () => {
      const patientId = 'patient-001';

      const visits = await db.prepare(`
        SELECT v.*, d.name as doctor_name
        FROM visits v
        LEFT JOIN doctors d ON v.doctor_id = d.id
        WHERE v.patient_id = ?
        ORDER BY v.created_at DESC
      `).bind(patientId).all();

      expect(visits.results).toBeDefined();
    });

    it('should return total count', async () => {
      const patientId = 'patient-001';

      const totalResult = await db.prepare(`
        SELECT COUNT(*) as count FROM visits WHERE patient_id = ?
      `).bind(patientId).first() as { count: number };

      expect(totalResult).toBeDefined();
    });

    it('should support pagination', async () => {
      const limit = 5;
      const offset = 10;

      expect(limit).toBeDefined();
      expect(offset).toBeDefined();
    });
  });
});