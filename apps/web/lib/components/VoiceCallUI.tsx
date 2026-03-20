'use client';

import { useEffect, useCallback } from 'react';
import { useVoiceCallStore, type CallPriority } from '@/lib/stores/voice';
import { useAuthStore } from '@/lib/stores/auth';
import {
  acceptCall,
  rejectCall,
  endCall,
} from '@/lib/api/voice';
import { StaffDirectory } from './StaffDirectory';
import { IncomingCallModal } from './IncomingCallModal';
import { ActiveCallUI } from './ActiveCallUI';

/**
 * VoiceCallUI Component
 * Wraps all voice call functionality into a single component
 * that can be placed in the dashboard layout
 */
export function VoiceCallUI() {
  const { user } = useAuthStore();
  const {
    isInCall,
    currentCall,
    incomingCall,
    isRinging,
    isVoiceUIOpen,
    isStaffDirectoryOpen,
    setCurrentCall,
    setIncomingCall,
    clearIncomingCall,
    toggleMute,
    toggleHold,
    clearCurrentCall,
    setIsStaffDirectoryOpen,
    simulateCallAccepted,
    simulateCallEnded,
  } = useVoiceCallStore();

  // Handle accepting incoming call
  const handleAcceptCall = useCallback(async () => {
    if (!incomingCall) return;

    try {
      const response = await acceptCall(incomingCall.callId);
      if (response.success) {
        // Set up the current call from incoming
        setCurrentCall({
          callId: incomingCall.callId,
          callerId: incomingCall.callerId,
          callerName: incomingCall.callerName,
          calleeId: user?.id || '',
          calleeName: user?.name || 'Unknown',
          status: 'active',
          priority: incomingCall.priority,
          startedAt: new Date().toISOString(),
          isMuted: false,
          isOnHold: false,
        });
        clearIncomingCall();
      } else {
        // Demo mode - simulate accepting
        simulateCallAccepted();
        clearIncomingCall();
      }
    } catch (error) {
      // Demo mode fallback
      console.log('Demo mode: Simulating call accept');
      simulateCallAccepted();
      clearIncomingCall();
    }
  }, [incomingCall, user, setCurrentCall, clearIncomingCall, simulateCallAccepted]);

  // Handle rejecting incoming call
  const handleRejectCall = useCallback(async () => {
    if (!incomingCall) return;

    try {
      await rejectCall(incomingCall.callId, 'Busy');
    } catch (error) {
      console.log('Demo mode: Call rejected');
    }
    clearIncomingCall();
  }, [incomingCall, clearIncomingCall]);

  // Handle ending call
  const handleEndCall = useCallback(async () => {
    if (!currentCall) return;

    try {
      await endCall(currentCall.callId);
    } catch (error) {
      console.log('Demo mode: Ending simulated call');
    }
    simulateCallEnded();
    clearCurrentCall();
  }, [currentCall, simulateCallEnded, clearCurrentCall]);

  // Handle initiating a call (called from StaffDirectory)
  const handleCallInitiated = useCallback(
    async (targetUserId: string, callId: string) => {
      // Call is already set up in StaffDirectory, this is for WebSocket subscription
      console.log(`Call initiated: ${callId} to ${targetUserId}`);
    },
    []
  );

  // Handle opening staff directory
  const handleOpenStaffDirectory = useCallback(() => {
    setIsStaffDirectoryOpen(true);
  }, [setIsStaffDirectoryOpen]);

  // Handle closing staff directory
  const handleCloseStaffDirectory = useCallback(() => {
    setIsStaffDirectoryOpen(false);
  }, [setIsStaffDirectoryOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if in input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (isInCall) {
        // M for mute
        if (e.key === 'm' || e.key === 'M') {
          toggleMute();
        }
        // H for hold
        if (e.key === 'h' || e.key === 'H') {
          toggleHold();
        }
        // Escape to end call
        if (e.key === 'Escape') {
          handleEndCall();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInCall, toggleMute, toggleHold, handleEndCall]);

  // Listen for custom openVoiceCall event from dashboard pages
  useEffect(() => {
    const handleOpenVoiceCall = () => {
      setIsStaffDirectoryOpen(true);
    };

    window.addEventListener('openVoiceCall', handleOpenVoiceCall);
    return () => window.removeEventListener('openVoiceCall', handleOpenVoiceCall);
  }, [setIsStaffDirectoryOpen]);

  return (
    <>
      {/* Staff Directory Modal */}
      <StaffDirectory
        isOpen={isStaffDirectoryOpen}
        onClose={handleCloseStaffDirectory}
        onCallInitiated={handleCallInitiated}
      />

      {/* Incoming Call Modal */}
      {incomingCall && (
        <IncomingCallModal
          isOpen={isRinging}
          callerId={incomingCall.callerId}
          callerName={incomingCall.callerName}
          priority={incomingCall.priority === 'emergency' ? 'urgent' : incomingCall.priority}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}

      {/* Active Call UI */}
      {currentCall && isVoiceUIOpen && (
        <ActiveCallUI
          isOpen={isInCall}
          callerId={currentCall.callerId}
          callerName={currentCall.callerName}
          isOnHold={currentCall.isOnHold}
          isMuted={currentCall.isMuted}
          onEndCall={handleEndCall}
          onToggleMute={toggleMute}
          onToggleHold={toggleHold}
        />
      )}
    </>
  );
}

/**
 * Voice Call FAB (Floating Action Button)
 * A floating button that can be added to dashboard pages
 * to trigger the staff directory
 */
export function VoiceCallFAB({ className = '' }: { className?: string }) {
  const { isInCall, isRinging, setIsStaffDirectoryOpen } = useVoiceCallStore();

  return (
    <button
      onClick={() => setIsStaffDirectoryOpen(true)}
      className={`fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all hover:scale-110 ${
        isRinging
          ? 'bg-yellow-500 animate-pulse'
          : isInCall
          ? 'bg-green-500'
          : 'bg-blue-500 hover:bg-blue-600'
      } ${className}`}
      title="Staff Directory - Voice Calls"
    >
      {isRinging ? (
        <span className="text-xl">📞</span>
      ) : isInCall ? (
        <span className="text-xl">📱</span>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-6 h-6 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
          />
        </svg>
      )}
    </button>
  );
}
