import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  hashPassword, 
  verifyPassword, 
  generateId, 
  generateTicketNumber,
  isValidEmail,
  isValidPhone,
  sanitizeInput,
  paginate,
  successResponse,
  errorResponse
} from '../../utils.js';

describe('Auth Utilities - Unit Tests', () => {
  describe('Password Hashing', () => {
    it('should hash password consistently', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should produce different hashes for different passwords', async () => {
      const hash1 = await hashPassword('password1');
      const hash2 = await hashPassword('password2');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should produce same hash for same password', async () => {
      const password = 'SamePassword';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).toBe(hash2);
    });

    it('should verify correct password', async () => {
      const password = 'CorrectPassword';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'CorrectPassword';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword('WrongPassword', hash);
      expect(isValid).toBe(false);
    });

    it('should handle empty password', async () => {
      const hash = await hashPassword('');
      const isValid = await verifyPassword('', hash);
      
      expect(isValid).toBe(true);
    });

    it('should handle special characters in password', async () => {
      const password = 'P@$$w0rd!#$%^&*()';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });
  });

  describe('ID Generation', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      
      expect(id1).not.toBe(id2);
    });

    it('should generate ID with prefix', () => {
      const id = generateId('patient');
      
      expect(id.startsWith('patient-')).toBe(true);
    });

    it('should generate ID with empty prefix', () => {
      const id = generateId('');
      
      expect(id.length).toBeGreaterThan(0);
      expect(id.includes('-')).toBe(true);
    });

    it('should generate different prefixes correctly', () => {
      const patientId = generateId('patient');
      const doctorId = generateId('doctor');
      
      expect(patientId.startsWith('patient-')).toBe(true);
      expect(doctorId.startsWith('doctor-')).toBe(true);
    });
  });

  describe('Ticket Number Generation', () => {
    it('should generate ticket number with correct format', () => {
      const ticket = generateTicketNumber('MEDICINE', 0);
      
      expect(ticket).toBe('MED001');
    });

    it('should increment ticket number', () => {
      const ticket1 = generateTicketNumber('PEDIATRICS', 4);
      const ticket2 = generateTicketNumber('PEDIATRICS', 5);
      
      expect(ticket1).toBe('PED005');
      expect(ticket2).toBe('PED006');
    });

    it('should handle lowercase department', () => {
      const ticket = generateTicketNumber('cardiology', 0);
      
      expect(ticket).toBe('CAR001');
    });

    it('should handle short department codes', () => {
      const ticket = generateTicketNumber('X', 0);
      
      expect(ticket).toBe('X001');
    });
  });

  describe('Email Validation', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'name123@subdomain.domain.com',
      ];
      
      validEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid',
        'missing@domain',
        '@nodomain.com',
        'spaces in@email.com',
        '',
        'test@',
      ];
      
      invalidEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(false);
      });
    });
  });

  describe('Phone Number Validation', () => {
    it('should validate Kenyan phone numbers starting with 0', () => {
      const validPhones = [
        '0712345678',
        '0723456789',
        '0744567890',
        '0755678901',
        '0766789012',
        '0777890123',
        '0788901234',
        '0799012345',
      ];
      
      validPhones.forEach(phone => {
        expect(isValidPhone(phone)).toBe(true);
      });
    });

    it('should validate Kenyan phone numbers with +254', () => {
      expect(isValidPhone('+254712345678')).toBe(true);
      expect(isValidPhone('254712345678')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      const invalidPhones = [
        '12345',
        '071234567',
        '07123456789',
        '0812345678',
        '+1234567890',
      ];
      
      invalidPhones.forEach(phone => {
        expect(isValidPhone(phone)).toBe(false);
      });
    });
  });

  describe('Input Sanitization', () => {
    it('should trim whitespace', () => {
      const result = sanitizeInput('  hello world  ');
      expect(result).toBe('hello world');
    });

    it('should remove angle brackets', () => {
      const result = sanitizeInput('<script>alert("xss")</script>');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('should handle mixed input', () => {
      const result = sanitizeInput('  <div>Hello</div>  ');
      expect(result).toBe('divHello/div');
    });

    it('should preserve normal text', () => {
      const result = sanitizeInput('Hello, World! How are you?');
      expect(result).toBe('Hello, World! How are you?');
    });
  });

  describe('Pagination', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }));

    it('should paginate correctly', () => {
      const result = paginate(items, 1, 10);
      
      expect(result.items.length).toBe(10);
      expect(result.total).toBe(100);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.hasMore).toBe(true);
    });

    it('should return correct items for different pages', () => {
      const page2 = paginate(items, 2, 10);
      const page3 = paginate(items, 3, 10);
      
      expect(page2.items[0].id).toBe(11);
      expect(page3.items[0].id).toBe(21);
    });

    it('should handle last page correctly', () => {
      const lastPage = paginate(items, 10, 10);
      
      expect(lastPage.items.length).toBe(10);
      expect(lastPage.hasMore).toBe(false);
    });

    it('should handle page beyond total', () => {
      const beyond = paginate(items, 20, 10);
      
      expect(beyond.items.length).toBe(0);
      expect(beyond.hasMore).toBe(false);
    });

    it('should handle empty array', () => {
      const result = paginate([], 1, 10);
      
      expect(result.items.length).toBe(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should handle single item page', () => {
      const result = paginate([{ id: 1 }], 1, 1);
      
      expect(result.items.length).toBe(1);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('Response Helpers', () => {
    it('should create success response', () => {
      const data = { id: '123', name: 'Test' };
      const response = successResponse(data, 'Operation successful');
      
      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.message).toBe('Operation successful');
    });

    it('should create success response without message', () => {
      const data = { id: '123' };
      const response = successResponse(data);
      
      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.message).toBeUndefined();
    });

    it('should create error response', () => {
      const response = errorResponse('Something went wrong');
      
      expect(response.success).toBe(false);
      expect(response.error).toBe('Something went wrong');
    });

    it('should handle complex data in success response', () => {
      const data = {
        users: [{ id: '1', name: 'John' }, { id: '2', name: 'Jane' }],
        total: 2,
      };
      const response = successResponse(data);
      
      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
    });
  });
});

describe('Auth Service - Unit Tests', () => {
  let mockDb: any;
  let mockSessionKV: any;

  beforeEach(() => {
    vi.resetModules();
    
    mockDb = {
      prepare: vi.fn(),
    };
    
    mockSessionKV = {
      put: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('JWT Token Operations', () => {
    it('should create and verify JWT token', async () => {
      const { createToken, verifyToken } = await import('../../services/auth.js');
      
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'patient' as const,
      };
      
      const token = await createToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      const verified = await verifyToken(token);
      expect(verified).not.toBeNull();
      expect((verified as any)?.userId).toBe('user-123');
    });

    it('should return null for invalid token', async () => {
      const { verifyToken } = await import('../../services/auth.js');
      
      const result = await verifyToken('invalid-token');
      expect(result).toBeNull();
    });

    it('should create token with all payload fields', async () => {
      const { createToken, verifyToken } = await import('../../services/auth.js');
      
      const payload = {
        userId: 'doctor-456',
        email: 'doctor@hospital.com',
        role: 'doctor' as const,
        doctorId: 'doc-123',
      };
      
      const token = await createToken(payload);
      const verified = await verifyToken(token);
      
      expect((verified as any)?.role).toBe('doctor');
      expect((verified as any)?.doctorId).toBe('doc-123');
    });
  });
});
