import { Hono } from 'hono';
import type { Bindings } from '../types';
import { successResponse, errorResponse } from '../utils';
import { createHMSService, HMSService } from '../services/hms';

const hms = new Hono<{ Bindings: Bindings }>();

let hmsService: HMSService | null = null;

function getHMSService(env: Bindings): HMSService {
  if (!hmsService) {
    const config = {
      type: (env.HMS_TYPE as any) || 'mock',
      baseUrl: env.HMS_BASE_URL,
      username: env.HMS_USERNAME,
      password: env.HMS_PASSWORD,
      facilityId: env.HMS_FACILITY_ID,
    };
    hmsService = createHMSService(config);
  }
  return hmsService;
}

hms.get('/status', async (c) => {
  const service = getHMSService(c.env);
  return c.json(successResponse({
    adapter: service.getAdapter().name,
    syncStatus: service.getSyncStatus(),
  }));
});

hms.post('/test-connection', async (c) => {
  try {
    const service = getHMSService(c.env);
    const result = await service.testConnection();
    if (result.success) {
      return c.json(successResponse({ message: 'Connection successful' }));
    }
    return c.json(errorResponse(result.error || 'Connection failed'), 500);
  } catch (error) {
    return c.json(errorResponse(String(error)), 500);
  }
});

hms.get('/patients', async (c) => {
  const query = c.req.query('q') || '';
  const limit = parseInt(c.req.query('limit') || '20');
  
  if (!query) {
    return c.json(successResponse({ patients: [], total: 0 }));
  }

  try {
    const service = getHMSService(c.env);
    const patients = await service.searchPatients(query);
    return c.json(successResponse({
      patients: patients.slice(0, limit),
      total: patients.length,
    }));
  } catch (error) {
    return c.json(errorResponse(String(error)), 500);
  }
});

hms.get('/patients/:id', async (c) => {
  const hmsPatientId = c.req.param('id');
  
  try {
    const service = getHMSService(c.env);
    const patient = await service.getPatient(hmsPatientId);
    
    if (!patient) {
      return c.json(errorResponse('Patient not found'), 404);
    }
    
    return c.json(successResponse(patient));
  } catch (error) {
    return c.json(errorResponse(String(error)), 500);
  }
});

hms.get('/patients/:id/appointments', async (c) => {
  const hmsPatientId = c.req.param('id');
  
  try {
    const service = getHMSService(c.env);
    const appointments = await service.getPatientAppointments(hmsPatientId);
    return c.json(successResponse({ appointments }));
  } catch (error) {
    return c.json(errorResponse(String(error)), 500);
  }
});

hms.post('/patients', async (c) => {
  const body = await c.req.json().catch(() => null);
  
  if (!body || !body.first_name || !body.last_name) {
    return c.json(errorResponse('Missing required fields: first_name, last_name'), 400);
  }

  try {
    const service = getHMSService(c.env);
    const patient = await service.createPatient(body);
    return c.json(successResponse(patient), 201);
  } catch (error) {
    return c.json(errorResponse(String(error)), 500);
  }
});

hms.patch('/patients/:id', async (c) => {
  const hmsPatientId = c.req.param('id');
  const body = await c.req.json().catch(() => null);
  
  if (!body) {
    return c.json(errorResponse('Missing update data'), 400);
  }

  try {
    const service = getHMSService(c.env);
    const patient = await service.updatePatient(hmsPatientId, body);
    return c.json(successResponse(patient));
  } catch (error) {
    return c.json(errorResponse(String(error)), 500);
  }
});

hms.get('/appointments', async (c) => {
  const date = c.req.query('date') || new Date().toISOString().split('T')[0];
  const departmentId = c.req.query('department');
  
  try {
    const service = getHMSService(c.env);
    const appointments = await service.getAppointments(date, departmentId);
    return c.json(successResponse({ appointments }));
  } catch (error) {
    return c.json(errorResponse(String(error)), 500);
  }
});

hms.post('/appointments', async (c) => {
  const body = await c.req.json().catch(() => null);
  
  if (!body || !body.patient_id || !body.date || !body.time) {
    return c.json(errorResponse('Missing required fields: patient_id, date, time'), 400);
  }

  try {
    const service = getHMSService(c.env);
    const appointment = await service.createAppointment({
      patient_id: body.patient_id,
      doctor_id: body.doctor_id || '',
      department_id: body.department_id || '',
      date: body.date,
      time: body.time,
      status: body.status || 'scheduled',
      reason: body.reason,
    });
    return c.json(successResponse(appointment), 201);
  } catch (error) {
    return c.json(errorResponse(String(error)), 500);
  }
});

