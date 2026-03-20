// Voice Call API Client - Express.js/Docker version
import * as SecureStore from 'expo-secure-store';

const API_BASE = 'http://localhost:8787/api';

export interface InitiateCallRequest {
  targetUserId: string;
  targetName?: string;
  priority?: 'normal' | 'urgent' | 'emergency';
  callerId: string;
  callerName: string;
}

export interface VoiceCallResponse {
  success: boolean;
  data?: {
    id: string;
    callerId: string;
    callerName: string;
    calleeId: string;
    calleeName: string;
    status: string;
    priority: string;
    createdAt: string;
  };
  error?: string;
}

export interface CallHistoryItem {
  id: string;
  callerId: string;
  callerName: string;
  calleeId: string;
  calleeName: string;
  status: string;
  priority: string;
  duration?: number;
  createdAt: string;
  endedAt?: string;
}

async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync('authToken');
  } catch {
    return null;
  }
}

export async function initiateCall(data: InitiateCallRequest): Promise<VoiceCallResponse> {
  const token = await getAuthToken();
  try {
    const response = await fetch(`${API_BASE}/voice/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });
    return response.json();
  } catch (error) {
    return { success: false, error: 'Network error. Please check your connection.' };
  }
}

export async function acceptCall(callId: string): Promise<VoiceCallResponse> {
  const token = await getAuthToken();
  try {
    const response = await fetch(`${API_BASE}/voice/call/${callId}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    return response.json();
  } catch (error) {
    return { success: false, error: 'Network error. Please check your connection.' };
  }
}

export async function rejectCall(callId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
  const token = await getAuthToken();
  try {
    const response = await fetch(`${API_BASE}/voice/call/${callId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ reason }),
    });
    return response.json();
  } catch (error) {
    return { success: false, error: 'Network error. Please check your connection.' };
  }
}

export async function endCall(callId: string): Promise<{ success: boolean; error?: string }> {
  const token = await getAuthToken();
  try {
    const response = await fetch(`${API_BASE}/voice/call/${callId}/end`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    return response.json();
  } catch (error) {
    return { success: false, error: 'Network error. Please check your connection.' };
  }
}

export async function holdCall(callId: string): Promise<{ success: boolean; error?: string }> {
  const token = await getAuthToken();
  try {
    const response = await fetch(`${API_BASE}/voice/call/${callId}/hold`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    return response.json();
  } catch (error) {
    return { success: false, error: 'Network error. Please check your connection.' };
  }
}

export async function resumeCall(callId: string): Promise<{ success: boolean; error?: string }> {
  const token = await getAuthToken();
  try {
    const response = await fetch(`${API_BASE}/voice/call/${callId}/resume`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    return response.json();
  } catch (error) {
    return { success: false, error: 'Network error. Please check your connection.' };
  }
}

export async function getCallHistory(params?: { status?: string; limit?: number }): Promise<{ success: boolean; data?: CallHistoryItem[]; error?: string }> {
  const token = await getAuthToken();
  try {
    const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
    const response = await fetch(`${API_BASE}/voice/calls${query}`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    return response.json();
  } catch (error) {
    return { success: false, error: 'Network error. Please check your connection.' };
  }
}

export async function getActiveCalls(): Promise<{ success: boolean; data?: CallHistoryItem[]; error?: string }> {
  const token = await getAuthToken();
  try {
    const response = await fetch(`${API_BASE}/voice/calls/active`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    return response.json();
  } catch (error) {
    return { success: false, error: 'Network error. Please check your connection.' };
  }
}
