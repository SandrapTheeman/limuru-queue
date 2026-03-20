// Unit tests for HIPAA Security Features
import { describe, it, expect, vi } from 'vitest';
import {
  checkRBAC,
  sanitizeInput,
  validatePatientData,
} from '../../security/hipaa';
import { UserRole } from '../../../types';

describe('HIPAA Security', () => {
  describe('checkRBAC', () => {
    it('should allow admin full access', () => {
      expect(checkRBAC('admin' as UserRole, 'patients', 'read')).toBe(true);
      expect(checkRBAC('admin' as UserRole, 'patients', 'create')).toBe(true);
      expect(checkRBAC('admin' as UserRole, 'patients', 'update')).toBe(true);
      expect(checkRBAC('admin' as UserRole, 'patients', 'delete')).toBe(true);
      expect(checkRBAC('admin' as UserRole, 'any_resource', 'any_action')).toBe(true);
    });

    it('should allow doctor specific permissions', () => {
      expect(checkRBAC('doctor' as UserRole, 'patients', 'read')).toBe(true);
      expect(checkRBAC('doctor' as UserRole, 'patients', 'update')).toBe(true);
      expect(checkRBAC('doctor' as UserRole, 'queue', 'call')).toBe(true);
      expect(checkRBAC('doctor' as UserRole, 'queue', 'start')).toBe(true);
      expect(checkRBAC('doctor' as UserRole, 'queue', 'complete')).toBe(true);
      expect(checkRBAC('doctor' as UserRole, 'admin_stats', 'read')).toBe(false);
    });

    it('should allow nurse specific permissions', () => {
      expect(checkRBAC('nurse' as UserRole, 'patients', 'read')).toBe(true);
      expect(checkRBAC('nurse' as UserRole, 'queue', 'call')).toBe(true);
      expect(checkRBAC('nurse' as UserRole, 'patients', 'create')).toBe(false);
      expect(checkRBAC('nurse' as UserRole, 'admin_stats', 'read')).toBe(false);
    });

    it('should allow receptionist specific permissions', () => {
      expect(checkRBAC('receptionist' as UserRole, 'patients', 'create')).toBe(true);
      expect(checkRBAC('receptionist' as UserRole, 'queue', 'create')).toBe(true);
      expect(checkRBAC('receptionist' as UserRole, 'queue', 'call')).toBe(true);
      expect(checkRBAC('receptionist' as UserRole, 'visits', 'delete')).toBe(false);
    });

    it('should allow patient limited access', () => {
      expect(checkRBAC('patient' as UserRole, 'own_profile', 'read')).toBe(true);
      expect(checkRBAC('patient' as UserRole, 'own_profile', 'update')).toBe(true);
      expect(checkRBAC('patient' as UserRole, 'own_visits', 'read')).toBe(true);
      expect(checkRBAC('patient' as UserRole, 'queue', 'read')).toBe(true);
      expect(checkRBAC('patient' as UserRole, 'patients', 'read')).toBe(false);
    });

    it('should deny unknown roles', () => {
      expect(checkRBAC('unknown' as UserRole, 'patients', 'read')).toBe(false);
    });

    it('should handle wildcard actions', () => {
      expect(checkRBAC('doctor' as UserRole, 'visits', 'read')).toBe(true);
      expect(checkRBAC('doctor' as UserRole, 'visits', 'create')).toBe(true);
      expect(checkRBAC('doctor' as UserRole, 'visits', 'update')).toBe(true);
    });
  });

  describe('sanitizeInput', () => {
    it('should remove angle brackets', () => {
      expect(sanitizeInput('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
    });

    it('should remove javascript: protocol', () => {
      expect(sanitizeInput('javascript:alert(1)')).toBe('alert(1)');
    });

    it('should remove event handlers', () => {
      expect(sanitizeInput('<img onerror="alert(1)" src=x>')).toBe('img src=x');
    });

    it('should trim whitespace', () => {
      expect(sanitizeInput('  test  ')).toBe('test');
    });

    it('should handle normal input', () => {
      expect(sanitizeInput('Normal text input')).toBe('Normal text input');
    });
  });

  describe('validatePatientData', () => {
    it('should validate valid data', () => {
      const result = validatePatientData({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+254712345678',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject name too long', () => {
      const result = validatePatientData({
        name: 'A'.repeat(201),
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Name too long');
    });

    it('should reject name with invalid characters', () => {
      const result = validatePatientData({
        name: '<script>alert(1)</script>',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid characters in name');
    });

    it('should reject invalid email format', () => {
      const result = validatePatientData({
        email: 'not-an-email',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should reject invalid phone format', () => {
      const result = validatePatientData({
        phone: '123',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid phone format');
    });

    it('should accept empty optional fields', () => {
      const result = validatePatientData({
        name: 'John Doe',
      });

      expect(result.valid).toBe(true);
    });

    it('should accept valid email with subdomain', () => {
      const result = validatePatientData({
        email: 'user@sub.domain.com',
      });

      expect(result.valid).toBe(true);
    });

    it('should accept phone with +254 format', () => {
      const result = validatePatientData({
        phone: '+254712345678',
      });

      expect(result.valid).toBe(true);
    });
  });

});