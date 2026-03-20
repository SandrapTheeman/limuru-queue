// Voice Call Service - Handles real-time audio communication

// WebRTC Types (defined locally since @types/webrtc may not be installed)
interface RTCIceCandidate {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}

interface RTCSessionDescriptionInit {
  type: RTCSdpType;
  sdp: string;
}

type RTCSdpType = 'offer' | 'pranswer' | 'answer' | 'rollback';

export interface VoiceCall {
  callId: string;
  callerId: string;
  callerName: string;
  callerRole: string;
  calleeId: string;
  calleeName: string;
  calleeRole: string;
  status: 'initiated' | 'ringing' | 'active' | 'held' | 'rejected' | 'ended' | 'transferring';
  priority: 'normal' | 'urgent' | 'emergency';
  metadata?: {
    patientId?: string;
    department?: string;
  };
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
}

export interface CallParticipant {
  userId: string;
  name: string;
  role: string;
  isOnline: boolean;
}

// In-memory call store (replace with database)
const activeCalls = new Map<string, VoiceCall>();
const userCalls = new Map<string, string[]>(); // userId -> callIds

export const voiceService = {
  /**
   * Initiate a new call
   */
  async initiateCall(
    callerId: string,
    callerName: string,
    callerRole: string,
    calleeId: string,
    priority: 'normal' | 'urgent' | 'emergency' = 'normal',
    metadata?: { patientId?: string; department?: string }
  ): Promise<VoiceCall> {
    const callId = `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const call: VoiceCall = {
      callId,
      callerId,
      callerName,
      callerRole,
      calleeId,
      calleeName: '', // Will be populated from user lookup
      calleeRole: '',
      status: 'initiated',
      priority,
      metadata,
      createdAt: new Date().toISOString(),
    };

    // Store call
    activeCalls.set(callId, call);
    
    // Update user's calls
    if (!userCalls.has(callerId)) {
      userCalls.set(callerId, []);
    }
    userCalls.get(callerId)!.push(callId);
    
    if (!userCalls.has(calleeId)) {
      userCalls.set(calleeId, []);
    }
    userCalls.get(calleeId)!.push(callId);

    return call;
  },

  /**
   * Accept an incoming call
   */
  async acceptCall(callId: string, userId: string): Promise<VoiceCall | null> {
    const call = activeCalls.get(callId);
    if (!call || call.calleeId !== userId) {
      return null;
    }

    call.status = 'active';
    call.startedAt = new Date().toISOString();
    
    activeCalls.set(callId, call);
    return call;
  },

  /**
   * Reject an incoming call
   */
  async rejectCall(
    callId: string,
    userId: string,
    reason: 'busy' | 'unavailable' | 'declined' = 'declined'
  ): Promise<VoiceCall | null> {
    const call = activeCalls.get(callId);
    if (!call || call.calleeId !== userId) {
      return null;
    }

    call.status = 'rejected';
    call.endedAt = new Date().toISOString();
    
    activeCalls.set(callId, call);
    return call;
  },

  /**
   * End an active call
   */
  async endCall(callId: string, userId: string): Promise<VoiceCall | null> {
    const call = activeCalls.get(callId);
    if (!call) {
      return null;
    }

    // Only caller or callee can end the call
    if (call.callerId !== userId && call.calleeId !== userId) {
      return null;
    }

    call.status = 'ended';
    call.endedAt = new Date().toISOString();
    
    if (call.startedAt) {
      call.duration = Math.floor(
        (new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000
      );
    }
    
    activeCalls.set(callId, call);
    return call;
  },

  /**
   * Put a call on hold
   */
  async holdCall(callId: string, userId: string): Promise<VoiceCall | null> {
    const call = activeCalls.get(callId);
    if (!call || call.status !== 'active') {
      return null;
    }

    call.status = 'held';
    activeCalls.set(callId, call);
    return call;
  },

  /**
   * Resume a held call
   */
  async resumeCall(callId: string, userId: string): Promise<VoiceCall | null> {
    const call = activeCalls.get(callId);
    if (!call || call.status !== 'held') {
      return null;
    }

    call.status = 'active';
    activeCalls.set(callId, call);
    return call;
  },

  /**
   * Transfer a call to another user
   */
  async transferCall(
    callId: string,
    fromUserId: string,
    toUserId: string,
    mode: 'attended' | 'blind' = 'attended'
  ): Promise<VoiceCall | null> {
    const call = activeCalls.get(callId);
    if (!call || (call.callerId !== fromUserId && call.calleeId !== fromUserId)) {
      return null;
    }

    // Remove current callee
    const previousCalleeId = call.calleeId;
    
    // Update to new callee
    call.calleeId = toUserId;
    call.status = mode === 'blind' ? 'initiated' : 'transferring';
    
    activeCalls.set(callId, call);
    return call;
  },

  /**
   * Get call by ID
   */
  async getCall(callId: string): Promise<VoiceCall | null> {
    return activeCalls.get(callId) || null;
  },

  /**
   * Get all active calls for a user
   */
  async getActiveCalls(userId: string): Promise<VoiceCall[]> {
    const callIds = userCalls.get(userId) || [];
    const calls: VoiceCall[] = [];
    
    for (const callId of callIds) {
      const call = activeCalls.get(callId);
      if (call && ['initiated', 'ringing', 'active', 'held'].includes(call.status)) {
        calls.push(call);
      }
    }
    
    return calls;
  },

  /**
   * Get call history for a user
   */
  async getCallHistory(
    userId: string,
    options: {
      status?: 'all' | 'completed' | 'missed' | 'rejected';
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ calls: VoiceCall[]; total: number }> {
    const callIds = userCalls.get(userId) || [];
    let calls: VoiceCall[] = [];
    
    for (const callId of callIds) {
      const call = activeCalls.get(callId);
      if (!call) continue;

      // Filter by status
      if (options.status && options.status !== 'all') {
        if (options.status === 'completed' && call.status !== 'ended') continue;
        if (options.status === 'missed' && call.status !== 'ended') continue;
        if (options.status === 'rejected' && call.status !== 'rejected') continue;
      }

      // Filter by date range
      if (options.startDate && call.createdAt < options.startDate) continue;
      if (options.endDate && call.createdAt > options.endDate) continue;

      calls.push(call);
    }

    // Sort by createdAt descending
    calls.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = calls.length;
    const offset = options.offset || 0;
    const limit = options.limit || 20;

    return {
      calls: calls.slice(offset, offset + limit),
      total,
    };
  },

  /**
   * Check if user is available for calls
   */
  async isUserAvailable(userId: string): Promise<boolean> {
    const activeCalls = await this.getActiveCalls(userId);
    return activeCalls.length === 0;
  },

  /**
   * Handle ICE candidate exchange
   */
  async handleIceCandidate(
    callId: string,
    candidate: RTCIceCandidate
  ): Promise<void> {
    // TODO: Relay ICE candidate to peer via WebSocket
    console.log(`ICE candidate for call ${callId}:`, candidate);
  },

  /**
   * Handle WebRTC offer
   */
  async handleOffer(
    callId: string,
    offer: RTCSessionDescriptionInit
  ): Promise<RTCSessionDescriptionInit | null> {
    // TODO: Process offer and return answer
    console.log(`WebRTC offer for call ${callId}:`, offer);
    return null;
  },

  /**
   * Handle WebRTC answer
   */
  async handleAnswer(
    callId: string,
    answer: RTCSessionDescriptionInit
  ): Promise<void> {
    // TODO: Process answer
    console.log(`WebRTC answer for call ${callId}:`, answer);
  },
};
