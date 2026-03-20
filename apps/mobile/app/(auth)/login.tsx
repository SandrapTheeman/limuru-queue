import { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

interface LoginResponse {
  success: boolean;
  data?: {
    user: {
      id: string;
      name: string;
      email?: string;
      role: 'patient' | 'admin' | 'doctor' | 'receptionist' | 'nurse';
      department?: string;
      room?: string;
      patientId?: string;
    };
    token: string;
  };
  message?: string;
}

const AUTH_STORAGE_KEY = 'auth_user';
const TOKEN_STORAGE_KEY = 'auth_token';

export default function LoginScreen() {
  const [loginType, setLoginType] = useState<'patient' | 'staff'>('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [patientId, setPatientId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPatientIdField, setShowPatientIdField] = useState(false);

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8787';

  const getEndpoint = () => {
    if (loginType === 'patient') {
      return showPatientIdField ? '/api/auth/patient/login-id' : '/api/auth/patient/login';
    }
    return '/api/auth/staff/login';
  };

  const handleLogin = async () => {
    if (!email && !patientId) {
      Alert.alert('Error', loginType === 'patient' ? 'Please enter your email or patient ID' : 'Please enter your email');
      return;
    }
    if (!password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setIsLoading(true);

    try {
      const body = loginType === 'patient' && showPatientIdField
        ? { identifier: patientId, password }
        : { email, password };

      const response = await fetch(`${API_URL}${getEndpoint()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data: LoginResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid credentials');
      }

      if (data.data?.user && data.data?.token) {
        await SecureStore.setItemAsync(AUTH_STORAGE_KEY, JSON.stringify(data.data.user));
        await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, data.data.token);

        const user = data.data.user;
        const route = user.role === 'patient' ? '/(patient)' : '/(staff)';
        router.replace(route);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLoginMethod = () => {
    setShowPatientIdField(!showPatientIdField);
    setEmail('');
    setPatientId('');
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Login' }} />
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.logo}>LQ</Text>
              <Text style={styles.title}>Limuru Queue</Text>
              <Text style={styles.subtitle}>Limuru Cottage Hospital</Text>
            </View>

            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, loginType === 'patient' && styles.activeTab]}
                onPress={() => setLoginType('patient')}
              >
                <Text style={[styles.tabText, loginType === 'patient' && styles.activeTabText]}>
                  Patient
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, loginType === 'staff' && styles.activeTab]}
                onPress={() => setLoginType('staff')}
              >
                <Text style={[styles.tabText, loginType === 'staff' && styles.activeTabText]}>
                  Staff
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              {loginType === 'patient' && (
                <TouchableOpacity onPress={toggleLoginMethod} style={styles.toggleButton}>
                  <Text style={styles.toggleText}>
                    {showPatientIdField 
                      ? 'Use email instead' 
                      : 'Use Patient ID instead'}
                  </Text>
                </TouchableOpacity>
              )}

              {loginType === 'patient' && showPatientIdField ? (
                <TextInput
                  style={styles.input}
                  placeholder="Patient ID"
                  value={patientId}
                  onChangeText={setPatientId}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              ) : (
                <TextInput
                  style={styles.input}
                  placeholder={loginType === 'patient' ? 'Email Address' : 'Email Address'}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
              )}
              
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Login</Text>
                )}
              </TouchableOpacity>

              {loginType === 'staff' && (
                <TouchableOpacity
                  style={styles.pinButton}
                  onPress={() => router.push('/(auth)/pin-login')}
                >
                  <Text style={styles.pinButtonText}>Use PIN Login</Text>
                </TouchableOpacity>
              )}
            </View>

            {loginType === 'patient' && (
              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.registerLink}
                  onPress={() => router.push('/(auth)/register')}
                >
                  <Text style={styles.registerText}>
                    Don't have an account? Register here
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.forgotLink}
                  onPress={() => router.push('/(auth)/reset-password')}
                >
                  <Text style={styles.forgotText}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#1E40AF',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: 'white',
    fontWeight: '600',
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleButton: {
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleText: {
    color: '#1E40AF',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  button: {
    backgroundColor: '#1E40AF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  pinButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  pinButtonText: {
    color: '#666',
    fontSize: 14,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  registerLink: {
    marginBottom: 12,
  },
  registerText: {
    color: '#1E40AF',
    fontSize: 16,
  },
  forgotLink: {
    marginTop: 8,
  },
  forgotText: {
    color: '#666',
    fontSize: 14,
  },
});
