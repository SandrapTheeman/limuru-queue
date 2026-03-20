// Active Voice Call Screen
import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, IconButton, Surface, Avatar, Chip } from 'react-native-paper';
import { router } from 'expo-router';
import { useVoiceCallStore } from '../../../lib/stores/voice';
import { endCall, acceptCall, rejectCall } from '../../../lib/api/voice';

export default function ActiveCallPage() {
  const { currentCall, incomingCall, clearCurrentCall, clearIncomingCall, setCurrentCall, addToHistory } = useVoiceCallStore();
  const [callDuration, setCallDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Update call duration every second
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentCall?.startedAt) {
      interval = setInterval(() => {
        const started = new Date(currentCall.startedAt!).getTime();
        setCallDuration(Math.floor((Date.now() - started) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentCall?.startedAt]);

  // Clear duration when call ends
  useEffect(() => {
    if (!currentCall) {
      setCallDuration(0);
    }
  }, [currentCall]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleEndCall = async () => {
    if (!currentCall) return;
    
    setIsLoading(true);
    try {
      await endCall(currentCall.callId);
      
      // Add to history before clearing
      if (currentCall) {
        addToHistory({
          ...currentCall,
          status: 'ended',
        });
      }
      
      clearCurrentCall();
      router.back();
    } catch (error) {
      console.error('Failed to end call:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!incomingCall) return;
    
    setIsLoading(true);
    try {
      const response = await acceptCall(incomingCall.callId);
      if (response.success) {
        setCurrentCall({
          callId: incomingCall.callId,
          callerId: incomingCall.callerId,
          callerName: incomingCall.callerName,
          calleeId: 'current-user',
          calleeName: 'You',
          status: 'active',
          startedAt: new Date().toISOString(),
          priority: incomingCall.priority,
        });
        clearIncomingCall();
      }
    } catch (error) {
      console.error('Failed to accept call:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!incomingCall) return;
    
    setIsLoading(true);
    try {
      await rejectCall(incomingCall.callId, 'declined');
      clearIncomingCall();
      router.back();
    } catch (error) {
      console.error('Failed to reject call:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Incoming call view
  if (incomingCall) {
    return (
      <Surface style={styles.incomingContainer}>
        <View style={styles.incomingContent}>
          <Text variant="titleMedium" style={styles.incomingLabel}>
            Incoming Call
          </Text>
          
          <Avatar.Text
            size={100}
            label={getInitials(incomingCall.callerName)}
            style={styles.avatar}
          />
          
          <Text variant="headlineMedium" style={styles.callerName}>
            {incomingCall.callerName}
          </Text>
          
          <Chip 
            style={[
              styles.priorityChip,
              incomingCall.priority === 'urgent' && styles.urgentChip,
              incomingCall.priority === 'emergency' && styles.emergencyChip,
            ]}
            textStyle={styles.priorityText}
          >
            {incomingCall.priority.toUpperCase()}
          </Chip>
          
          <View style={styles.incomingActions}>
            <Button
              mode="contained"
              icon="phone"
              onPress={handleAccept}
              loading={isLoading}
              disabled={isLoading}
              style={styles.acceptButton}
              contentStyle={styles.acceptButtonContent}
            >
              Accept
            </Button>
            <Button
              mode="outlined"
              icon="phone-hangup"
              onPress={handleReject}
              loading={isLoading}
              disabled={isLoading}
              style={styles.rejectButton}
              contentStyle={styles.rejectButtonContent}
            >
              Decline
            </Button>
          </View>
        </View>
      </Surface>
    );
  }

  // No active call view
  if (!currentCall) {
    return (
      <Surface style={styles.container}>
        <View style={styles.emptyContent}>
          <IconButton
            icon="phone-off"
            size={64}
            iconColor="#9E9E9E"
          />
          <Text variant="titleMedium" style={styles.emptyText}>
            No active call
          </Text>
          <Button
            mode="outlined"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            Go Back
          </Button>
        </View>
      </Surface>
    );
  }

  // Active call view
  return (
    <Surface style={styles.container}>
      <View style={styles.callContent}>
        {/* Avatar */}
        <Avatar.Text
          size={120}
          label={getInitials(currentCall.calleeName)}
          style={styles.callAvatar}
        />
        
        {/* Name */}
        <Text variant="headlineMedium" style={styles.callName}>
          {currentCall.calleeName}
        </Text>
        
        {/* Status / Duration */}
        <Text variant="bodyLarge" style={styles.callStatus}>
          {currentCall.status === 'active' 
            ? formatDuration(callDuration)
            : currentCall.status === 'initiated'
            ? 'Calling...'
            : currentCall.status === 'ringing'
            ? 'Ringing...'
            : 'Call ended'}
        </Text>
        
        {/* Priority indicator for urgent/emergency */}
        {currentCall.priority && currentCall.priority !== 'normal' && (
          <Chip 
            style={[
              styles.callPriorityChip,
              currentCall.priority === 'urgent' && styles.urgentChip,
              currentCall.priority === 'emergency' && styles.emergencyChip,
            ]}
            textStyle={styles.priorityText}
          >
            {currentCall.priority.toUpperCase()}
          </Chip>
        )}
      </View>
      
      {/* Call actions */}
      <View style={styles.callActions}>
        <IconButton
          icon="phone-hangup"
          mode="contained"
          size={32}
          onPress={handleEndCall}
          loading={isLoading}
          disabled={isLoading}
          style={styles.endButton}
          iconColor="#fff"
        />
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  incomingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  incomingContent: {
    alignItems: 'center',
  },
  incomingLabel: {
    color: '#666',
    marginBottom: 20,
  },
  avatar: {
    backgroundColor: '#4CAF50',
  },
  callerName: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  priorityChip: {
    marginTop: 8,
    backgroundColor: '#2196F3',
  },
  urgentChip: {
    backgroundColor: '#FF9800',
  },
  emergencyChip: {
    backgroundColor: '#F44336',
  },
  priorityText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  incomingActions: {
    flexDirection: 'row',
    marginTop: 40,
    gap: 16,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  acceptButtonContent: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  rejectButton: {
    borderColor: '#F44336',
  },
  rejectButtonContent: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    marginTop: 8,
  },
  backButton: {
    marginTop: 24,
  },
  callContent: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  callAvatar: {
    backgroundColor: '#4CAF50',
  },
  callName: {
    marginTop: 20,
    fontWeight: '600',
  },
  callStatus: {
    marginTop: 8,
    color: '#666',
  },
  callPriorityChip: {
    marginTop: 12,
  },
  callActions: {
    flexDirection: 'row',
    marginBottom: 60,
  },
  endButton: {
    backgroundColor: '#F44336',
    width: 72,
    height: 72,
    borderRadius: 36,
  },
});
