// Queue Management Service
import { Visit, QueueItem, QueueResponse } from '../types';
import { generateId, generateTicketNumber, calculateWaitTime, now } from '../utils';

// Get queue for a department
export async function getQueue(
  db: D1Database,
  department: string,
  limit = 20,
  offset = 0
): Promise<QueueResponse> {
  // Get waiting patients
  const waiting = await db.prepare(`
    SELECT v.*, p.name as patient_name 
    FROM visits v
    JOIN patients p ON v.patient_id = p.id
    WHERE v.department = ? AND v.status = 'waiting'
    ORDER BY v.priority DESC, v.created_at ASC
    LIMIT ? OFFSET ?
  `).bind(department, limit, offset).all();
  
  // Get count of waiting
  const waitingCount = await db.prepare(`
    SELECT COUNT(*) as count FROM visits 
    WHERE department = ? AND status = 'waiting'
  `).bind(department).first() as { count: number };
  
  // Get count of called
  const calledCount = await db.prepare(`
    SELECT COUNT(*) as count FROM visits 
    WHERE department = ? AND status = 'called'
  `).bind(department).first() as { count: number };
  
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
    priority: Boolean(visit.priority),
    wait_time: calculateWaitTime(visit.created_at),
    position: offset + index + 1,
    status: visit.status,
    joined_at: visit.created_at,
  }));
  
  const waitingTotal = waitingCount?.count || 0;
  const estimatedWait = waitingTotal * waitTimePerPatient;
  
  // Calculate next call estimate
  const nextCallDate = new Date();
  nextCallDate.setMinutes(nextCallDate.getMinutes() + estimatedWait);
  
  return {
    department,
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
    department: string;
    priority?: boolean;
    patientId?: string;
  }
): Promise<{ visit: any; position: number; estimatedWaitTime: number }> {
  // Get current ticket count for department
  const countResult: any = await db.prepare(`
    SELECT COUNT(*) as count FROM visits 
    WHERE department = ? AND status IN ('waiting', 'called', 'in_progress')
    AND date(created_at) = date('now')
  `).bind(data.department).first();
  
  const count = countResult?.count || 0;
  const ticketNumber = generateTicketNumber(data.department, count);
  
  // Get or create patient
  let patientId = data.patientId;
  
  if (!patientId) {
    // Create new patient
    patientId = generateId('patient');
    await db.prepare(`
      INSERT INTO patients (id, name, email, phone)
      VALUES (?, ?, ?, ?)
    `).bind(patientId, data.name, data.email || null, data.phone || null).run();
  }
  
  // Create visit
  const visitId = generateId('visit');
  const createdAt = now();
  
  await db.prepare(`
    INSERT INTO visits (id, patient_id, ticket_number, department, priority, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'waiting', ?)
  `).bind(visitId, patientId, ticketNumber, data.department, data.priority ? 1 : 0, createdAt).run();
  
  // Get wait time setting
  const waitTimeSetting: any = await db.prepare(`
    SELECT value FROM settings WHERE key = 'wait_time_per_patient'
  `).first();
  
  const waitTimePerPatient = waitTimeSetting ? parseInt(waitTimeSetting.value) : 15;
  const position = count + 1;
  const estimatedWaitTime = position * waitTimePerPatient;
  
  const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').bind(visitId).first();
  
  return {
    visit,
    position,
    estimatedWaitTime,
  };
}

// Call patient
export async function callPatient(
  db: D1Database,
  visitId: string,
  doctorId: string,
  room: string
): Promise<any> {
  const calledAt = now();
  
  await db.prepare(`
    UPDATE visits 
    SET status = 'called', called_at = ?, doctor_id = ?, room_assigned = ?
    WHERE id = ?
  `).bind(calledAt, doctorId, room, visitId).run();
  
  // Add to queue history
  await db.prepare(`
    INSERT INTO queue_history (id, visit_id, action, actor_id, actor_type, timestamp)
    VALUES (?, ?, 'called', ?, 'doctor', ?)
  `).bind(generateId('history'), visitId, doctorId, calledAt).run();
  
  return await db.prepare(`
    SELECT v.*, p.name as patient_name 
    FROM visits v
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
    UPDATE visits SET status = 'in_progress', started_at = ?
    WHERE id = ?
  `).bind(startedAt, visitId).run();
  
  return await db.prepare('SELECT * FROM visits WHERE id = ?').bind(visitId).first();
}

