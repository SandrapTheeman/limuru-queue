import { Hono } from 'hono';
import { z } from 'zod';
import { QueueEngine, type QueueTicket, type QueueStats, type TVDisplayState } from '../services/queue-engine';
import { successResponse, errorResponse } from '../utils';

type Bindings = {
  DB: D1Database;
  CACHE_KV: KVNamespace;
  FACILITY_ID?: string;
};

type Variables = {
  userId?: string;
  userRole?: string;
};

const queue = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const createTicketSchema = z.object({
  patientId: z.string(),
  departmentId: z.string(),
  priority: z.enum(['1', '2', '3', '4']).transform(v => parseInt(v) as 1 | 2 | 3 | 4),
  complaint: z.string().optional(),
  doctorId: z.string().optional(),
  hmsAppointmentId: z.string().optional(),
});

const callPatientSchema = z.object({
  ticketId: z.string(),
  roomAssigned: z.string(),
  doctorId: z.string().optional(),
});

const overrideCallSchema = z.object({
  patientId: z.string(),
  departmentId: z.string(),
  roomAssigned: z.string(),
  reason: z.string(),
  doctorId: z.string().optional(),
});

const transferSchema = z.object({
  newDepartmentId: z.string(),
});

const updatePrioritySchema = z.object({
  priority: z.enum(['1', '2', '3', '4']).transform(v => parseInt(v) as 1 | 2 | 3 | 4),
});

const getEngine = (c: any): QueueEngine => {
  const facilityId = c.env.FACILITY_ID || 'default-facility';
  return new QueueEngine(c.env.DB, c.env.CACHE_KV, facilityId);
};

const optionalAuth = async (c: any, next: () => Promise<void>) => {
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    c.set('userId', authHeader.substring(7));
  } else {
    c.set('userId', 'anonymous');
  }
  await next();
};

const requireAuth = async (c: any, next: () => Promise<void>) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(errorResponse('Authorization required'), 401);
  }
  c.set('userId', authHeader.substring(7));
  await next();
};

const requireRole = (roles: string[]) => async (c: any, next: () => Promise<void>) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) {
    return c.json(errorResponse('Authorization required'), 401);
  }
  const roleHeader = c.req.header('X-User-Role');
  if (roleHeader && !roles.includes(roleHeader)) {
    return c.json(errorResponse('Insufficient permissions'), 403);
  }
  c.set('userId', authHeader.substring(7));
  await next();
};

queue.get('/', optionalAuth, async (c) => {
  try {
    const engine = getEngine(c);
    const departmentId = c.req.query('departmentId');
    const includeCompleted = c.req.query('includeCompleted') === 'true';

    const tickets = await engine.getQueue(departmentId, includeCompleted);

    return c.json(successResponse({
      tickets,
      total: tickets.length,
      departmentId: departmentId || null,
    }));
  } catch (e: any) {
    console.error('Error getting queue:', e?.message || 'Unknown error');
    return c.json(errorResponse('Failed to retrieve queue data'), 500);
  }
});

queue.post('/', requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const validated = createTicketSchema.parse(body);

    const engine = getEngine(c);
    const userId = c.get('userId') || 'system';

    const ticket = await engine.createTicket({
      patientId: validated.patientId,
      departmentId: validated.departmentId,
      priority: validated.priority,
      complaint: validated.complaint,
      doctorId: validated.doctorId,
      hmsAppointmentId: validated.hmsAppointmentId,
      userId,
    });

    return c.json(successResponse({ ticket }), 201);
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return c.json(errorResponse(e.errors.map((err: any) => err.message).join(', ')), 400);
    }
    console.error('Error creating ticket:', e?.message || 'Unknown error');
    return c.json(errorResponse('Failed to create ticket'), 500);
  }
});

queue.post('/call', requireRole(['admin', 'doctor', 'nurse', 'receptionist']), async (c) => {
  try {
    const body = await c.req.json();
    const validated = callPatientSchema.parse(body);

    const engine = getEngine(c);
    const userId = c.get('userId') || 'system';

    const ticket = await engine.callPatient({
      ticketId: validated.ticketId,
      roomAssigned: validated.roomAssigned,
      doctorId: validated.doctorId,
      userId,
    });

    if (!ticket) {
      return c.json(errorResponse('Ticket not found'), 404);
    }

    return c.json(successResponse({ ticket }));
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return c.json(errorResponse(e.errors.map((err: any) => err.message).join(', ')), 400);
    }
    console.error('Error calling patient:', e?.message || 'Unknown error');
    return c.json(errorResponse('Failed to call patient'), 500);
  }
});

