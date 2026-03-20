import type { D1Database, KVNamespace } from '@cloudflare/workers-types';

export interface QueueTicket {
  id: string;
  facility_id: string;
  patient_id: string;
  department_id: string;
  doctor_id?: string;
  ticket_number: string;
  priority: 1 | 2 | 3 | 4;
  priority_score: number;
  status: 'waiting' | 'called' | 'serving' | 'completed' | 'no_show' | 'cancelled' | 'transferred';
  room_assigned?: string;
  called_at?: string;
  called_by?: string;
  started_at?: string;
  completed_at?: string;
  sequence_number: number;
  estimated_wait_minutes?: number;
  actual_wait_minutes?: number;
  is_override: boolean;
  override_reason?: string;
  hms_appointment_id?: string;
  created_at: string;
  updated_at?: string;
  complaint?: string;
  patient_name?: string;
  department_name?: string;
  department_code?: string;
  doctor_name?: string;
}

export interface QueueStats {
  totalWaiting: number;
  totalCalled: number;
  totalServing: number;
  totalCompleted: number;
  avgWaitMinutes: number;
  avgServiceMinutes: number;
}

export interface TVDisplayState {
  displayId: string;
  departmentIds: string[];
  currentlyCalling: QueueTicket | null;
  upNext: QueueTicket[];
  queue: QueueTicket[];
  lastUpdated: string;
}

export interface Patient {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  phone?: string;
  email?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  average_service_time: number;
}

const PRIORITY_WEIGHTS = {
  1: 100,
  2: 70,
  3: 40,
  4: 10
};

const PRIORITY_LABELS = {
  1: 'Critical',
  2: 'Emergency',
  3: 'Urgent',
  4: 'Normal'
};

export class QueueEngine {
  private facilityId: string;

  constructor(
    private db: D1Database,
    private cache: KVNamespace,
    facilityId: string
  ) {
    this.facilityId = facilityId;
  }

  async generateTicketNumber(departmentId: string, deptCode: string): Promise<{ ticketNumber: string; sequence: number }> {
    const today = new Date().toISOString().split('T')[0];
    const result = await this.db
      .prepare(`SELECT MAX(sequence_number) as max_seq FROM queue_tickets WHERE facility_id = ? AND department_id = ? AND DATE(created_at) = ?`)
      .bind(this.facilityId, departmentId, today)
      .first<{ max_seq: number | null }>();
    const nextSeq = (result?.max_seq || 0) + 1;
    return {
      ticketNumber: `${deptCode}/R---/${nextSeq.toString().padStart(3, '0')}`,
      sequence: nextSeq,
    };
  }

  calculatePriorityScore(priority: 1 | 2 | 3 | 4, createdAt: string, isAppointment: boolean = false): number {
    const waitMinutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    const waitBoost = Math.floor(waitMinutes / 10);
    const appointmentBonus = isAppointment ? 5 : 0;
    return -PRIORITY_WEIGHTS[priority] + waitBoost + appointmentBonus;
  }

  async createTicket(data: {
    patientId: string;
    departmentId: string;
    priority: 1 | 2 | 3 | 4;
    complaint?: string;
    doctorId?: string;
    hmsAppointmentId?: string;
    userId: string;
  }): Promise<QueueTicket> {
    const dept = await this.db
      .prepare('SELECT code, average_service_time FROM departments WHERE id = ?')
      .bind(data.departmentId)
      .first<{ code: string; average_service_time: number }>();
    
    if (!dept) {
      throw new Error('Department not found');
    }

    const { ticketNumber, sequence } = await this.generateTicketNumber(data.departmentId, dept.code);
    const now = new Date().toISOString();
    const priorityScore = this.calculatePriorityScore(data.priority, now, !!data.hmsAppointmentId);
    const position = await this.getQueuePosition(data.departmentId);
    const estimatedWait = position * (dept.average_service_time || 15);
    const id = crypto.randomUUID();

    await this.db
      .prepare(`
        INSERT INTO queue_tickets (
          id, facility_id, patient_id, department_id, doctor_id, ticket_number,
          priority, priority_score, status, complaint, sequence_number,
          estimated_wait_minutes, hms_appointment_id, is_override, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'waiting', ?, ?, ?, ?, 0, ?, ?)
      `)
      .bind(
        id,
        this.facilityId,
        data.patientId,
        data.departmentId,
        data.doctorId || null,
        ticketNumber,
        data.priority,
        priorityScore,
        data.complaint || null,
        sequence,
        estimatedWait,
        data.hmsAppointmentId || null,
        now,
        now
      )
      .run();

    await this.invalidateCache();
    const ticket = await this.getTicket(id);
    if (!ticket) throw new Error('Failed to retrieve created ticket');
    return ticket;
  }

