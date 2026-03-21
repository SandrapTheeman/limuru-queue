// Queue Management Service
import { QueueItem, QueueResponse } from '../types';
import { generateId, generateTicketNumber, calculateWaitTime, now } from '../utils';

// Get queue for a department (accepts department CODE, not ID)
export async function getQueue(
  db: D1Database,
  departmentCode: string,
  limit = 20,
  offset = 0
): Promise<QueueResponse> {
  // Look up department ID from code
  const dept = await db.prepare('SELECT id FROM departments WHERE code = ?').bind(departmentCode).first() as { id: string } | undefined;
  if (!dept) {
    return { department: departmentCode, waiting: 0, called: 0, patients: [], estimated_wait_time: 0, next_call_estimate: '' };
  }
  const departmentId = dept.id;

  // Get waiting patients
  const waiting = await db.prepare(`
    SELECT v.*, 
           p.first_name || ' ' || p.last_name as patient_name,
           p.phone as patient_phone,
           p.date_of_birth as patient_dob,
           d.name as department_name
    FROM queue_tickets v
    JOIN patients p ON v.patient_id = p.id
    LEFT JOIN departments d ON v.department_id = d.id
    WHERE v.department_id = ? AND v.status = 'waiting'
    ORDER BY v.priority DESC, v.created_at ASC
    LIMIT ? OFFSET ?
  `).bind(departmentId, limit, offset).all();
  
  // Get count of waiting
  const waitingCount = await db.prepare(`
    SELECT COUNT(*) as count FROM queue_tickets 
    WHERE department_id = ? AND status = 'waiting'
  `).bind(departmentId).first() as { count: number };
  
  // Get count of called
  const calledCount = await db.prepare(`
    SELECT COUNT(*) as count FROM queue_tickets 
    WHERE department_id = ? AND status = 'called'
  `).bind(departmentId).first() as { count: number };
  
  // Get wait time setting
  const waitTimeSetting = await db.prepare(`
    SELECT value FROM settings WHERE key = 'wait_time_per_patient'
  `).first() as { value: string } | undefined;
  
  const waitTimePerPatient = waitTimeSetting ? parseInt(waitTimeSetting.value) : 15;
  
  // Build queue items
  const items: QueueItem[] = (waiting.results || []).map((visit: any, index: number) => ({
    id: visit.id,
    ticket_number: visit.ticket_number,
    patient_name: visit.patient_name,
    priority: visit.priority,
    wait_time: calculateWaitTime(visit.created_at),
    position: offset + index + 1,
    status: visit.status,
    joined_at: visit.created_at,
  }));
  
  const waitingTotal = waitingCount?.count || 0;
  const estimatedWait = waitingTotal * waitTimePerPatient;
  
  const nextCallDate = new Date();
  nextCallDate.setMinutes(nextCallDate.getMinutes() + estimatedWait);
  
  return {
    department: departmentCode,
    waiting: waitingTotal,
    called: calledCount?.count || 0,
    patients: items,
    estimated_wait_time: estimatedWait,
    next_call_estimate: nextCallDate.toISOString(),
  };
}

// Add patient to queue
export async function addToQueue(
  db: D1Database,
  data: {
    name: string;
    phone?: string;
    email?: string;
    department: string;  // department CODE
    priority?: number;
    patientId?: string;
  }
): Promise<{ visit: any; position: number; estimatedWaitTime: number }> {
  // Look up department ID from code
  const dept = await db.prepare('SELECT id FROM departments WHERE code = ?').bind(data.department).first() as { id: string } | undefined;
  if (!dept) {
    throw new Error(`Department '${data.department}' not found`);
  }
  const departmentId = dept.id;

  // Get current ticket count for department
  const countResult = await db.prepare(`
    SELECT COUNT(*) as count FROM queue_tickets 
    WHERE department_id = ? AND status IN ('waiting', 'called', 'in_progress')
    AND date(created_at) = date('now')
  `).bind(departmentId).first() as { count: number } | undefined;
  
  const count = countResult?.count || 0;
  const ticketNumber = generateTicketNumber(data.department, count);
  
  // Get or create patient
  let patientId = data.patientId;
  
  if (!patientId) {
    // Create new patient - parse name into first/last
    patientId = generateId('patient');
    const nameParts = (data.name || '').trim().split(/\s+/);
    const firstName = nameParts[0] || 'Unknown';
    const lastName = nameParts.slice(1).join(' ') || '-';
    await db.prepare(`
      INSERT INTO patients (id, first_name, last_name, email, phone)
      VALUES (?, ?, ?, ?, ?)
    `).bind(patientId, firstName, lastName, data.email || null, data.phone || null).run();
  }
  
  // Create queue ticket
  const visitId = generateId('visit');
  const createdAt = now();
  
  await db.prepare(`
    INSERT INTO queue_tickets (id, patient_id, department_id, ticket_number, priority, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'waiting', ?)
  `).bind(visitId, patientId, departmentId, ticketNumber, data.priority || 3, createdAt).run();
  
  // Get wait time setting
  const waitTimeSetting = await db.prepare(`
    SELECT value FROM settings WHERE key = 'wait_time_per_patient'
  `).first() as { value: string } | undefined;
  
  const waitTimePerPatient = waitTimeSetting ? parseInt(waitTimeSetting.value) : 15;
  const position = count + 1;
  const estimatedWaitTime = position * waitTimePerPatient;
  
  const visit = await db.prepare(`
    SELECT v.*, 
           p.first_name || ' ' || p.last_name as patient_name
    FROM queue_tickets v
    JOIN patients p ON v.patient_id = p.id
    WHERE v.id = ?
  `).bind(visitId).first();
  
  return { visit, position, estimatedWaitTime };
}