// Complete visit
export async function completeVisit(
  db: D1Database,
  visitId: string,
  notes?: {
    diagnosis?: string;
    prescription?: string;
    doctorNotes?: string;
  }
): Promise<any> {
  const completedAt = now();
  
  // Get visit to calculate wait time
  const visit: any = await db.prepare('SELECT * FROM visits WHERE id = ?').bind(visitId).first();
  
  let waitTime = 0;
  if (visit?.called_at) {
    waitTime = calculateWaitTime(visit.called_at);
  }
  
  await db.prepare(`
    UPDATE visits 
    SET status = 'completed', completed_at = ?, wait_time_minutes = ?,
        diagnosis = ?, prescription = ?, doctor_notes = ?
    WHERE id = ?
  `).bind(
    completedAt, 
    waitTime,
    notes?.diagnosis || null,
    notes?.prescription || null,
    notes?.doctorNotes || null,
    visitId
  ).run();
  
  // Add to queue history
  await db.prepare(`
    INSERT INTO queue_history (id, visit_id, action, actor_type, timestamp)
    VALUES (?, ?, 'completed', 'system', ?)
  `).bind(generateId('history'), visitId, completedAt).run();
  
  return await db.prepare(`
    SELECT v.*, p.name as patient_name 
    FROM visits v
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
    UPDATE visits SET status = 'no_show' WHERE id = ?
  `).bind(visitId).run();
  
  return await db.prepare('SELECT * FROM visits WHERE id = ?').bind(visitId).first();
}

// Transfer patient
export async function transferPatient(
  db: D1Database,
  visitId: string,
  newDepartment: string,
  actorId: string
): Promise<any> {
  // Get current ticket count for new department
  const countResult: any = await db.prepare(`
    SELECT COUNT(*) as count FROM visits 
    WHERE department = ? AND status IN ('waiting', 'called', 'in_progress')
    AND date(created_at) = date('now')
  `).bind(newDepartment).first();
  
  const newTicketNumber = generateTicketNumber(newDepartment, countResult?.count || 0);
  
  await db.prepare(`
    UPDATE visits 
    SET department = ?, ticket_number = ?, status = 'waiting'
    WHERE id = ?
  `).bind(newDepartment, newTicketNumber, visitId).run();
  
  // Add to queue history
  await db.prepare(`
    INSERT INTO queue_history (id, visit_id, action, actor_id, actor_type, timestamp, metadata)
    VALUES (?, ?, 'transferred', ?, 'staff', ?, ?)
  `).bind(
    generateId('history'), 
    visitId, 
    actorId, 
    now(),
    JSON.stringify({ new_department: newDepartment })
  ).run();
  
  return await db.prepare('SELECT * FROM visits WHERE id = ?').bind(visitId).first();
}

// Get visit by ID
export async function getVisit(
  db: D1Database,
  visitId: string
): Promise<any> {
  return await db.prepare(`
    SELECT v.*, p.name as patient_name 
    FROM visits v
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
): Promise<{ visits: any[]; total: number }> {
  const visits = await db.prepare(`
    SELECT v.*, d.name as doctor_name
    FROM visits v
    LEFT JOIN doctors d ON v.doctor_id = d.id
    WHERE v.patient_id = ?
    ORDER BY v.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(patientId, limit, offset).all();
  
  const totalResult: any = await db.prepare(`
    SELECT COUNT(*) as count FROM visits WHERE patient_id = ?
  `).bind(patientId).first();
  
  return {
    visits: visits.results || [],
    total: totalResult?.count || 0,
  };
}
