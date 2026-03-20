import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Animated, Vibration, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button, Chip, ProgressBar } from 'react-native-paper';
import { format, formatDistanceToNow } from 'date-fns';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';

interface QueueEntry {
  id: string;
  position: number;
  ticketNumber: string;
  patientName: string;
  status: 'waiting' | 'called' | 'serving' | 'completed';
  estimatedWait: number;
  department: string;
  calledAt?: string;
  roomAssigned?: string;
}

interface QueueUpdate {
  type: 'position_update' | 'called' | 'serving' | 'completed';
  position?: number;
  room?: string;
}

const TOKEN_KEY = 'auth_token';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function PatientQueueScreen() {
  const [myQueueEntry, setMyQueueEntry] = useState<QueueEntry | null>(null);
  const [queueAhead, setQueueAhead] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState<number>(0);
  const [progress, setProgress] = useState(0);
  const pulseAnim = new Animated.Value(1);

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8787';

  useEffect(() => {
    fetchMyQueueStatus();
    setupNotificationListeners();

    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      clearInterval(interval);
      Notifications.removeNotificationSubscription;
    };
  }, []);

  useEffect(() => {
    if (myQueueEntry?.status === 'called') {
      startPulseAnimation();
      triggerCallNotification();
    }
  }, [myQueueEntry?.status]);

  const setupNotificationListeners = () => {
    Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
    });

    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification response:', response);
    });
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const triggerCallNotification = async () => {
    if (Platform.OS === 'android') {
      Vibration.vibrate([0, 500, 200, 500, 200, 500]);
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Your Turn! 🎉',
        body: 'Please proceed to the reception desk.',
        data: { type: 'called' },
      },
      trigger: null,
    });
  };

  const fetchMyQueueStatus = async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const response = await fetch(`${API_URL}/api/queue/my-status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMyQueueEntry(data.data?.myEntry);
        setQueueAhead(data.data?.queueAhead || []);
        
        if (data.data?.myEntry?.estimatedWait) {
          setCountdown(data.data.myEntry.estimatedWait * 60);
          setProgress(1 - (data.data.myEntry.position / (data.data.myEntry.position + data.data.queueAhead?.length || 1)));
        }
      }
    } catch (error) {
      console.error('Failed to fetch queue status:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMyQueueStatus();
    setRefreshing(false);
  }, []);

  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    try {
      const data: QueueUpdate = JSON.parse(event.data);
      
      switch (data.type) {
        case 'position_update':
          setMyQueueEntry((prev) =>
            prev ? { ...prev, position: data.position || prev.position } : null
          );
          break;
        case 'called':
          setMyQueueEntry((prev) =>
            prev ? { ...prev, status: 'called', roomAssigned: data.room } : null
          );
          break;
        case 'serving':
          setMyQueueEntry((prev) =>
            prev ? { ...prev, status: 'serving' } : null
          );
          break;
        case 'completed':
          setMyQueueEntry((prev) =>
            prev ? { ...prev, status: 'completed' } : null
          );
          break;
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }, []);

  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderQueueItem = ({ item, index }: { item: QueueEntry; index: number }) => (
    <Card style={styles.queueItemCard}>
      <Card.Content style={styles.queueItemContent}>
        <View style={styles.queueItemLeft}>
          <Text style={styles.queuePosition}>#{index + 1}</Text>
        </View>
        <View style={styles.queueItemCenter}>
          <Text style={styles.queueTicket}>{item.ticketNumber}</Text>
          <Text style={styles.queueName}>{item.patientName}</Text>
        </View>
        <View style={styles.queueItemRight}>
          <Chip
            style={[
              styles.statusChip,
              {
                backgroundColor:
                  item.status === 'called'
                    ? '#42A5F5'
                    : item.status === 'serving'
                    ? '#66BB6A'
                    : '#FFA726',
              },
            ]}
            textStyle={styles.statusChipText}
          >
            {item.status === 'called' ? 'Now' : item.status === 'serving' ? 'In' : 'Wait'}
          </Chip>
        </View>
      </Card.Content>
    </Card>
  );

  const renderMyPosition = () => {
    if (!myQueueEntry) return null;

    return (
      <Card style={styles.myPositionCard}>
        <Card.Content>
          <View style={styles.positionHeader}>
            <Text style={styles.positionLabel}>Your Position</Text>
            <Chip
              style={[
                styles.myStatusChip,
                {
                  backgroundColor:
                    myQueueEntry.status === 'called'
                      ? '#42A5F5'
                      : myQueueEntry.status === 'serving'
                      ? '#66BB6A'
                      : '#1E40AF',
                },
              ]}
              textStyle={styles.myStatusText}
            >
              {myQueueEntry.status === 'waiting' && 'Waiting'}
              {myQueueEntry.status === 'called' && 'Your Turn!'}
              {myQueueEntry.status === 'serving' && 'Being Served'}
              {myQueueEntry.status === 'completed' && 'Done'}
            </Chip>
          </View>

          <View style={styles.positionMain}>
            <Animated.View
              style={[
                styles.positionCircle,
                myQueueEntry.status === 'called' && { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <Text style={styles.positionNumber}>#{myQueueEntry.position}</Text>
            </Animated.View>

            <View style={styles.positionInfo}>
              <Text style={styles.ticketDisplay}>{myQueueEntry.ticketNumber}</Text>
              <Text style={styles.departmentDisplay}>{myQueueEntry.department}</Text>
            </View>
          </View>

          {myQueueEntry.status === 'waiting' && (
            <>
              <View style={styles.countdownContainer}>
                <Text style={styles.countdownLabel}>Estimated Wait Time</Text>
                <Text style={styles.countdownValue}>{formatCountdown(countdown)}</Text>
              </View>

              <ProgressBar
                progress={progress}
                color="#1E40AF"
                style={styles.progressBar}
              />

              <Text style={styles.progressText}>
                {Math.round(progress * 100)}% through the queue
              </Text>
            </>
          )}

          {myQueueEntry.status === 'called' && (
            <View style={styles.calledContainer}>
              <Text style={styles.calledTitle}>Please Proceed To:</Text>
              <Text style={styles.roomText}>{myQueueEntry.roomAssigned || 'Reception'}</Text>
              <Text style={styles.calledSubtext}>Your number has been called</Text>
            </View>
          )}

          {myQueueEntry.status === 'serving' && (
            <View style={styles.servingContainer}>
              <Text style={styles.servingTitle}>Consultation In Progress</Text>
              <Text style={styles.servingSubtext}>Please wait in the waiting area</Text>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Queue</Text>
        <Text style={styles.headerSubtitle}>Live Position Updates</Text>
      </View>

      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <>
            {renderMyPosition()}
            
            {queueAhead.length > 0 && (
              <View style={styles.queueSection}>
                <Text style={styles.sectionTitle}>
                  Queue Ahead ({queueAhead.length} patients)
                </Text>
                <FlatList
                  data={queueAhead}
                  renderItem={renderQueueItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              </View>
            )}

            {!myQueueEntry && !loading && (
              <Card style={styles.noQueueCard}>
                <Card.Content>
                  <Text style={styles.noQueueText}>
                    You are not currently in any queue
                  </Text>
                  <Button
                    mode="contained"
                    style={styles.joinButton}
                    onPress={() => {}}
                  >
                    Join Queue
                  </Button>
                </Card.Content>
              </Card>
            )}
          </>
        }
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1E40AF',
    padding: 16,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  myPositionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  positionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  positionLabel: {
    fontSize: 16,
    color: '#666',
  },
  myStatusChip: {
    paddingHorizontal: 12,
  },
  myStatusText: {
    color: 'white',
    fontWeight: '600',
  },
  positionMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  positionCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  positionNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  positionInfo: {
    alignItems: 'flex-start',
  },
  ticketDisplay: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  departmentDisplay: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  countdownContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  countdownLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  countdownValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1E40AF',
    fontVariant: ['tabular-nums'],
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
  },
  calledContainer: {
    backgroundColor: '#E3F2FD',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  calledTitle: {
    fontSize: 16,
    color: '#1E40AF',
    marginBottom: 8,
  },
  roomText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 4,
  },
  calledSubtext: {
    fontSize: 14,
    color: '#666',
  },
  servingContainer: {
    backgroundColor: '#E8F5E9',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  servingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 4,
  },
  servingSubtext: {
    fontSize: 14,
    color: '#666',
  },
  queueSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  queueItemCard: {
    backgroundColor: 'white',
    marginBottom: 8,
    borderRadius: 8,
  },
  queueItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  queueItemLeft: {
    width: 50,
  },
  queuePosition: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  queueItemCenter: {
    flex: 1,
  },
  queueTicket: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
  },
  queueName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  queueItemRight: {},
  statusChip: {
    paddingHorizontal: 8,
  },
  statusChipText: {
    fontSize: 12,
    color: 'white',
  },
  noQueueCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginTop: 16,
  },
  noQueueText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  joinButton: {
    backgroundColor: '#1E40AF',
  },
});
