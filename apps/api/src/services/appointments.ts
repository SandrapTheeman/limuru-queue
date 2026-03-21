// Appointments Service
import { generateId, now } from '../utils';

export interface Appointment {
  id: string;
  patient_id: string;
  patient_name?: string;
  doctor_id: string | null;
  doctor_name?: string | null;
  department: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  status: AppointmentStatus;
  reason: string | null;
  notes: string | null;
  checked_in_at: string | null;
  checked_in_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type AppointmentStatus = 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

export interface CreateAppointmentInput {
  patient_id: string;
  doctor_id?: string;
  department: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes?: number;
  reason?: string;
  notes?: string;
  created_by?: string;
}

export interface UpdateAppointmentInput {
  doctor_id?: string;
  department?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  duration_minutes?: number;
  reason?: string;
  notes?: string;
}

export interface ListAppointmentsInput {
  department?: string;
  doctor_id?: string;
  patient_id?: string;
  status?: AppointmentStatus;
  date?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export async function createAppointment(
  db: D1Database,
  input: CreateAppointmentInput
): Promise<Appointment> {
  const id = generateId('apt');
  const createdAt = now();
  const status: AppointmentStatus = 'scheduled';
  const durationMinutes = input.duration_minutes || 30;

  await db.prepare(`
    INSERT INTO appointments (
      id, patient_id, doctor_id, department, scheduled_date, scheduled_time,
      duration_minutes, status, reason, notes, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.patient_id,
    input.doctor_id || null,
    input.department,
    input.scheduled_date,
    input.scheduled_time,
    durationMinutes,
    status,
    input.reason || null,
    input.notes || null,
    input.created_by || null,
    createdAt,
    createdAt
  ).run();

  return getAppointment(db, id) as Promise<Appointment>;
}

export async function getAppointment(
  db: D1Database,
  appointmentId: string
): Promise<Appointment | null> {
  const result = await db.prepare(`
    SELECT 
      a.*,
      p.first_name || ' ' || p.last_name as patient_name,
      u.first_name || ' ' || u.last_name as doctor_name
    FROM appointments a
    LEFT JOIN patients p ON a.patient_id = p.id
    LEFT JOIN users u ON a.doctor_id = u.id
    WHERE a.id = ?
  `).bind(appointmentId).first();

  return result as Appointment | null;
}

export async function listAppointments(
  db: D1Database,
  input: ListAppointmentsInput = {}
): Promise<{ appointments: Appointment[]; total: number }> {
  const conditions: string[] = [];
  const bindings: any[] = [];

  if (input.department) {
    conditions.push('a.department_id = ?');
    bindings.push(input.department);
  }

  if (input.doctor_id) {
    conditions.push('a.doctor_id = ?');
    bindings.push(input.doctor_id);
  }

  if (input.patient_id) {
    conditions.push('a.patient_id = ?');
    bindings.push(input.patient_id);
  }

  if (input.status) {
    conditions.push('a.status = ?');
    bindings.push(input.status);
  }

  if (input.date) {
    conditions.push('a.scheduled_date = ?');
    bindings.push(input.date);
  }

  if (input.start_date) {
    conditions.push('a.scheduled_date >= ?');
    bindings.push(input.start_date);
  }

  if (input.end_date) {
    conditions.push('a.scheduled_date <= ?');
    bindings.push(input.end_date);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await db.prepare(`
    SELECT COUNT(*) as count FROM appointments a ${whereClause}
  `).bind(...bindings).first() as { count: number };

  const limit = input.limit || 50;
  const offset = input.offset || 0;

  const appointments = await db.prepare(`
    SELECT 
      a.*,
      p.first_name || ' ' || p.last_name as patient_name,
      u.first_name || ' ' || u.last_name as doctor_name
    FROM appointments a
    LEFT JOIN patients p ON a.patient_id = p.id
    LEFT JOIN users u ON a.doctor_id = u.id
    ${whereClause}
    ORDER BY a.scheduled_date ASC, a.scheduled_time ASC
    LIMIT ? OFFSET ?
  `).bind(...bindings, limit, offset).all();

  return {
    appointments: (appointments.results || []) as unknown as Appointment[],
    total: countResult?.count || 0,
  };
}

export async function updateAppointment(
  db: D1Database,
  appointmentId: string,
  input: UpdateAppointmentInput
): Promise<Appointment | null> {
  const existing = await getAppointment(db, appointmentId);
  if (!existing) return null;

  if (existing.status === 'cancelled' || existing.status === 'completed') {
    throw new Error(`Cannot update appointment with status: ${existing.status}`);
  }

  const updates: string[] = [];
  const bindings: any[] = [];

  if (input.doctor_id !== undefined) {
    updates.push('doctor_id = ?');
    bindings.push(input.doctor_id);
  }

  if (input.department !== undefined) {
    updates.push('department_id = ?');
    bindings.push(input.department);
  }

  if (input.scheduled_date !== undefined) {
    updates.push('scheduled_date = ?');
    bindings.push(input.scheduled_date);
  }

  if (input.scheduled_time !== undefined) {
    updates.push('scheduled_time = ?');
    bindings.push(input.scheduled_time);
  }

  if (input.duration_minutes !== undefined) {
    updates.push('duration_minutes = ?');
    bindings.push(input.duration_minutes);
  }

  if (input.reason !== undefined) {
    updates.push('reason = ?');
    bindings.push(input.reason);
  }

  if (input.notes !== undefined) {
    updates.push('notes = ?');
    bindings.push(input.notes);
  }

  if (updates.length === 0) return existing;

  updates.push('updated_at = ?');
  bindings.push(now());
  bindings.push(appointmentId);

  await db.prepare(`
    UPDATE appointments SET ${updates.join(', ')} WHERE id = ?
  `).bind(...bindings).run();

  return getAppointment(db, appointmentId);
}

export async function deleteAppointment(
  db: D1Database,
  appointmentId: string
): Promise<boolean> {
  const existing = await getAppointment(db, appointmentId);
  if (!existing) return false;

  if (existing.status === 'in_progress' || existing.status === 'completed') {
    throw new Error(`Cannot delete appointment with status: ${existing.status}`);
  }

  await db.prepare('DELETE FROM appointments WHERE id = ?').bind(appointmentId).run();
  return true;
}

export async function checkInAppointment(
  db: D1Database,
  appointmentId: string,
  checkedInBy?: string
): Promise<Appointment | null> {
  const existing = await getAppointment(db, appointmentId);
  if (!existing) return null;

  if (existing.status !== 'scheduled') {
    throw new Error(`Cannot check in appointment with status: ${existing.status}`);
  }

  const checkedInAt = now();

  await db.prepare(`
    UPDATE appointments 
    SET status = 'checked_in', checked_in_at = ?, checked_in_by = ?, updated_at = ?
    WHERE id = ?
  `).bind(checkedInAt, checkedInBy || null, checkedInAt, appointmentId).run();

  return getAppointment(db, appointmentId);
}

export async function cancelAppointment(
  db: D1Database,
  appointmentId: string,
  cancelledBy?: string,
  reason?: string
): Promise<Appointment | null> {
  const existing = await getAppointment(db, appointmentId);
  if (!existing) return null;

  if (existing.status === 'cancelled') {
    throw new Error('Appointment is already cancelled');
  }

  if (existing.status === 'completed' || existing.status === 'in_progress') {
    throw new Error(`Cannot cancel appointment with status: ${existing.status}`);
  }

  const cancelledAt = now();

  await db.prepare(`
    UPDATE appointments 
    SET status = 'cancelled', cancelled_at = ?, cancelled_by = ?, 
        cancellation_reason = ?, updated_at = ?
    WHERE id = ?
  `).bind(cancelledAt, cancelledBy || null, reason || null, cancelledAt, appointmentId).run();

  return getAppointment(db, appointmentId);
}

export async function getPatientAppointments(
  db: D1Database,
  patientId: string,
  limit = 10,
  offset = 0
): Promise<{ appointments: Appointment[]; total: number }> {
  const countResult = await db.prepare(`
    SELECT COUNT(*) as count FROM appointments WHERE patient_id = ?
  `).bind(patientId).first() as { count: number };

  const appointments = await db.prepare(`
    SELECT 
      a.*,
      d.name as doctor_name
    FROM appointments a
    LEFT JOIN doctors d ON a.doctor_id = d.id
    WHERE a.patient_id = ?
    ORDER BY a.scheduled_date DESC, a.scheduled_time DESC
    LIMIT ? OFFSET ?
  `).bind(patientId, limit, offset).all();

  return {
    appointments: (appointments.results || []) as unknown as Appointment[],
    total: countResult?.count || 0,
  };
}

export async function getTodayAppointments(
  db: D1Database,
  department?: string,
  doctorId?: string
): Promise<Appointment[]> {
  const today = new Date().toISOString().split('T')[0];
  const conditions = ['a.scheduled_date = ?'];
  const bindings: any[] = [today];

  if (department) {
    conditions.push('a.department_id = ?');
    bindings.push(department);
  }

  if (doctorId) {
    conditions.push('a.doctor_id = ?');
    bindings.push(doctorId);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')} AND a.status != 'cancelled'`;

  const result = await db.prepare(`
    SELECT 
      a.*,
      p.first_name || ' ' || p.last_name as patient_name,
      u.first_name || ' ' || u.last_name as doctor_name
    FROM appointments a
    LEFT JOIN patients p ON a.patient_id = p.id
    LEFT JOIN users u ON a.doctor_id = u.id
    ${whereClause}
    ORDER BY a.scheduled_time ASC
  `).bind(...bindings).all();

  return (result.results || []) as unknown as Appointment[];
}
