// Voice Call Service - Express.js/PostgreSQL version for real-time audio communication
// Uses pg client instead of D1, stores calls in PostgreSQL

const { Pool } = require('pg');

// PostgreSQL connection pool
// In production, use environment variables for connection string
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/hospital_queue',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Types (matching PostgreSQL schema)
const VoiceCallStatus = ['initiated', 'ringing', 'active', 'held', 'transferring', 'rejected', 'ended'];
const PriorityLevel = ['normal', 'urgent', 'emergency'];
const TransferMode = ['attended', 'blind'];
const RejectReason = ['busy', 'unavailable', 'declined'];

/**
 * Execute a query with error handling
 */
const executeQuery = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

/**
 * Get user info from users table
 */
const getUserInfo = async (userId) => {
  const result = await executeQuery(
    'SELECT id, name, role, department FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0] || null;
};

const voiceService = {
  /**
   * Initiate a new call
   */
  async initiateCall(
    callerId,
    callerName,
    callerRole,
    calleeId,
    priority = 'normal',
    metadata = null
  ) {
    // Get callee info
    const calleeInfo = await getUserInfo(calleeId);
    if (!calleeInfo) {
      throw new Error('Callee not found');
    }

    const result = await executeQuery(
      `INSERT INTO voice_calls (
        caller_id, caller_name, caller_role,
        callee_id, callee_name, callee_role,
        status, priority, metadata, started_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *`,
      [
        callerId,
        callerName,
        callerRole,
        calleeId,
        calleeInfo.name,
        calleeInfo.role,
        'initiated',
        priority,
        metadata ? JSON.stringify(metadata) : null
      ]
    );

    return result.rows[0];
  },

  /**
   * Accept an incoming call
   */
  async acceptCall(callId, userId) {
    // Verify user is the callee
    const existingCall = await executeQuery(
      'SELECT * FROM voice_calls WHERE id = $1',
      [callId]
    );

    if (!existingCall.rows[0] || existingCall.rows[0].callee_id !== userId) {
      return null;
    }

    // Update status to active
    const result = await executeQuery(
      `UPDATE voice_calls 
       SET status = 'active', started_at = NOW()
       WHERE id = $1 AND callee_id = $2
       RETURNING *`,
      [callId, userId]
    );

    return result.rows[0] || null;
  },

  /**
   * Reject an incoming call
   */
  async rejectCall(callId, userId, reason = 'declined') {
    // Verify user is the callee
    const existingCall = await executeQuery(
      'SELECT * FROM voice_calls WHERE id = $1',
      [callId]
    );

    if (!existingCall.rows[0] || existingCall.rows[0].callee_id !== userId) {
      return null;
    }

    // Update status to rejected
    const result = await executeQuery(
      `UPDATE voice_calls 
       SET status = 'rejected', ended_at = NOW(),
           metadata = jsonb_set(COALESCE(metadata, '{}'), '{rejection_reason}', to_jsonb($3::text))
       WHERE id = $1 AND callee_id = $2
       RETURNING *`,
      [callId, userId, reason]
    );

    return result.rows[0] || null;
  },

  /**
   * End an active call
   */
  async endCall(callId, userId) {
    // Verify user is a participant
    const existingCall = await executeQuery(
      'SELECT * FROM voice_calls WHERE id = $1',
      [callId]
    );

    if (!existingCall.rows[0]) {
      return null;
    }

    const call = existingCall.rows[0];
    if (call.caller_id !== userId && call.callee_id !== userId) {
      return null;
    }

    // Calculate duration if call was active
    let duration = null;
    if (call.started_at) {
      duration = Math.floor(
        (new Date().getTime() - new Date(call.started_at).getTime()) / 1000
      );
    }

    // Update status to ended
    const result = await executeQuery(
      `UPDATE voice_calls 
       SET status = 'ended', ended_at = NOW(), duration = $3
       WHERE id = $1 AND (caller_id = $2 OR callee_id = $2)
       RETURNING *`,
      [callId, userId, duration]
    );

    return result.rows[0] || null;
  },

  /**
   * Put a call on hold
   */
  async holdCall(callId, userId) {
    // Verify user is a participant and call is active
    const existingCall = await executeQuery(
      'SELECT * FROM voice_calls WHERE id = $1 AND status = $2',
      [callId, 'active']
    );

    if (!existingCall.rows[0]) {
      return null;
    }

    const call = existingCall.rows[0];
    if (call.caller_id !== userId && call.callee_id !== userId) {
      return null;
    }

    const result = await executeQuery(
      `UPDATE voice_calls 
       SET status = 'held'
       WHERE id = $1 AND (caller_id = $2 OR callee_id = $2)
       RETURNING *`,
      [callId, userId]
    );

    return result.rows[0] || null;
  },

  /**
   * Resume a held call
   */
  async resumeCall(callId, userId) {
    // Verify user is a participant and call is held
    const existingCall = await executeQuery(
      'SELECT * FROM voice_calls WHERE id = $1 AND status = $2',
      [callId, 'held']
    );

    if (!existingCall.rows[0]) {
      return null;
    }

    const call = existingCall.rows[0];
    if (call.caller_id !== userId && call.callee_id !== userId) {
      return null;
    }

    const result = await executeQuery(
      `UPDATE voice_calls 
       SET status = 'active'
       WHERE id = $1 AND (caller_id = $2 OR callee_id = $2)
       RETURNING *`,
      [callId, userId]
    );

    return result.rows[0] || null;
  },

  /**
   * Transfer a call to another user
   */
  async transferCall(callId, fromUserId, toUserId, mode = 'attended') {
    // Verify user is a participant
    const existingCall = await executeQuery(
      'SELECT * FROM voice_calls WHERE id = $1',
      [callId]
    );

    if (!existingCall.rows[0]) {
      return null;
    }

    const call = existingCall.rows[0];
    if (call.caller_id !== fromUserId && call.callee_id !== fromUserId) {
      return null;
    }

    // Get new callee info
    const newCalleeInfo = await getUserInfo(toUserId);
    if (!newCalleeInfo) {
      throw new Error('Transfer target user not found');
    }

    const newStatus = mode === 'blind' ? 'initiated' : 'transferring';

    const result = await executeQuery(
      `UPDATE voice_calls 
       SET callee_id = $4, callee_name = $5, callee_role = $6,
           status = $7,
           metadata = jsonb_set(COALESCE(metadata, '{}'), '{transfer}',
             to_jsonb(json_build_object('from', $8, 'mode', $9::text, 'at', NOW())))
       WHERE id = $1
       RETURNING *`,
      [callId, fromUserId, toUserId, toUserId, newCalleeInfo.name, newCalleeInfo.role, newStatus, fromUserId, mode]
    );

    return result.rows[0] || null;
  },

  /**
   * Get call by ID
   */
  async getCall(callId) {
    const result = await executeQuery(
      'SELECT * FROM voice_calls WHERE id = $1',
      [callId]
    );
    return result.rows[0] || null;
  },

  /**
   * Get all active calls for a user
   */
  async getActiveCalls(userId) {
    const result = await executeQuery(
      `SELECT * FROM voice_calls 
       WHERE (caller_id = $1 OR callee_id = $1)
         AND status IN ('initiated', 'ringing', 'active', 'held')
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  /**
   * Get call history for a user
   */
  async getCallHistory(userId, options = {}) {
    const { status = 'all', startDate, endDate, limit = 20, offset = 0 } = options;

    let whereClause = '(caller_id = $1 OR callee_id = $1)';
    const params = [userId];
    let paramIndex = 2;

    // Filter by status
    if (status === 'completed') {
      whereClause += ' AND status = $' + paramIndex++;
      params.push('ended');
    } else if (status === 'missed') {
      // Missed calls: initiated but ended without being accepted
      whereClause += ` AND status = 'ended' AND caller_id = $${paramIndex++} AND callee_id != $1`;
      params.push(userId);
    } else if (status === 'rejected') {
      whereClause += ' AND status = $' + paramIndex++;
      params.push('rejected');
    }
    // 'all' doesn't add a status filter

    // Date range filter
    if (startDate) {
      whereClause += ` AND created_at >= $${paramIndex++}`;
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ` AND created_at <= $${paramIndex++}`;
      params.push(endDate);
    }

    // Get total count
    const countResult = await executeQuery(
      `SELECT COUNT(*) as total FROM voice_calls WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get paginated results
    const result = await executeQuery(
      `SELECT * FROM voice_calls 
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, limit, offset]
    );

    return {
      calls: result.rows,
      total
    };
  },

  /**
   * Check if user is available for calls
   */
  async isUserAvailable(userId) {
    const activeCalls = await this.getActiveCalls(userId);
    return activeCalls.length === 0;
  },

  /**
   * Handle ICE candidate exchange
   * TODO: Relay ICE candidate to peer via WebSocket
   */
  async handleIceCandidate(callId, candidate) {
    console.log(`ICE candidate for call ${callId}:`, candidate);
    // In production, relay to WebSocket server for peer connection
    return true;
  },

  /**
   * Handle WebRTC offer
   * TODO: Process offer and return answer
   */
  async handleOffer(callId, offer) {
    console.log(`WebRTC offer for call ${callId}:`, offer);
    // In production, process through TURN/STUN server
    return null;
  },

  /**
   * Handle WebRTC answer
   * TODO: Process answer
   */
  async handleAnswer(callId, answer) {
    console.log(`WebRTC answer for call ${callId}:`, answer);
    // In production, complete peer connection setup
    return true;
  },

  /**
   * Get database pool for connection management
   */
  getPool() {
    return pool;
  },

  /**
   * Close all connections (for graceful shutdown)
   */
  async close() {
    await pool.end();
  }
};

module.exports = voiceService;
