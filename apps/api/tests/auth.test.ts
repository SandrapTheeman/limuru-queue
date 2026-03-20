import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/server';
import { createMockEnv, populateMockData } from '../src/services/__tests__/mocks';
import { testPatients, testUsers, testDoctors } from '../src/services/__tests__/fixtures';
import { hashPassword } from '../src/utils';

describe('Authentication API Integration Tests', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.JWT_EXPIRES_IN = '24h';
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
    delete process.env.JWT_EXPIRES_IN;
  });

  describe('GET /', () => {
    it('should return API info', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('version');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('POST /api/auth/patient/login', () => {
    it('should reject request without body', async () => {
      const response = await request(app)
        .post('/api/auth/patient/login')
        .send({});
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/patient/login')
        .send({ email: 'invalid-email', password: 'password123' });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject short password', async () => {
      const response = await request(app)
        .post('/api/auth/patient/login')
        .send({ email: 'test@example.com', password: '12345' });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject request without email', async () => {
      const response = await request(app)
        .post('/api/auth/patient/login')
        .send({ password: 'password123' });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject request without password', async () => {
      const response = await request(app)
        .post('/api/auth/patient/login')
        .send({ email: 'test@example.com' });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/auth/staff/login', () => {
    it('should reject request without body', async () => {
      const response = await request(app)
        .post('/api/auth/staff/login')
        .send({});
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/staff/login')
        .send({ email: 'not-an-email', password: 'password123' });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject short password', async () => {
      const response = await request(app)
        .post('/api/auth/staff/login')
        .send({ email: 'staff@example.com', password: 'short' });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/auth/pin/login', () => {
    it('should reject request without patientId', async () => {
      const response = await request(app)
        .post('/api/auth/pin/login')
        .send({ pin: '1234' });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject request without pin', async () => {
      const response = await request(app)
        .post('/api/auth/pin/login')
        .send({ patientId: 'patient-001' });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject invalid pin length', async () => {
      const response = await request(app)
        .post('/api/auth/pin/login')
        .send({ patientId: 'patient-001', pin: '12345' });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject short pin', async () => {
      const response = await request(app)
        .post('/api/auth/pin/login')
        .send({ patientId: 'patient-001', pin: '123' });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should handle logout request', async () => {
      const response = await request(app).post('/api/auth/logout');
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should return logout confirmation', async () => {
      const response = await request(app).post('/api/auth/logout');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('should reject request without currentPassword', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .send({ newPassword: 'newpassword123' });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject request without newPassword', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .send({ currentPassword: 'oldpassword' });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject short newPassword', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .send({ currentPassword: 'oldpassword', newPassword: '12345' });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/auth/reset-password/request', () => {
    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password/request')
        .send({ email: 'invalid-email' });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject request without email', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password/request')
        .send({});
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/auth/reset-password/confirm', () => {
    it('should reject request without token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password/confirm')
        .send({ newPassword: 'newpassword123' });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject request without newPassword', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password/confirm')
        .send({ token: 'some-reset-token' });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject short newPassword', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password/confirm')
        .send({ token: 'some-reset-token', newPassword: '12345' });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/api/unknown-route');
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Not Found');
    });
  });

  describe('Error Handler', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/patient/login')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});
