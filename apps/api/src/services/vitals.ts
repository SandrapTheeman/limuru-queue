import { D1Database } from '@cloudflare/workers-types';
import { generateId, now } from '../utils';
import { TriageService } from './ai/triage';

export interface VitalsRecord {
  id: string;
  patient_id: string;
  visit_id: string | null;
  recorded_by: string;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  heart_rate: number | null;
  temperature: number | null;
  respiratory_rate: number | null;
  oxygen_saturation: number | null;
  weight: number | null;
  height: number | null;
  notes: string | null;
  recorded_at: string;
}

export interface RecordVitalsParams {
  patientId: string;
  visitId?: string;
  recordedBy: string;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
  chiefComplaint?: string;
  painLevel?: number;
  notes?: string;
}

export interface TriageParams {
  chiefComplaint: string;
  symptoms?: string[];
  symptomDuration?: string;
  painLevel: number;
  vitalSigns?: {
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    heartRate?: number;
    temperature?: number;
    oxygenSaturation?: number;
  };
  medicalHistory?: string[];
  allergies?: string[];
}

export interface TriageResult {
  triageLevel: 'emergency' | 'urgent' | 'normal' | 'low';
  recommendedDepartment: string;
  redFlags: string[];
  waitTimeEstimate: number;
  aiReasoning: string;
  patientId: string;
  recordedBy: string;
  createdAt: string;
}

export async function recordVitals(
  db: D1Database,
  params: RecordVitalsParams
): Promise<VitalsRecord> {
  const id = generateId('vs');
  const recordedAt = now();

  let visitId = params.visitId;
  if (!visitId) {
    const activeVisit = await db.prepare(`
      SELECT id FROM visits 
      WHERE patient_id = ? 
      AND status IN ('waiting', 'called', 'in_progress')
      ORDER BY created_at DESC 
      LIMIT 1
    `).bind(params.patientId).first() as { id: string } | undefined;

    visitId = activeVisit?.id;
  }

  await db.prepare(`
    INSERT INTO vital_signs (
      id, patient_id, visit_id, recorded_by,
      blood_pressure_systolic, blood_pressure_diastolic,
      heart_rate, temperature, respiratory_rate, oxygen_saturation,
      weight, height, notes, recorded_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    params.patientId,
    visitId || null,
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

  const vitalSign = await db.prepare('SELECT * FROM vital_signs WHERE id = ?').bind(id).first() as VitalsRecord;
  return vitalSign;
}

export async function getVitalsHistory(
  db: D1Database,
  patientId: string,
  limit = 50,
  offset = 0
): Promise<{ vitals: VitalsRecord[]; total: number }> {
  const countResult = await db.prepare(`
    SELECT COUNT(*) as count FROM vital_signs WHERE patient_id = ?
  `).bind(patientId).first() as { count: number };

  const result = await db.prepare(`
    SELECT vs.*, u.name as recorded_by_name
    FROM vital_signs vs
    LEFT JOIN users u ON vs.recorded_by = u.id
    WHERE vs.patient_id = ?
    ORDER BY vs.recorded_at DESC
    LIMIT ? OFFSET ?
  `).bind(patientId, limit, offset).all();

  return {
    vitals: result.results as unknown as VitalsRecord[],
    total: countResult?.count || 0,
  };
}

export async function getLatestVitals(
  db: D1Database,
  patientId: string
): Promise<VitalsRecord | null> {
  const vitalSign = await db.prepare(`
    SELECT vs.*, u.name as recorded_by_name
    FROM vital_signs vs
    LEFT JOIN users u ON vs.recorded_by = u.id
    WHERE vs.patient_id = ?
    ORDER BY vs.recorded_at DESC
    LIMIT 1
  `).bind(patientId).first() as (VitalsRecord & { recorded_by_name?: string }) | undefined;

  return vitalSign || null;
}

export async function triageAssessment(
  db: D1Database,
  params: TriageParams,
  recordedBy: string
): Promise<TriageResult> {
  const triageService = new TriageService();

  const input = {
    chiefComplaint: params.chiefComplaint,
    symptoms: params.symptoms || [],
    symptomDuration: params.symptomDuration || 'unknown',
    painLevel: params.painLevel,
    vitalSigns: params.vitalSigns,
    medicalHistory: params.medicalHistory || [],
    allergies: params.allergies || [],
  };

  const triageResult = await triageService.assess(input);

  const resultId = generateId('triage');
  const createdAt = now();

  let patientId = 'unknown';
  if (params.vitalSigns) {
    const latestVitals = await db.prepare(`
      SELECT patient_id FROM vital_signs 
      WHERE blood_pressure_systolic = ? 
      OR heart_rate = ?
      ORDER BY recorded_at DESC LIMIT 1
    `).bind(
      params.vitalSigns.bloodPressureSystolic || null,
      params.vitalSigns.heartRate || null
    ).first() as { patient_id: string } | undefined;

    patientId = latestVitals?.patient_id || patientId;
  }

  await db.prepare(`
    INSERT INTO triage_assessments (
      id, patient_id, recorded_by, triage_level, recommended_department,
      red_flags, wait_time_estimate, ai_reasoning, chief_complaint,
      symptoms, vital_signs, pain_level, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    resultId,
    patientId,
    recordedBy,
    triageResult.triageLevel,
    triageResult.recommendedDepartment,
    JSON.stringify(triageResult.redFlags),
    triageResult.waitTimeEstimate,
    triageResult.aiReasoning,
    params.chiefComplaint,
    JSON.stringify(params.symptoms || []),
    JSON.stringify(params.vitalSigns || {}),
    params.painLevel,
    createdAt
  ).run();

  return {
    ...triageResult,
    patientId,
    recordedBy,
    createdAt,
  };
}
