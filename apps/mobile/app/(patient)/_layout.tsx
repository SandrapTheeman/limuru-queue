// Patient Tab Layout
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { OfflineIndicator } from '../../components/OfflineIndicator';
import { getOfflineStatus } from '../../lib/offline';

export default function PatientLayout() {
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>('online');

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1E40AF',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerRight: () => (
          <View style={{ marginRight: 8 }}>
            <OfflineIndicator minimal onNetworkChange={(status) => setNetworkStatus(status)} />
          </View>
        ),
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Patient Dashboard',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="queue" 
        options={{ 
          title: 'Queue Status',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="history" 
        options={{ 
          title: 'Visit History',
          headerShown: true,
        }} 
      />
    </Stack>
  );
}
