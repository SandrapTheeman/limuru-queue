import type { D1Database } from '@cloudflare/workers-types';

export interface QueueTicket {
  id: string;
  facility_id: string;
  patient_id: string;
  department_id: string;
  priority_score: number;
  status: 'waiting' | 'called' | 'serving' | 'completed' | 'no_show' | 'cancelled';
  created_at: string;
  ticket_number: string;
}

export interface OptimizedQueries {
  getQueueWithPosition: (
    db: D1Database,
    facilityId: string,
    departmentId?: string,
    limit?: number
  ) => Promise<(QueueTicket & { position: number })[]>;
  
  getPatientPosition: (
    db: D1Database,
    facilityId: string,
    ticketId: string
  ) => Promise<{ position: number; estimatedWait: number } | null>;
  
  getQueueStats: (
    db: D1Database,
    facilityId: string,
    departmentId?: string
  ) => Promise<{
    waiting: number;
    called: number;
    serving: number;
    completed: number;
    avgWait: number;
  }>;
  
  searchPatients: (
    db: D1Database,
    query: string,
    limit?: number
  ) => Promise<{ id: string; name: string; phone: string | null }[]>;
  
  getPatientActiveVisit: (
    db: D1Database,
    patientId: string
  ) => Promise<QueueTicket | null>;
}

export const createOptimizedQueries = (): OptimizedQueries => {
  return {
    getQueueWithPosition: async (db, facilityId, departmentId, limit = 50) => {
      const today = new Date().toISOString().split('T')[0];
      
      let sql = `
        WITH queue_cte AS (
          SELECT 
            qt.*,
            ROW_NUMBER() OVER (
              PARTITION BY qt.department_id 
              ORDER BY qt.priority_score DESC, qt.created_at ASC
            ) as position
          FROM queue_tickets qt
          WHERE qt.facility_id = ?
            AND qt.status IN ('waiting', 'called', 'serving')
            AND DATE(qt.created_at) = ?
      `;
      const bindings: unknown[] = [facilityId, today];

      if (departmentId) {
        sql += ` AND qt.department_id = ?`;
        bindings.push(departmentId);
      }

      sql += `)
        SELECT * FROM queue_cte WHERE position <= ?`;
      bindings.push(limit);

      const result = await db.prepare(sql).bind(...bindings).all<QueueTicket & { position: number }>();
      return result.results || [];
    },

    getPatientPosition: async (db, facilityId, ticketId) => {
      const ticket = await db.prepare(`
        SELECT department_id, priority_score 
        FROM queue_tickets 
        WHERE id = ? AND facility_id = ?
      `).bind(ticketId, facilityId).first<{ department_id: string; priority_score: number }>();

      if (!ticket) return null;

      const ahead = await db.prepare(`
        SELECT COUNT(*) as count
        FROM queue_tickets
        WHERE facility_id = ?
          AND department_id = ?
          AND status = 'waiting'
          AND priority_score > ?
      `).bind(facilityId, ticket.department_id, ticket.priority_score).first<{ count: number }>();

      const dept = await db.prepare(`
        SELECT average_service_time 
        FROM departments 
        WHERE id = ?
      `).first<{ average_service_time: number }>();

      const avgTime = dept?.average_service_time || 15;
      const position = (ahead?.count || 0) + 1;

      return {
        position,
        estimatedWait: position * avgTime,
      };
    },

    getQueueStats: async (db, facilityId, departmentId) => {
      const today = new Date().toISOString().split('T')[0];
      
      let sql = `
        SELECT 
          status,
          COUNT(*) as count,
          AVG(actual_wait_minutes) as avg_wait
        FROM queue_tickets
        WHERE facility_id = ? AND DATE(created_at) = ?
      `;
      const bindings: unknown[] = [facilityId, today];

      if (departmentId) {
        sql += ` AND department_id = ?`;
        bindings.push(departmentId);
      }

      sql += ` GROUP BY status`;

      const results = await db.prepare(sql).bind(...bindings).all<{
        status: string;
        count: number;
        avg_wait: number | null;
      }>();

      const stats = { waiting: 0, called: 0, serving: 0, completed: 0, avgWait: 0 };
      let totalWait = 0;
      let waitCount = 0;

      for (const r of results.results || []) {
        switch (r.status) {
          case 'waiting':
            stats.waiting = r.count;
            break;
          case 'called':
            stats.called = r.count;
            break;
          case 'serving':
            stats.serving = r.count;
            break;
          case 'completed':
            stats.completed = r.count;
            break;
        }
        if (r.avg_wait) {
          totalWait += r.avg_wait;
          waitCount++;
        }
      }

      stats.avgWait = waitCount > 0 ? Math.round(totalWait / waitCount) : 0;
      return stats;
    },

    searchPatients: async (db, query, limit = 10) => {
      const pattern = `%${query}%`;
      
      const result = await db.prepare(`
        SELECT id, name, phone
        FROM patients 
        WHERE phone LIKE ? 
           OR national_id LIKE ?
           OR name LIKE ?
        LIMIT ?
      `).bind(pattern, pattern, pattern, limit).all<{ id: string; name: string; phone: string | null }>();

      return result.results || [];
    },

    getPatientActiveVisit: async (db, patientId) => {
      const result = await db.prepare(`
        SELECT * FROM queue_tickets 
        WHERE patient_id = ? 
          AND status IN ('waiting', 'called', 'serving')
        ORDER BY created_at DESC
        LIMIT 1
      `).bind(patientId).first<QueueTicket>();

      return result || null;
    },
  };
};