  async callPatient(data: {
    ticketId: string;
    roomAssigned: string;
    doctorId?: string;
    userId: string;
  }): Promise<QueueTicket | null> {
    const ticket = await this.getTicket(data.ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }
    if (ticket.status !== 'waiting') {
      throw new Error('Ticket not waiting');
    }

    const now = new Date().toISOString();
    const actualWaitMinutes = Math.floor(
      (Date.now() - new Date(ticket.created_at).getTime()) / 60000
    );

    const dept = await this.db
      .prepare('SELECT code FROM departments WHERE id = ?')
      .bind(ticket.department_id)
      .first<{ code: string }>();

    const finalTicketNumber = `${dept?.code || 'UNK'}/${data.roomAssigned}/${ticket.sequence_number.toString().padStart(3, '0')}`;

    await this.db
      .prepare(`
        UPDATE queue_tickets
        SET status = 'called',
            room_assigned = ?,
            called_at = ?,
            called_by = ?,
            doctor_id = COALESCE(?, doctor_id),
            actual_wait_minutes = ?,
            ticket_number = ?,
            updated_at = ?
        WHERE id = ?
      `)
      .bind(
        data.roomAssigned,
        now,
        data.userId,
        data.doctorId || null,
        actualWaitMinutes,
        finalTicketNumber,
        now,
        data.ticketId
      )
      .run();

    await this.invalidateCache();
    return this.getTicket(data.ticketId);
  }

  async callNextPatient(departmentId?: string, doctorId?: string): Promise<QueueTicket | null> {
    let query = `
      SELECT * FROM queue_tickets
      WHERE facility_id = ? AND status = 'waiting'
    `;
    const bindings: any[] = [this.facilityId];

    if (departmentId) {
      query += ' AND department_id = ?';
      bindings.push(departmentId);
    }

    if (doctorId) {
      query += ' AND (doctor_id IS NULL OR doctor_id = ?)';
      bindings.push(doctorId);
    }

    query += ' ORDER BY priority_score DESC, created_at ASC LIMIT 1';

    const next = await this.db.prepare(query).bind(...bindings).first<any>();
    if (!next) return null;

    const room = await this.getAvailableRoom(departmentId);
    if (!room) {
      throw new Error('No available rooms');
    }

    return this.callPatient({
      ticketId: next.id,
      roomAssigned: room,
      doctorId,
      userId: 'system',
    });
  }

  async overrideCall(data: {
    patientId: string;
    departmentId: string;
    roomAssigned: string;
    reason: string;
    doctorId?: string;
    userId: string;
  }): Promise<QueueTicket | null> {
    const existing = await this.db
      .prepare(`SELECT * FROM queue_tickets WHERE facility_id = ? AND patient_id = ? AND status = 'waiting'`)
      .bind(this.facilityId, data.patientId)
      .first();

    if (existing) {
      const result = await this.callPatient({
        ticketId: (existing as any).id,
        roomAssigned: data.roomAssigned,
        doctorId: data.doctorId,
        userId: data.userId,
      });
      await this.db
        .prepare('UPDATE queue_tickets SET is_override = 1, override_reason = ? WHERE id = ?')
        .bind(data.reason, (existing as any).id)
        .run();
      return result;
    }

    const dept = await this.db
      .prepare('SELECT code FROM departments WHERE id = ?')
      .bind(data.departmentId)
      .first<{ code: string }>();

    const { ticketNumber, sequence } = await this.generateTicketNumber(
      data.departmentId,
      dept?.code || 'UNK'
    );
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const finalTicketNumber = `${dept?.code || 'UNK'}/${data.roomAssigned}/${sequence.toString().padStart(3, '0')}`;

    await this.db
      .prepare(`
        INSERT INTO queue_tickets (
          id, facility_id, patient_id, department_id, doctor_id, ticket_number,
          priority, priority_score, status, room_assigned, called_at, called_by,
          sequence_number, is_override, override_reason, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 2, 200, 'called', ?, ?, ?, ?, 1, ?, ?, ?)
      `)
      .bind(
        id,
        this.facilityId,
        data.patientId,
        data.departmentId,
        data.doctorId || null,
        finalTicketNumber,
        data.roomAssigned,
        now,
        data.userId,
        sequence,
        data.reason,
        now,
        now
      )
      .run();

    await this.invalidateCache();
    return this.getTicket(id);
  }

