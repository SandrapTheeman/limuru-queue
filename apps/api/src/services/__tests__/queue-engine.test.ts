import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { D1Database, KVNamespace } from '@cloudflare/workers-types';

interface MockD1Result {
  results?: any[];
  success?: boolean;
  error?: string;
}

function createMockD1Database() {
  const data = new Map<string, any>();
  const firstData = new Map<string, any>();

  return {
    prepare: vi.fn((sql: string) => ({
      bind: vi.fn((...args: any[]) => ({
        first: vi.fn(async <T = any>(): Promise<T | undefined> => {
          const key = `${sql}:${JSON.stringify(args)}`;
          return firstData.get(key) as T | undefined;
        }),
        run: vi.fn(async (): Promise<MockD1Result> => {
          const key = `${sql}:${JSON.stringify(args)}`;
          if (!data.has(key)) {
            data.set(key, []);
          }
          return { success: true };
        }),
        all: vi.fn(async (): Promise<{ results: any[] }> => {
          const key = `${sql}:${JSON.stringify(args)}`;
          return { results: data.get(key) || [] };
        }),
      })),
      first: vi.fn(async <T = any>(): Promise<T | undefined> => {
        return firstData.get(sql) as T | undefined;
      }),
      run: vi.fn(async (): Promise<MockD1Result> => {
        return { success: true };
      }),
      all: vi.fn(async (): Promise<{ results: any[] }> => {
        return { results: data.get(sql) || [] };
      }),
    })),
    batch: vi.fn(async () => []),
    exec: vi.fn(async () => []),
    _setData: (sql: string, results: any[]) => data.set(sql, results),
    _setFirstData: (sql: string, result: any) => firstData.set(sql, result),
    _clear: () => { data.clear(); firstData.clear(); },
  } as unknown as D1Database & { 
    _setData: (sql: string, results: any[]) => void;
    _setFirstData: (sql: string, result: any) => void;
    _clear: () => void;
  };
}

function createMockKV() {
  const store = new Map<string, string>();

  return {
    get: vi.fn(async (key: string) => store.get(key) || null),
    put: vi.fn(async (key: string, value: string) => { store.set(key, value); }),
    delete: vi.fn(async (key: string) => store.delete(key)),
    list: vi.fn(async (_options?: any) => ({
      keys: Array.from(store.keys()).map(name => ({ name })),
    })),
    _store: store,
    _clear: () => store.clear(),
  } as unknown as KVNamespace & { _store: Map<string, string>; _clear: () => void };
}