export const BATCH_QUERIES = {
  getQueueWithCounts: async (db: D1Database, facilityId: string, departmentId: string) => {
    const today = new Date().toISOString().split('T')[0];
    
    const [queue, counts] = await Promise.all([
      db.prepare(`
        SELECT qt.*, p.first_name, p.last_name, d.name as department_name
        FROM queue_tickets qt
        JOIN patients p ON qt.patient_id = p.id
        JOIN departments d ON qt.department_id = d.id
        WHERE qt.facility_id = ?
          AND qt.department_id = ?
          AND qt.status IN ('waiting', 'called', 'serving')
          AND DATE(qt.created_at) = ?
        ORDER BY qt.priority_score DESC, qt.created_at ASC
        LIMIT 100
      `).bind(facilityId, departmentId, today).all(),
      
      db.prepare(`
        SELECT status, COUNT(*) as count
        FROM queue_tickets
        WHERE facility_id = ?
          AND department_id = ?
          AND DATE(created_at) = ?
        GROUP BY status
      `).bind(facilityId, departmentId, today).all(),
    ]);

    const countMap: Record<string, number> = {};
    for (const row of (counts.results || []) as { status: string; count: number }[]) {
      countMap[row.status] = row.count;
    }

    return { queue: queue.results, counts: countMap };
  },
};

export const TRANSACTION_HELPERS = {
  createTicketWithHistory: async (
    db: D1Database,
    ticketData: {
      id: string;
      facilityId: string;
      patientId: string;
      departmentId: string;
      ticketNumber: string;
      priority: number;
      priorityScore: number;
      sequenceNumber: number;
      estimatedWait: number;
      complaint?: string;
      userId: string;
    }
  ) => {
    const now = new Date().toISOString();
    
    await db.batch([
      db.prepare(`
        INSERT INTO queue_tickets (
          id, facility_id, patient_id, department_id, ticket_number,
          priority, priority_score, status, complaint, sequence_number,
          estimated_wait_minutes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'waiting', ?, ?, ?, ?, ?)
      `).bind(
        ticketData.id,
        ticketData.facilityId,
        ticketData.patientId,
        ticketData.departmentId,
        ticketData.ticketNumber,
        ticketData.priority,
        ticketData.priorityScore,
        ticketData.complaint || null,
        ticketData.sequenceNumber,
        ticketData.estimatedWait,
        now,
        now
      ),
      db.prepare(`
        INSERT INTO queue_history (
          id, visit_id, action, actor_id, actor_type, timestamp, metadata
        ) VALUES (?, ?, 'created', ?, 'system', ?, ?)
      `).bind(
        crypto.randomUUID(),
        ticketData.id,
        ticketData.userId,
        now,
        JSON.stringify({ ticket_number: ticketData.ticketNumber })
      ),
    ]);
  },

  callPatientWithHistory: async (
    db: D1Database,
    ticketId: string,
    roomAssigned: string,
    doctorId: string,
    userId: string
  ) => {
    const now = new Date().toISOString();
    
    await db.batch([
      db.prepare(`
        UPDATE queue_tickets
        SET status = 'called',
            room_assigned = ?,
            called_at = ?,
            called_by = ?,
            doctor_id = COALESCE(?, doctor_id),
            actual_wait_minutes = (
              SELECT CAST((julianday(?) - julianday(created_at)) * 24 * 60 AS INTEGER)
              FROM queue_tickets WHERE id = ?
            ),
            updated_at = ?
        WHERE id = ?
      `).bind(roomAssigned, now, userId, doctorId, now, ticketId, now, ticketId),
      db.prepare(`
        INSERT INTO queue_history (
          id, visit_id, action, actor_id, actor_type, timestamp
        ) VALUES (?, ?, 'called', ?, 'staff', ?)
      `).bind(crypto.randomUUID(), ticketId, userId, now),
    ]);
  },
};
