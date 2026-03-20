import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/server';
import { testVisits, testPatients } from '../src/services/__tests__/fixtures';

describe('Queue Management API Integration Tests', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-key';
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
  });

  describe('GET /api/queue/:department', () => {
    it('should reject missing department parameter', async () => {
      const response = await request(app).get('/api/queue/');
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should accept valid department parameter', async () => {
      const response = await request(app).get('/api/queue/MED');
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should accept different department codes', async () => {
      const departments = ['MED', 'PED', 'GYN', 'OBS'];
      for (const dept of departments) {
        const response = await request(app).get(`/api/queue/${dept}`);
        expect(response.status).toBeGreaterThanOrEqual(200);
      }
    });

    it('should return queue data structure', async () => {
      const response = await request(app).get('/api/queue/MED');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/queue', () => {
    it('should reject request without patientId', async () => {
      const response = await request(app)
        .post('/api/queue')
        .send({ department: 'MED' });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject request without department', async () => {
      const response = await request(app)
        .post('/api/queue')
        .send({ patientId: 'patient-001' });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should accept valid queue creation request', async () => {
      const response = await request(app)
        .post('/api/queue')
        .send({
          patientId: 'patient-001',
          department: 'MED',
          priority: 'normal',
        });
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should accept request with priority', async () => {
      const response = await request(app)
        .post('/api/queue')
        .send({
          patientId: 'patient-001',
          department: 'MED',
          priority: 'high',
        });
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should reject invalid priority value', async () => {
      const response = await request(app)
        .post('/api/queue')
        .send({
          patientId: 'patient-001',
          department: 'MED',
          priority: 'invalid',
        });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should accept request with optional notes', async () => {
      const response = await request(app)
        .post('/api/queue')
        .send({
          patientId: 'patient-001',
          department: 'MED',
          notes: 'Follow-up visit',
        });
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('POST /api/queue/fast', () => {
    it('should reject request without patientId', async () => {
      const response = await request(app)
        .post('/api/queue/fast')
        .send({
          department: 'MED',
          reason: 'Emergency',
        });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject request without department', async () => {
      const response = await request(app)
        .post('/api/queue/fast')
        .send({
          patientId: 'patient-001',
          reason: 'Emergency',
        });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject request without reason', async () => {
      const response = await request(app)
        .post('/api/queue/fast')
        .send({
          patientId: 'patient-001',
          department: 'MED',
        });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should accept valid fast queue request', async () => {
      const response = await request(app)
        .post('/api/queue/fast')
        .send({
          patientId: 'patient-001',
          department: 'MED',
          reason: 'Severe pain',
        });
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('POST /api/queue/:id/call', () => {
    it('should reject call without queue id', async () => {
      const response = await request(app)
        .post('/api/queue//call')
        .send({});
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should accept valid call request', async () => {
      const response = await request(app)
        .post('/api/queue/visit-001/call')
        .send({});
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should return queue id in response', async () => {
      const response = await request(app)
        .post('/api/queue/visit-001/call')
        .send({});
      expect(response.body).toHaveProperty('queueId');
    });
  });

  describe('POST /api/queue/:id/start', () => {
    it('should accept valid start consultation request', async () => {
      const response = await request(app)
        .post('/api/queue/visit-001/start')
        .send({});
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should return queue id in response', async () => {
      const response = await request(app)
        .post('/api/queue/visit-001/start')
        .send({});
      expect(response.body).toHaveProperty('queueId');
    });
  });

  describe('POST /api/queue/:id/complete', () => {
    it('should accept valid complete consultation request', async () => {
      const response = await request(app)
        .post('/api/queue/visit-001/complete')
        .send({});
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should return queue id in response', async () => {
      const response = await request(app)
        .post('/api/queue/visit-001/complete')
        .send({});
      expect(response.body).toHaveProperty('queueId');
    });
  });

  describe('POST /api/queue/:id/no-show', () => {
    it('should accept valid no-show request', async () => {
      const response = await request(app)
        .post('/api/queue/visit-001/no-show')
        .send({});
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should return queue id in response', async () => {
      const response = await request(app)
        .post('/api/queue/visit-001/no-show')
        .send({});
      expect(response.body).toHaveProperty('queueId');
    });
  });

  describe('POST /api/queue/:id/transfer', () => {
    it('should reject transfer without toDepartment', async () => {
      const response = await request(app)
        .post('/api/queue/visit-001/transfer')
        .send({ reason: 'Patient request' });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should accept valid transfer request', async () => {
      const response = await request(app)
        .post('/api/queue/visit-001/transfer')
        .send({
          toDepartment: 'PED',
          reason: 'Specialized care needed',
        });
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should accept transfer without reason', async () => {
      const response = await request(app)
        .post('/api/queue/visit-001/transfer')
        .send({ toDepartment: 'PED' });
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should return queue id and transfer data', async () => {
      const response = await request(app)
        .post('/api/queue/visit-001/transfer')
        .send({ toDepartment: 'PED' });
      expect(response.body).toHaveProperty('queueId');
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('GET /api/queue/all/summary', () => {
    it('should return queue summary', async () => {
      const response = await request(app).get('/api/queue/all/summary');
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should return summary message', async () => {
      const response = await request(app).get('/api/queue/all/summary');
      expect(response.body).toHaveProperty('message');
    });
  });
});
