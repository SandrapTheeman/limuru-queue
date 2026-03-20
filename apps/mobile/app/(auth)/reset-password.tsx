// Mobile Password Reset Screen
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useState } from 'react';
import { Link, useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../../lib/store';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const token = params.token as string | undefined;
  
  const [step, setStep] = useState<'request' | 'confirm' | 'success'>(token ? 'confirm' : 'request');
  const [loading, setLoading] = useState(false);
  
  // Request form state
  const [identifier, setIdentifier] = useState('');
  
  // Confirm form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRequestSubmit = async () => {
    if (!identifier) {
      Alert.alert('Error', 'Please enter your email or patient ID');
      return;
    }
    
    setLoading(true);
    try {
      await (api as any).requestPasswordReset(identifier);
      Alert.alert('Success', 'If an account exists, a reset link will be sent to your email.');
      router.replace('/(auth)/login');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSubmit = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    try {
      await (api as any).confirmPasswordReset(token, newPassword);
      setStep('success');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Password Reset Successful</Text>
          <Text style={styles.subtitle}>Your password has been reset. You can now login.</Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>Go to Login</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    );
  }

  if (step === 'confirm') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Enter your new password</Text>
          
          <View style={styles.form}>
            <Text style={styles.label}>New Password</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              secureTextEntry
            />
            
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              secureTextEntry
            />
            
            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleConfirmSubmit}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <Link href="/(auth)/login" style={styles.link}>
            <Text style={styles.linkText}>← Back to Login</Text>
          </Link>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.subtitle}>Enter your email or patient ID to reset</Text>
        
        <View style={styles.form}>
          <Text style={styles.label}>Email or Patient ID</Text>
          <TextInput
            style={styles.input}
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="your.email@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          
          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRequestSubmit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Text>
          </TouchableOpacity>
        </View>
        
        <Link href="/(auth)/login" style={styles.link}>
          <Text style={styles.linkText}>← Back to Login</Text>
        </Link>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    marginTop: 24,
  },
  linkText: {
    color: '#4CAF50',
    fontSize: 14,
  },
});