hms.delete('/appointments/:id', async (c) => {
  const appointmentId = c.req.param('id');
  
  try {
    const service = getHMSService(c.env);
    const result = await service.cancelAppointment(appointmentId);
    if (result) {
      return c.json(successResponse({ message: 'Appointment cancelled' }));
    }
    return c.json(errorResponse('Failed to cancel appointment'), 500);
  } catch (error) {
    return c.json(errorResponse(String(error)), 500);
  }
});

hms.get('/doctors', async (c) => {
  const departmentId = c.req.query('department');
  
  try {
    const service = getHMSService(c.env);
    const doctors = await service.getDoctors(departmentId);
    return c.json(successResponse({ doctors }));
  } catch (error) {
    return c.json(errorResponse(String(error)), 500);
  }
});

hms.get('/doctors/:id/availability', async (c) => {
  const doctorId = c.req.param('id');
  const date = c.req.query('date') || new Date().toISOString().split('T')[0];
  
  try {
    const service = getHMSService(c.env);
    const availability = await service.getDoctorAvailability(doctorId, date);
    return c.json(successResponse(availability));
  } catch (error) {
    return c.json(errorResponse(String(error)), 500);
  }
});

hms.get('/lab/orders/:patientId', async (c) => {
  const patientId = c.req.param('patientId');
  
  try {
    const service = getHMSService(c.env);
    const orders = await service.getLabOrders(patientId);
    return c.json(successResponse({ orders }));
  } catch (error) {
    return c.json(errorResponse(String(error)), 500);
  }
});

hms.get('/lab/results/:orderId', async (c) => {
  const orderId = c.req.param('orderId');
  
  try {
    const service = getHMSService(c.env);
    const results = await service.getLabResults(orderId);
    return c.json(successResponse({ results }));
  } catch (error) {
    return c.json(errorResponse(String(error)), 500);
  }
});

hms.post('/lab/orders', async (c) => {
  const body = await c.req.json().catch(() => null);
  
  if (!body || !body.patient_id || !body.test_code) {
    return c.json(errorResponse('Missing required fields: patient_id, test_code'), 400);
  }

  try {
    const service = getHMSService(c.env);
    const result = await service.submitLabOrder({
      id: `LAB-${Date.now()}`,
      patient_id: body.patient_id,
      doctor_id: body.doctor_id || '',
      test_name: body.test_name || '',
      test_code: body.test_code,
      priority: body.priority || 2,
      notes: body.notes,
    });
    
    if (result) {
      return c.json(successResponse({ message: 'Lab order submitted' }), 201);
    }
    return c.json(errorResponse('Failed to submit lab order'), 500);
  } catch (error) {
    return c.json(errorResponse(String(error)), 500);
  }
});

hms.get('/lab/samples', async (c) => {
  try {
    const service = getHMSService(c.env);
    const samples = await service.getLabSamples();
    return c.json(successResponse({ samples }));
  } catch (error) {
    return c.json(errorResponse(String(error)), 500);
  }
});

hms.post('/sync', async (c) => {
  const body = await c.req.json().catch(() => null);
  const syncType = body?.type || 'all';
  
  try {
    const service = getHMSService(c.env);
    const db = c.env.DB;
    
    if (syncType === 'patients' || syncType === 'all') {
      await service.syncPatients(db);
    }
    
    if (syncType === 'appointments' || syncType === 'all') {
      const date = body?.date || new Date().toISOString().split('T')[0];
      await service.syncAppointments(db, date);
    }
    
    return c.json(successResponse({
      message: 'Sync completed',
      syncStatus: service.getSyncStatus(),
    }));
  } catch (error) {
    return c.json(errorResponse(String(error)), 500);
  }
});

hms.get('/sync/status', async (c) => {
  try {
    const service = getHMSService(c.env);
    return c.json(successResponse(service.getSyncStatus()));
  } catch (error) {
    return c.json(errorResponse(String(error)), 500);
  }
});

export { hms };