// Patient Tab Layout
import { Stack } from 'expo-router';

export default function PatientLayout() {
  return (
    <Stack>
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
