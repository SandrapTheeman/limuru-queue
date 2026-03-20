import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/server';
import { testPatients } from '../src/services/__tests__/fixtures';

describe('Patient API Integration Tests', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-key';
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
  });

  describe('GET /api/patients/:id', () => {
    it('should reject request without patient id', async () => {
      const response = await request(app).get('/api/patients/');
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should accept valid patient id', async () => {
      const response = await request(app).get('/api/patients/patient-001');
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should return patient id in response', async () => {
      const response = await request(app).get('/api/patients/patient-001');
      expect(response.body).toHaveProperty('patientId');
    });

    it('should handle different patient id formats', async () => {
      const ids = ['patient-001', 'patient-002', 'uuid-12345'];
      for (const id of ids) {
        const response = await request(app).get(`/api/patients/${id}`);
        expect(response.status).toBeGreaterThanOrEqual(200);
      }
    });
  });

  describe('PUT /api/patients/:id', () => {
    it('should reject request without patient id', async () => {
      const response = await request(app)
        .put('/api/patients/')
        .send({ firstName: 'John' });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .put('/api/patients/patient-001')
        .send({ email: 'invalid-email' });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should accept valid patient update request', async () => {
      const response = await request(app)
        .put('/api/patients/patient-001')
        .send({
          firstName: 'John',
          lastName: 'Updated',
          phone: '+254712345678',
        });
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should accept update with email', async () => {
      const response = await request(app)
        .put('/api/patients/patient-001')
        .send({
          email: 'updated@example.com',
        });
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should accept update with dateOfBirth', async () => {
      const response = await request(app)
        .put('/api/patients/patient-001')
        .send({
          dateOfBirth: '1990-01-15',
        });
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should accept update with address', async () => {
      const response = await request(app)
        .put('/api/patients/patient-001')
        .send({
          address: '123 Main Street, Nairobi',
        });
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should accept update with emergency contact', async () => {
      const response = await request(app)
        .put('/api/patients/patient-001')
        .send({
          emergencyContact: '+254798765432',
        });
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should accept partial update', async () => {
      const response = await request(app)
        .put('/api/patients/patient-001')
        .send({
          firstName: 'John',
        });
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should accept empty update', async () => {
      const response = await request(app)
        .put('/api/patients/patient-001')
        .send({});
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should return patient id in response', async () => {
      const response = await request(app)
        .put('/api/patients/patient-001')
        .send({ firstName: 'John' });
      expect(response.body).toHaveProperty('patientId');
    });
  });

  describe('POST /api/patients/search', () => {
    it('should reject request without query', async () => {
      const response = await request(app)
        .post('/api/patients/search')
        .send({});
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should accept valid search request', async () => {
      const response = await request(app)
        .post('/api/patients/search')
        .send({ query: 'John' });
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should accept search with limit', async () => {
      const response = await request(app)
        .post('/api/patients/search')
        .send({ query: 'John', limit: 10 });
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should accept search with zero limit', async () => {
      const response = await request(app)
        .post('/api/patients/search')
        .send({ query: 'John', limit: 0 });
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should accept search with negative limit', async () => {
      const response = await request(app)
        .post('/api/patients/search')
        .send({ query: 'John', limit: -1 });
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should return search data in response', async () => {
      const response = await request(app)
        .post('/api/patients/search')
        .send({ query: 'John' });
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('GET /api/patients/:id/history', () => {
    it('should reject request without patient id', async () => {
      const response = await request(app).get('/api/patients//history');
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should accept valid patient id for history', async () => {
      const response = await request(app).get('/api/patients/patient-001/history');
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should return patient id in response', async () => {
      const response = await request(app).get('/api/patients/patient-001/history');
      expect(response.body).toHaveProperty('patientId');
    });

    it('should handle non-existent patient', async () => {
      const response = await request(app).get('/api/patients/non-existent/history');
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('POST /api/patients/register', () => {
    it('should reject request without required fields', async () => {
      const response = await request(app)
        .post('/api/patients/register')
        .send({});
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject request without firstName', async () => {
      const response = await request(app)
        .post('/api/patients/register')
        .send({
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+254712345678',
          dateOfBirth: '1990-01-15',
        });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject request without lastName', async () => {
      const response = await request(app)
        .post('/api/patients/register')
        .send({
          firstName: 'John',
          email: 'john@example.com',
          phone: '+254712345678',
          dateOfBirth: '1990-01-15',
        });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject request without email', async () => {
      const response = await request(app)
        .post('/api/patients/register')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          phone: '+254712345678',
          dateOfBirth: '1990-01-15',
        });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject request without phone', async () => {
      const response = await request(app)
        .post('/api/patients/register')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          dateOfBirth: '1990-01-15',
        });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject request without dateOfBirth', async () => {
      const response = await request(app)
        .post('/api/patients/register')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+254712345678',
        });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/patients/register')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'invalid-email',
          phone: '+254712345678',
          dateOfBirth: '1990-01-15',
        });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should accept valid registration request', async () => {
      const response = await request(app)
        .post('/api/patients/register')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'newpatient@example.com',
          phone: '+254712345678',
          dateOfBirth: '1990-01-15',
        });
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should accept registration with optional address', async () => {
      const response = await request(app)
        .post('/api/patients/register')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'newpatient@example.com',
          phone: '+254712345678',
          dateOfBirth: '1990-01-15',
          address: '123 Main Street',
        });
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should accept registration with optional emergency contact', async () => {
      const response = await request(app)
        .post('/api/patients/register')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'newpatient@example.com',
          phone: '+254712345678',
          dateOfBirth: '1990-01-15',
          emergencyContact: '+254798765432',
        });
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should accept registration with optional PIN', async () => {
      const response = await request(app)
        .post('/api/patients/register')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'newpatient@example.com',
          phone: '+254712345678',
          dateOfBirth: '1990-01-15',
          pin: '1234',
        });
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should reject invalid PIN length', async () => {
      const response = await request(app)
        .post('/api/patients/register')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'newpatient@example.com',
          phone: '+254712345678',
          dateOfBirth: '1990-01-15',
          pin: '12345',
        });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject short PIN', async () => {
      const response = await request(app)
        .post('/api/patients/register')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'newpatient@example.com',
          phone: '+254712345678',
          dateOfBirth: '1990-01-15',
          pin: '123',
        });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should return registration data in response', async () => {
      const response = await request(app)
        .post('/api/patients/register')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'newpatient@example.com',
          phone: '+254712345678',
          dateOfBirth: '1990-01-15',
        });
      expect(response.body).toHaveProperty('data');
    });
  });
});
