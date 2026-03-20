// Voice Call State Store
import { create } from 'zustand';

export interface CurrentCall {
  callId: string;
  callerId: string;
  callerName: string;
  calleeId: string;
  calleeName: string;
  status: 'initiated' | 'ringing' | 'active' | 'ended';
  startedAt?: string;
  priority?: 'normal' | 'urgent' | 'emergency';
}

export interface IncomingCall {
  callId: string;
  callerId: string;
  callerName: string;
  priority: 'normal' | 'urgent' | 'emergency';
  createdAt: string;
}

interface VoiceCallState {
  isInCall: boolean;
  currentCall: CurrentCall | null;
  incomingCall: IncomingCall | null;
  callHistory: CurrentCall[];
  
  // Actions
  setCurrentCall: (call: CurrentCall | null) => void;
  setIncomingCall: (call: IncomingCall | null) => void;
  clearIncomingCall: () => void;
  clearCurrentCall: () => void;
  addToHistory: (call: CurrentCall) => void;
  reset: () => void;
}

export const useVoiceCallStore = create<VoiceCallState>((set) => ({
  isInCall: false,
  currentCall: null,
  incomingCall: null,
  callHistory: [],
  
  setCurrentCall: (call) =>
    set({ 
      currentCall: call, 
      isInCall: !!call 
    }),
  
  setIncomingCall: (call) =>
    set({ incomingCall: call }),
  
  clearIncomingCall: () =>
    set({ incomingCall: null }),
  
  clearCurrentCall: () =>
    set({ currentCall: null, isInCall: false }),
  
  addToHistory: (call) =>
    set((state) => ({
      callHistory: [call, ...state.callHistory].slice(0, 50) // Keep last 50 calls
    })),
  
  reset: () =>
    set({
      isInCall: false,
      currentCall: null,
      incomingCall: null,
    }),
}));
