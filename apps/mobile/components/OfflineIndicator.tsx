import { View, Text, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { getOfflineStatus, getPendingOperations, NetworkStatus } from '../lib/offline';
import { formatDistanceToNow } from 'date-fns';

interface OfflineIndicatorProps {
  onNetworkChange?: (status: NetworkStatus) => void;
  minimal?: boolean;
}

export function OfflineIndicator({ onNetworkChange, minimal = false }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let mounted = true;

    const checkStatus = async () => {
      if (!mounted) return;

      const status = await getOfflineStatus();
      setIsOnline(status.isOnline);
      setPendingCount(status.pendingCount);
      setLastSyncTime(status.lastSyncTime ? new Date(status.lastSyncTime) : null);
      setIsSyncing(status.isSyncing);

      if (onNetworkChange) {
        onNetworkChange(status.isOnline ? 'online' : 'offline');
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [onNetworkChange]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: isOnline ? 1 : 0.7,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOnline, fadeAnim]);

  useEffect(() => {
    if (!isOnline) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isOnline, pulseAnim]);

  if (isOnline && pendingCount === 0 && minimal) {
    return null;
  }

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (isSyncing) return 'Syncing...';
    if (pendingCount > 0) return `${pendingCount} pending`;
    return 'Online';
  };

  const getStatusColor = () => {
    if (!isOnline) return '#F44336';
    if (isSyncing) return '#FF9800';
    if (pendingCount > 0) return '#FF9800';
    return '#4CAF50';
  };

  if (minimal) {
    return (
      <Animated.View
        style={[
          styles.minimalContainer,
          { backgroundColor: getStatusColor() },
          { opacity: fadeAnim, transform: [{ scale: pulseAnim }] },
        ]}
        accessibilityLabel={getStatusText()}
        accessibilityRole="status"
      >
        {isSyncing ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <View style={[styles.minimalDot, { backgroundColor: '#FFFFFF' }]} />
        )}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: getStatusColor() },
        { opacity: fadeAnim, transform: [{ scale: pulseAnim }] },
      ]}
      accessibilityLabel={`Connection status: ${getStatusText()}`}
      accessibilityRole="status"
    >
      <View style={styles.statusRow}>
        <View style={[styles.dot, { backgroundColor: '#FFFFFF' }]} />
        <Text style={styles.statusText}>{getStatusText()}</Text>
        {isSyncing && <ActivityIndicator size="small" color="#FFFFFF" />}
      </View>

      {pendingCount > 0 && (
        <Text style={styles.pendingText}>
          {pendingCount} action{pendingCount !== 1 ? 's' : ''} pending sync
        </Text>
      )}

      {lastSyncTime && (
        <Text style={styles.lastSyncText}>
          Last synced: {formatDistanceToNow(lastSyncTime, { addSuffix: true })}
        </Text>
      )}
    </Animated.View>
  );
}

interface PendingActionsListProps {
  onActionPress?: (id: string) => void;
}

export function PendingActionsList({ onActionPress }: PendingActionsListProps) {
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    setLoading(true);
    const ops = await getPendingOperations();
    setPending(ops);
    setLoading(false);
  };

  const getActionLabel = (op: any) => {
    const labels: Record<string, string> = {
      create: 'Create',
      update: 'Update',
      delete: 'Delete',
    };
    return labels[op.type] || op.type;
  };

  if (loading) {
    return (
      <View style={styles.pendingListContainer}>
        <Text style={styles.pendingListTitle}>Pending Actions</Text>
        <Text style={styles.emptyText}>Loading...</Text>
      </View>
    );
  }

  if (pending.length === 0) {
    return (
      <View style={styles.pendingListContainer}>
        <Text style={styles.pendingListTitle}>Pending Actions</Text>
        <Text style={styles.emptyText}>No pending actions</Text>
      </View>
    );
  }

  return (
    <View style={styles.pendingListContainer}>
      <Text style={styles.pendingListTitle}>
        Pending Actions ({pending.length})
      </Text>
      {pending.map((op) => (
        <View
          key={op.id}
          style={styles.pendingItem}
          accessibilityRole="button"
          accessibilityLabel={`${getActionLabel(op)} ${op.entity}`}
          onTouchEnd={() => onActionPress?.(op.id)}
        >
          <View style={styles.pendingItemContent}>
            <View style={[styles.actionBadge, styles[`action${op.type}`]]}>
              <Text style={styles.actionBadgeText}>{getActionLabel(op)}</Text>
            </View>
            <Text style={styles.entityText}>{op.entity}</Text>
          </View>
          <Text style={styles.timestampText}>
            {formatDistanceToNow(new Date(op.timestamp), { addSuffix: true })}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  pendingText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    marginTop: 4,
  },
  lastSyncText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 4,
  },
  minimalContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  minimalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pendingListContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  pendingListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  pendingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  pendingItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  actioncreate: {
    backgroundColor: '#4CAF50',
  },
  actionupdate: {
    backgroundColor: '#2196F3',
  },
  actiondelete: {
    backgroundColor: '#F44336',
  },
  actionBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  entityText: {
    fontSize: 14,
    color: '#333',
  },
  timestampText: {
    fontSize: 12,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    paddingVertical: 16,
  },
});