describe('Queue Engine - Unit Tests', () => {
  let mockDb: D1Database & { _setData: (sql: string, results: any[]) => void; _setFirstData: (sql: string, result: any) => void; _clear: () => void };
  let mockCache: KVNamespace & { _store: Map<string, string>; _clear: () => void };
  let QueueEngine: any;

  beforeEach(async () => {
    vi.resetModules();
    mockDb = createMockD1Database();
    mockCache = createMockKV();
    
    const module = await import('../queue-engine.js');
    QueueEngine = module.QueueEngine;
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockDb._clear();
    mockCache._clear();
  });

  describe('Priority Score Calculation', () => {
    it('should calculate correct priority score for critical priority', () => {
      const engine = new QueueEngine(mockDb as any, mockCache as any, 'facility-1');
      const now = new Date().toISOString();
      const score = engine.calculatePriorityScore(1, now, false);
      expect(score).toBe(-100);
    });

    it('should calculate correct priority score for emergency priority', () => {
      const engine = new QueueEngine(mockDb as any, mockCache as any, 'facility-1');
      const now = new Date().toISOString();
      const score = engine.calculatePriorityScore(2, now, false);
      expect(score).toBe(-70);
    });

    it('should calculate correct priority score for urgent priority', () => {
      const engine = new QueueEngine(mockDb as any, mockCache as any, 'facility-1');
      const now = new Date().toISOString();
      const score = engine.calculatePriorityScore(3, now, false);
      expect(score).toBe(-40);
    });

    it('should calculate correct priority score for normal priority', () => {
      const engine = new QueueEngine(mockDb as any, mockCache as any, 'facility-1');
      const now = new Date().toISOString();
      const score = engine.calculatePriorityScore(4, now, false);
      expect(score).toBe(-10);
    });

    it('should add wait boost for longer waiting patients', () => {
      const engine = new QueueEngine(mockDb as any, mockCache as any, 'facility-1');
      const oldTime = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const score = engine.calculatePriorityScore(3, oldTime, false);
      expect(score).toBe(-40 + 3);
    });

    it('should add appointment bonus for scheduled patients', () => {
      const engine = new QueueEngine(mockDb as any, mockCache as any, 'facility-1');
      const now = new Date().toISOString();
      const score = engine.calculatePriorityScore(3, now, true);
      expect(score).toBe(-40 + 5);
    });

    it('should combine wait boost and appointment bonus', () => {
      const engine = new QueueEngine(mockDb as any, mockCache as any, 'facility-1');
      const oldTime = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const score = engine.calculatePriorityScore(3, oldTime, true);
      expect(score).toBe(-40 + 3 + 5);
    });
  });

  describe('Priority Labels', () => {
    it('should return correct label for priority 1', () => {
      const engine = new QueueEngine(mockDb as any, mockCache as any, 'facility-1');
      expect(engine.getPriorityLabel(1)).toBe('Critical');
    });

    it('should return correct label for priority 2', () => {
      const engine = new QueueEngine(mockDb as any, mockCache as any, 'facility-1');
      expect(engine.getPriorityLabel(2)).toBe('Emergency');
    });

    it('should return correct label for priority 3', () => {
      const engine = new QueueEngine(mockDb as any, mockCache as any, 'facility-1');
      expect(engine.getPriorityLabel(3)).toBe('Urgent');
    });

    it('should return correct label for priority 4', () => {
      const engine = new QueueEngine(mockDb as any, mockCache as any, 'facility-1');
      expect(engine.getPriorityLabel(4)).toBe('Normal');
    });
  });

  describe('Ticket Number Generation', () => {
    it('should generate ticket number with correct format', async () => {
      const engine = new QueueEngine(mockDb as any, mockCache as any, 'facility-1');
      
      mockDb._setFirstData(
        'SELECT MAX(sequence_number) as max_seq FROM queue_tickets WHERE facility_id = ? AND department_id = ? AND DATE(created_at) = ?',
        { max_seq: 0 }
      );

      const result = await engine.generateTicketNumber('dept-1', 'MED');
      
      expect(result.ticketNumber).toBe('MED/R---/001');
      expect(result.sequence).toBe(1);
    });

    it('should increment sequence number correctly', async () => {
      const engine = new QueueEngine(mockDb as any, mockCache as any, 'facility-1');
      
      mockDb._setFirstData(
        'SELECT MAX(sequence_number) as max_seq FROM queue_tickets WHERE facility_id = ? AND department_id = ? AND DATE(created_at) = ?',
        { max_seq: 5 }
      );

      const result = await engine.generateTicketNumber('dept-1', 'PED');
      
      expect(result.ticketNumber).toBe('PED/R---/006');
      expect(result.sequence).toBe(6);
    });

    it('should handle null max sequence', async () => {
      const engine = new QueueEngine(mockDb as any, mockCache as any, 'facility-1');
      
      mockDb._setFirstData(
        'SELECT MAX(sequence_number) as max_seq FROM queue_tickets WHERE facility_id = ? AND department_id = ? AND DATE(created_at) = ?',
        { max_seq: null }
      );

      const result = await engine.generateTicketNumber('dept-1', 'GYN');
      
      expect(result.ticketNumber).toBe('GYN/R---/001');
      expect(result.sequence).toBe(1);
    });
  });

  describe('Queue Position Calculation', () => {
    it('should calculate correct patient position', async () => {
      const engine = new QueueEngine(mockDb as any, mockCache as any, 'facility-1');
      
      mockDb._setFirstData('SELECT * FROM queue_tickets WHERE id = ?', {
        id: 'ticket-1',
        department_id: 'dept-1',
        priority_score: 40,
      });

      mockDb._setFirstData(
        'SELECT COUNT(*) as count FROM queue_tickets WHERE facility_id = ? AND department_id = ? AND status = ? AND priority_score > ?',
        { count: 2 }
      );

      mockDb._setFirstData(
        'SELECT average_service_time FROM departments WHERE id = ?',
        { average_service_time: 15 }
      );

      const result = await engine.getPatientPosition('ticket-1');
      
      expect(result).not.toBeNull();
      expect(result!.position).toBe(3);
      expect(result!.estimatedWait).toBe(45);
    });

    it('should return null for non-existent ticket', async () => {
      const engine = new QueueEngine(mockDb as any, mockCache as any, 'facility-1');
      
      mockDb._setFirstData('SELECT * FROM queue_tickets WHERE id = ?', null);

      const result = await engine.getPatientPosition('non-existent');
      
      expect(result).toBeNull();
    });

    it('should use default service time when department not found', async () => {
      const engine = new QueueEngine(mockDb as any, mockCache as any, 'facility-1');
      
      mockDb._setFirstData('SELECT * FROM queue_tickets WHERE id = ?', {
        id: 'ticket-1',
        department_id: 'dept-1',
        priority_score: 40,
      });

      mockDb._setFirstData(
        'SELECT COUNT(*) as count FROM queue_tickets WHERE facility_id = ? AND department_id = ? AND status = ? AND priority_score > ?',
        { count: 0 }
      );

      mockDb._setFirstData(
        'SELECT average_service_time FROM departments WHERE id = ?',
        null
      );

      const result = await engine.getPatientPosition('ticket-1');
      
      expect(result).not.toBeNull();
      expect(result!.position).toBe(1);
      expect(result!.estimatedWait).toBe(15);
    });
  });

  describe('Queue Statistics', () => {
    it('should calculate queue statistics correctly', async () => {
      const engine = new QueueEngine(mockDb as any, mockCache as any, 'facility-1');
      
      mockDb._setData(
        `SELECT status, COUNT(*) as count, AVG(actual_wait_minutes) as avg_wait, AVG(CASE WHEN completed_at AND started_at THEN (julianday(completed_at) - julianday(started_at)) * 24 * 60 ELSE NULL END) as avg_service FROM queue_tickets WHERE facility_id = ? AND DATE(created_at) = ? GROUP BY status`,
        [
          { status: 'waiting', count: 5, avg_wait: 20 },
          { status: 'called', count: 2, avg_wait: 15 },
          { status: 'serving', count: 1, avg_wait: 10 },
          { status: 'completed', count: 10, avg_wait: 25, avg_service: 12 },
        ]
      );

      const stats = await engine.getStats();
      
      expect(stats.totalWaiting).toBe(5);
      expect(stats.totalCalled).toBe(2);
      expect(stats.totalServing).toBe(1);
      expect(stats.totalCompleted).toBe(10);
      expect(stats.avgWaitMinutes).toBe(22);
      expect(stats.avgServiceMinutes).toBe(12);
    });

    it('should return zero statistics when no tickets', async () => {
      const engine = new QueueEngine(mockDb as any, mockCache as any, 'facility-1');
      
      mockDb._setData(
        `SELECT status, COUNT(*) as count, AVG(actual_wait_minutes) as avg_wait, AVG(CASE WHEN completed_at AND started_at THEN (julianday(completed_at) - julianday(started_at)) * 24 * 60 ELSE NULL END) as avg_service FROM queue_tickets WHERE facility_id = ? AND DATE(created_at) = ? GROUP BY status`,
        []
      );

      const stats = await engine.getStats();
      
      expect(stats.totalWaiting).toBe(0);
      expect(stats.totalCalled).toBe(0);
      expect(stats.totalServing).toBe(0);
      expect(stats.totalCompleted).toBe(0);
      expect(stats.avgWaitMinutes).toBe(0);
      expect(stats.avgServiceMinutes).toBe(0);
    });
  });

  describe('TV Display State', () => {
    it('should return cached TV display state when available', async () => {
      const engine = new QueueEngine(mockDb as any, mockCache as any, 'facility-1');
      
      const cachedState = {
        displayId: 'tv-1',
        departmentIds: ['dept-1'],
        currentlyCalling: { id: 'ticket-1', ticket_number: 'MED/001/001' },
        upNext: [],
        queue: [],
        lastUpdated: new Date().toISOString(),
      };
      
      mockCache._store.set('tv:tv-1', JSON.stringify(cachedState));

      const result = await engine.getTVDisplayState('tv-1', ['dept-1']);
      
      expect(result.displayId).toBe('tv-1');
      expect(result.currentlyCalling?.ticket_number).toBe('MED/001/001');
    });

    it('should mask patient names in public display', async () => {
      const engine = new QueueEngine(mockDb as any, mockCache as any, 'facility-1');
      
      const state = {
        displayId: 'tv-1',
        departmentIds: ['dept-1'],
        currentlyCalling: { 
          id: 'ticket-1', 
          ticket_number: 'MED/001/001',
          patient_name: 'John Doe',
        },
        upNext: [],
        queue: [],
        lastUpdated: new Date().toISOString(),
      };
      
      mockCache._store.set('tv:tv-1', JSON.stringify(state));

      const result = await engine.getTVDisplayStatePublic('tv-1', ['dept-1']);
      
      expect(result.currentlyCalling?.patient_name).toBe('J***e');
    });

    it('should mask short names appropriately', async () => {
      const engine = new QueueEngine(mockDb as any, mockCache as any, 'facility-1');
      
      const result = (engine as any).maskName('Jo');
      expect(result).toBe('***');
    });

    it('should mask single character names', async () => {
      const engine = new QueueEngine(mockDb as any, mockCache as any, 'facility-1');
      
      const result = (engine as any).maskName('J');
      expect(result).toBe('***');
    });

    it('should mask empty names', async () => {
      const engine = new QueueEngine(mockDb as any, mockCache as any, 'facility-1');
      
      const result = (engine as any).maskName('');
      expect(result).toBe('***');
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate cache after ticket operations', async () => {
      const engine = new QueueEngine(mockDb as any, mockCache as any, 'facility-1');
      
      mockCache._store.set('tv:display-1', 'some-data');
      mockCache._store.set('tv:display-2', 'some-data');
      mockCache._store.set('other:key', 'data');

      mockDb._setFirstData('SELECT MAX(sequence_number) as max_seq FROM queue_tickets WHERE facility_id = ? AND department_id = ? AND DATE(created_at) = ?', { max_seq: 0 });
      mockDb._setFirstData('SELECT code, average_service_time FROM departments WHERE id = ?', { code: 'MED', average_service_time: 15 });
      mockDb._setFirstData('SELECT * FROM queue_tickets WHERE id = ?', null);
      mockDb._setFirstData('SELECT COUNT(*) as count FROM queue_tickets WHERE facility_id = ? AND department_id = ? AND status = ?', { count: 0 });

      await (engine as any).invalidateCache();
      
      expect(mockCache._store.has('tv:display-1')).toBe(false);
      expect(mockCache._store.has('tv:display-2')).toBe(false);
      expect(mockCache._store.has('other:key')).toBe(true);
    });
  });

  describe('Queue Transfer', () => {
    it('should reject transfer to non-existent department', async () => {
      const engine = new QueueEngine(mockDb as any, mockCache as any, 'facility-1');
      
      mockDb._setFirstData('SELECT * FROM queue_tickets WHERE id = ?', {
        id: 'ticket-1',
        department_id: 'dept-1',
        priority: 3,
        created_at: new Date().toISOString(),
      });

      mockDb._setFirstData('SELECT code FROM departments WHERE id = ?', null);

      await expect(engine.transferTicket('ticket-1', 'non-existent', 'user-1'))
        .rejects.toThrow('Target department not found');
    });

    it('should reject transfer of non-existent ticket', async () => {
      const engine = new QueueEngine(mockDb as any, mockCache as any, 'facility-1');
      
      mockDb._setFirstData('SELECT * FROM queue_tickets WHERE id = ?', null);

      await expect(engine.transferTicket('non-existent', 'dept-2', 'user-1'))
        .rejects.toThrow('Ticket not found');
    });
  });

  describe('Priority Update', () => {
    it('should reject priority update for non-existent ticket', async () => {
      const engine = new QueueEngine(mockDb as any, mockCache as any, 'facility-1');
      
      mockDb._setFirstData('SELECT * FROM queue_tickets WHERE id = ?', null);

      await expect(engine.updatePriority('non-existent', 1, 'user-1'))
        .rejects.toThrow('Ticket not found');
    });

    it('should recalculate priority score on priority change', async () => {
      const engine = new QueueEngine(mockDb as any, mockCache as any, 'facility-1');
      
      const oldTime = new Date(Date.now() - 20 * 60 * 1000).toISOString();
      mockDb._setFirstData('SELECT * FROM queue_tickets WHERE id = ?', {
        id: 'ticket-1',
        department_id: 'dept-1',
        priority: 4,
        created_at: oldTime,
      });

      mockDb._setFirstData('SELECT MAX(sequence_number) as max_seq FROM queue_tickets WHERE facility_id = ? AND department_id = ? AND DATE(created_at) = ?', { max_seq: 0 });
      mockDb._setFirstData('SELECT code, average_service_time FROM departments WHERE id = ?', { code: 'MED', average_service_time: 15 });
      mockDb._setFirstData('SELECT COUNT(*) as count FROM queue_tickets WHERE facility_id = ? AND department_id = ? AND status = ?', { count: 0 });
      mockDb._setFirstData('SELECT * FROM queue_tickets WHERE id = ?', {
        id: 'ticket-1',
        department_id: 'dept-1',
        priority: 1,
        priority_score: -100 + 2,
        created_at: oldTime,
      });

      const result = await engine.updatePriority('ticket-1', 1, 'user-1');
      
      expect(result).not.toBeNull();
    });
  });

  describe('Department Statistics', () => {
    it('should calculate department-specific statistics', async () => {
      const engine = new QueueEngine(mockDb as any, mockCache as any, 'facility-1');
      
      mockDb._setData(
        `SELECT status, COUNT(*) as count, AVG(actual_wait_minutes) as avg_wait FROM queue_tickets WHERE facility_id = ? AND department_id = ? AND DATE(created_at) = ? GROUP BY status`,
        [
          { status: 'waiting', count: 3, avg_wait: 15 },
          { status: 'called', count: 1, avg_wait: 10 },
          { status: 'serving', count: 1, avg_wait: 5 },
          { status: 'completed', count: 8, avg_wait: 20 },
        ]
      );

      const stats = await engine.getDepartmentStats('dept-1');
      
      expect(stats.waiting).toBe(3);
      expect(stats.called).toBe(1);
      expect(stats.serving).toBe(1);
      expect(stats.completed).toBe(8);
      expect(stats.avgWait).toBe(17);
    });
  });

  describe('Emergency Override', () => {
    it('should prioritize emergency override patients', async () => {
      const engine = new QueueEngine(mockDb as any, mockCache as any, 'facility-1');
      
      mockDb._setFirstData('SELECT MAX(sequence_number) as max_seq FROM queue_tickets WHERE facility_id = ? AND department_id = ? AND DATE(created_at) = ?', { max_seq: 0 });
      mockDb._setFirstData('SELECT code FROM departments WHERE id = ?', { code: 'EMR' });
      mockDb._setFirstData('SELECT * FROM queue_tickets WHERE facility_id = ? AND patient_id = ? AND status = ?', null);
      mockDb._setFirstData('SELECT MAX(sequence_number) as max_seq FROM queue_tickets WHERE facility_id = ? AND department_id = ? AND DATE(created_at) = ?', { max_seq: 5 });
      mockDb._setFirstData('SELECT * FROM queue_tickets WHERE id = ?', {
        id: 'override-ticket',
        priority: 2,
        priority_score: 200,
        is_override: 1,
        override_reason: 'Emergency case',
      });
      mockDb._setFirstData('SELECT COUNT(*) as count FROM queue_tickets WHERE facility_id = ? AND department_id = ? AND status = ?', { count: 0 });

      const result = await engine.overrideCall({
        patientId: 'patient-1',
        departmentId: 'dept-emr',
        roomAssigned: 'E101',
        reason: 'Emergency case',
        userId: 'user-1',
      });

      expect(result).not.toBeNull();
      expect(result!.priority).toBe(2);
      expect(result!.is_override).toBe(true);
    });
  });
});
