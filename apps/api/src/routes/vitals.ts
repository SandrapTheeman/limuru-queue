import { Hono } from 'hono';
import { z } from 'zod';
import type { Bindings } from '../types';
import { successResponse, errorResponse } from '../utils';
import {
  recordVitals,
  getVitalsHistory,
  getLatestVitals,
  triageAssessment,
  type RecordVitalsParams,
  type TriageParams,
} from '../services/vitals';

type User = {
  userId: string;
  role: string;
  patientId?: string;
  doctorId?: string;
  name?: string;
  email?: string;
};

type Context = {
  Bindings: Bindings;
  set: (key: string, value: unknown) => void;
  get: (key: string) => unknown;
  req: {
    param: (key: string) => string;
    query: (key?: string) => string | Record<string, string>;
    header: (key: string) => string | undefined;
    valid: (target: 'json') => unknown;
  };
  json: (body: unknown, status?: number) => Response;
  env: Bindings;
};

const vitals = new Hono<{ Bindings: Bindings }>();

const recordVitalsSchema = z.object({
  patientId: z.string(),
  visitId: z.string().optional(),
  bloodPressureSystolic: z.number().min(60).max(250).optional(),
  bloodPressureDiastolic: z.number().min(40).max(150).optional(),
  heartRate: z.number().min(30).max(220).optional(),
  temperature: z.number().min(30).max(45).optional(),
  respiratoryRate: z.number().min(5).max(50).optional(),
  oxygenSaturation: z.number().min(50).max(100).optional(),
  weight: z.number().min(0.5).max(500).optional(),
  height: z.number().min(20).max(250).optional(),
  chiefComplaint: z.string().optional(),
  painLevel: z.number().min(0).max(10).optional(),
  notes: z.string().optional(),
});

const triageSchema = z.object({
  chiefComplaint: z.string(),
  symptoms: z.array(z.string()).optional(),
  symptomDuration: z.string().optional(),
  painLevel: z.number().min(0).max(10),
  vitalSigns: z.object({
    bloodPressureSystolic: z.number().optional(),
    bloodPressureDiastolic: z.number().optional(),
    heartRate: z.number().optional(),
    temperature: z.number().optional(),
    oxygenSaturation: z.number().optional(),
  }).optional(),
  medicalHistory: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
});

vitals.get('/:patientId', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');

  if (!user) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const patientId = c.req.param('patientId');
  const vitalsHistory = await getVitalsHistory(db, patientId);
  return c.json(successResponse(vitalsHistory));
});

vitals.post('/', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  const body = await c.req.json().catch(() => null) as any;

  if (!user) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  if (!['admin', 'doctor', 'nurse'].includes(user.role)) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const vitalSign = await recordVitals(db, {
    ...body,
    recordedBy: user.userId,
  } as RecordVitalsParams);

  return c.json(successResponse(vitalSign, 'Vitals recorded'), 201);
});

vitals.get('/triage/:patientId', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');

  if (!user) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  if (!['admin', 'doctor', 'nurse'].includes(user.role)) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const patientId = c.req.param('patientId');
  const latestVitals = await getLatestVitals(db, patientId);
  
  if (!latestVitals) {
    return c.json(errorResponse('No vitals found for patient'), 404);
  }

  return c.json(successResponse(latestVitals));
});

vitals.post('/triage', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  const body = await c.req.json().catch(() => null) as any;

  if (!user) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  if (!['admin', 'doctor', 'nurse'].includes(user.role)) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const triageResult = await triageAssessment(db, body as TriageParams, user.userId);
  return c.json(successResponse(triageResult, 'Triage assessment completed'));
});

export { vitals };
