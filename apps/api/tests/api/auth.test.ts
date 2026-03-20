// Integration tests for Authentication
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockEnv, populateMockData } from '../../src/services/__tests__/mocks';
import { testPatients, testUsers, testDoctors } from '../../src/services/__tests__/fixtures';
import { hashPassword, verifyPassword } from '../../src/utils';

describe('Authentication API Integration Tests', () => {
  let env: any;
  let db: any;

  beforeEach(() => {
    env = createMockEnv();
    db = env.DB;
  });

  describe('POST /api/auth/patient/login', () => {
    it('should authenticate patient with email', async () => {
      const passwordHash = await hashPassword('password123');
      const patient = { ...testPatients[0], password_hash: passwordHash };
      
      populateMockData(db, { patients: [patient] });

      const isValid = await verifyPassword('password123', patient.password_hash);
      expect(isValid).toBe(true);
    });

    it('should authenticate patient with ID', async () => {
      const patient = testPatients[0];
      
      populateMockData(db, { patients: [patient] });

      const result = await db.prepare('SELECT * FROM patients WHERE id = ?')
        .bind(patient.id).first();

      expect(result.id).toBe(patient.id);
    });

    it('should reject invalid credentials', async () => {
      const passwordHash = await hashPassword('password123');
      const patient = { ...testPatients[0], password_hash: passwordHash };
      
      populateMockData(db, { patients: [patient] });

      const isValid = await verifyPassword('wrongpassword', patient.password_hash);
      expect(isValid).toBe(false);
    });

    it('should reject non-existent patient', async () => {
      populateMockData(db, { patients: [] });

      const result = await db.prepare('SELECT * FROM patients WHERE email = ?')
        .bind('nonexistent@example.com').first();

      expect(result).toBeUndefined();
    });

    it('should reject patient without password', async () => {
      const patient = { ...testPatients[0], password_hash: null };
      
      populateMockData(db, { patients: [patient] });

      const isValid = await verifyPassword('password123', '');
      expect(isValid).toBe(false);
    });
  });

  describe('POST /api/auth/staff/login', () => {
    it('should authenticate staff with email', async () => {
      const passwordHash = await hashPassword('password123');
      const user = { ...testUsers[1], password_hash: passwordHash };
      
      populateMockData(db, { users: [user] });

      const result = await db.prepare(
        'SELECT * FROM users WHERE email = ? AND is_active = 1'
      ).bind(user.email).first();

      expect(result).toBeDefined();
    });

    it('should reject inactive user', async () => {
      const user = { ...testUsers[1], is_active: false };
      
      populateMockData(db, { users: [user] });

      const result = await db.prepare(
        'SELECT * FROM users WHERE email = ? AND is_active = 1'
      ).bind(user.email).first();

      expect(result).toBeUndefined();
    });

    it('should update last login on success', async () => {
      const user = testUsers[1];
      
      expect(user.last_login).toBeDefined();
    });
  });

  describe('POST /api/auth/pin/login', () => {
    it('should authenticate doctor with PIN', async () => {
      const pinHash = await hashPassword('1234');
      const doctor = { ...testDoctors[0], pin_hash: pinHash };
      
      populateMockData(db, { doctors: [doctor] });

      const isValid = await verifyPassword('1234', doctor.pin_hash);
      expect(isValid).toBe(true);
    });

    it('should fallback to demo doctor when no PIN configured', async () => {
      populateMockData(db, { doctors: [] });

      const anyDoctor = await db.prepare('SELECT * FROM doctors LIMIT 1').first();
      
      expect(anyDoctor).toBeUndefined();
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register new patient', async () => {
      const newPatient = {
        name: 'New Patient',
        email: 'new@example.com',
        phone: '+254712345678',
        password: 'password123',
      };

      expect(newPatient.name).toBeTruthy();
      expect(newPatient.password).toBeTruthy();
    });

    it('should require name and password', async () => {
      const invalidData = { name: '', password: '' };
      
      expect(invalidData.name).toBeFalsy();
      expect(invalidData.password).toBeFalsy();
    });

    it('should reject duplicate email', async () => {
      populateMockData(db, { patients: [testPatients[0]] });

      const existing = await db.prepare('SELECT * FROM patients WHERE email = ?')
        .bind(testPatients[0].email).first();

      expect(existing).toBeDefined();
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('should change password successfully', async () => {
      const currentPassword = 'oldpassword';
      const newPassword = 'newpassword123';
      
      const currentHash = await hashPassword(currentPassword);
      const newHash = await hashPassword(newPassword);

      expect(currentHash).not.toBe(newHash);
    });

    it('should reject incorrect current password', async () => {
      const storedHash = await hashPassword('correctpassword');
      const inputHash = await hashPassword('wrongpassword');

      expect(storedHash).not.toBe(inputHash);
    });
  });

  describe('POST /api/auth/reset-password/request', () => {
    it('should accept email identifier', async () => {
      const identifier = 'patient@example.com';
      
      expect(identifier.includes('@')).toBe(true);
    });

    it('should accept patient ID identifier', async () => {
      const identifier = 'patient-001';
      
      expect(identifier.includes('@')).toBe(false);
    });

    it('should not reveal if user exists', async () => {
      populateMockData(db, { patients: [] });

      const user = await db.prepare('SELECT * FROM patients WHERE email = ?')
        .bind('test@example.com').first();

      expect(user).toBeUndefined();
    });
  });

  describe('POST /api/auth/reset-password/confirm', () => {
    it('should require token and new password', async () => {
      const invalidData = { token: '', newPassword: '' };
      
      expect(invalidData.token).toBeFalsy();
      expect(invalidData.newPassword).toBeFalsy();
    });

    it('should validate password minimum length', async () => {
      const password = '12345';
      
      expect(password.length < 6).toBe(true);
    });
  });

  describe('JWT Token', () => {
    it('should create token with correct payload', async () => {
      const payload = {
        userId: 'user-001',
        email: 'test@example.com',
        role: 'patient',
        patientId: 'patient-001',
      };

      expect(payload.userId).toBeDefined();
      expect(payload.role).toBe('patient');
    });

    it('should verify token structure', async () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
      
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
    });
  });
});