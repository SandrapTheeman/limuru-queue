import { D1Database } from '@cloudflare/workers-types';
import { generateId, now } from '../utils';

export interface ClinicalNote {
  id: string;
  visit_id: string;
  patient_id: string;
  doctor_id: string;
  doctor_name: string;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  vitals: string | null;
  diagnosis: string | null;
  prescriptions: string | null;
  follow_up: string | null;
  source: 'typed' | 'voice' | 'template' | null;
  status: 'draft' | 'final' | 'amended';
  version: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  last_edited_by: string | null;
}

export interface CreateClinicalNoteParams {
  visitId: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  vitals?: Record<string, unknown>;
  diagnosis?: string;
  prescriptions?: Record<string, unknown>[];
  followUp?: {
    date?: string;
    instructions?: string;
    department?: string;
  };
  source?: 'typed' | 'voice' | 'template';
  createdBy?: string;
}

export interface UpdateClinicalNoteParams {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  vitals?: Record<string, unknown>;
  diagnosis?: string;
  prescriptions?: Record<string, unknown>[];
  followUp?: {
    date?: string;
    instructions?: string;
    department?: string;
  };
  status?: 'draft' | 'final' | 'amended';
  lastEditedBy?: string;
}

export interface ClinicalNoteFilters {
  patientId?: string;
  doctorId?: string;
  visitId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export async function createNote(
  db: D1Database,
  params: CreateClinicalNoteParams
): Promise<ClinicalNote> {
  const id = generateId('note');
  const createdAt = now();
  const updatedAt = createdAt;

  await db.prepare(`
    INSERT INTO clinical_notes (
      id, visit_id, patient_id, doctor_id, doctor_name,
      subjective, objective, assessment, plan, vitals,
      diagnosis, prescriptions, follow_up, source, status, version,
      created_at, updated_at, created_by, last_edited_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 1, ?, ?, ?, ?)
  `).bind(
    id,
    params.visitId,
    params.patientId,
    params.doctorId,
    params.doctorName,
    params.subjective || null,
    params.objective || null,
    params.assessment || null,
    params.plan || null,
    params.vitals ? JSON.stringify(params.vitals) : null,
    params.diagnosis || null,
    params.prescriptions ? JSON.stringify(params.prescriptions) : null,
    params.followUp ? JSON.stringify(params.followUp) : null,
    params.source || 'typed',
    createdAt,
    updatedAt,
    params.createdBy || null,
    params.createdBy || null
  ).run();

  const note = await db.prepare('SELECT * FROM clinical_notes WHERE id = ?').bind(id).first() as ClinicalNote;
  return note;
}

export async function getNote(
  db: D1Database,
  noteId: string
): Promise<ClinicalNote | null> {
  const note = await db.prepare('SELECT * FROM clinical_notes WHERE id = ?').bind(noteId).first() as ClinicalNote | undefined;
  return note || null;
}

export async function getNotesByVisit(
  db: D1Database,
  visitId: string
): Promise<ClinicalNote[]> {
  const result = await db.prepare(`
    SELECT * FROM clinical_notes 
    WHERE visit_id = ?
    ORDER BY created_at DESC
  `).bind(visitId).all();

  return result.results as unknown as ClinicalNote[];
}

export async function getNotes(
  db: D1Database,
  filters: ClinicalNoteFilters
): Promise<{ notes: ClinicalNote[]; total: number }> {
  const { patientId, doctorId, visitId, status, fromDate, toDate, limit = 20, offset = 0 } = filters;

  let whereClause = '1=1';
  const params: unknown[] = [];

  if (patientId) {
    whereClause += ' AND patient_id = ?';
    params.push(patientId);
  }
  if (doctorId) {
    whereClause += ' AND doctor_id = ?';
    params.push(doctorId);
  }
  if (visitId) {
    whereClause += ' AND visit_id = ?';
    params.push(visitId);
  }
  if (status) {
    whereClause += ' AND status = ?';
    params.push(status);
  }
  if (fromDate) {
    whereClause += ' AND created_at >= ?';
    params.push(fromDate);
  }
  if (toDate) {
    whereClause += ' AND created_at <= ?';
    params.push(toDate);
  }

  const countResult = await db.prepare(`
    SELECT COUNT(*) as count FROM clinical_notes WHERE ${whereClause}
  `).bind(...params).first() as { count: number };

  const result = await db.prepare(`
    SELECT * FROM clinical_notes 
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).bind(...params, limit, offset).all();

  return {
    notes: result.results as unknown as ClinicalNote[],
    total: countResult?.count || 0,
  };
}

export async function updateNote(
  db: D1Database,
  noteId: string,
  params: UpdateClinicalNoteParams
): Promise<ClinicalNote | null> {
  const existing = await db.prepare('SELECT * FROM clinical_notes WHERE id = ?').bind(noteId).first() as ClinicalNote | undefined;
  
  if (!existing) {
    return null;
  }

  const updates: string[] = [];
  const updateParams: unknown[] = [];

  if (params.subjective !== undefined) {
    updates.push('subjective = ?');
    updateParams.push(params.subjective);
  }
  if (params.objective !== undefined) {
    updates.push('objective = ?');
    updateParams.push(params.objective);
  }
  if (params.assessment !== undefined) {
    updates.push('assessment = ?');
    updateParams.push(params.assessment);
  }
  if (params.plan !== undefined) {
    updates.push('plan = ?');
    updateParams.push(params.plan);
  }
  if (params.vitals !== undefined) {
    updates.push('vitals = ?');
    updateParams.push(JSON.stringify(params.vitals));
  }
  if (params.diagnosis !== undefined) {
    updates.push('diagnosis = ?');
    updateParams.push(params.diagnosis);
  }
  if (params.prescriptions !== undefined) {
    updates.push('prescriptions = ?');
    updateParams.push(JSON.stringify(params.prescriptions));
  }
  if (params.followUp !== undefined) {
    updates.push('follow_up = ?');
    updateParams.push(JSON.stringify(params.followUp));
  }
  if (params.status !== undefined) {
    updates.push('status = ?');
    updateParams.push(params.status);
  }

  if (updates.length === 0) {
    return existing;
  }

  updates.push('updated_at = ?');
  updateParams.push(now());
  updates.push('version = version + 1');
  updates.push('last_edited_by = ?');
  updateParams.push(params.lastEditedBy || null);

  updateParams.push(noteId);
  await db.prepare(`UPDATE clinical_notes SET ${updates.join(', ')} WHERE id = ?`).bind(...updateParams).run();

  const updated = await db.prepare('SELECT * FROM clinical_notes WHERE id = ?').bind(noteId).first() as ClinicalNote;
  return updated;
}

export async function deleteNote(
  db: D1Database,
  noteId: string
): Promise<boolean> {
  const existing = await db.prepare('SELECT * FROM clinical_notes WHERE id = ?').bind(noteId).first();
  
  if (!existing) {
    return false;
  }

  await db.prepare('DELETE FROM clinical_notes WHERE id = ?').bind(noteId).run();
  return true;
}

export async function searchNotes(
  db: D1Database,
  query: string,
  patientId?: string,
  doctorId?: string,
  fromDate?: string,
  toDate?: string,
  limit = 20,
  offset = 0
): Promise<{ notes: ClinicalNote[]; total: number }> {
  const searchPattern = `%${query}%`;
  const params: unknown[] = [searchPattern];
  let whereClause = '(subjective LIKE ? OR objective LIKE ? OR assessment LIKE ? OR plan LIKE ? OR diagnosis LIKE ?)';

  if (patientId) {
    whereClause += ' AND patient_id = ?';
    params.push(patientId);
  }
  if (doctorId) {
    whereClause += ' AND doctor_id = ?';
    params.push(doctorId);
  }
  if (fromDate) {
    whereClause += ' AND created_at >= ?';
    params.push(fromDate);
  }
  if (toDate) {
    whereClause += ' AND created_at <= ?';
    params.push(toDate);
  }

  params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);

  const countResult = await db.prepare(`
    SELECT COUNT(*) as count FROM clinical_notes WHERE ${whereClause}
  `).bind(...params.slice(0, -4)).first() as { count: number };

  const result = await db.prepare(`
    SELECT * FROM clinical_notes 
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).bind(...params.slice(0, -4), limit, offset).all();

  return {
    notes: result.results as unknown as ClinicalNote[],
    total: countResult?.count || 0,
  };
}
