// Staff Tab Layout with Voice Call Support
import { Tabs } from 'expo-router';
import { useAuthStore } from '../../lib/store';
import { useVoiceCallStore } from '../../lib/stores/voice';
import { Badge, IconButton } from 'react-native-paper';
import { View, StyleSheet } from 'react-native';

interface TabIconProps {
  color: string;
  size: number;
}

export default function StaffLayout() {
  const { user } = useAuthStore();
  const { incomingCall, isInCall } = useVoiceCallStore();

  const getTitle = () => {
    switch (user?.role) {
      case 'doctor':
        return 'Doctor Dashboard';
      case 'receptionist':
        return 'Reception';
      default:
        return 'Queue Management';
    }
  };

  const HomeIcon = ({ color, size }: TabIconProps) => (
    <IconButton icon="home" iconColor={color} size={size} />
  );

  const QueueIcon = ({ color, size }: TabIconProps) => (
    <IconButton icon="format-list-numbered" iconColor={color} size={size} />
  );

  const CallsIcon = ({ color, size }: TabIconProps) => (
    <View>
      <IconButton icon="phone" iconColor={color} size={size} />
      {(incomingCall || isInCall) && (
        <Badge style={styles.badge} size={8} />
      )}
    </View>
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#9E9E9E',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#f0f0f0',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: '#4CAF50',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Home',
          tabBarIcon: HomeIcon,
        }}
      />
      <Tabs.Screen
        name="queue"
        options={{
          title: getTitle(),
          tabBarLabel: 'Queue',
          tabBarIcon: QueueIcon,
        }}
      />
      <Tabs.Screen
        name="calls"
        options={{
          title: 'Staff Calls',
          tabBarLabel: 'Calls',
          tabBarIcon: CallsIcon,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 8,
    right:  8,
    backgroundColor: '#F44336',
  },
});
