/**
 * Voice Call API Client
 * Handles all voice call related API operations
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

/**
 * Request types for voice call operations
 */
export interface InitiateCallRequest {
  targetUserId: string;
  priority?: 'normal' | 'urgent' | 'emergency';
  metadata?: {
    patientId?: string;
    department?: string;
  };
}

export interface CallHistoryParams {
  status?: string;
  limit?: number;
  offset?: number;
}

/**
 * Response types from voice call API
 */
export interface VoiceCallData {
  callId: string;
  callerId: string;
  callerName: string;
  calleeId: string;
  calleeName?: string;
  status: string;
  priority: string;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  metadata?: {
    patientId?: string;
    department?: string;
  };
}

export interface VoiceCallResponse {
  success: boolean;
  data?: VoiceCallData;
  error?: string;
  message?: string;
}

export interface CallHistoryResponse {
  success: boolean;
  data?: {
    calls: VoiceCallData[];
    total?: number;
    limit?: number;
    offset?: number;
  };
  error?: string;
}

export interface ActiveCallsResponse {
  success: boolean;
  data?: VoiceCallData[];
  error?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  isOnline?: boolean;
}

/**
 * Get the auth token from localStorage
 */
function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
}

/**
 * Create headers with auth token
 */
function createHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

/**
 * Initiate a voice call to another staff member
 */
export async function initiateCall(data: InitiateCallRequest): Promise<VoiceCallResponse> {
  try {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE}/voice/call`, {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to initiate call' }));
      return { success: false, error: error.message };
    }

    return res.json();
  } catch (error) {
    console.error('Error initiating call:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Accept an incoming call
 */
export async function acceptCall(callId: string): Promise<VoiceCallResponse> {
  try {
    const res = await fetch(`${API_BASE}/voice/call/${callId}/accept`, {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to accept call' }));
      return { success: false, error: error.message };
    }

    return res.json();
  } catch (error) {
    console.error('Error accepting call:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Reject an incoming call
 */
export async function rejectCall(callId: string, reason?: string): Promise<VoiceCallResponse> {
  try {
    const res = await fetch(`${API_BASE}/voice/call/${callId}/reject`, {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify({ reason }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to reject call' }));
      return { success: false, error: error.message };
    }

    return res.json();
  } catch (error) {
    console.error('Error rejecting call:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * End an active call
 */
export async function endCall(callId: string): Promise<VoiceCallResponse> {
  try {
    const res = await fetch(`${API_BASE}/voice/call/${callId}/end`, {
      method: 'POST',
      headers: createHeaders(),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to end call' }));
      return { success: false, error: error.message };
    }

    return res.json();
  } catch (error) {
    console.error('Error ending call:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Get call history with optional filters
 */
export async function getCallHistory(params?: CallHistoryParams): Promise<CallHistoryResponse> {
  try {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.offset) query.append('offset', String(params.offset));

    const queryString = query.toString();
    const url = `${API_BASE}/voice/calls${queryString ? `?${queryString}` : ''}`;

    const res = await fetch(url, {
      headers: createHeaders(),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to fetch call history' }));
      return { success: false, error: error.message };
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching call history:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Get all active calls
 */
export async function getActiveCalls(): Promise<ActiveCallsResponse> {
  try {
    const res = await fetch(`${API_BASE}/voice/calls/active`, {
      headers: createHeaders(),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to fetch active calls' }));
      return { success: false, error: error.message };
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching active calls:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Get available staff members for calling
 * This would typically fetch from the staff/users endpoint
 */
export async function getStaffMembers(department?: string): Promise<{ success: boolean; data?: StaffMember[]; error?: string }> {
  try {
    const query = department ? `?department=${department}` : '';
    const res = await fetch(`${API_BASE}/staff${query}`, {
      headers: createHeaders(),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to fetch staff members' }));
      return { success: false, error: error.message };
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching staff members:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Update call status (for internal use)
 */
export async function updateCallStatus(
  callId: string,
  status: 'active' | 'on-hold' | 'completed'
): Promise<VoiceCallResponse> {
  try {
    const res = await fetch(`${API_BASE}/voice/call/${callId}/status`, {
      method: 'PATCH',
      headers: createHeaders(),
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to update call status' }));
      return { success: false, error: error.message };
    }

    return res.json();
  } catch (error) {
    console.error('Error updating call status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}
