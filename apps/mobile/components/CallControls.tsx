import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Pressable, Text as RNText } from 'react-native';
import { Text, IconButton, ActivityIndicator } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { endCall, holdCall, resumeCall } from '../lib/api/voice';
import { useVoiceCallStore } from '../lib/stores/voice';

export function CallControls() {
  const { currentCall, setCurrentCall, callDuration, setCallDuration } = useVoiceCallStore();
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (currentCall) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [currentCall, pulseAnim]);

  const handleMute = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsMuted(!isMuted);
  };

  const handleSpeaker = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSpeakerOn(!isSpeakerOn);
  };

  const handleHold = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (isOnHold) {
      await resumeCall(currentCall?.callId || '');
      setIsOnHold(false);
    } else {
      await holdCall(currentCall?.callId || '');
      setIsOnHold(true);
    }
  };

  const handleEndCall = async () => {
    setIsEnding(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    
    try {
      if (currentCall) {
        await endCall(currentCall.callId);
      }
      setCurrentCall(null);
    } catch (error) {
      console.error('Failed to end call:', error);
    } finally {
      setIsEnding(false);
    }
  };

  if (!currentCall) {
    return (
      <View style={styles.container}>
        <Text style={styles.noCallText}>No active call</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.statusIndicator, { transform: [{ scale: pulseAnim }] }]}>
        <View style={[styles.statusDot, { backgroundColor: isOnHold ? '#FF9800' : '#4CAF50' }]} />
        <Text style={styles.statusText}>
          {isOnHold ? 'On Hold' : 'Connected'}
        </Text>
      </Animated.View>

      <View style={styles.callerInfo}>
        <Text style={styles.callerName}>{currentCall.calleeName || currentCall.callerName}</Text>
        <Text style={styles.callDuration}>
          {format(callDuration * 1000, 'mm:ss')}
        </Text>
      </View>

      <View style={styles.controlsRow}>
        <Pressable
          onPress={handleMute}
          style={({ pressed }) => [
            styles.controlButton,
            isMuted && styles.controlButtonActive,
            pressed && styles.buttonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={isMuted ? 'Unmute' : 'Mute'}
          accessibilityHint="Toggle microphone mute"
        >
          <IconButton
            icon={isMuted ? 'microphone-off' : 'microphone'}
            iconColor={isMuted ? '#F44336' : '#FFFFFF'}
            size={28}
          />
          <RNText style={styles.controlLabel}>
            {isMuted ? 'Unmute' : 'Mute'}
          </RNText>
        </Pressable>

        <Pressable
          onPress={handleSpeaker}
          style={({ pressed }) => [
            styles.controlButton,
            isSpeakerOn && styles.controlButtonActive,
            pressed && styles.buttonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={isSpeakerOn ? 'Turn speaker off' : 'Turn speaker on'}
          accessibilityHint="Toggle speakerphone"
        >
          <IconButton
            icon={isSpeakerOn ? 'volume-high' : 'volume-low'}
            iconColor={isSpeakerOn ? '#4CAF50' : '#FFFFFF'}
            size={28}
          />
          <RNText style={styles.controlLabel}>
            {isSpeakerOn ? 'Speaker' : 'Speaker'}
          </RNText>
        </Pressable>

        <Pressable
          onPress={handleHold}
          style={({ pressed }) => [
            styles.controlButton,
            isOnHold && styles.controlButtonActive,
            pressed && styles.buttonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={isOnHold ? 'Resume call' : 'Put on hold'}
          accessibilityHint="Put call on hold"
        >
          <IconButton
            icon={isOnHold ? 'play' : 'pause'}
            iconColor={isOnHold ? '#FF9800' : '#FFFFFF'}
            size={28}
          />
          <RNText style={styles.controlLabel}>
            {isOnHold ? 'Resume' : 'Hold'}
          </RNText>
        </Pressable>
      </View>

      <Pressable
        onPress={handleEndCall}
        disabled={isEnding}
        style={({ pressed }) => [
          styles.endCallButton,
          pressed && styles.buttonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="End call"
        accessibilityHint="End the current call"
      >
        {isEnding ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <IconButton
            icon="phone-hangup"
            iconColor="#FFFFFF"
            size={32}
          />
        )}
        <RNText style={styles.endCallText}>End Call</RNText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
  },
  noCallText: {
    fontSize: 16,
    color: '#666',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  callerInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  callerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  callDuration: {
    fontSize: 16,
    color: '#666',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 32,
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F5F5F5',
  },
  controlButtonActive: {
    backgroundColor: '#E3F2FD',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  controlLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: -4,
  },
  endCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F44336',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    minWidth: 160,
    minHeight: 56,
  },
  endCallText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