  async recallPatient(ticketId: string): Promise<QueueTicket | null> {
    const ticket = await this.getTicket(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }
    if (ticket.status !== 'called') {
      throw new Error('Ticket not called');
    }

    const now = new Date().toISOString();
    await this.db
      .prepare('UPDATE queue_tickets SET called_at = ?, updated_at = ? WHERE id = ?')
      .bind(now, now, ticketId)
      .run();

    await this.invalidateCache();
    return this.getTicket(ticketId)!;
  }

  async startServing(ticketId: string, doctorId: string): Promise<QueueTicket | null> {
    const now = new Date().toISOString();
    await this.db
      .prepare(`
        UPDATE queue_tickets
        SET status = 'serving', started_at = ?, doctor_id = COALESCE(?, doctor_id), updated_at = ?
        WHERE id = ?
      `)
      .bind(now, doctorId, now, ticketId)
      .run();

    await this.invalidateCache();
    return this.getTicket(ticketId);
  }

  async completeTicket(ticketId: string): Promise<QueueTicket | null> {
    const ticket = await this.getTicket(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const now = new Date().toISOString();
    let actualWait = ticket.actual_wait_minutes || 0;
    if (ticket.called_at) {
      actualWait = Math.floor(
        (Date.now() - new Date(ticket.called_at).getTime()) / 60000
      );
    }

    let serviceMinutes: number | null = null;
    if (ticket.started_at) {
      serviceMinutes = Math.floor(
        (Date.now() - new Date(ticket.started_at).getTime()) / 60000
      );
    }

    await this.db
      .prepare(`
        UPDATE queue_tickets
        SET status = 'completed', completed_at = ?, actual_wait_minutes = ?, updated_at = ?
        WHERE id = ?
      `)
      .bind(now, actualWait, now, ticketId)
      .run();

    await this.recordWaitTime(ticket.department_id, actualWait, serviceMinutes);
    await this.invalidateCache();
    const completed = this.getTicket(ticketId);
    return completed;
  }

  async markNoShow(ticketId: string): Promise<QueueTicket | null> {
    const ticket = await this.getTicket(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const now = new Date().toISOString();
    await this.db
      .prepare('UPDATE queue_tickets SET status = ?, updated_at = ? WHERE id = ?')
      .bind('no_show', now, ticketId)
      .run();

    await this.invalidateCache();
    const noShow = this.getTicket(ticketId);
    return noShow;
  }

  async cancelTicket(ticketId: string): Promise<QueueTicket | null> {
    const ticket = await this.getTicket(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const now = new Date().toISOString();
    await this.db
      .prepare('UPDATE queue_tickets SET status = ?, updated_at = ? WHERE id = ?')
      .bind('cancelled', now, ticketId)
      .run();

    await this.invalidateCache();
    return this.getTicket(ticketId);
  }

  async transferTicket(ticketId: string, newDepartmentId: string, userId: string): Promise<QueueTicket | null> {
    const ticket = await this.getTicket(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const dept = await this.db
      .prepare('SELECT code FROM departments WHERE id = ?')
      .bind(newDepartmentId)
      .first<{ code: string }>();

    if (!dept) {
      throw new Error('Target department not found');
    }

    const { ticketNumber, sequence } = await this.generateTicketNumber(newDepartmentId, dept.code);
    const now = new Date().toISOString();
    const newPriorityScore = this.calculatePriorityScore(ticket.priority, ticket.created_at);

    await this.db
      .prepare(`
        UPDATE queue_tickets
        SET department_id = ?,
            ticket_number = ?,
            sequence_number = ?,
            priority_score = ?,
            status = 'waiting',
            room_assigned = NULL,
            called_at = NULL,
            updated_at = ?
        WHERE id = ?
      `)
      .bind(newDepartmentId, ticketNumber, sequence, newPriorityScore, now, ticketId)
      .run();

    await this.invalidateCache();
    return this.getTicket(ticketId);
  }

  async updatePriority(ticketId: string, newPriority: 1 | 2 | 3 | 4, userId: string): Promise<QueueTicket | null> {
    const ticket = await this.getTicket(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const now = new Date().toISOString();
    const newScore = this.calculatePriorityScore(newPriority, ticket.created_at);

    await this.db
      .prepare(`
        UPDATE queue_tickets
        SET priority = ?, priority_score = ?, updated_at = ?
        WHERE id = ?
      `)
      .bind(newPriority, newScore, now, ticketId)
      .run();

    await this.invalidateCache();
    const updated = await this.getTicket(ticketId);
    return updated as QueueTicket;
  }

  async getQueue(departmentId?: string, includeCompleted: boolean = false): Promise<QueueTicket[]> {
    let query = `
      SELECT
        qt.*,
        p.first_name,
        p.last_name,
        d.name as department_name,
        d.code as department_code,
        u.first_name as doctor_first_name,
        u.last_name as doctor_last_name
      FROM queue_tickets qt
      JOIN patients p ON qt.patient_id = p.id
      JOIN departments d ON qt.department_id = d.id
      LEFT JOIN users u ON qt.doctor_id = u.id
      WHERE qt.facility_id = ?
    `;
    const bindings: any[] = [this.facilityId];

    if (departmentId) {
      query += ' AND qt.department_id = ?';
      bindings.push(departmentId);
    }

    if (!includeCompleted) {
      query += " AND qt.status IN ('waiting', 'called', 'serving')";
    }

    query += ' ORDER BY qt.priority_score DESC, qt.created_at ASC';

    const results = await this.db.prepare(query).bind(...bindings).all<any>();

    return (results.results || []).map((r: any) => ({
      ...this.mapToTicket(r),
      patient_name: `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.name || 'Unknown',
      department_name: r.department_name,
      department_code: r.department_code,
      doctor_name: r.doctor_first_name
        ? `${r.doctor_first_name} ${r.doctor_last_name || ''}`.trim()
        : undefined,
    }));
  }

  async getPatientPosition(ticketId: string): Promise<{ position: number; estimatedWait: number } | null> {
    const ticket = await this.getTicket(ticketId);
    if (!ticket) return null;

    const ahead = await this.db
      .prepare(`
        SELECT COUNT(*) as count
        FROM queue_tickets
        WHERE facility_id = ?
          AND department_id = ?
          AND status = 'waiting'
          AND priority_score > ?
      `)
      .bind(this.facilityId, ticket.department_id, ticket.priority_score)
      .first<{ count: number }>();

    const dept = await this.db
      .prepare('SELECT average_service_time FROM departments WHERE id = ?')
      .bind(ticket.department_id)
      .first<{ average_service_time: number }>();

    const avgTime = dept?.average_service_time || 15;
    const position = (ahead?.count || 0) + 1;
    const estimatedWait = position * avgTime;

    return { position, estimatedWait };
  }

  async getStats(departmentId?: string): Promise<QueueStats> {
    const today = new Date().toISOString().split('T')[0];
    let query = `
      SELECT
        status,
        COUNT(*) as count,
        AVG(actual_wait_minutes) as avg_wait,
        AVG(
          CASE
            WHEN completed_at AND started_at
            THEN (julianday(completed_at) - julianday(started_at)) * 24 * 60
            ELSE NULL
          END
        ) as avg_service
      FROM queue_tickets
      WHERE facility_id = ? AND DATE(created_at) = ?
    `;
    const bindings: any[] = [this.facilityId, today];

    if (departmentId) {
      query += ' AND department_id = ?';
      bindings.push(departmentId);
    }

    query += ' GROUP BY status';

    const results = await this.db.prepare(query).bind(...bindings).all<any>();

    const stats: QueueStats = {
      totalWaiting: 0,
      totalCalled: 0,
      totalServing: 0,
      totalCompleted: 0,
      avgWaitMinutes: 0,
      avgServiceMinutes: 0,
    };

    let totalWait = 0;
    let totalService = 0;
    let waitCount = 0;
    let serviceCount = 0;

    for (const r of results.results || []) {
      switch (r.status) {
        case 'waiting':
          stats.totalWaiting = r.count;
          break;
        case 'called':
          stats.totalCalled = r.count;
          break;
        case 'serving':
          stats.totalServing = r.count;
          break;
        case 'completed':
          stats.totalCompleted = r.count;
          break;
      }
      if (r.avg_wait) {
        totalWait += (r.avg_wait as number) * r.count;
        waitCount += r.count;
      }
      if (r.avg_service) {
        totalService += (r.avg_service as number) * r.count;
        serviceCount += r.count;
      }
    }

    stats.avgWaitMinutes = waitCount > 0 ? Math.round(totalWait / waitCount) : 0;
    stats.avgServiceMinutes = serviceCount > 0 ? Math.round(totalService / serviceCount) : 0;

    return stats;
  }

  async getTVDisplayState(displayId: string, departmentIds: string[]): Promise<TVDisplayState> {
    const cacheKey = `tv:${displayId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const placeholders = departmentIds.map(() => '?').join(',');
    const bindings = [this.facilityId, ...departmentIds];

    const called = await this.db
      .prepare(`
        SELECT
          qt.*,
          p.first_name,
          p.last_name,
          d.name as department_name,
          d.code as department_code,
          u.first_name as doctor_first_name,
          u.last_name as doctor_last_name
        FROM queue_tickets qt
        JOIN patients p ON qt.patient_id = p.id
        JOIN departments d ON qt.department_id = d.id
        LEFT JOIN users u ON qt.doctor_id = u.id
        WHERE qt.facility_id = ?
          AND qt.department_id IN (${placeholders})
          AND qt.status = 'called'
        ORDER BY qt.called_at DESC
        LIMIT 1
      `)
      .bind(...bindings)
      .first<any>();

    const upNextResults = await this.db
      .prepare(`
        SELECT
          qt.*,
          p.first_name,
          p.last_name,
          d.name as department_name,
          d.code as department_code
        FROM queue_tickets qt
        JOIN patients p ON qt.patient_id = p.id
        JOIN departments d ON qt.department_id = d.id
        WHERE qt.facility_id = ?
          AND qt.department_id IN (${placeholders})
          AND qt.status = 'waiting'
        ORDER BY qt.priority_score DESC, qt.created_at ASC
        LIMIT 5
      `)
      .bind(...bindings)
      .all<any>();

    const queueResults = await this.db
      .prepare(`
        SELECT
          qt.*,
          p.first_name,
          p.last_name,
          d.name as department_name,
          d.code as department_code
        FROM queue_tickets qt
        JOIN patients p ON qt.patient_id = p.id
        JOIN departments d ON qt.department_id = d.id
        WHERE qt.facility_id = ?
          AND qt.department_id IN (${placeholders})
          AND qt.status IN ('waiting', 'called', 'serving')
        ORDER BY qt.priority_score DESC
      `)
      .bind(...bindings)
      .all<any>();

    const mapTicket = (r: any): QueueTicket => ({
      ...this.mapToTicket(r),
      patient_name: `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.name || 'Unknown',
      department_name: r.department_name,
      department_code: r.department_code,
    });

    const state: TVDisplayState = {
      displayId,
      departmentIds,
      currentlyCalling: called ? mapTicket(called) : null,
      upNext: (upNextResults.results || []).map(mapTicket),
      queue: (queueResults.results || []).map(mapTicket),
      lastUpdated: new Date().toISOString(),
    };

    await this.cache.put(cacheKey, JSON.stringify(state), { expirationTtl: 5 });
    return state;
  }

  async getTVDisplayStatePublic(displayId: string, departmentIds: string[]): Promise<TVDisplayState> {
    const state = await this.getTVDisplayState(displayId, departmentIds);

    if (state.currentlyCalling) {
      state.currentlyCalling = {
        ...state.currentlyCalling,
        patient_name: this.maskName(state.currentlyCalling.patient_name || ''),
      };
    }

    state.upNext = state.upNext.map(ticket => ({
      ...ticket,
      patient_name: this.maskName(ticket.patient_name || ''),
    }));

    state.queue = state.queue.map(ticket => ({
      ...ticket,
      patient_name: this.maskName(ticket.patient_name || ''),
    }));

    return state;
  }

  private maskName(name: string): string {
    if (!name || name.length < 2) return '***';
    return name.charAt(0) + '***' + name.charAt(name.length - 1);
  }

  async getPatientQueueHistory(
    patientId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<{ tickets: QueueTicket[]; total: number }> {
    const results = await this.db
      .prepare(`
        SELECT
          qt.*,
          d.name as department_name,
          d.code as department_code
        FROM queue_tickets qt
        JOIN departments d ON qt.department_id = d.id
        WHERE qt.patient_id = ?
        ORDER BY qt.created_at DESC
        LIMIT ? OFFSET ?
      `)
      .bind(patientId, limit, offset)
      .all<any>();

    const countResult = await this.db
      .prepare('SELECT COUNT(*) as count FROM queue_tickets WHERE patient_id = ?')
      .bind(patientId)
      .first<{ count: number }>();

    return {
      tickets: (results.results || []).map((r: any) => ({
        ...this.mapToTicket(r),
        department_name: r.department_name,
        department_code: r.department_code,
      })),
      total: countResult?.count || 0,
    };
  }

  async getDepartmentStats(departmentId: string): Promise<{
    waiting: number;
    called: number;
    serving: number;
    completed: number;
    avgWait: number;
  }> {
    const today = new Date().toISOString().split('T')[0];
    const results = await this.db
      .prepare(`
        SELECT
          status,
          COUNT(*) as count,
          AVG(actual_wait_minutes) as avg_wait
        FROM queue_tickets
        WHERE facility_id = ? AND department_id = ? AND DATE(created_at) = ?
        GROUP BY status
      `)
      .bind(this.facilityId, departmentId, today)
      .all<any>();

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
        totalWait += r.avg_wait as number;
        waitCount++;
      }
    }

    stats.avgWait = waitCount > 0 ? Math.round(totalWait / waitCount) : 0;
    return stats;
  }

  private async getTicket(id: string): Promise<QueueTicket | null> {
    const r = await this.db
      .prepare('SELECT * FROM queue_tickets WHERE id = ?')
      .bind(id)
      .first<any>();
    return r ? this.mapToTicket(r) : null;
  }

  private async getQueuePosition(departmentId: string): Promise<number> {
    const r = await this.db
      .prepare(`
        SELECT COUNT(*) as count
        FROM queue_tickets
        WHERE facility_id = ? AND department_id = ? AND status = ?
      `)
      .bind(this.facilityId, departmentId, 'waiting')
      .first<{ count: number }>();
    return r?.count || 0;
  }

  private async getAvailableRoom(departmentId?: string): Promise<string | null> {
    let query = `
      SELECT room_number
      FROM rooms
      WHERE status = 'available'
    `;
    const bindings: any[] = [];

    if (departmentId) {
      query += ' AND department_id = ?';
      bindings.push(departmentId);
    }

    query += ' LIMIT 1';

    const result = await this.db.prepare(query).bind(...bindings).first<Record<string, string>>();
    return result?.['room_number'] || 'R01';
  }

  private mapToTicket(row: any): QueueTicket {
    return {
      id: row.id,
      facility_id: row.facility_id,
      patient_id: row.patient_id,
      department_id: row.department_id,
      doctor_id: row.doctor_id,
      ticket_number: row.ticket_number,
      priority: row.priority as 1 | 2 | 3 | 4,
      priority_score: row.priority_score,
      status: row.status,
      room_assigned: row.room_assigned,
      called_at: row.called_at,
      called_by: row.called_by,
      started_at: row.started_at,
      completed_at: row.completed_at,
      sequence_number: row.sequence_number,
      estimated_wait_minutes: row.estimated_wait_minutes,
      actual_wait_minutes: row.actual_wait_minutes,
      is_override: !!row.is_override,
      override_reason: row.override_reason,
      hms_appointment_id: row.hms_appointment_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      complaint: row.complaint,
    };
  }

  private async invalidateCache(): Promise<void> {
    const keys = await this.cache.list({ prefix: 'tv:' });
    for (const k of keys.keys || []) {
      await this.cache.delete(k.name);
    }
  }

  private async recordWaitTime(
    deptId: string,
    waitMin: number,
    serviceMin: number | null
  ): Promise<void> {
    const now = new Date();
    await this.db
      .prepare(`
        INSERT INTO wait_time_history (
          id, facility_id, department_id, date, hour_of_day, day_of_week,
          avg_wait_seconds, patient_count, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
      `)
      .bind(
        crypto.randomUUID(),
        this.facilityId,
        deptId,
        now.toISOString().split('T')[0],
        now.getHours(),
        now.getDay(),
        waitMin * 60,
        now.toISOString()
      )
      .run();
  }

  getPriorityLabel(priority: 1 | 2 | 3 | 4): string {
    return PRIORITY_LABELS[priority];
  }
}

export function createQueueEngine(
  db: D1Database,
  cache: KVNamespace,
  facilityId: string
): QueueEngine {
  return new QueueEngine(db, cache, facilityId);
}
