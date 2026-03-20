// Voice Call Types - Shared across all apps

export type CallStatus = 
  | 'initiated' 
  | 'ringing' 
  | 'active' 
  | 'held' 
  | 'transferring' 
  | 'rejected' 
  | 'ended';

export type CallPriority = 'normal' | 'urgent' | 'emergency';

export type CallType = 'incoming' | 'outgoing';

export interface VoiceCall {
  callId: string;
  callerId: string;
  callerName: string;
  callerRole?: string;
  calleeId: string;
  calleeName: string;
  calleeRole?: string;
  status: CallStatus;
  priority: CallPriority;
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
  lastSeen?: string;
}

export interface CallHistoryItem {
  id: string;
  callId: string;
  type: CallType;
  participant: CallParticipant;
  status: CallStatus;
  priority: CallPriority;
  startedAt: string;
  endedAt?: string;
  duration?: number;
  notes?: string;
}

export interface WebRTCCandidate {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
  usernameFragment?: string | null;
}

export interface WebRTCOffer {
  type: 'offer';
  sdp: string;
}

export interface WebRTCAnswer {
  type: 'answer';
  sdp: string;
}

export interface CallRequest {
  targetUserId: string;
  priority?: CallPriority;
  metadata?: {
    patientId?: string;
    department?: string;
  };
}

export interface CallResponse {
  success: boolean;
  data?: VoiceCall;
  error?: string;
}

export interface CallHistoryResponse {
  success: boolean;
  data?: {
    calls: VoiceCall[];
    total: number;
    limit: number;
    offset: number;
  };
  error?: string;
}
