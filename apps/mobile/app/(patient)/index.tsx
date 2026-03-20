import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Avatar, Badge, Divider } from 'react-native-paper';
import { router } from 'expo-router';
import { format, formatDistanceToNow } from 'date-fns';
import * as SecureStore from 'expo-secure-store';

interface User {
  id: string;
  name: string;
  email?: string;
  role: string;
  department?: string;
  room?: string;
}

interface QueueStatus {
  position: number;
  ticketNumber: string;
  estimatedWait: number;
  department: string;
  status: 'waiting' | 'called' | 'serving' | 'completed';
}

interface Appointment {
  id: string;
  doctorName: string;
  department: string;
  date: string;
  time: string;
  status: 'upcoming' | 'completed' | 'cancelled';
}

const AUTH_STORAGE_KEY = 'auth_user';

export default function PatientDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8787';

  useEffect(() => {
    loadUserData();
    fetchQueueStatus();
    fetchAppointments();
  }, []);

  const loadUserData = async () => {
    try {
      const storedUser = await SecureStore.getItemAsync(AUTH_STORAGE_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    }
  };

  const fetchQueueStatus = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const response = await fetch(`${API_URL}/api/queue/my-status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setQueueStatus(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch queue status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const response = await fetch(`${API_URL}/api/appointments/my`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setAppointments(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchQueueStatus(), fetchAppointments()]);
    setRefreshing(false);
  }, []);

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return '#FFA726';
      case 'called':
        return '#42A5F5';
      case 'serving':
        return '#66BB6A';
      case 'completed':
        return '#9E9E9E';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'In Queue';
      case 'called':
        return 'Your Turn!';
      case 'serving':
        return 'Being Served';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
    await SecureStore.deleteItemAsync('auth_token');
    router.replace('/(auth)/login');
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
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Avatar.Text
              size={60}
              label={user ? getInitials(user.name) : 'P'}
              style={styles.avatar}
            />
            <View style={styles.headerText}>
              <Text style={styles.welcomeText}>Welcome,</Text>
              <Text style={styles.nameText}>{user?.name || 'Patient'}</Text>
              <Text style={styles.roleText}>Patient</Text>
            </View>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {queueStatus && (
            <Card style={styles.queueCard}>
              <Card.Content>
                <View style={styles.queueHeader}>
                  <Text style={styles.cardTitle}>My Queue Status</Text>
                  <Badge
                    style={[styles.statusBadge, { backgroundColor: getStatusColor(queueStatus.status) }]}
                  >
                    {getStatusLabel(queueStatus.status)}
                  </Badge>
                </View>
                
                <View style={styles.queueDetails}>
                  <View style={styles.ticketContainer}>
                    <Text style={styles.ticketLabel}>Ticket Number</Text>
                    <Text style={styles.ticketNumber}>{queueStatus.ticketNumber}</Text>
                  </View>
                  
                  <View style={styles.positionContainer}>
                    <Text style={styles.positionLabel}>Position</Text>
                    <Text style={styles.positionNumber}>#{queueStatus.position}</Text>
                  </View>
                </View>

                <Divider style={styles.divider} />

                <View style={styles.waitContainer}>
                  <View style={styles.waitItem}>
                    <Text style={styles.waitLabel}>Estimated Wait</Text>
                    <Text style={styles.waitValue}>~{queueStatus.estimatedWait} min</Text>
                  </View>
                  <View style={styles.waitItem}>
                    <Text style={styles.waitLabel}>Department</Text>
                    <Text style={styles.waitValue}>{queueStatus.department}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.viewQueueButton}
                  onPress={() => router.push('/(patient)/queue')}
                >
                  <Text style={styles.viewQueueText}>View Queue Details</Text>
                </TouchableOpacity>
              </Card.Content>
            </Card>
          )}

          {!queueStatus && (
            <Card style={styles.noQueueCard}>
              <Card.Content>
                <Text style={styles.noQueueText}>You are not currently in any queue</Text>
                <TouchableOpacity
                  style={styles.joinQueueButton}
                  onPress={() => router.push('/(patient)/register-visit')}
                >
                  <Text style={styles.joinQueueText}>Join Queue</Text>
                </TouchableOpacity>
              </Card.Content>
            </Card>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Appointments</Text>
              <TouchableOpacity onPress={() => router.push('/(patient)/appointments')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            {appointments.length > 0 ? (
              appointments.slice(0, 3).map((appointment) => (
                <Card key={appointment.id} style={styles.appointmentCard}>
                  <Card.Content>
                    <View style={styles.appointmentHeader}>
                      <Text style={styles.doctorName}>{appointment.doctorName}</Text>
                      <Badge
                        style={[
                          styles.appointmentBadge,
                          {
                            backgroundColor:
                              appointment.status === 'upcoming'
                                ? '#42A5F5'
                                : appointment.status === 'completed'
                                ? '#66BB6A'
                                : '#EF5350',
                          },
                        ]}
                      >
                        {appointment.status}
                      </Badge>
                    </View>
                    <Text style={styles.departmentText}>{appointment.department}</Text>
                    <View style={styles.dateTimeRow}>
                      <Text style={styles.dateText}>{appointment.date}</Text>
                      <Text style={styles.timeText}>{appointment.time}</Text>
                    </View>
                  </Card.Content>
                </Card>
              ))
            ) : (
              <Card style={styles.emptyCard}>
                <Card.Content>
                  <Text style={styles.emptyText}>No upcoming appointments</Text>
                </Card.Content>
              </Card>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/(patient)/queue')}
              >
                <Text style={styles.actionIcon}>📋</Text>
                <Text style={styles.actionLabel}>My Queue</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/(patient)/appointments')}
              >
                <Text style={styles.actionIcon}>📅</Text>
                <Text style={styles.actionLabel}>Appointments</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/(patient)/history')}
              >
                <Text style={styles.actionIcon}>📜</Text>
                <Text style={styles.actionLabel}>History</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/(patient)/profile')}
              >
                <Text style={styles.actionIcon}>👤</Text>
                <Text style={styles.actionLabel}>Profile</Text>
              </TouchableOpacity>
            </View>
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
    backgroundColor: '#1E40AF',
    padding: 20,
    paddingTop: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#fff',
  },
  headerText: {
    marginLeft: 16,
  },
  welcomeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  nameText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  roleText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
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
  content: {
    padding: 16,
  },
  queueCard: {
    backgroundColor: 'white',
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  queueDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  ticketContainer: {
    alignItems: 'center',
  },
  ticketLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  ticketNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  positionContainer: {
    alignItems: 'center',
  },
  positionLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  positionNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  divider: {
    marginVertical: 12,
  },
  waitContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  waitItem: {
    alignItems: 'center',
  },
  waitLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  waitValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  viewQueueButton: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  viewQueueText: {
    color: '#1E40AF',
    fontWeight: '600',
  },
  noQueueCard: {
    backgroundColor: 'white',
    marginBottom: 16,
    borderRadius: 12,
  },
  noQueueText: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 16,
  },
  joinQueueButton: {
    backgroundColor: '#1E40AF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  joinQueueText: {
    color: 'white',
    fontWeight: '600',
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  viewAllText: {
    color: '#1E40AF',
    fontSize: 14,
  },
  appointmentCard: {
    backgroundColor: 'white',
    marginBottom: 8,
    borderRadius: 8,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  appointmentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  departmentText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 14,
    color: '#333',
  },
  timeText: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: 'white',
    borderRadius: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 12,
  },
  actionCard: {
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
