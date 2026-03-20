import { D1Database } from '@cloudflare/workers-types';
import { Visit, VitalSign, SoapNote, Prescription, Allergy, TriageLevel, VisitStatus } from '../db/schema';
import { generateId, now, calculateWaitTime } from '../utils';

export interface CreateVisitParams {
  patientId: string;
  department: string;
  priority?: boolean;
  triageLevel?: TriageLevel;
  complaint?: string;
  notes?: string;
  createdBy?: string;
  createdByRole?: string;
}

export interface UpdateVisitParams {
  status?: VisitStatus;
  roomAssigned?: string;
  doctorId?: string;
  doctorNotes?: string;
  diagnosis?: string;
  prescription?: string;
  triageLevel?: TriageLevel;
}

export interface RecordVitalSignsParams {
  visitId: string;
  recordedBy: string;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
  notes?: string;
}

export interface CreateSoapNoteParams {
  visitId: string;
  recordedBy: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

export interface CreatePrescriptionParams {
  visitId: string;
  prescribedBy: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration?: string;
  instructions?: string;
}

export interface AddAllergyParams {
  patientId: string;
  allergen: string;
  reaction?: string;
  severity: 'mild' | 'moderate' | 'severe' | 'life_threatening';
  recordedBy?: string;
}

export interface VisitFilters {
  status?: VisitStatus;
  department?: string;
  doctorId?: string;
  patientId?: string;
  date?: string;
  limit?: number;
  offset?: number;
}

export async function createVisit(
  db: D1Database,
  params: CreateVisitParams
): Promise<Visit> {
  const countResult = await db.prepare(`
    SELECT COUNT(*) as count FROM visits 
    WHERE department = ? AND status IN ('waiting', 'called', 'in_progress')
    AND date(created_at) = date('now')
  `).bind(params.department).first() as unknown as { count: number };

  const ticketNumber = `${params.department.substring(0, 3).toUpperCase()}${String((countResult?.count || 0) + 1).padStart(3, '0')}`;
  const id = generateId('visit');
  const createdAt = now();

  await db.prepare(`
    INSERT INTO visits (id, patient_id, ticket_number, department, priority, triage_level, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'waiting', ?)
  `).bind(
    id,
    params.patientId,
    ticketNumber,
    params.department,
    params.priority ? 1 : 0,
    params.triageLevel || null,
    createdAt
  ).run();

  await db.prepare(`
    INSERT INTO queue_history (id, visit_id, action, actor_id, actor_type, timestamp, metadata)
    VALUES (?, ?, 'created', ?, ?, ?, ?)
  `).bind(
    generateId('hist'),
    id,
    params.createdBy || null,
    params.createdByRole || 'system',
    createdAt,
    JSON.stringify({ complaint: params.complaint, notes: params.notes })
  ).run();

  const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').bind(id).first() as Visit;
  return visit;
}

export async function getVisit(
  db: D1Database,
  visitId: string
): Promise<Visit | null> {
  const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').bind(visitId).first() as Visit | undefined;
  return visit || null;
}

export async function getVisitWithDetails(
  db: D1Database,
  visitId: string
): Promise<Visit & { patient_name?: string; doctor_name?: string; patient_allergies?: Allergy[] } | null> {
  const visit = await db.prepare(`
    SELECT v.*, p.name as patient_name, p.phone as patient_phone, p.email as patient_email,
           p.dob as patient_dob, d.name as doctor_name
    FROM visits v
    LEFT JOIN patients p ON v.patient_id = p.id
    LEFT JOIN doctors d ON v.doctor_id = d.id
    WHERE v.id = ?
  `).bind(visitId).first() as (Visit & { patient_name?: string; doctor_name?: string }) | undefined;

  if (!visit) {
    return null;
  }

  const allergies = await db.prepare(`
    SELECT * FROM allergies WHERE patient_id = ? AND is_active = 1
  `).bind(visit.patient_id).all();

  return {
    ...visit,
    patient_allergies: (allergies.results as unknown) as Allergy[],
  };
}

export async function getVisits(
  db: D1Database,
  filters: VisitFilters
): Promise<{ visits: Visit[]; total: number }> {
  const { status, department, doctorId, patientId, date, limit = 20, offset = 0 } = filters;

  let sql = `
    SELECT v.*, p.name as patient_name, d.name as doctor_name
    FROM visits v
    LEFT JOIN patients p ON v.patient_id = p.id
    LEFT JOIN doctors d ON v.doctor_id = d.id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (status) {
    sql += ` AND v.status = ?`;
    params.push(status);
  }
  if (department) {
    sql += ` AND v.department = ?`;
    params.push(department);
  }
  if (doctorId) {
    sql += ` AND v.doctor_id = ?`;
    params.push(doctorId);
  }
  if (patientId) {
    sql += ` AND v.patient_id = ?`;
    params.push(patientId);
  }
  if (date) {
    sql += ` AND date(v.created_at) = ?`;
    params.push(date);
  }

  const countSql = sql.replace(/LEFT JOIN.*ON.*/, '').replace(/SELECT v\.\*,.*FROM/, 'SELECT COUNT(*) as count FROM visits v WHERE 1=1');
  const countResult = await db.prepare(countSql).bind(...params).first() as unknown as { count: number };

  sql += ` ORDER BY v.priority DESC, v.created_at ASC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const result = await db.prepare(sql).bind(...params).all();

  return {
    visits: (result.results as unknown) as Visit[],
    total: countResult?.count || 0,
  };
}

export async function updateVisit(
  db: D1Database,
  visitId: string,
  params: UpdateVisitParams,
  actorId?: string,
  actorRole?: string
): Promise<Visit | null> {
  const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').bind(visitId).first() as Visit | undefined;

  if (!visit) {
    return null;
  }

  const updates: string[] = [];
  const updateParams: unknown[] = [];

  if (params.status) {
    updates.push(`status = ?`);
    updateParams.push(params.status);

    if (params.status === 'called') {
      updates.push(`called_at = ?`);
      updateParams.push(now());
    } else if (params.status === 'in_progress') {
      updates.push(`started_at = ?`);
      updateParams.push(now());
    } else if (params.status === 'completed') {
      updates.push(`completed_at = ?`);
      updateParams.push(now());

      let waitTime = 0;
      if (visit.called_at) {
        waitTime = calculateWaitTime(visit.called_at);
      }
      updates.push(`wait_time_minutes = ?`);
      updateParams.push(waitTime);
    }
  }

  if (params.roomAssigned !== undefined) {
    updates.push(`room_assigned = ?`);
    updateParams.push(params.roomAssigned);
  }

  if (params.doctorId !== undefined) {
    updates.push(`doctor_id = ?`);
    updateParams.push(params.doctorId);
  }

  if (params.doctorNotes !== undefined) {
    updates.push(`doctor_notes = ?`);
    updateParams.push(params.doctorNotes);
  }

  if (params.diagnosis !== undefined) {
    updates.push(`diagnosis = ?`);
    updateParams.push(params.diagnosis);
  }

  if (params.prescription !== undefined) {
    updates.push(`prescription = ?`);
    updateParams.push(params.prescription);
  }

  if (params.triageLevel !== undefined) {
    updates.push(`triage_level = ?`);
    updateParams.push(params.triageLevel);
  }

  if (updates.length === 0) {
    return visit;
  }

  updateParams.push(visitId);
  await db.prepare(`UPDATE visits SET ${updates.join(', ')} WHERE id = ?`).bind(...updateParams).run();

  await db.prepare(`
    INSERT INTO queue_history (id, visit_id, action, actor_id, actor_type, timestamp, metadata)
    VALUES (?, ?, 'updated', ?, ?, ?, ?)
  `).bind(
    generateId('hist'),
    visitId,
    actorId || null,
    actorRole || 'system',
    now(),
    JSON.stringify(params)
  ).run();

  const updated = await db.prepare('SELECT * FROM visits WHERE id = ?').bind(visitId).first() as Visit;
  return updated;
}

export async function startVisit(
  db: D1Database,
  visitId: string,
  doctorId: string,
  actorId?: string,
  actorRole?: string
): Promise<Visit | null> {
  const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').bind(visitId).first() as Visit | undefined;

  if (!visit) {
    return null;
  }

  if (visit.status !== 'waiting' && visit.status !== 'called') {
    throw new Error('Visit cannot be started');
  }

  const startedAt = now();

  await db.prepare(`
    UPDATE visits SET status = 'in_progress', started_at = ?, doctor_id = ?
    WHERE id = ?
  `).bind(startedAt, doctorId, visitId).run();

  await db.prepare(`
    INSERT INTO queue_history (id, visit_id, action, actor_id, actor_type, timestamp)
    VALUES (?, ?, 'started', ?, ?, ?)
  `).bind(generateId('hist'), visitId, actorId || doctorId, actorRole || 'doctor', startedAt).run();

  const updated = await db.prepare('SELECT * FROM visits WHERE id = ?').bind(visitId).first() as Visit;
  return updated;
}

export async function completeVisit(
  db: D1Database,
  visitId: string,
  params: {
    diagnosis?: string;
    prescription?: string;
    doctorNotes?: string;
  },
  actorId?: string,
  actorRole?: string
): Promise<Visit | null> {
  const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').bind(visitId).first() as Visit | undefined;

  if (!visit) {
    return null;
  }

  const completedAt = now();
  let waitTime = 0;

  if (visit.called_at) {
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
    params.diagnosis || null,
    params.prescription || null,
    params.doctorNotes || null,
    visitId
  ).run();

  await db.prepare(`
    INSERT INTO queue_history (id, visit_id, action, actor_id, actor_type, timestamp)
    VALUES (?, ?, 'completed', ?, ?, ?)
  `).bind(generateId('hist'), visitId, actorId || null, actorRole || 'system', completedAt).run();

  const updated = await db.prepare('SELECT * FROM visits WHERE id = ?').bind(visitId).first() as Visit;
  return updated;
}

export async function markNoShow(
  db: D1Database,
  visitId: string,
  actorId?: string,
  actorRole?: string
): Promise<Visit | null> {
  await db.prepare(`UPDATE visits SET status = 'no_show' WHERE id = ?`).bind(visitId).run();

  await db.prepare(`
    INSERT INTO queue_history (id, visit_id, action, actor_id, actor_type, timestamp)
    VALUES (?, ?, 'no_show', ?, ?, ?)
  `).bind(generateId('hist'), visitId, actorId || null, actorRole || 'system', now()).run();

  const updated = await db.prepare('SELECT * FROM visits WHERE id = ?').bind(visitId).first() as Visit;
  return updated;
}

export async function recordVitalSigns(
  db: D1Database,
  params: RecordVitalSignsParams
): Promise<VitalSign> {
  const id = generateId('vs');
  const recordedAt = now();

  await db.prepare(`
    INSERT INTO vital_signs (id, visit_id, recorded_by, blood_pressure_systolic, blood_pressure_diastolic,
      heart_rate, temperature, respiratory_rate, oxygen_saturation, weight, height, notes, recorded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    params.visitId,
    params.recordedBy,
    params.bloodPressureSystolic || null,
    params.bloodPressureDiastolic || null,
    params.heartRate || null,
    params.temperature || null,
    params.respiratoryRate || null,
    params.oxygenSaturation || null,
    params.weight || null,
    params.height || null,
    params.notes || null,
    recordedAt
  ).run();

  const vitalSign = await db.prepare('SELECT * FROM vital_signs WHERE id = ?').bind(id).first() as VitalSign;
  return vitalSign;
}

export async function getVitalSigns(
  db: D1Database,
  visitId: string
): Promise<VitalSign[]> {
  const result = await db.prepare(`
    SELECT vs.*, u.name as recorded_by_name
    FROM vital_signs vs
    LEFT JOIN users u ON vs.recorded_by = u.id
    WHERE vs.visit_id = ?
    ORDER BY vs.recorded_at DESC
  `).bind(visitId).all();

  return (result.results as unknown) as VitalSign[];
}

export async function createOrUpdateSoapNote(
  db: D1Database,
  params: CreateSoapNoteParams
): Promise<SoapNote> {
  const existing = await db.prepare('SELECT * FROM soap_notes WHERE visit_id = ?').bind(params.visitId).first() as SoapNote | undefined;

  const updatedAt = now();

  if (existing) {
    await db.prepare(`
      UPDATE soap_notes SET subjective = ?, objective = ?, assessment = ?, plan = ?, updated_at = ?
      WHERE visit_id = ?
    `).bind(
      params.subjective || null,
      params.objective || null,
      params.assessment || null,
      params.plan || null,
      updatedAt,
      params.visitId
    ).run();

    const updated = await db.prepare('SELECT * FROM soap_notes WHERE visit_id = ?').bind(params.visitId).first() as SoapNote;
    return updated;
  }

  const id = generateId('soap');
  const createdAt = now();

  await db.prepare(`
    INSERT INTO soap_notes (id, visit_id, recorded_by, subjective, objective, assessment, plan, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    params.visitId,
    params.recordedBy,
    params.subjective || null,
    params.objective || null,
    params.assessment || null,
    params.plan || null,
    createdAt,
    createdAt
  ).run();

  const soapNote = await db.prepare('SELECT * FROM soap_notes WHERE id = ?').bind(id).first() as SoapNote;
  return soapNote;
}

export async function getSoapNotes(
  db: D1Database,
  visitId: string
): Promise<SoapNote[]> {
  const result = await db.prepare(`
    SELECT sn.*, u.name as recorded_by_name
    FROM soap_notes sn
    LEFT JOIN users u ON sn.recorded_by = u.id
    WHERE sn.visit_id = ?
    ORDER BY sn.created_at DESC
  `).bind(visitId).all();

  return (result.results as unknown) as SoapNote[];
}

export async function createPrescription(
  db: D1Database,
  params: CreatePrescriptionParams
): Promise<Prescription> {
  const id = generateId('rx');
  const createdAt = now();

  await db.prepare(`
    INSERT INTO prescriptions (id, visit_id, prescribed_by, medication, dosage, frequency, duration, instructions, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    params.visitId,
    params.prescribedBy,
    params.medication,
    params.dosage,
    params.frequency,
    params.duration || null,
    params.instructions || null,
    createdAt
  ).run();

  const prescription = await db.prepare('SELECT * FROM prescriptions WHERE id = ?').bind(id).first() as Prescription;
  return prescription;
}

export async function getPrescriptions(
  db: D1Database,
  visitId: string,
  activeOnly = true
): Promise<Prescription[]> {
  let sql = `
    SELECT p.*, u.name as prescribed_by_name
    FROM prescriptions p
    LEFT JOIN users u ON p.prescribed_by = u.id
    WHERE p.visit_id = ?
  `;

  if (activeOnly) {
    sql += ` AND p.is_active = 1`;
  }

  sql += ` ORDER BY p.created_at DESC`;

  const result = await db.prepare(sql).bind(visitId).all();
  return (result.results as unknown) as Prescription[];
}

export async function addAllergy(
  db: D1Database,
  params: AddAllergyParams
): Promise<Allergy> {
  const existing = await db.prepare(`
    SELECT * FROM allergies WHERE patient_id = ? AND allergen = ? AND is_active = 1
  `).bind(params.patientId, params.allergen).first();

  if (existing) {
    throw new Error('Allergy already exists');
  }

  const id = generateId('allergy');
  const createdAt = now();

  await db.prepare(`
    INSERT INTO allergies (id, patient_id, allergen, reaction, severity, recorded_by, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
  `).bind(
    id,
    params.patientId,
    params.allergen,
    params.reaction || null,
    params.severity,
    params.recordedBy || null,
    createdAt
  ).run();

  const allergy = await db.prepare('SELECT * FROM allergies WHERE id = ?').bind(id).first() as Allergy;
  return allergy;
}

export async function getPatientAllergies(
  db: D1Database,
  patientId: string
): Promise<Allergy[]> {
  const result = await db.prepare(`
    SELECT a.*, u.name as recorded_by_name
    FROM allergies a
    LEFT JOIN users u ON a.recorded_by = u.id
    WHERE a.patient_id = ? AND a.is_active = 1
    ORDER BY 
      CASE a.severity 
        WHEN 'life_threatening' THEN 1 
        WHEN 'severe' THEN 2 
        WHEN 'moderate' THEN 3 
        WHEN 'mild' THEN 4 
        ELSE 5 
      END,
      a.created_at DESC
  `).bind(patientId).all();

  return (result.results as unknown) as Allergy[];
}

export async function getVisitHistory(
  db: D1Database,
  visitId: string
): Promise<{ visit: Visit; history: unknown[] }> {
  const visit = await db.prepare('SELECT * FROM visits WHERE id = ?').bind(visitId).first() as Visit;

  if (!visit) {
    throw new Error('Visit not found');
  }

  const history = await db.prepare(`
    SELECT qh.*, u.name as actor_name
    FROM queue_history qh
    LEFT JOIN users u ON qh.actor_id = u.id
    WHERE qh.visit_id = ?
    ORDER BY qh.timestamp ASC
  `).bind(visitId).all();

  return {
    visit,
    history: history.results,
  };
}

export async function getDailyStats(
  db: D1Database,
  date?: string
): Promise<{
  stats: {
    total_visits: number;
    completed: number;
    waiting: number;
    in_progress: number;
    no_show: number;
    avg_wait_time: number | null;
  };
  byDepartment: { department: string; count: number; completed: number }[];
}> {
  const targetDate = date || new Date().toISOString().split('T')[0];

  const stats = await db.prepare(`
    SELECT 
      COUNT(*) as total_visits,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) as waiting,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show,
      AVG(wait_time_minutes) as avg_wait_time
    FROM visits
    WHERE date(created_at) = ?
  `).bind(targetDate).first() as {
    total_visits: number;
    completed: number;
    waiting: number;
    in_progress: number;
    no_show: number;
    avg_wait_time: number | null;
  };

  const byDepartment = await db.prepare(`
    SELECT 
      department,
      COUNT(*) as count,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM visits
    WHERE date(created_at) = ?
    GROUP BY department
  `).bind(targetDate).all() as unknown as { department: string; count: number; completed: number }[];

  return { stats, byDepartment };
}
