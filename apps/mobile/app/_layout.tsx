import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Portal, Modal, Surface, Text, Button, Avatar, View } from 'react-native-paper';
import { router, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useVoiceCallStore } from '../lib/stores/voice';
import { acceptCall, rejectCall } from '../lib/api/voice';
import { initOfflineSync, NetworkStatus } from '../lib/offline';
import { WebSocketProvider } from '../lib/websocket';
import * as Haptics from 'expo-haptics';
import { registerNotificationCategories, handleNotificationResponse } from '../lib/notifications';
import * as Notifications from 'expo-notifications';
import { OfflineIndicator } from '../components/OfflineIndicator';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string, type: 'patient' | 'staff') => Promise<void>;
  logout: () => Promise<void>;
}

interface User {
  id: string;
  name: string;
  email?: string;
  role: 'patient' | 'admin' | 'doctor' | 'receptionist' | 'nurse';
  department?: string;
  room?: string;
  patientId?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'auth_user';
const TOKEN_STORAGE_KEY = 'auth_token';

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within RootLayout');
  }
  return context;
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
    initOfflineSync(handleNetworkChange);
    registerNotificationCategories();
    
    const subscription = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );
    
    return () => {
      subscription.remove();
    };
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedUser = await SecureStore.getItemAsync(AUTH_STORAGE_KEY);
      const storedToken = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      }
    } catch (error) {
      console.error('Failed to load auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNetworkChange = (status: NetworkStatus) => {
    console.log('Network status changed:', status);
  };

  const login = async (email: string, password: string, type: 'patient' | 'staff') => {
    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8787';
    const endpoint = type === 'patient' ? '/api/auth/patient/login' : '/api/auth/staff/login';
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Login failed' }));
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    const userData = data.data?.user || data.user;
    const authToken = data.data?.token || data.token;

    await SecureStore.setItemAsync(AUTH_STORAGE_KEY, JSON.stringify(userData));
    await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, authToken);
    
    setUser(userData);
    setToken(authToken);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
    await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function useProtectedRoute() {
  const segments = useSegments();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const isAuthRoute = segments[0] === '(auth)';
    const isPatientRoute = segments[0] === '(patient)';
    const isStaffRoute = segments[0] === '(staff)';

    if (!user && !isAuthRoute) {
      router.replace('/(auth)/login');
      return;
    }

    if (user) {
      if (user.role === 'patient' && !isPatientRoute && !isAuthRoute) {
        router.replace('/(patient)');
      } else if (user.role !== 'patient' && !isStaffRoute && !isAuthRoute) {
        router.replace('/(staff)');
      }
    }
  }, [segments, user, loading]);
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const { incomingCall, clearIncomingCall, setCurrentCall } = useVoiceCallStore();
  const [showIncomingModal, setShowIncomingModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (incomingCall) {
      setShowIncomingModal(true);
    } else {
      setShowIncomingModal(false);
    }
  }, [incomingCall]);

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
        router.push('/(staff)/calls/active');
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
    } catch (error) {
      console.error('Failed to reject call:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WebSocketProvider>
          <StatusBar style="auto" />
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)/login" options={{ presentation: 'modal' }} />
            <Stack.Screen name="(auth)/register" options={{ presentation: 'modal' }} />
            <Stack.Screen name="(patient)" />
            <Stack.Screen name="(staff)" />
          </Stack>

          <Portal>
            <Modal
              visible={showIncomingModal && !!incomingCall}
              onDismiss={() => {}}
              contentContainerStyle={styles.modalContainer}
            >
              <Surface style={styles.modalContent}>
                <Text variant="titleMedium" style={styles.modalLabel}>
                  Incoming Call
                </Text>
                
                <Avatar.Text
                  size={80}
                  label={incomingCall ? getInitials(incomingCall.callerName) : ''}
                  style={styles.avatar}
                />
                
                <Text variant="headlineSmall" style={styles.callerName}>
                  {incomingCall?.callerName}
                </Text>
                
                <Button
                  mode="contained"
                  icon="phone"
                  onPress={handleAccept}
                  loading={isLoading}
                  disabled={isLoading}
                  style={styles.acceptButton}
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
                >
                  Decline
                </Button>
              </Surface>
            </Modal>
          </Portal>
        </WebSocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

const styles = {
  modalContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center' as const,
    margin: 20,
    width: '85%',
  },
  modalLabel: {
    color: '#666',
    marginBottom: 16,
  },
  avatar: {
    backgroundColor: '#1E40AF',
  },
  callerName: {
    marginTop: 16,
    marginBottom: 24,
    fontWeight: '600' as const,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    width: '100%',
    marginBottom: 12,
  },
  rejectButton: {
    width: '100%',
    borderColor: '#F44336',
  },
};
