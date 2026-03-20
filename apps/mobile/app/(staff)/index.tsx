import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Avatar, Badge, Chip, Button } from 'react-native-paper';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

interface User {
  id: string;
  name: string;
  email?: string;
  role: 'admin' | 'doctor' | 'receptionist' | 'nurse';
  department?: string;
  room?: string;
}

interface QueueEntry {
  id: string;
  position: number;
  ticketNumber: string;
  patientName: string;
  patientId: string;
  priority: 'normal' | 'urgent' | 'critical';
  status: 'waiting' | 'called' | 'serving' | 'completed';
  waitTime: number;
  service: string;
}

interface TodayStats {
  totalServed: number;
  averageWaitTime: number;
  currentlyWaiting: number;
  currentlyServing: number;
}

const AUTH_STORAGE_KEY = 'auth_user';
const DEPARTMENTS = ['MED', 'PED', 'GYN', 'OPH', 'DEN', 'ORTH', 'PHY', 'SUR'];

export default function StaffDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [department, setDepartment] = useState('MED');
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [stats, setStats] = useState<TodayStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8787';

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (user) {
      fetchQueue();
      fetchStats();
    }
  }, [department, user]);

  const loadUserData = async () => {
    try {
      const storedUser = await SecureStore.getItemAsync(AUTH_STORAGE_KEY);
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        if (userData.department) {
          setDepartment(userData.department);
        }
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQueue = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const response = await fetch(`${API_URL}/api/queue/${department}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setQueue(data.data?.patients || []);
      }
    } catch (error) {
      console.error('Failed to fetch queue:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const response = await fetch(`${API_URL}/api/analytics/today`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchQueue(), fetchStats()]);
    setRefreshing(false);
  };

  const handleCallPatient = async (visitId: string) => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const response = await fetch(`${API_URL}/api/queue/${visitId}/call`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ room: user?.room || 'Room 1' }),
      });

      if (response.ok) {
        fetchQueue();
      }
    } catch (error) {
      console.error('Failed to call patient:', error);
    }
  };

  const handleCompletePatient = async (visitId: string) => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const response = await fetch(`${API_URL}/api/queue/${visitId}/complete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        fetchQueue();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to complete patient:', error);
    }
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
    await SecureStore.deleteItemAsync('auth_token');
    router.replace('/(auth)/login');
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return '#F44336';
      case 'urgent':
        return '#FF9800';
      default:
        return '#4CAF50';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'doctor':
        return 'Doctor';
      case 'nurse':
        return 'Nurse';
      case 'receptionist':
        return 'Receptionist';
      case 'admin':
        return 'Admin';
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'doctor':
        return '#2196F3';
      case 'nurse':
        return '#9C27B0';
      case 'receptionist':
        return '#FF9800';
      case 'admin':
        return '#607D8B';
      default:
        return '#9E9E9E';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={[styles.header, { backgroundColor: getRoleColor(user?.role || 'staff') }]}>
          <View style={styles.headerContent}>
            <Avatar.Text
              size={60}
              label={user ? getInitials(user.name) : 'S'}
              style={styles.avatar}
            />
            <View style={styles.headerText}>
              <Text style={styles.welcomeText}>Welcome,</Text>
              <Text style={styles.nameText}>{user?.name || 'Staff'}</Text>
              <View style={styles.roleRow}>
                <Chip
                  style={[styles.roleChip, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                  textStyle={styles.roleChipText}
                >
                  {getRoleLabel(user?.role || 'staff')}
                </Chip>
                {user?.department && (
                  <Chip
                    style={[styles.deptChip, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                    textStyle={styles.deptChipText}
                  >
                    {user.department}
                  </Chip>
                )}
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {stats && (
          <View style={styles.statsRow}>
            <Card style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
              <Card.Content style={styles.statContent}>
                <Text style={[styles.statNumber, { color: '#1976D2' }]}>{stats.currentlyWaiting}</Text>
                <Text style={styles.statLabel}>Waiting</Text>
              </Card.Content>
            </Card>
            <Card style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
              <Card.Content style={styles.statContent}>
                <Text style={[styles.statNumber, { color: '#F57C00' }]}>{stats.currentlyServing}</Text>
                <Text style={styles.statLabel}>Serving</Text>
              </Card.Content>
            </Card>
            <Card style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
              <Card.Content style={styles.statContent}>
                <Text style={[styles.statNumber, { color: '#388E3C' }]}>{stats.totalServed}</Text>
                <Text style={styles.statLabel}>Served</Text>
              </Card.Content>
            </Card>
          </View>
        )}

        <View style={styles.deptSelector}>
          <Text style={styles.deptSelectorLabel}>Department</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.deptScroll}
          >
            {DEPARTMENTS.map((dept) => (
              <TouchableOpacity
                key={dept}
                style={[
                  styles.deptButton,
                  department === dept && styles.deptButtonActive,
                ]}
                onPress={() => setDepartment(dept)}
              >
                <Text
                  style={[
                    styles.deptButtonText,
                    department === dept && styles.deptButtonTextActive,
                  ]}
                >
                  {dept}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.queueSection}>
          <View style={styles.queueHeader}>
            <Text style={styles.sectionTitle}>Queue - {department}</Text>
            <Badge style={styles.queueCount}>{queue.length}</Badge>
          </View>

          {queue.length > 0 ? (
            queue.map((entry, index) => (
              <Card key={entry.id} style={styles.queueCard}>
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardLeft}>
                      <Text style={styles.positionText}>#{index + 1}</Text>
                      <Badge
                        style={[
                          styles.priorityBadge,
                          { backgroundColor: getPriorityColor(entry.priority) },
                        ]}
                      >
                        {entry.priority.toUpperCase()}
                      </Badge>
                    </View>
                    <Badge
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            entry.status === 'called'
                              ? '#2196F3'
                              : entry.status === 'serving'
                              ? '#4CAF50'
                              : '#9E9E9E',
                        },
                      ]}
                    >
                      {entry.status.toUpperCase()}
                    </Badge>
                  </View>

                  <View style={styles.patientInfo}>
                    <Text style={styles.patientName}>{entry.patientName}</Text>
                    <Text style={styles.patientId}>{entry.patientId}</Text>
                  </View>

                  <View style={styles.serviceRow}>
                    <Text style={styles.serviceText}>{entry.service}</Text>
                    <Text style={styles.waitTimeText}>~{entry.waitTime} min</Text>
                  </View>

                  <View style={styles.actionRow}>
                    {entry.status === 'waiting' && (
                      <TouchableOpacity
                        style={styles.callButton}
                        onPress={() => handleCallPatient(entry.id)}
                      >
                        <Text style={styles.callButtonText}>Call Patient</Text>
                      </TouchableOpacity>
                    )}
                    {entry.status === 'called' && (
                      <TouchableOpacity
                        style={styles.completeButton}
                        onPress={() => handleCompletePatient(entry.id)}
                      >
                        <Text style={styles.completeButtonText}>Complete</Text>
                      </TouchableOpacity>
                    )}
                    {entry.status === 'serving' && (
                      <TouchableOpacity
                        style={styles.completeButton}
                        onPress={() => handleCompletePatient(entry.id)}
                      >
                        <Text style={styles.completeButtonText}>Finish Consultation</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </Card.Content>
              </Card>
            ))
          ) : (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <Text style={styles.emptyIcon}>✓</Text>
                <Text style={styles.emptyText}>No patients waiting</Text>
                <Text style={styles.emptySubtext}>
                  The queue for {department} is empty
                </Text>
              </Card.Content>
            </Card>
          )}
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/(staff)/queue')}
            >
              <Text style={styles.actionIcon}>📋</Text>
              <Text style={styles.actionLabel}>View Queue</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/(staff)/messages')}
            >
              <Text style={styles.actionIcon}>💬</Text>
              <Text style={styles.actionLabel}>Messages</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/(staff)/calls')}
            >
              <Text style={styles.actionIcon}>📞</Text>
              <Text style={styles.actionLabel}>Calls</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/(staff)/settings')}
            >
              <Text style={styles.actionIcon}>⚙️</Text>
              <Text style={styles.actionLabel}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    paddingTop: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: 'white',
  },
  headerText: {
    marginLeft: 16,
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  nameText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  roleRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  roleChip: {
    height: 24,
  },
  roleChipText: {
    color: 'white',
    fontSize: 12,
  },
  deptChip: {
    height: 24,
  },
  deptChipText: {
    color: 'white',
    fontSize: 12,
  },
  logoutButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
  },
  logoutText: {
    color: 'white',
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
  },
  statContent: {
    alignItems: 'center',
    padding: 8,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  deptSelector: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  deptSelectorLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  deptScroll: {
    gap: 8,
  },
  deptButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    marginRight: 8,
  },
  deptButtonActive: {
    backgroundColor: '#1E40AF',
  },
  deptButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  deptButtonTextActive: {
    color: 'white',
  },
  queueSection: {
    padding: 16,
    paddingTop: 0,
  },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  queueCount: {
    backgroundColor: '#1E40AF',
  },
  queueCard: {
    backgroundColor: 'white',
    marginBottom: 12,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  positionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  patientInfo: {
    marginBottom: 8,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  patientId: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceText: {
    fontSize: 14,
    color: '#666',
  },
  waitTimeText: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  callButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  callButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  completeButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
  },
  emptyContent: {
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
  },
  quickActions: {
    padding: 16,
    paddingTop: 0,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 12,
  },
  actionButton: {
    width: '47%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 1,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
});
