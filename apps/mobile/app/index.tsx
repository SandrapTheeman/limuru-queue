// Mobile App Home/Landing Page
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuthStore } from '../lib/store';
import { useEffect } from 'react';

export default function HomeScreen() {
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Navigate based on role
      if (user.role === 'patient') {
        router.replace('/(patient)');
      } else {
        router.replace('/(staff)');
      }
    }
  }, [isAuthenticated, user]);

  const departments = [
    { code: 'MED', name: 'General Medicine' },
    { code: 'PED', name: 'Pediatrics' },
    { code: 'GYN', name: 'Gynecology' },
    { code: 'OPH', name: 'Orthopedics' },
    { code: 'DEN', name: 'Dental' },
    { code: 'ORTH', name: 'Ophthalmology' },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Limuru Cottage Hospital</Text>
        <Text style={styles.subtitle}>Digital Queuing System</Text>
      </View>

      <View style={styles.section}>
        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={styles.loginButton}>
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/(auth)/register" asChild>
          <TouchableOpacity style={styles.registerButton}>
            <Text style={styles.registerButtonText}>Register</Text>
          </TouchableOpacity>
        </Link>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Departments</Text>
        <View style={styles.departmentGrid}>
          {departments.map((dept) => (
            <TouchableOpacity
              key={dept.code}
              style={styles.departmentCard}
              onPress={() => router.push({
                pathname: '/(auth)/register',
                params: { department: dept.code }
              })}
            >
              <Text style={styles.departmentCode}>{dept.code}</Text>
              <Text style={styles.departmentName}>{dept.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  section: {
    padding: 16,
  },
  loginButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  registerButtonText: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  departmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  departmentCard: {
    width: '31%',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  departmentCode: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  departmentName: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
});
