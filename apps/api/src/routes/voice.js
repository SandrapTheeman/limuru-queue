// Voice Call Routes - Express.js version for real-time audio communication
const express = require('express');
const router = express.Router();
const voiceService = require('../services/voice');

// Validation middleware helper
const validateBody = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.details.map(d => ({ field: d.path.join('.'), message: d.message }))
    });
  }
  req.validatedBody = value;
  next();
};

const validateQuery = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.query, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.details.map(d => ({ field: d.path.join('.'), message: d.message }))
    });
  }
  req.validatedQuery = value;
  next();
};

// Simple Zod-like validation (using express-validator patterns)
const schemas = {
  initiateCall: {
    validate: (req, res, next) => {
      const { targetUserId, priority, metadata } = req.body;
      if (!targetUserId || typeof targetUserId !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: [{ field: 'targetUserId', message: 'targetUserId is required' }]
        });
      }
      if (priority && !['normal', 'urgent', 'emergency'].includes(priority)) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: [{ field: 'priority', message: 'priority must be normal, urgent, or emergency' }]
        });
      }
      req.validatedBody = { targetUserId, priority: priority || 'normal', metadata };
      next();
    }
  },
  acceptCall: {
    validate: (req, res, next) => {
      req.validatedBody = { sdp: req.body.sdp };
      next();
    }
  },
  rejectCall: {
    validate: (req, res, next) => {
      const { reason } = req.body;
      if (reason && !['busy', 'unavailable', 'declined'].includes(reason)) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: [{ field: 'reason', message: 'reason must be busy, unavailable, or declined' }]
        });
      }
      req.validatedBody = { reason: reason || 'declined' };
      next();
    }
  },
  transferCall: {
    validate: (req, res, next) => {
      const { targetUserId, mode } = req.body;
      if (!targetUserId || typeof targetUserId !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: [{ field: 'targetUserId', message: 'targetUserId is required' }]
        });
      }
      if (mode && !['attended', 'blind'].includes(mode)) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: [{ field: 'mode', message: 'mode must be attended or blind' }]
        });
      }
      req.validatedBody = { targetUserId, mode: mode || 'attended' };
      next();
    }
  },
  getCalls: {
    validate: (req, res, next) => {
      const { status, userId, startDate, endDate, limit, offset } = req.query;
      if (status && !['all', 'completed', 'missed', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: [{ field: 'status', message: 'status must be all, completed, missed, or rejected' }]
        });
      }
      req.validatedQuery = {
        status: status || 'all',
        userId,
        startDate,
        endDate,
        limit: Math.min(Math.max(parseInt(limit) || 20, 1), 100),
        offset: Math.max(parseInt(offset) || 0, 0)
      };
      next();
    }
  }
};

// Middleware to extract user info from auth context
// TODO: Replace with actual authentication middleware (e.g., JWT verification)
const extractUser = (req, res, next) => {
  // In production, extract from JWT token
  // For now, use headers or default values
  req.user = {
    id: req.headers['x-user-id'] || 'current-user-id',
    name: req.headers['x-user-name'] || 'Current User',
    role: req.headers['x-user-role'] || 'nurse'
  };
  next();
};

// Apply user extraction to all routes
router.use(extractUser);

// POST /voice/call - Initiate a call
router.post('/call', schemas.initiateCall.validate, async (req, res) => {
  const { targetUserId, priority, metadata } = req.validatedBody;
  const { id: callerId, name: callerName, role: callerRole } = req.user;

  try {
    const call = await voiceService.initiateCall(
      callerId,
      callerName,
      callerRole,
      targetUserId,
      priority,
      metadata
    );

    res.status(201).json({
      success: true,
      data: {
        callId: call.id,
        callerId: call.caller_id,
        callerName: call.caller_name,
        calleeId: call.callee_id,
        status: call.status,
        priority: call.priority,
        createdAt: call.created_at,
      }
    });
  } catch (error) {
    console.error('Error initiating call:', error);
    res.status(500).json({ success: false, error: 'Failed to initiate call' });
  }
});

// POST /voice/call/:callId/accept - Accept an incoming call
router.post('/call/:callId/accept', schemas.acceptCall.validate, async (req, res) => {
  const { callId } = req.params;
  const { id: userId } = req.user;

  try {
    const call = await voiceService.acceptCall(callId, userId);
    if (!call) {
      return res.status(404).json({ success: false, error: 'Call not found or not authorized' });
    }

    res.json({
      success: true,
      data: {
        callId: call.id,
        status: call.status,
        startedAt: call.started_at,
      }
    });
  } catch (error) {
    console.error('Error accepting call:', error);
    res.status(500).json({ success: false, error: 'Failed to accept call' });
  }
});

// POST /voice/call/:callId/reject - Reject an incoming call
router.post('/call/:callId/reject', schemas.rejectCall.validate, async (req, res) => {
  const { callId } = req.params;
  const { reason } = req.validatedBody;
  const { id: userId } = req.user;

  try {
    const call = await voiceService.rejectCall(callId, userId, reason);
    if (!call) {
      return res.status(404).json({ success: false, error: 'Call not found or not authorized' });
    }

    res.json({
      success: true,
      data: {
        callId: call.id,
        status: call.status,
        reason,
        endedAt: call.ended_at,
      }
    });
  } catch (error) {
    console.error('Error rejecting call:', error);
    res.status(500).json({ success: false, error: 'Failed to reject call' });
  }
});

