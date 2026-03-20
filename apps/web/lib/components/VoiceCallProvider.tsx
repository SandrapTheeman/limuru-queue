'use client';

import { useEffect } from 'react';
import { useVoiceCallStore } from '@/lib/stores/voice';
import { VoiceCallUI } from '@/lib/components/VoiceCallUI';

/**
 * VoiceCallProvider
 * Provides voice call functionality across the application
 * Add this to the root layout or dashboard layout
 */
export function VoiceCallProvider() {
  const { simulateIncomingCall } = useVoiceCallStore();

  // Simulate incoming calls for demo purposes
  // In production, this would be replaced with WebSocket/SSE handlers
  useEffect(() => {
    // Demo: Simulate an incoming call after 30 seconds for testing
    // Remove this in production
    const demoTimeout = setTimeout(() => {
      // Uncomment to test incoming calls:
      // simulateIncomingCall({
      //   callId: `demo-incoming-${Date.now()}`,
      //   callerId: 'demo-caller-001',
      //   callerName: 'Dr. Sarah Johnson',
      //   priority: 'normal',
      // });
    }, 30000);

    return () => clearTimeout(demoTimeout);
  }, [simulateIncomingCall]);

  return <VoiceCallUI />;
}
