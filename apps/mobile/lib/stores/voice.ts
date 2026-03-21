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
  callDuration: number;
  
  // Actions
  setCurrentCall: (call: CurrentCall | null) => void;
  setIncomingCall: (call: IncomingCall | null) => void;
  clearIncomingCall: () => void;
  clearCurrentCall: () => void;
  addToHistory: (call: CurrentCall) => void;
  setCallDuration: (duration: number) => void;
  reset: () => void;
}

export const useVoiceCallStore = create<VoiceCallState>((set) => ({
  isInCall: false,
  currentCall: null,
  incomingCall: null,
  callHistory: [],
  callDuration: 0,
  
  setCurrentCall: (call) =>
    set({ 
      currentCall: call, 
      isInCall: !!call,
      callDuration: 0,
    }),
  
  setIncomingCall: (call) =>
    set({ incomingCall: call }),
  
  clearIncomingCall: () =>
    set({ incomingCall: null }),
  
  clearCurrentCall: () =>
    set({ currentCall: null, isInCall: false, callDuration: 0 }),
  
  addToHistory: (call) =>
    set((state) => ({
      callHistory: [call, ...state.callHistory].slice(0, 50)
    })),

  setCallDuration: (duration) =>
    set({ callDuration: duration }),
  
  reset: () =>
    set({
      isInCall: false,
      currentCall: null,
      incomingCall: null,
      callDuration: 0,
    }),
}));
