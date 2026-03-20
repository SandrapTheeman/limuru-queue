import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button, Chip, Searchbar, SegmentedButtons, Modal, Portal } from 'react-native-paper';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

interface QueueEntry {
  id: string;
  position: number;
  ticketNumber: string;
  patientName: string;
  patientId: string;
  priority: 'normal' | 'urgent' | 'critical';
  status: 'waiting' | 'called' | 'serving' | 'completed' | 'no_show';
  waitTime: number;
  service: string;
  arrivalTime: string;
}

interface VitalsEntry {
  bloodPressure: string;
  heartRate: number;
  temperature: number;
  weight: number;
  notes: string;
}

const DEPARTMENTS = ['MED', 'PED', 'GYN', 'OPH', 'DEN', 'ORTH', 'PHY', 'SUR'];
const TOKEN_KEY = 'auth_token';

export default function StaffQueueScreen() {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [filteredQueue, setFilteredQueue] = useState<QueueEntry[]>([]);
  const [department, setDepartment] = useState('MED');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<QueueEntry | null>(null);
  const [vitals, setVitals] = useState<VitalsEntry>({
    bloodPressure: '',
    heartRate: 0,
    temperature: 0,
    weight: 0,
    notes: '',
  });

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8787';

  useEffect(() => {
    fetchQueue();
  }, [department]);

  useEffect(() => {
    filterQueue();
  }, [queue, searchQuery, statusFilter]);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
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
    } finally {
      setLoading(false);
    }
  };

  const filterQueue = () => {
    let filtered = [...queue];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (entry) =>
          entry.patientName.toLowerCase().includes(query) ||
          entry.patientId.toLowerCase().includes(query) ||
          entry.ticketNumber.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((entry) => entry.status === statusFilter);
    }

    setFilteredQueue(filtered);
  };

  const handleCallPatient = async (visitId: string) => {
    setActionLoading(visitId);
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const response = await fetch(`${API_URL}/api/queue/${visitId}/call`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ room: 'Room 1' }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Patient has been called');
        fetchQueue();
      } else {
        Alert.alert('Error', 'Failed to call patient');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartConsultation = async (visitId: string) => {
    setActionLoading(visitId);
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const response = await fetch(`${API_URL}/api/queue/${visitId}/start`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchQueue();
      }
    } catch (error) {
      console.error('Failed to start consultation:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompletePatient = async (visitId: string) => {
    setActionLoading(visitId);
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const response = await fetch(`${API_URL}/api/queue/${visitId}/complete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        Alert.alert('Success', 'Patient consultation completed');
        fetchQueue();
      }
    } catch (error) {
      Alert.alert('Error', 'Network error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleNoShow = async (visitId: string) => {
    Alert.alert(
      'Mark No Show',
      'Are you sure you want to mark this patient as no-show?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(visitId);
            try {
              const token = await SecureStore.getItemAsync(TOKEN_KEY);
              const response = await fetch(`${API_URL}/api/queue/${visitId}/no-show`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });

              if (response.ok) {
                fetchQueue();
              }
            } catch (error) {
              console.error('Failed to mark no-show:', error);
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleOverrideCall = async (visitId: string) => {
    Alert.prompt(
      'Override Call',
      'Enter the ticket number to call (override queue order):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: async (ticketNumber) => {
            if (!ticketNumber) return;
            
            setActionLoading(visitId);
            try {
              const token = await SecureStore.getItemAsync(TOKEN_KEY);
              const response = await fetch(`${API_URL}/api/queue/${visitId}/call`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ room: 'Room 1', override: true, ticketNumber }),
              });

              if (response.ok) {
                Alert.alert('Success', `Patient with ticket ${ticketNumber} has been called`);
                fetchQueue();
              }
            } catch (error) {
              Alert.alert('Error', 'Network error');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleOpenVitals = (patient: QueueEntry) => {
    setSelectedPatient(patient);
    setVitals({
      bloodPressure: '',
      heartRate: 0,
      temperature: 0,
      weight: 0,
      notes: '',
    });
    setShowVitalsModal(true);
  };

  const handleSaveVitals = async () => {
    if (!selectedPatient) return;

    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const response = await fetch(`${API_URL}/api/vitals`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visitId: selectedPatient.id,
          patientId: selectedPatient.patientId,
          ...vitals,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Vitals saved successfully');
        setShowVitalsModal(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save vitals');
    }
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return '#9E9E9E';
      case 'called':
        return '#2196F3';
      case 'serving':
        return '#4CAF50';
      case 'completed':
        return '#66BB6A';
      case 'no_show':
        return '#EF5350';
      default:
        return '#9E9E9E';
    }
  };

  const waitingCount = queue.filter((e) => e.status === 'waiting').length;
  const calledCount = queue.filter((e) => e.status === 'called').length;
  const servingCount = queue.filter((e) => e.status === 'serving').length;
  const completedCount = queue.filter((e) => e.status === 'completed').length;

  const renderQueueEntry = ({ item, index }: { item: QueueEntry; index: number }) => (
    <Card style={styles.queueCard}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.cardLeft}>
            <Text style={styles.positionText}>#{index + 1}</Text>
            <Chip
              style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}
              textStyle={styles.badgeText}
            >
              {item.priority.toUpperCase()}
            </Chip>
          </View>
          <Chip
            style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}
            textStyle={styles.badgeText}
          >
            {item.status.toUpperCase().replace('_', ' ')}
          </Chip>
        </View>

        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>{item.patientName}</Text>
          <Text style={styles.patientId}>{item.patientId}</Text>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Ticket</Text>
            <Text style={styles.ticketNumber}>{item.ticketNumber}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Service</Text>
            <Text style={styles.detailValue}>{item.service}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Wait</Text>
            <Text style={styles.waitTime}>{item.waitTime} min</Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          {item.status === 'waiting' && (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.callBtn]}
                onPress={() => handleCallPatient(item.id)}
                disabled={actionLoading === item.id}
              >
                {actionLoading === item.id ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.actionBtnText}>Call</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.overrideBtn]}
                onPress={() => handleOverrideCall(item.id)}
              >
                <Text style={styles.actionBtnText}>Override</Text>
              </TouchableOpacity>
            </>
          )}

          {item.status === 'called' && (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.startBtn]}
                onPress={() => handleStartConsultation(item.id)}
                disabled={actionLoading === item.id}
              >
                {actionLoading === item.id ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.actionBtnText}>Start</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.noShowBtn]}
                onPress={() => handleNoShow(item.id)}
              >
                <Text style={styles.actionBtnText}>No Show</Text>
              </TouchableOpacity>
            </>
          )}

          {item.status === 'serving' && (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.vitalsBtn]}
                onPress={() => handleOpenVitals(item)}
              >
                <Text style={styles.actionBtnText}>Vitals</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.completeBtn]}
                onPress={() => handleCompletePatient(item.id)}
                disabled={actionLoading === item.id}
              >
                {actionLoading === item.id ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.actionBtnText}>Complete</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {item.status === 'completed' && (
            <Text style={styles.completedText}>Consultation completed</Text>
          )}

          {item.status === 'no_show' && (
            <Text style={styles.noShowText}>Patient did not show</Text>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Department Queue</Text>
        <Text style={styles.headerSubtitle}>{department} Department</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={[styles.statBox, { backgroundColor: '#E3F2FD' }]}>
          <Text style={[styles.statNumber, { color: '#1976D2' }]}>{waitingCount}</Text>
          <Text style={styles.statLabel}>Waiting</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: '#BBDEFB' }]}>
          <Text style={[styles.statNumber, { color: '#1976D2' }]}>{calledCount}</Text>
          <Text style={styles.statLabel}>Called</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: '#C8E6C9' }]}>
          <Text style={[styles.statNumber, { color: '#388E3C' }]}>{servingCount}</Text>
          <Text style={styles.statLabel}>Serving</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: '#E8F5E9' }]}>
          <Text style={[styles.statNumber, { color: '#388E3C' }]}>{completedCount}</Text>
          <Text style={styles.statLabel}>Done</Text>
        </View>
      </View>

      <View style={styles.deptSelector}>
        <FlatList
          horizontal
          data={DEPARTMENTS}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.deptChip,
                department === item && styles.deptChipActive,
              ]}
              onPress={() => setDepartment(item)}
            >
              <Text
                style={[
                  styles.deptChipText,
                  department === item && styles.deptChipTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
        />
      </View>

      <Searchbar
        placeholder="Search patient..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      <SegmentedButtons
        value={statusFilter}
        onValueChange={setStatusFilter}
        buttons={[
          { value: 'all', label: 'All' },
          { value: 'waiting', label: 'Waiting' },
          { value: 'called', label: 'Called' },
          { value: 'serving', label: 'Serving' },
        ]}
        style={styles.segmentedButtons}
      />

      <FlatList
        data={filteredQueue}
        renderItem={renderQueueEntry}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={fetchQueue}
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Text style={styles.emptyText}>No patients found</Text>
            </Card.Content>
          </Card>
        }
      />

      <Portal>
        <Modal
          visible={showVitalsModal}
          onDismiss={() => setShowVitalsModal(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Text style={styles.modalTitle}>Enter Vitals</Text>
          <Text style={styles.modalSubtitle}>{selectedPatient?.patientName}</Text>

          <TextInput
            style={styles.vitalsInput}
            placeholder="Blood Pressure (e.g., 120/80)"
            value={vitals.bloodPressure}
            onChangeText={(text) => setVitals({ ...vitals, bloodPressure: text })}
          />

          <TextInput
            style={styles.vitalsInput}
            placeholder="Heart Rate (bpm)"
            keyboardType="numeric"
            value={vitals.heartRate ? String(vitals.heartRate) : ''}
            onChangeText={(text) => setVitals({ ...vitals, heartRate: parseInt(text) || 0 })}
          />

          <TextInput
            style={styles.vitalsInput}
            placeholder="Temperature (°C)"
            keyboardType="decimal-pad"
            value={vitals.temperature ? String(vitals.temperature) : ''}
            onChangeText={(text) => setVitals({ ...vitals, temperature: parseFloat(text) || 0 })}
          />

          <TextInput
            style={styles.vitalsInput}
            placeholder="Weight (kg)"
            keyboardType="decimal-pad"
            value={vitals.weight ? String(vitals.weight) : ''}
            onChangeText={(text) => setVitals({ ...vitals, weight: parseFloat(text) || 0 })}
          />

          <TextInput
            style={[styles.vitalsInput, styles.notesInput]}
            placeholder="Notes"
            multiline
            value={vitals.notes}
            onChangeText={(text) => setVitals({ ...vitals, notes: text })}
          />

          <View style={styles.modalButtons}>
            <Button
              mode="outlined"
              onPress={() => setShowVitalsModal(false)}
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSaveVitals}
              style={styles.modalButton}
            >
              Save
            </Button>
          </View>
        </Modal>
      </Portal>
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
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  statBox: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  deptSelector: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  deptChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    marginRight: 8,
  },
  deptChipActive: {
    backgroundColor: '#1E40AF',
  },
  deptChipText: {
    fontSize: 14,
    color: '#666',
  },
  deptChipTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'white',
  },
  segmentedButtons: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
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
    marginBottom: 12,
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
    height: 24,
  },
  statusBadge: {
    height: 24,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  patientInfo: {
    marginBottom: 12,
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
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
  },
  ticketNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
  },
  waitTime: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  callBtn: {
    backgroundColor: '#2196F3',
  },
  overrideBtn: {
    backgroundColor: '#FF9800',
  },
  startBtn: {
    backgroundColor: '#4CAF50',
  },
  noShowBtn: {
    backgroundColor: '#EF5350',
  },
  vitalsBtn: {
    backgroundColor: '#9C27B0',
  },
  completeBtn: {
    backgroundColor: '#388E3C',
  },
  actionBtnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  completedText: {
    flex: 1,
    textAlign: 'center',
    color: '#388E3C',
    fontWeight: '500',
  },
  noShowText: {
    flex: 1,
    textAlign: 'center',
    color: '#EF5350',
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
  },
  emptyContent: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  vitalsInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
  },
});
