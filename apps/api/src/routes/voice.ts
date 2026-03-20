// Voice Call Routes - Real-time audio communication between staff
import { Hono } from 'hono';
import type { Bindings } from '../types';
import { z } from 'zod';
import { voiceService } from '../services/voice';

const voice = new Hono<{ Bindings: Bindings }>();

const initiateCallSchema = z.object({
  targetUserId: z.string().min(1),
  priority: z.enum(['normal', 'urgent', 'emergency']).optional().default('normal'),
  metadata: z.object({
    patientId: z.string().optional(),
    department: z.string().optional(),
  }).optional(),
});

const acceptCallSchema = z.object({
  sdp: z.string().optional(),
});

const rejectCallSchema = z.object({
  reason: z.enum(['busy', 'unavailable', 'declined']).optional().default('declined'),
});

const transferCallSchema = z.object({
  targetUserId: z.string().min(1),
  mode: z.enum(['attended', 'blind']).optional().default('attended'),
});

const getCallsSchema = z.object({
  status: z.enum(['all', 'completed', 'missed', 'rejected']).optional().default('all'),
  userId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0),
});

voice.use('*', async (c, next) => {
  await next();
});

async function validateBody<T>(schema: z.ZodSchema<T>, c: any): Promise<T | null> {
  try {
    const body = await c.req.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      c.status(400);
      c.json({ success: false, error: 'Validation failed', details: result.error.flatten() });
      return null;
    }
    return result.data;
  } catch {
    c.status(400);
    c.json({ success: false, error: 'Invalid JSON body' });
    return null;
  }
}

async function validateQuery<T>(schema: z.ZodSchema<T>, c: any): Promise<T | null> {
  try {
    const query = c.req.query();
    const result = schema.safeParse(query);
    if (!result.success) {
      c.status(400);
      c.json({ success: false, error: 'Validation failed', details: result.error.flatten() });
      return null;
    }
    return result.data;
  } catch {
    c.status(400);
    c.json({ success: false, error: 'Invalid query parameters' });
    return null;
  }
}

voice.post('/call', async (c) => {
  const body = await validateBody(initiateCallSchema, c);
  if (!body) return;
  
  const callerId = 'current-user-id';
  const callerName = 'Current User';
  const callerRole = 'nurse';
  
  try {
    const call = await voiceService.initiateCall(
      callerId,
      callerName,
      callerRole,
      body.targetUserId,
      body.priority,
      body.metadata
    );
    
    return c.json({
      success: true,
      data: {
        callId: call.callId,
        callerId: call.callerId,
        callerName: call.callerName,
        calleeId: call.calleeId,
        status: call.status,
        priority: call.priority,
        createdAt: call.createdAt,
      }
    }, 201);
  } catch (error) {
    c.status(500);
    return c.json({ success: false, error: 'Failed to initiate call' });
  }
});

voice.post('/call/:callId/accept', async (c) => {
  const { callId } = c.req.param();
  const body = await validateBody(acceptCallSchema, c);
  if (!body) return;
  
  const userId = 'current-user-id';
  
  try {
    const call = await voiceService.acceptCall(callId, userId);
    if (!call) {
      c.status(404);
      return c.json({ success: false, error: 'Call not found or not authorized' });
    }
    
    return c.json({
      success: true,
      data: {
        callId: call.callId,
        status: call.status,
        startedAt: call.startedAt,
      }
    });
  } catch (error) {
    c.status(500);
    return c.json({ success: false, error: 'Failed to accept call' });
  }
});

voice.post('/call/:callId/reject', async (c) => {
  const { callId } = c.req.param();
  const body = await validateBody(rejectCallSchema, c);
  if (!body) return;
  
  const userId = 'current-user-id';
  
  try {
    const call = await voiceService.rejectCall(callId, userId, body.reason);
    if (!call) {
      c.status(404);
      return c.json({ success: false, error: 'Call not found or not authorized' });
    }
    
    return c.json({
      success: true,
      data: {
        callId: call.callId,
        status: call.status,
        reason: body.reason,
        endedAt: call.endedAt,
      }
    });
  } catch (error) {
    c.status(500);
    return c.json({ success: false, error: 'Failed to reject call' });
  }
});

voice.post('/call/:callId/end', async (c) => {
  const { callId } = c.req.param();
  
  const userId = 'current-user-id';
  
  try {
    const call = await voiceService.endCall(callId, userId);
    if (!call) {
      c.status(404);
      return c.json({ success: false, error: 'Call not found or not authorized' });
    }
    
    return c.json({
      success: true,
      data: {
        callId: call.callId,
        status: call.status,
        duration: call.duration,
        endedAt: call.endedAt,
      }
    });
  } catch (error) {
    c.status(500);
    return c.json({ success: false, error: 'Failed to end call' });
  }
});

voice.post('/call/:callId/hold', async (c) => {
  const { callId } = c.req.param();
  
  const userId = 'current-user-id';
  
  try {
    const call = await voiceService.holdCall(callId, userId);
    if (!call) {
      c.status(404);
      return c.json({ success: false, error: 'Call not found or not active' });
    }
    
    return c.json({
      success: true,
      data: {
        callId: call.callId,
        status: call.status,
      }
    });
  } catch (error) {
    c.status(500);
    return c.json({ success: false, error: 'Failed to hold call' });
  }
});

voice.post('/call/:callId/resume', async (c) => {
  const { callId } = c.req.param();
  
  const userId = 'current-user-id';
  
  try {
    const call = await voiceService.resumeCall(callId, userId);
    if (!call) {
      c.status(404);
      return c.json({ success: false, error: 'Call not found or not on hold' });
    }
    
    return c.json({
      success: true,
      data: {
        callId: call.callId,
        status: call.status,
      }
    });
  } catch (error) {
    c.status(500);
    return c.json({ success: false, error: 'Failed to resume call' });
  }
});

voice.post('/call/:callId/transfer', async (c) => {
  const { callId } = c.req.param();
  const body = await validateBody(transferCallSchema, c);
  if (!body) return;
  
  const userId = 'current-user-id';
  
  try {
    const call = await voiceService.transferCall(callId, userId, body.targetUserId, body.mode);
    if (!call) {
      c.status(404);
      return c.json({ success: false, error: 'Call not found or not authorized' });
    }
    
    return c.json({
      success: true,
      data: {
        callId: call.callId,
        newCalleeId: body.targetUserId,
        transferMode: body.mode,
        status: call.status,
      }
    });
  } catch (error) {
    c.status(500);
    return c.json({ success: false, error: 'Failed to transfer call' });
  }
});

voice.get('/calls', async (c) => {
  const query = await validateQuery(getCallsSchema, c);
  if (!query) return;
  
  const userId = 'current-user-id';
  
  try {
    const result = await voiceService.getCallHistory(userId, {
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
      limit: query.limit,
      offset: query.offset,
    });
    
    return c.json({
      success: true,
      data: {
        calls: result.calls,
        total: result.total,
        limit: query.limit,
        offset: query.offset,
      }
    });
  } catch (error) {
    c.status(500);
    return c.json({ success: false, error: 'Failed to get call history' });
  }
});

voice.get('/calls/active', async (c) => {
  const userId = 'current-user-id';
  
  try {
    const calls = await voiceService.getActiveCalls(userId);
    
    return c.json({
      success: true,
      data: {
        calls,
      }
    });
  } catch (error) {
    c.status(500);
    return c.json({ success: false, error: 'Failed to get active calls' });
  }
});

export { voice };