queue.post('/call-next', requireRole(['admin', 'doctor', 'nurse', 'receptionist']), async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { departmentId, doctorId } = body;

    const engine = getEngine(c);

    const ticket = await engine.callNextPatient(departmentId, doctorId);

    if (!ticket) {
      return c.json(errorResponse('No patients waiting'), 404);
    }

    return c.json(successResponse({ ticket }));
  } catch (e: any) {
    console.error('Error calling next patient:', e?.message || 'Unknown error');
    return c.json(errorResponse('Failed to call next patient'), 500);
  }
});

queue.post('/override', requireRole(['admin', 'doctor']), async (c) => {
  try {
    const body = await c.req.json();
    const validated = overrideCallSchema.parse(body);

    const engine = getEngine(c);
    const userId = c.get('userId') || 'system';

    const ticket = await engine.overrideCall({
      patientId: validated.patientId,
      departmentId: validated.departmentId,
      roomAssigned: validated.roomAssigned,
      reason: validated.reason,
      doctorId: validated.doctorId,
      userId,
    });

    if (!ticket) {
      return c.json(errorResponse('Failed to override call'), 500);
    }

    return c.json(successResponse({ ticket }));
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return c.json(errorResponse(e.errors.map((err: any) => err.message).join(', ')), 400);
    }
    console.error('Error overriding call:', e?.message || 'Unknown error');
    return c.json(errorResponse('Failed to override call'), 500);
  }
});

queue.post('/:id/start', requireRole(['admin', 'doctor', 'nurse']), async (c) => {
  try {
    const ticketId = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const doctorId = body.doctorId || c.get('userId') || 'system';

    const engine = getEngine(c);
    const ticket = await engine.startServing(ticketId, doctorId);

    if (!ticket) {
      return c.json(errorResponse('Ticket not found'), 404);
    }

    return c.json(successResponse({ ticket }));
  } catch (e: any) {
    console.error('Error starting serving:', e?.message || 'Unknown error');
    return c.json(errorResponse('Failed to start consultation'), 500);
  }
});

queue.post('/:id/complete', requireRole(['admin', 'doctor', 'nurse']), async (c) => {
  try {
    const ticketId = c.req.param('id');

    const engine = getEngine(c);
    const ticket = await engine.completeTicket(ticketId);

    if (!ticket) {
      return c.json(errorResponse('Ticket not found'), 404);
    }

    return c.json(successResponse({ ticket }));
  } catch (e: any) {
    console.error('Error completing ticket:', e?.message || 'Unknown error');
    return c.json(errorResponse('Failed to complete ticket'), 500);
  }
});

queue.post('/:id/no-show', requireRole(['admin', 'doctor', 'nurse', 'receptionist']), async (c) => {
  try {
    const ticketId = c.req.param('id');

    const engine = getEngine(c);
    const ticket = await engine.markNoShow(ticketId);

    if (!ticket) {
      return c.json(errorResponse('Ticket not found'), 404);
    }

    return c.json(successResponse({ ticket }));
  } catch (e: any) {
    console.error('Error marking no-show:', e?.message || 'Unknown error');
    return c.json(errorResponse('Failed to mark no-show'), 500);
  }
});

queue.post('/:id/cancel', requireRole(['admin']), async (c) => {
  try {
    const ticketId = c.req.param('id');

    const engine = getEngine(c);
    const ticket = await engine.cancelTicket(ticketId);

    if (!ticket) {
      return c.json(errorResponse('Ticket not found'), 404);
    }

    return c.json(successResponse({ ticket }));
  } catch (e: any) {
    console.error('Error cancelling ticket:', e?.message || 'Unknown error');
    return c.json(errorResponse('Failed to cancel ticket'), 500);
  }
});

queue.post('/:id/transfer', requireRole(['admin', 'doctor', 'nurse', 'receptionist']), async (c) => {
  try {
    const ticketId = c.req.param('id');
    const body = await c.req.json();
    const validated = transferSchema.parse(body);

    const engine = getEngine(c);
    const userId = c.get('userId') || 'system';

    const ticket = await engine.transferTicket(ticketId, validated.newDepartmentId, userId);

    if (!ticket) {
      return c.json(errorResponse('Ticket not found'), 404);
    }

    return c.json(successResponse({ ticket }));
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return c.json(errorResponse(e.errors.map((err: any) => err.message).join(', ')), 400);
    }
    console.error('Error transferring ticket:', e?.message || 'Unknown error');
    return c.json(errorResponse('Failed to transfer ticket'), 500);
  }
});

