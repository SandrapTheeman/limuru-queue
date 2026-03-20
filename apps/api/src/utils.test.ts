// Unit tests for API utility functions
import { describe, it, expect } from 'vitest';
import { 
  generateId, 
  hashPassword, 
  verifyPassword, 
  generateTicketNumber, 
  calculateWaitTime,
  successResponse,
  errorResponse
} from './utils';

describe('Utils', () => {
  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId('test');
      const id2 = generateId('test');
      
      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
    });
    
    it('should include prefix in ID', () => {
      const id = generateId('patient');
      expect(id).toContain('patient');
    });
  });
  
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const hash = await hashPassword('testPassword123');
      expect(hash).toBeTruthy();
      expect(hash).not.toBe('testPassword123');
    });
    
    it('should produce different hashes for same password', async () => {
      const hash1 = await hashPassword('testPassword123');
      const hash2 = await hashPassword('testPassword123');
      // Note: bcrypt includes salt, so hashes will differ
      expect(hash1).not.toBe(hash2);
    });
  });
  
  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });
    
    it('should reject incorrect password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword('wrongPassword', hash);
      expect(isValid).toBe(false);
    });
  });
  
  describe('generateTicketNumber', () => {
    it('should generate ticket with department code', () => {
      const ticket = generateTicketNumber('MED', 1);
      expect(ticket).toContain('MED');
    });
    
    it('should increment ticket number', () => {
      const ticket1 = generateTicketNumber('MED', 1);
      const ticket2 = generateTicketNumber('MED', 2);
      
      expect(ticket1).not.toBe(ticket2);
    });
  });
  
  describe('calculateWaitTime', () => {
    it('should calculate wait time in minutes', () => {
      const pastDate = new Date();
      pastDate.setMinutes(pastDate.getMinutes() - 15);
      
      const waitTime = calculateWaitTime(pastDate.toISOString());
      expect(waitTime).toBeGreaterThanOrEqual(14);
      expect(waitTime).toBeLessThanOrEqual(16);
    });
    
    it('should return 0 for future dates', () => {
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 15);
      
      const waitTime = calculateWaitTime(futureDate.toISOString());
      expect(waitTime).toBe(0);
    });
  });
  
  describe('successResponse', () => {
    it('should create success response', () => {
      const response = successResponse({ message: 'test' });
      
      expect(response.success).toBe(true);
      expect(response.data).toEqual({ message: 'test' });
    });
  });
  
  describe('errorResponse', () => {
    it('should create error response', () => {
      const response = errorResponse('Test error');
      
      expect(response.success).toBe(false);
      expect(response.error).toBe('Test error');
    });
  });
});
