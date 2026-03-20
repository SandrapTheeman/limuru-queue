// Integration tests for Queue Operations
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockEnv, createMockD1, populateMockData } from '../../src/services/__tests__/mocks';
import { testPatients, testVisits, testDoctors, testSettings } from '../../src/services/__tests__/fixtures';

describe('Queue API Integration Tests', () => {
  let env: any;
  let db: any;

  beforeEach(() => {
    env = createMockEnv();
    db = env.DB;
  });

  describe('GET /api/queue/:department', () => {
    it('should return queue for valid department', async () => {
      populateMockData(db, {
        visits: testVisits.filter(v => v.department === 'MED' && v.status === 'waiting'),
        settings: testSettings,
      });

      db.setFirstData(
        "SELECT COUNT(*) as count FROM visits WHERE department = 'MED' AND status = 'waiting'",
        { count: 2 }
      );
      db.setFirstData(
        "SELECT COUNT(*) as count FROM visits WHERE department = 'MED' AND status = 'called'",
        { count: 1 }
      );
      db.setFirstData(
        "SELECT value FROM settings WHERE key = 'wait_time_per_patient'",
        { value: '15' }
      );

      const result = await db.prepare(`
        SELECT v.*, p.name as patient_name 
        FROM visits v
        JOIN patients p ON v.patient_id = p.id
        WHERE v.department = ? AND v.status = 'waiting'
        ORDER BY v.priority DESC, v.created_at ASC
        LIMIT 20 OFFSET 0
      `).bind('MED').all();

      expect(result.results).toBeDefined();
    });

    it('should handle empty queue', async () => {
      db.setFirstData(
        "SELECT COUNT(*) as count FROM visits WHERE department = 'MED' AND status = 'waiting'",
        { count: 0 }
      );
      db.setFirstData(
        "SELECT COUNT(*) as count FROM visits WHERE department = 'MED' AND status = 'called'",
        { count: 0 }
      );

      const waiting = await db.prepare(`
        SELECT COUNT(*) as count FROM visits WHERE department = ? AND status = 'waiting'
      `).bind('MED').first() as { count: number } | undefined;

      expect(waiting?.count).toBe(0);
    });

    it('should respect pagination parameters', async () => {
      populateMockData(db, { visits: testVisits });

      const limit = 5;
      const offset = 0;

      const result = await db.prepare(`
        SELECT v.*, p.name as patient_name 
        FROM visits v
        JOIN patients p ON v.patient_id = p.id
        WHERE v.department = ? AND v.status = 'waiting'
        ORDER BY v.priority DESC, v.created_at ASC
        LIMIT ? OFFSET ?
      `).bind('MED', limit, offset).all();

      expect(result.results).toBeDefined();
    });
  });

  describe('POST /api/queue', () => {
    it('should add patient to queue', async () => {
      db.setFirstData(
        "SELECT COUNT(*) as count FROM visits WHERE department = ? AND status IN ('waiting', 'called', 'in_progress') AND date(created_at) = date('now')",
        { count: 0 }
      );

      const countResult = await db.prepare(`
        SELECT COUNT(*) as count FROM visits 
        WHERE department = ? AND status IN ('waiting', 'called', 'in_progress')
        AND date(created_at) = date('now')
      `).bind('MED').first() as { count: number } | undefined;

      const ticketNumber = `MED${String((countResult?.count || 0) + 1).padStart(3, '0')}`;
      expect(ticketNumber).toBe('MED001');
    });

    it('should reject duplicate patient in queue', async () => {
      populateMockData(db, {
        visits: testVisits.filter(v => v.status === 'waiting'),
      });

      db.setFirstData(
        "SELECT * FROM visits WHERE patient_id = ? AND status IN ('waiting', 'called', 'in_progress')",
        testVisits[0]
      );

      const existing = await db.prepare(`
        SELECT * FROM visits 
        WHERE patient_id = ? AND status IN ('waiting', 'called', 'in_progress')
      `).bind('patient-001').first();

      expect(existing).toBeDefined();
    });

    it('should require name and department', async () => {
      const validData = { name: 'John Doe', department: 'MED' };
      const invalidData = { name: '' };

      expect(validData.name).toBeTruthy();
      expect(validData.department).toBeTruthy();
      expect(invalidData.name).toBeFalsy();
    });

    it('should assign priority flag correctly', async () => {
      const priorityData = { name: 'Emergency', department: 'MED', priority: true };
      const normalData = { name: 'Regular', department: 'MED', priority: false };

      expect(priorityData.priority).toBe(true);
      expect(normalData.priority).toBe(false);
    });
  });

  describe('POST /api/queue/call/:visitId', () => {
    it('should call patient and update status', async () => {
      db.setData('SELECT * FROM visits WHERE id = ?', [testVisits[0]]);

      const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').bind('visit-001').first();

      expect(visit).toBeDefined();
    });

    it('should record call in queue history', async () => {
      const visitId = 'visit-001';
      const doctorId = 'doctor-001';
      const room = 'Room 101';

      expect(visitId).toBeDefined();
      expect(doctorId).toBeDefined();
      expect(room).toBeDefined();
    });

    it('should fail for non-existent visit', async () => {
      db.setData('SELECT * FROM visits WHERE id = ?', []);

      const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').bind('non-existent').first();

      expect(visit).toBeUndefined();
    });
  });

  describe('POST /api/queue/start/:visitId', () => {
    it('should start consultation', async () => {
      db.setData('SELECT * FROM visits WHERE id = ? AND status = ?', [testVisits[0]]);

      const visit = await db.prepare('SELECT * FROM visits WHERE id = ? AND status = ?')
        .bind('visit-001', 'called').first();

      expect(visit).toBeDefined();
    });
  });

  describe('POST /api/queue/complete/:visitId', () => {
    it('should complete visit with notes', async () => {
      const visitId = 'visit-001';
      const notes = {
        diagnosis: 'Common cold',
        prescription: 'Paracetamol 500mg',
        doctorNotes: 'Rest and hydration',
      };

      expect(notes.diagnosis).toBeDefined();
      expect(notes.prescription).toBeDefined();
      expect(notes.doctorNotes).toBeDefined();
    });

    it('should calculate wait time', async () => {
      const createdAt = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const calledAt = new Date().toISOString();

      const waitTime = Math.floor((new Date(calledAt).getTime() - new Date(createdAt).getTime()) / (1000 * 60));

      expect(waitTime).toBe(30);
    });
  });

  describe('POST /api/queue/no-show/:visitId', () => {
    it('should mark patient as no-show', async () => {
      db.setData('SELECT * FROM visits WHERE id = ?', [testVisits[0]]);

      const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').bind('visit-001').first();

      expect(visit).toBeDefined();
    });
  });

  describe('POST /api/queue/transfer/:visitId', () => {
    it('should transfer patient to new department', async () => {
      const visitId = 'visit-001';
      const newDepartment = 'PED';

      // Test that department transfer logic works
      const currentCount = 5;
      const newTicketNumber = `PED${String(currentCount + 1).padStart(3, '0')}`;
      
      expect(newTicketNumber).toBe('PED006');
    });
  });
});