// POST /voice/call/:callId/end - End an active call
router.post('/call/:callId/end', async (req, res) => {
  const { callId } = req.params;
  const { id: userId } = req.user;

  try {
    const call = await voiceService.endCall(callId, userId);
    if (!call) {
      return res.status(404).json({ success: false, error: 'Call not found or not authorized' });
    }

    res.json({
      success: true,
      data: {
        callId: call.id,
        status: call.status,
        duration: call.duration,
        endedAt: call.ended_at,
      }
    });
  } catch (error) {
    console.error('Error ending call:', error);
    res.status(500).json({ success: false, error: 'Failed to end call' });
  }
});

// POST /voice/call/:callId/hold - Put call on hold
router.post('/call/:callId/hold', async (req, res) => {
  const { callId } = req.params;
  const { id: userId } = req.user;

  try {
    const call = await voiceService.holdCall(callId, userId);
    if (!call) {
      return res.status(404).json({ success: false, error: 'Call not found or not active' });
    }

    res.json({
      success: true,
      data: {
        callId: call.id,
        status: call.status,
      }
    });
  } catch (error) {
    console.error('Error holding call:', error);
    res.status(500).json({ success: false, error: 'Failed to hold call' });
  }
});

// POST /voice/call/:callId/resume - Resume a held call
router.post('/call/:callId/resume', async (req, res) => {
  const { callId } = req.params;
  const { id: userId } = req.user;

  try {
    const call = await voiceService.resumeCall(callId, userId);
    if (!call) {
      return res.status(404).json({ success: false, error: 'Call not found or not on hold' });
    }

    res.json({
      success: true,
      data: {
        callId: call.id,
        status: call.status,
      }
    });
  } catch (error) {
    console.error('Error resuming call:', error);
    res.status(500).json({ success: false, error: 'Failed to resume call' });
  }
});

// POST /voice/call/:callId/transfer - Transfer call to another user
router.post('/call/:callId/transfer', schemas.transferCall.validate, async (req, res) => {
  const { callId } = req.params;
  const { targetUserId, mode } = req.validatedBody;
  const { id: userId } = req.user;

  try {
    const call = await voiceService.transferCall(callId, userId, targetUserId, mode);
    if (!call) {
      return res.status(404).json({ success: false, error: 'Call not found or not authorized' });
    }

    res.json({
      success: true,
      data: {
        callId: call.id,
        newCalleeId: targetUserId,
        transferMode: mode,
        status: call.status,
      }
    });
  } catch (error) {
    console.error('Error transferring call:', error);
    res.status(500).json({ success: false, error: 'Failed to transfer call' });
  }
});

// GET /voice/calls - Get call history
router.get('/calls', schemas.getCalls.validate, async (req, res) => {
  const { status, userId, startDate, endDate, limit, offset } = req.validatedQuery;
  const { id: currentUserId } = req.user;

  try {
    const result = await voiceService.getCallHistory(currentUserId, {
      status,
      startDate,
      endDate,
      limit,
      offset,
    });

    res.json({
      success: true,
      data: {
        calls: result.calls,
        total: result.total,
        limit,
        offset,
      }
    });
  } catch (error) {
    console.error('Error getting call history:', error);
    res.status(500).json({ success: false, error: 'Failed to get call history' });
  }
});

// GET /voice/calls/active - Get active calls
router.get('/calls/active', async (req, res) => {
  const { id: userId } = req.user;

  try {
    const calls = await voiceService.getActiveCalls(userId);

    res.json({
      success: true,
      data: {
        calls,
      }
    });
  } catch (error) {
    console.error('Error getting active calls:', error);
    res.status(500).json({ success: false, error: 'Failed to get active calls' });
  }
});

// GET /voice/call/:callId - Get a specific call
router.get('/call/:callId', async (req, res) => {
  const { callId } = req.params;
  const { id: userId } = req.user;

  try {
    const call = await voiceService.getCall(callId);
    if (!call) {
      return res.status(404).json({ success: false, error: 'Call not found' });
    }

    // Check if user is participant
    if (call.caller_id !== userId && call.callee_id !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized to view this call' });
    }

    res.json({
      success: true,
      data: call
    });
  } catch (error) {
    console.error('Error getting call:', error);
    res.status(500).json({ success: false, error: 'Failed to get call' });
  }
});

// POST /voice/call/:callId/ice - Handle ICE candidate exchange
router.post('/call/:callId/ice', async (req, res) => {
  const { callId } = req.params;
  const { candidate } = req.body;

  try {
    await voiceService.handleIceCandidate(callId, candidate);
    res.json({ success: true });
  } catch (error) {
    console.error('Error handling ICE candidate:', error);
    res.status(500).json({ success: false, error: 'Failed to handle ICE candidate' });
  }
});

// POST /voice/call/:callId/offer - Handle WebRTC offer
router.post('/call/:callId/offer', async (req, res) => {
  const { callId } = req.params;
  const { offer } = req.body;

  try {
    const answer = await voiceService.handleOffer(callId, offer);
    res.json({ success: true, data: { answer } });
  } catch (error) {
    console.error('Error handling offer:', error);
    res.status(500).json({ success: false, error: 'Failed to handle offer' });
  }
});

// POST /voice/call/:callId/answer - Handle WebRTC answer
router.post('/call/:callId/answer', async (req, res) => {
  const { callId } = req.params;
  const { answer } = req.body;

  try {
    await voiceService.handleAnswer(callId, answer);
    res.json({ success: true });
  } catch (error) {
    console.error('Error handling answer:', error);
    res.status(500).json({ success: false, error: 'Failed to handle answer' });
  }
});

module.exports = router;
