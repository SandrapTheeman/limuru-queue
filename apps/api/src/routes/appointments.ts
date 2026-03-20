import { Hono } from 'hono';
import { z } from 'zod';
import type { Bindings } from '../types';
import {
  createAppointment,
  getAppointment,
  listAppointments,
  updateAppointment,
  deleteAppointment,
  checkInAppointment,
  cancelAppointment,
  getPatientAppointments,
  getTodayAppointments,
} from '../services/appointments';
import { successResponse, errorResponse } from '../utils';

const appointments = new Hono<{ Bindings: Bindings }>();

const createAppointmentSchema = z.object({
  patient_id: z.string(),
  doctor_id: z.string().optional(),
  department: z.string().min(1),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  scheduled_time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  duration_minutes: z.number().int().min(5).max(180).optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

const updateAppointmentSchema = z.object({
  doctor_id: z.string().optional(),
  department: z.string().min(1).optional(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  scheduled_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  duration_minutes: z.number().int().min(5).max(180).optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

const cancelSchema = z.object({
  reason: z.string().optional(),
});

appointments.get('/', async (c) => {
  const db = c.env.DB;
  
  const department = c.req.query('department');
  const doctor_id = c.req.query('doctor_id');
  const patient_id = c.req.query('patient_id');
  const status = c.req.query('status') as any;
  const date = c.req.query('date');
  const start_date = c.req.query('start_date');
  const end_date = c.req.query('end_date');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  const result = await listAppointments(db, {
    department,
    doctor_id,
    patient_id,
    status,
    date,
    start_date,
    end_date,
    limit,
    offset,
  });

  return c.json(successResponse(result));
});

appointments.get('/today', async (c) => {
  const db = c.env.DB;
  const department = c.req.query('department');
  const doctor_id = c.req.query('doctor_id');

  const appointments = await getTodayAppointments(db, department, doctor_id);

  return c.json(successResponse({ appointments }));
});

appointments.get('/patient/:patientId', async (c) => {
  const db = c.env.DB;
  const patientId = c.req.param('patientId');
  const limit = parseInt(c.req.query('limit') || '10');
  const offset = parseInt(c.req.query('offset') || '0');

  const result = await getPatientAppointments(db, patientId, limit, offset);

  return c.json(successResponse(result));
});

appointments.get('/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  const appointment = await getAppointment(db, id);

  if (!appointment) {
    return c.json(errorResponse('Appointment not found'), 404);
  }

  return c.json(successResponse(appointment));
});

appointments.post('/', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json().catch(() => null);

  try {
    const appointment = await createAppointment(db, body);
    return c.json(successResponse(appointment, 'Appointment created successfully'), 201);
  } catch (error: any) {
    return c.json(errorResponse(error.message), 400);
  }
});

appointments.put('/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => null);

  try {
    const appointment = await updateAppointment(db, id, body);

    if (!appointment) {
      return c.json(errorResponse('Appointment not found'), 404);
    }

    return c.json(successResponse(appointment, 'Appointment updated successfully'));
  } catch (error: any) {
    return c.json(errorResponse(error.message), 400);
  }
});

appointments.delete('/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  try {
    const deleted = await deleteAppointment(db, id);

    if (!deleted) {
      return c.json(errorResponse('Appointment not found'), 404);
    }

    return c.json(successResponse(null, 'Appointment deleted successfully'));
  } catch (error: any) {
    return c.json(errorResponse(error.message), 400);
  }
});

appointments.post('/:id/checkin', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  try {
    const appointment = await checkInAppointment(db, id);

    if (!appointment) {
      return c.json(errorResponse('Appointment not found'), 404);
    }

    return c.json(successResponse(appointment, 'Appointment checked in successfully'));
  } catch (error: any) {
    return c.json(errorResponse(error.message), 400);
  }
});

appointments.post('/:id/cancel', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));

  try {
    const appointment = await cancelAppointment(db, id, undefined, body.reason);

    if (!appointment) {
      return c.json(errorResponse('Appointment not found'), 404);
    }

    return c.json(successResponse(appointment, 'Appointment cancelled successfully'));
  } catch (error: any) {
    return c.json(errorResponse(error.message), 400);
  }
});

export { appointments };