queue.post('/:id/priority', requireRole(['admin', 'doctor', 'nurse']), async (c) => {
  try {
    const ticketId = c.req.param('id');
    const body = await c.req.json();
    const validated = updatePrioritySchema.parse(body);

    const engine = getEngine(c);
    const userId = c.get('userId') || 'system';

    const ticket = await engine.updatePriority(ticketId, validated.priority, userId);

    if (!ticket) {
      return c.json(errorResponse('Ticket not found'), 404);
    }

    return c.json(successResponse({ ticket }));
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return c.json(errorResponse(e.errors.map((err: any) => err.message).join(', ')), 400);
    }
    console.error('Error updating priority:', e?.message || 'Unknown error');
    return c.json(errorResponse('Failed to update priority'), 500);
  }
});

queue.post('/:id/recall', requireRole(['admin', 'doctor', 'nurse', 'receptionist']), async (c) => {
  try {
    const ticketId = c.req.param('id');

    const engine = getEngine(c);
    const ticket = await engine.recallPatient(ticketId);

    if (!ticket) {
      return c.json(errorResponse('Ticket not found'), 404);
    }

    return c.json(successResponse({ ticket }));
  } catch (e: any) {
    console.error('Error recalling patient:', e?.message || 'Unknown error');
    return c.json(errorResponse('Failed to recall patient'), 500);
  }
});

queue.get('/:id/position', optionalAuth, async (c) => {
  try {
    const ticketId = c.req.param('id');

    const engine = getEngine(c);
    const position = await engine.getPatientPosition(ticketId);

    if (!position) {
      return c.json(errorResponse('Ticket not found'), 404);
    }

    return c.json(successResponse(position));
  } catch (e: any) {
    console.error('Error getting position:', e?.message || 'Unknown error');
    return c.json(errorResponse('Failed to get position'), 500);
  }
});

queue.get('/stats', optionalAuth, async (c) => {
  try {
    const departmentId = c.req.query('departmentId');

    const engine = getEngine(c);
    const stats = await engine.getStats(departmentId);

    return c.json(successResponse(stats));
  } catch (e: any) {
    console.error('Error getting stats:', e?.message || 'Unknown error');
    return c.json(errorResponse('Failed to get statistics'), 500);
  }
});

queue.get('/stats/department/:departmentId', optionalAuth, async (c) => {
  try {
    const departmentId = c.req.param('departmentId');

    const engine = getEngine(c);
    const stats = await engine.getDepartmentStats(departmentId);

    return c.json(successResponse(stats));
  } catch (e: any) {
    console.error('Error getting department stats:', e?.message || 'Unknown error');
    return c.json(errorResponse('Failed to get department statistics'), 500);
  }
});

queue.get('/tv/:displayId', optionalAuth, async (c) => {
  try {
    const displayId = c.req.param('displayId');
    const deptIds = c.req.query('departments')?.split(',') || [];

    if (deptIds.length === 0) {
      return c.json(errorResponse('At least one department ID required'), 400);
    }

    const engine = getEngine(c);
    const state = await engine.getTVDisplayState(displayId, deptIds);

    return c.json(successResponse(state));
  } catch (e: any) {
    console.error('Error getting TV display state:', e?.message || 'Unknown error');
    return c.json(errorResponse('Failed to get display state'), 500);
  }
});

queue.get('/tv/:displayId/public', async (c) => {
  try {
    const displayId = c.req.param('displayId');
    const deptIds = c.req.query('departments')?.split(',') || [];

    if (deptIds.length === 0) {
      return c.json(errorResponse('At least one department ID required'), 400);
    }

    const engine = getEngine(c);
    const state = await engine.getTVDisplayStatePublic(displayId, deptIds);

    return c.json(successResponse(state));
  } catch (e: any) {
    console.error('Error getting public TV display state:', e);
    return c.json(errorResponse(e.message || 'Failed to get TV display state'), 500);
  }
});

queue.get('/patient/:patientId/history', optionalAuth, async (c) => {
  try {
    const patientId = c.req.param('patientId');
    const limit = parseInt(c.req.query('limit') || '10');
    const offset = parseInt(c.req.query('offset') || '0');

    const engine = getEngine(c);
    const history = await engine.getPatientQueueHistory(patientId, limit, offset);

    return c.json(successResponse(history));
  } catch (e: any) {
    console.error('Error getting patient history:', e?.message || 'Unknown error');
    return c.json(errorResponse('Failed to retrieve patient history'), 500);
  }
});

queue.get('/:id', optionalAuth, async (c) => {
  try {
    const ticketId = c.req.param('id');

    const engine = getEngine(c);
    const queue = await engine.getQueue();

    const ticket = queue.find(t => t.id === ticketId);

    if (!ticket) {
      return c.json(errorResponse('Ticket not found'), 404);
    }

    return c.json(successResponse({ ticket }));
  } catch (e: any) {
    console.error('Error getting ticket:', e?.message || 'Unknown error');
    return c.json(errorResponse('Failed to retrieve ticket'), 500);
  }
});

export { queue };
export type { QueueTicket, QueueStats, TVDisplayState };
