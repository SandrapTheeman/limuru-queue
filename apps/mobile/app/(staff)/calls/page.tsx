// Staff Directory with Voice Call Functionality
import { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Card, Text, Button, Searchbar, Avatar, Chip, ActivityIndicator } from 'react-native-paper';
import { router } from 'expo-router';
import { useVoiceCallStore } from '../../lib/stores/voice';
import { initiateCall, getAuthToken } from '../../lib/api/voice';

// Mock staff data - replace with API call
interface StaffMember {
  id: string;
  name: string;
  role: string;
  department: string;
  online: boolean;
  avatar?: string;
}

const MOCK_STAFF: StaffMember[] = [
  { id: '1', name: 'Dr. Jane Smith', role: 'Doctor', department: 'General Medicine', online: true },
  { id: '2', name: 'Nurse John Doe', role: 'Nurse', department: 'Emergency', online: true },
  { id: '3', name: 'Dr. Emily Brown', role: 'Doctor', department: 'Pediatrics', online: false },
  { id: '4', name: 'Nurse Sarah Wilson', role: 'Nurse', department: 'General Medicine', online: true },
  { id: '5', name: 'Dr. Michael Chen', role: 'Doctor', department: 'Orthopedics', online: true },
  { id: '6', name: 'Nurse James Kimani', role: 'Nurse', department: 'Emergency', online: false },
  { id: '7', name: 'Dr. Alice Njeri', role: 'Doctor', department: 'Gynecology', online: true },
  { id: '8', name: 'Nurse Grace Muthoni', role: 'Nurse', department: 'General Medicine', online: true },
];

// Get current user info (mock - replace with actual auth store)
async function getCurrentUser(): Promise<{ id: string; name: string }> {
  // Try to get from secure store or use mock
  try {
    const token = await getAuthToken();
    // In production, decode JWT or fetch user profile
    // For now, return mock user
    return { id: 'current-user-id', name: 'Current User' };
  } catch {
    return { id: 'current-user-id', name: 'Current User' };
  }
}

export default function StaffCallsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [staff] = useState<StaffMember[]>(MOCK_STAFF);
  const [calling, setCalling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { setCurrentCall } = useVoiceCallStore();

  const filteredStaff = staff.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleCall = async (userId: string, userName: string) => {
    setCalling(userId);
    setError(null);
    try {
      const currentUser = await getCurrentUser();
      const response = await initiateCall({
        targetUserId: userId,
        targetName: userName,
        priority: 'normal',
        callerId: currentUser.id,
        callerName: currentUser.name,
      });

      if (response.success && response.data) {
        setCurrentCall({
          callId: response.data.id,
          callerId: response.data.callerId,
          callerName: response.data.callerName,
          calleeId: response.data.calleeId,
          calleeName: response.data.calleeName,
          status: 'initiated',
          priority: response.data.priority as 'normal' | 'urgent' | 'emergency',
        });
        // Navigate to active call screen
        router.push('/(staff)/calls/active');
      } else {
        setError(response.error || 'Failed to initiate call. Please try again.');
      }
    } catch (err) {
      console.error('Failed to initiate call:', err);
      setError('Failed to initiate call. Please check your connection.');
    } finally {
      setCalling(null);
    }
  };

  const renderStaffItem = ({ item }: { item: StaffMember }) => (
    <Card style={styles.card} mode="elevated">
      <Card.Content style={styles.cardContent}>
        <View style={styles.avatarContainer}>
          <Avatar.Text
            size={48}
            label={getInitials(item.name)}
            style={[
              styles.avatar,
              !item.online && styles.avatarOffline,
            ]}
          />
          {item.online && <View style={styles.onlineIndicator} />}
        </View>
        <View style={styles.info}>
          <Text variant="titleMedium" style={styles.nameText}>
            {item.name}
          </Text>
          <Text variant="bodySmall" style={styles.role}>
            {item.role}
          </Text>
          <Chip compact style={styles.chip} textStyle={styles.chipText}>
            {item.department}
          </Chip>
        </View>
        <Button
          mode="contained"
          icon="phone"
          onPress={() => handleCall(item.id, item.name)}
          loading={calling === item.id}
          disabled={calling === item.id || !item.online}
          style={styles.callButton}
          contentStyle={styles.callButtonContent}
        >
          {calling === item.id ? 'Calling...' : 'Call'}
        </Button>
      </Card.Content>
    </Card>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text variant="titleLarge" style={styles.title}>
        Staff Directory
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Tap to call any staff member
      </Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text variant="bodyLarge" style={styles.emptyText}>
        No staff members found
      </Text>
      <Text variant="bodySmall" style={styles.emptySubtext}>
        Try a different search term
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search staff..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
        inputStyle={styles.searchInput}
      />
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button onPress={() => setError(null)}>Dismiss</Button>
        </View>
      )}
      
      <FlatList
        data={filteredStaff}
        renderItem={renderStaffItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontWeight: '600',
    color: '#333',
  },
  subtitle: {
    color: '#666',
    marginTop: 4,
  },
  searchbar: {
    margin: 16,
    marginBottom: 8,
  },
  searchInput: {
    minHeight: 0,
  },
  list: {
    padding: 16,
    paddingTop: 8,
  },
  card: {
    marginBottom: 12,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    backgroundColor: '#4CAF50',
  },
  avatarOffline: {
    backgroundColor: '#9E9E9E',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4caf50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  info: {
    flex: 1,
  },
  nameText: {
    fontWeight: '600',
  },
  role: {
    color: '#666',
    marginBottom: 4,
  },
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: '#E3F2FD',
    height: 24,
  },
  chipText: {
    fontSize: 10,
    color: '#1976D2',
  },
  callButton: {
    marginLeft: 8,
    backgroundColor: '#4CAF50',
  },
  callButtonContent: {
    paddingHorizontal: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    color: '#666',
  },
  emptySubtext: {
    color: '#999',
    marginTop: 4,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#C62828',
    flex: 1,
  },
});
