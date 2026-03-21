import { Hono } from 'hono';
import { z } from 'zod';
import type { Bindings } from '../types';
import { generateId, successResponse, errorResponse, now } from '../utils';
import * as clinicalService from '../services/clinical';

const clinical = new Hono<{ Bindings: Bindings }>();

const createNoteSchema = z.object({
  visitId: z.string().min(1),
  patientId: z.string().min(1),
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  vitals: z.object({
    temperature: z.number().optional(),
    bloodPressure: z.string().optional(),
    heartRate: z.number().optional(),
    respiratoryRate: z.number().optional(),
    oxygenSaturation: z.number().optional(),
    weight: z.number().optional(),
    height: z.number().optional(),
  }).optional(),
  diagnosis: z.string().optional(),
  prescriptions: z.array(z.object({
    medication: z.string(),
    dosage: z.string(),
    frequency: z.string(),
    duration: z.string().optional(),
    instructions: z.string().optional(),
  })).optional(),
  followUp: z.object({
    date: z.string().optional(),
    instructions: z.string().optional(),
    department: z.string().optional(),
  }).optional(),
  source: z.enum(['typed', 'voice', 'template']).optional().default('typed'),
});

const updateNoteSchema = z.object({
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  vitals: z.object({
    temperature: z.number().optional(),
    bloodPressure: z.string().optional(),
    heartRate: z.number().optional(),
    respiratoryRate: z.number().optional(),
    oxygenSaturation: z.number().optional(),
    weight: z.number().optional(),
    height: z.number().optional(),
  }).optional(),
  diagnosis: z.string().optional(),
  prescriptions: z.array(z.object({
    medication: z.string(),
    dosage: z.string(),
    frequency: z.string(),
    duration: z.string().optional(),
    instructions: z.string().optional(),
  })).optional(),
  followUp: z.object({
    date: z.string().optional(),
    instructions: z.string().optional(),
    department: z.string().optional(),
  }).optional(),
  status: z.enum(['draft', 'final', 'amended']).optional(),
});

clinical.get('/', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');

  if (!user) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const query = c.req.query();
  const patientId = query.patientId;
  const doctorId = query.doctorId;
  const visitId = query.visitId;
  const status = query.status;
  const fromDate = query.fromDate;
  const toDate = query.toDate;
  const limit = parseInt(query.limit || '20');
  const offset = parseInt(query.offset || '0');

  if (user.role !== 'admin' && user.role !== 'doctor' && user.role !== 'nurse') {
    if (patientId && user.patientId !== patientId) {
      return c.json(errorResponse('Forbidden'), 403);
    }
  }

  const result = await clinicalService.getNotes(db, {
    patientId,
    doctorId,
    visitId,
    status,
    fromDate,
    toDate,
    limit,
    offset,
  });

  return c.json(successResponse({
    notes: result.notes,
    total: result.total,
    limit,
    offset,
  }));
});

clinical.get('/patient/:patientId', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  const patientId = c.req.param('patientId');

  if (!user) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  if (user.role !== 'admin' && user.role !== 'doctor' && user.role !== 'nurse') {
    if (user.patientId !== patientId) {
      return c.json(errorResponse('Forbidden'), 403);
    }
  }

  const limit = parseInt(c.req.query('limit') || '20');
  const offset = parseInt(c.req.query('offset') || '0');

  const result = await clinicalService.getNotes(db, { patientId, limit, offset });

  return c.json(successResponse({
    notes: result.notes,
    total: result.total,
    limit,
    offset,
  }));
});

clinical.get('/visit/:visitId', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  const visitId = c.req.param('visitId');

  if (!user) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const notes = await clinicalService.getNotesByVisit(db, visitId);

  return c.json(successResponse(notes));
});