// Call patient
export async function callPatient(
  db: D1Database,
  visitId: string,
  doctorId: string,
  roomAssigned?: string
): Promise<any> {
  const calledAt = now();
  
  await db.prepare(`
    UPDATE queue_tickets 
    SET status = 'called', called_at = ?, doctor_id = ?, room_assigned = ?, call_count = call_count + 1, first_call_at = COALESCE(first_call_at, ?)
    WHERE id = ?
  `).bind(calledAt, doctorId, roomAssigned || null, calledAt, visitId).run();
  
  return await db.prepare(`
    SELECT v.*, 
           p.first_name || ' ' || p.last_name as patient_name,
           p.phone as patient_phone
    FROM queue_tickets v
    JOIN patients p ON v.patient_id = p.id
    WHERE v.id = ?
  `).bind(visitId).first();
}

// Start consultation
export async function startConsultation(
  db: D1Database,
  visitId: string
): Promise<any> {
  const startedAt = now();
  
  await db.prepare(`
    UPDATE queue_tickets SET status = 'in_progress', started_at = ?
    WHERE id = ?
  `).bind(startedAt, visitId).run();
  
  return await db.prepare(`
    SELECT v.*, p.first_name || ' ' || p.last_name as patient_name
    FROM queue_tickets v
    JOIN patients p ON v.patient_id = p.id
    WHERE v.id = ?
  `).bind(visitId).first();
}

// Complete visit
export async function completeVisit(
  db: D1Database,
  visitId: string,
  completedBy?: string,
  notes?: string
): Promise<any> {
  const completedAt = now();
  
  // Get visit to calculate wait time
  const visit: any = await db.prepare('SELECT * FROM queue_tickets WHERE id = ?').bind(visitId).first();
  
  let waitTime = 0;
  if (visit?.started_at) {
    const started = new Date(visit.started_at).getTime();
    const completed = new Date(completedAt).getTime();
    waitTime = Math.round((completed - started) / 60000);
  }
  
  await db.prepare(`
    UPDATE queue_tickets 
    SET status = 'completed', completed_at = ?, completed_by = ?, wait_time_minutes = ?, notes = ?
    WHERE id = ?
  `).bind(completedAt, completedBy || null, waitTime, notes || null, visitId).run();
  
  return await db.prepare(`
    SELECT v.*, p.first_name || ' ' || p.last_name as patient_name
    FROM queue_tickets v
    JOIN patients p ON v.patient_id = p.id
    WHERE v.id = ?
  `).bind(visitId).first();
}

// Mark as no-show
export async function markNoShow(
  db: D1Database,
  visitId: string
): Promise<any> {
  await db.prepare(`
    UPDATE queue_tickets SET status = 'no_show', no_show_count = no_show_count + 1 WHERE id = ?
  `).bind(visitId).run();
  
  return await db.prepare('SELECT * FROM queue_tickets WHERE id = ?').bind(visitId).first();
}

// Transfer patient
export async function transferPatient(
  db: D1Database,
  visitId: string,
  newDepartmentCode: string,
  actorId?: string
): Promise<any> {
  // Look up new department ID from code
  const dept = await db.prepare('SELECT id FROM departments WHERE code = ?').bind(newDepartmentCode).first() as { id: string } | undefined;
  if (!dept) {
    throw new Error(`Department '${newDepartmentCode}' not found`);
  }
  const newDepartmentId = dept.id;
  
  const countResult = await db.prepare(`
    SELECT COUNT(*) as count FROM queue_tickets 
    WHERE department_id = ? AND status IN ('waiting', 'called', 'in_progress')
    AND date(created_at) = date('now')
  `).bind(newDepartmentId).first() as { count: number } | undefined;
  
  const newTicketNumber = generateTicketNumber(newDepartmentCode, countResult?.count || 0);
  
  await db.prepare(`
    UPDATE queue_tickets 
    SET department_id = ?, ticket_number = ?, status = 'waiting',
        transferred_to_department = ?, transferred_at = ?
    WHERE id = ?
  `).bind(newDepartmentId, newTicketNumber, newDepartmentId, now(), visitId).run();
  
  return await db.prepare(`
    SELECT v.*, p.first_name || ' ' || p.last_name as patient_name
    FROM queue_tickets v
    JOIN patients p ON v.patient_id = p.id
    WHERE v.id = ?
  `).bind(visitId).first();
}

// Get visit by ID
export async function getVisit(
  db: D1Database,
  visitId: string
): Promise<any> {
  return await db.prepare(`
    SELECT v.*, 
           p.first_name || ' ' || p.last_name as patient_name,
           p.phone as patient_phone
    FROM queue_tickets v
    JOIN patients p ON v.patient_id = p.id
    WHERE v.id = ?
  `).bind(visitId).first();
}

// Get patient visits
export async function getPatientVisits(
  db: D1Database,
  patientId: string,
  limit = 10,
  offset = 0
): Promise<{ queue_tickets: any[]; total: number }> {
  const results = await db.prepare(`
    SELECT v.*, 
           d.qualification as doctor_name,
           dep.name as department_name
    FROM queue_tickets v
    LEFT JOIN doctors d ON v.doctor_id = d.id
    LEFT JOIN departments dep ON v.department_id = dep.id
    WHERE v.patient_id = ?
    ORDER BY v.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(patientId, limit, offset).all();
  
  const totalResult = await db.prepare(`
    SELECT COUNT(*) as count FROM queue_tickets WHERE patient_id = ?
  `).bind(patientId).first() as { count: number } | undefined;
  
  return {
    queue_tickets: results.results || [],
    total: totalResult?.count || 0,
  };
}
