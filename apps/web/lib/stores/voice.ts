'use client';

/**
 * Voice Call Store
 * Manages voice call state using Zustand with immer middleware
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export type CallPriority = 'normal' | 'urgent' | 'emergency';
export type CallStatus = 'ringing' | 'connecting' | 'active' | 'on-hold' | 'ended';

/**
 * Active call information
 */
export interface ActiveCall {
  callId: string;
  callerId: string;
  callerName: string;
  calleeId: string;
  calleeName: string;
  status: CallStatus;
  priority: CallPriority;
  startedAt?: string;
  isMuted: boolean;
  isOnHold: boolean;
}

/**
 * Incoming call information
 */
export interface IncomingCall {
  callId: string;
  callerId: string;
  callerName: string;
  priority: CallPriority;
  metadata?: {
    patientId?: string;
    department?: string;
  };
}

/**
 * Call history item
 */
export interface CallHistoryItem {
  id: string;
  callId: string;
  callerId: string;
  callerName: string;
  calleeId: string;
  calleeName: string;
  direction: 'incoming' | 'outgoing';
  status: 'completed' | 'missed' | 'rejected' | 'cancelled';
  priority: CallPriority;
  startedAt: string;
  endedAt?: string;
  duration?: number;
  metadata?: {
    patientId?: string;
    department?: string;
  };
}

/**
 * Voice call state interface
 */
interface VoiceCallState {
  // Call state
  isInCall: boolean;
  currentCall: ActiveCall | null;
  
  // Incoming call state
  incomingCall: IncomingCall | null;
  isRinging: boolean;
  
  // Call history
  callHistory: CallHistoryItem[];
  
  // UI state
  isVoiceUIOpen: boolean;
  isStaffDirectoryOpen: boolean;
  
  // Actions - Current call
  setCurrentCall: (call: ActiveCall | null) => void;
  updateCallStatus: (status: CallStatus) => void;
  toggleMute: () => void;
  toggleHold: () => void;
  clearCurrentCall: () => void;
  
  // Actions - Incoming call
  setIncomingCall: (call: IncomingCall | null) => void;
  clearIncomingCall: () => void;
  setIsRinging: (ringing: boolean) => void;
  
  // Actions - History
  addToHistory: (item: CallHistoryItem) => void;
  setCallHistory: (history: CallHistoryItem[]) => void;
  clearCallHistory: () => void;
  
  // Actions - UI
  setIsVoiceUIOpen: (open: boolean) => void;
  setIsStaffDirectoryOpen: (open: boolean) => void;
  
  // WebSocket simulation helpers
  simulateIncomingCall: (call: IncomingCall) => void;
  simulateCallAccepted: () => void;
  simulateCallEnded: () => void;
}

/**
 * Voice call store using immer for immutable updates
 */
export const useVoiceCallStore = create<VoiceCallState>()(
  immer((set, get) => ({
    // Initial state
    isInCall: false,
    currentCall: null,
    incomingCall: null,
    isRinging: false,
    callHistory: [],
    isVoiceUIOpen: false,
    isStaffDirectoryOpen: false,
    
    // Current call actions
    setCurrentCall: (call) =>
      set((state) => {
        state.currentCall = call;
        state.isInCall = !!call;
        if (call) {
          state.isVoiceUIOpen = true;
        }
      }),
    
    updateCallStatus: (status) =>
      set((state) => {
        if (state.currentCall) {
          state.currentCall.status = status;
        }
      }),
    
    toggleMute: () =>
      set((state) => {
        if (state.currentCall) {
          state.currentCall.isMuted = !state.currentCall.isMuted;
        }
      }),
    
    toggleHold: () =>
      set((state) => {
        if (state.currentCall) {
          state.currentCall.isOnHold = !state.currentCall.isOnHold;
          state.currentCall.status = state.currentCall.isOnHold ? 'on-hold' : 'active';
        }
      }),
    
    clearCurrentCall: () =>
      set((state) => {
        state.currentCall = null;
        state.isInCall = false;
        state.isVoiceUIOpen = false;
      }),
    
    // Incoming call actions
    setIncomingCall: (call) =>
      set((state) => {
        state.incomingCall = call;
        state.isRinging = !!call;
      }),
    
    clearIncomingCall: () =>
      set((state) => {
        state.incomingCall = null;
        state.isRinging = false;
      }),
    
    setIsRinging: (ringing) =>
      set((state) => {
        state.isRinging = ringing;
      }),
    
    // History actions
    addToHistory: (item) =>
      set((state) => {
        state.callHistory.unshift(item);
        // Keep only last 50 entries
        if (state.callHistory.length > 50) {
          state.callHistory = state.callHistory.slice(0, 50);
        }
      }),
    
    setCallHistory: (history) =>
      set((state) => {
        state.callHistory = history;
      }),
    
    clearCallHistory: () =>
      set((state) => {
        state.callHistory = [];
      }),
    
    // UI actions
    setIsVoiceUIOpen: (open) =>
      set((state) => {
        state.isVoiceUIOpen = open;
      }),
    
    setIsStaffDirectoryOpen: (open) =>
      set((state) => {
        state.isStaffDirectoryOpen = open;
      }),
    
    // WebSocket simulation helpers (for demo/development)
    simulateIncomingCall: (call) =>
      set((state) => {
        state.incomingCall = call;
        state.isRinging = true;
      }),
    
    simulateCallAccepted: () =>
      set((state) => {
        if (state.incomingCall) {
          const { incomingCall } = state;
          state.currentCall = {
            callId: incomingCall.callId,
            callerId: incomingCall.callerId,
            callerName: incomingCall.callerName,
            calleeId: '', // Would be set from auth
            calleeName: '', // Would be set from auth
            status: 'active',
            priority: incomingCall.priority,
            startedAt: new Date().toISOString(),
            isMuted: false,
            isOnHold: false,
          };
          state.isInCall = true;
          state.incomingCall = null;
          state.isRinging = false;
          state.isVoiceUIOpen = true;
        }
      }),
    
    simulateCallEnded: () =>
      set((state) => {
        if (state.currentCall) {
          // Add to history before clearing
          const historyItem: CallHistoryItem = {
            id: state.currentCall.callId,
            callId: state.currentCall.callId,
            callerId: state.currentCall.callerId,
            callerName: state.currentCall.callerName,
            calleeId: state.currentCall.calleeId,
            calleeName: state.currentCall.calleeName,
            direction: 'incoming',
            status: 'completed',
            priority: state.currentCall.priority,
            startedAt: state.currentCall.startedAt || new Date().toISOString(),
            endedAt: new Date().toISOString(),
            metadata: state.currentCall.status === 'on-hold' ? undefined : undefined,
          };
          state.callHistory.unshift(historyItem);
          state.currentCall = null;
          state.isInCall = false;
          state.isVoiceUIOpen = false;
        }
      }),
  }))
);

/**
 * Selector hooks for optimized re-renders
 */
export const useIsInCall = () => useVoiceCallStore((state) => state.isInCall);
export const useCurrentCall = () => useVoiceCallStore((state) => state.currentCall);
export const useIncomingCall = () => useVoiceCallStore((state) => state.incomingCall);
export const useIsRinging = () => useVoiceCallStore((state) => state.isRinging);
export const useCallHistory = () => useVoiceCallStore((state) => state.callHistory);