clinical.get('/:id', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  const noteId = c.req.param('id');

  if (!user) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const note = await clinicalService.getNote(db, noteId);

  if (!note) {
    return c.json(errorResponse('Note not found'), 404);
  }

  if (user.role !== 'admin' && user.role !== 'doctor' && user.role !== 'nurse') {
    if (user.patientId !== note.patient_id) {
      return c.json(errorResponse('Forbidden'), 403);
    }
  }

  return c.json(successResponse(note));
});

clinical.post('/', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  const body = await c.req.json().catch(() => null) as any;

  if (!user) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  if (!['admin', 'doctor', 'nurse'].includes(user.role)) {
    return c.json(errorResponse('Forbidden'), 403);
  }

  const visit = await db.prepare('SELECT * FROM queue_tickets WHERE id = ?').bind(body.visitId).first();
  if (!visit) {
    return c.json(errorResponse('Visit not found'), 404);
  }

  const doctor = await db.prepare('SELECT * FROM doctors WHERE id = ?').bind(user.doctorId || body.patientId).first();
  const doctorName = doctor ? (doctor as any).name || (doctor as any).first_name + ' ' + (doctor as any).last_name : user.name || 'Unknown';

  const note = await clinicalService.createNote(db, {
    visitId: body.visitId,
    patientId: body.patientId,
    doctorId: user.doctorId || user.userId,
    doctorName,
    subjective: body.subjective,
    objective: body.objective,
    assessment: body.assessment,
    plan: body.plan,
    vitals: body.vitals,
    diagnosis: body.diagnosis,
    prescriptions: body.prescriptions,
    followUp: body.followUp,
    source: body.source,
    createdBy: user.userId,
  });

  return c.json(successResponse(note, 'Clinical note created'), 201);
});

clinical.put('/:id', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  const noteId = c.req.param('id');
  const body = await c.req.json().catch(() => null) as any;

  if (!user) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  if (!['admin', 'doctor', 'nurse'].includes(user.role)) {
    return c.json(errorResponse('Forbidden'), 403);
  }

  const existing = await clinicalService.getNote(db, noteId);
  if (!existing) {
    return c.json(errorResponse('Note not found'), 404);
  }

  if (user.role !== 'admin' && existing.doctor_id !== user.doctorId && existing.created_by !== user.userId) {
    return c.json(errorResponse('Forbidden'), 403);
  }

  const note = await clinicalService.updateNote(db, noteId, {
    subjective: body.subjective,
    objective: body.objective,
    assessment: body.assessment,
    plan: body.plan,
    vitals: body.vitals,
    diagnosis: body.diagnosis,
    prescriptions: body.prescriptions,
    followUp: body.followUp,
    status: body.status,
    lastEditedBy: user.userId,
  });

  return c.json(successResponse(note, 'Clinical note updated'));
});

clinical.delete('/:id', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  const noteId = c.req.param('id');

  if (!user) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  if (!['admin', 'doctor', 'nurse'].includes(user.role)) {
    return c.json(errorResponse('Forbidden'), 403);
  }

  const existing = await clinicalService.getNote(db, noteId);
  if (!existing) {
    return c.json(errorResponse('Note not found'), 404);
  }

  if (user.role !== 'admin' && existing.created_by !== user.userId) {
    return c.json(errorResponse('Forbidden'), 403);
  }

  await clinicalService.deleteNote(db, noteId);

  return c.json(successResponse(null, 'Note deleted'), { status: 204 } as any);
});

clinical.get('/search', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');

  if (!user) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  if (!['admin', 'doctor', 'nurse'].includes(user.role)) {
    return c.json(errorResponse('Forbidden'), 403);
  }

  const query = c.req.query('q') || '';
  const patientId = c.req.query('patientId');
  const doctorId = c.req.query('doctorId');
  const fromDate = c.req.query('fromDate');
  const toDate = c.req.query('toDate');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = parseInt(c.req.query('offset') || '0');

  const result = await clinicalService.searchNotes(db, query, patientId, doctorId, fromDate, toDate, limit, offset);

  return c.json(successResponse({
    results: result.notes,
    total: result.total,
  }));
});

export { clinical };
