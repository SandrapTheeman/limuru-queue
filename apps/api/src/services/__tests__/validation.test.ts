import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('Validation Schemas - Unit Tests', () => {
  describe('Patient Registration Schema', () => {
    const patientSchema = z.object({
      firstName: z.string().min(1, 'First name is required'),
      lastName: z.string().min(1, 'Last name is required'),
      email: z.string().email('Invalid email format'),
      phone: z.string().optional(),
      dateOfBirth: z.string().optional(),
      password: z.string().min(6, 'Password must be at least 6 characters'),
    });

    it('should validate correct patient data', () => {
      const validData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+254712345678',
        dateOfBirth: '1990-01-15',
        password: 'password123',
      };

      const result = patientSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty first name', () => {
      const invalidData = {
        firstName: '',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
      };

      const result = patientSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'not-an-email',
        password: 'password123',
      };

      const result = patientSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: '12345',
      };

      const result = patientSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should allow optional phone', () => {
      const validData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
      };

      const result = patientSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Queue Ticket Creation Schema', () => {
    const ticketSchema = z.object({
      patientId: z.string().uuid('Invalid patient ID format'),
      departmentId: z.string().uuid('Invalid department ID format'),
      priority: z.enum(['1', '2', '3', '4']),
      complaint: z.string().optional(),
      doctorId: z.string().uuid().optional(),
      hmsAppointmentId: z.string().optional(),
    });

    it('should validate correct ticket data', () => {
      const validData = {
        patientId: '123e4567-e89b-12d3-a456-426614174000',
        departmentId: '123e4567-e89b-12d3-a456-426614174001',
        priority: '3',
        complaint: 'Headache and fever',
      };

      const result = ticketSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid priority value', () => {
      const invalidData = {
        patientId: '123e4567-e89b-12d3-a456-426614174000',
        departmentId: '123e4567-e89b-12d3-a456-426614174001',
        priority: '5',
      };

      const result = ticketSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID', () => {
      const invalidData = {
        patientId: 'not-a-uuid',
        departmentId: '123e4567-e89b-12d3-a456-426614174001',
        priority: '3',
      };

      const result = ticketSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Emergency Override Schema', () => {
    const overrideSchema = z.object({
      patientId: z.string().min(1, 'Patient ID is required'),
      departmentId: z.string().min(1, 'Department ID is required'),
      roomAssigned: z.string().min(1, 'Room is required'),
      reason: z.string().min(10, 'Reason must be at least 10 characters'),
      doctorId: z.string().optional(),
    });

    it('should validate correct override data', () => {
      const validData = {
        patientId: 'patient-123',
        departmentId: 'dept-emr',
        roomAssigned: 'E101',
        reason: 'Critical emergency case - chest pain',
      };

      const result = overrideSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject short reason', () => {
      const invalidData = {
        patientId: 'patient-123',
        departmentId: 'dept-emr',
        roomAssigned: 'E101',
        reason: 'Emergency',
      };

      const result = overrideSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should allow optional doctor ID', () => {
      const validData = {
        patientId: 'patient-123',
        departmentId: 'dept-emr',
        roomAssigned: 'E101',
        reason: 'Critical emergency case requiring immediate attention',
      };

      const result = overrideSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Patient Search Schema', () => {
    const searchSchema = z.object({
      query: z.string().min(1, 'Search query is required'),
      limit: z.number().min(1).max(100).optional().default(20),
      offset: z.number().min(0).optional().default(0),
    });

    it('should validate correct search data', () => {
      const validData = {
        query: 'John Doe',
        limit: 20,
        offset: 0,
      };

      const result = searchSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should apply default limit', () => {
      const validData = {
        query: 'John',
      };

      const result = searchSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
      }
    });

    it('should reject limit over 100', () => {
      const invalidData = {
        query: 'John',
        limit: 150,
      };

      const result = searchSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject negative offset', () => {
      const invalidData = {
        query: 'John',
        offset: -1,
      };

      const result = searchSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Department Transfer Schema', () => {
    const transferSchema = z.object({
      toDepartmentId: z.string().uuid('Invalid department ID'),
      reason: z.string().optional(),
    });

    it('should validate correct transfer data', () => {
      const validData = {
        toDepartmentId: '123e4567-e89b-12d3-a456-426614174000',
        reason: 'Patient requires specialized care',
      };

      const result = transferSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should allow transfer without reason', () => {
      const validData = {
        toDepartmentId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = transferSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('WhatsApp Message Schema', () => {
    const messageSchema = z.object({
      from: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number'),
      to: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number'),
      body: z.string().min(1, 'Message body is required'),
      timestamp: z.string().datetime().optional(),
      type: z.enum(['text', 'image', 'audio', 'location', 'button_reply', 'interactive']).default('text'),
    });

    it('should validate correct message', () => {
      const validData = {
        from: '+254712345678',
        to: '+254798765432',
        body: 'Hello, I need to book an appointment',
        type: 'text',
      };

      const result = messageSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid phone number', () => {
      const invalidData = {
        from: '123',
        to: '+254798765432',
        body: 'Hello',
      };

      const result = messageSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should set default type', () => {
      const validData = {
        from: '+254712345678',
        to: '+254798765432',
        body: 'Hello',
      };

      const result = messageSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('text');
      }
    });
  });

  describe('API Response Schema', () => {
    const apiResponseSchema = z.object({
      success: z.boolean(),
      data: z.any().optional(),
      error: z.string().optional(),
      message: z.string().optional(),
    });

    it('should validate success response', () => {
      const validData = {
        success: true,
        data: { id: '123', name: 'Test' },
        message: 'Operation successful',
      };

      const result = apiResponseSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate error response', () => {
      const validData = {
        success: false,
        error: 'Something went wrong',
      };

      const result = apiResponseSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Login Credentials Schema', () => {
    const loginSchema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
    });

    it('should validate correct login credentials', () => {
      const validData = {
        email: 'user@example.com',
        password: 'password123',
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject missing password', () => {
      const invalidData = {
        email: 'user@example.com',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Password Reset Schema', () => {
    const resetSchema = z.object({
      token: z.string().min(1),
      newPassword: z.string().min(6).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
        'Password must contain uppercase, lowercase, and number'),
    });

    it('should validate correct reset data', () => {
      const validData = {
        token: 'reset-token-123',
        newPassword: 'NewPass123',
      };

      const result = resetSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject weak password', () => {
      const invalidData = {
        token: 'reset-token-123',
        newPassword: 'password',
      };

      const result = resetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Quick Register Schema', () => {
    const quickRegisterSchema = z.object({
      name: z.string().min(1, 'Name is required'),
      phone: z.string().regex(/^(\+?254|0)[71]\d{8}$/, 'Invalid Kenyan phone number').optional(),
      email: z.string().email().optional(),
      hmsPatientId: z.string().optional(),
    });

    it('should validate with only name', () => {
      const validData = {
        name: 'John Doe',
      };

      const result = quickRegisterSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate with phone', () => {
      const validData = {
        name: 'John Doe',
        phone: '0712345678',
      };

      const result = quickRegisterSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid phone format', () => {
      const invalidData = {
        name: 'John Doe',
        phone: '12345',
      };

      const result = quickRegisterSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
