// Test fixtures for Hospital Queue System

export const testPatients = [
  {
    id: 'patient-001',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+254712345678',
    dob: '1990-05-15',
    password_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    requires_password_change: false,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'patient-002',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    phone: '+254798765432',
    dob: '1985-08-22',
    password_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    requires_password_change: true,
    created_at: '2024-01-02T00:00:00.000Z',
    updated_at: '2024-01-02T00:00:00.000Z',
  },
];

export const testDoctors = [
  {
    id: 'doctor-001',
    name: 'Dr. Emily White',
    email: 'emily.white@hospital.co.ke',
    department: 'MED',
    room: '101',
    pin_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    is_available: true,
    break_until: null,
    created_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'doctor-002',
    name: 'Dr. Michael Brown',
    email: 'michael.brown@hospital.co.ke',
    department: 'PED',
    room: '102',
    pin_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    is_available: true,
    break_until: null,
    created_at: '2024-01-01T00:00:00.000Z',
  },
];

export const testUsers = [
  {
    id: 'user-001',
    email: 'admin@hospital.co.ke',
    password_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    role: 'admin',
    doctor_id: null,
    name: 'Admin User',
    is_active: true,
    last_login: '2024-01-10T10:00:00.000Z',
    created_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'user-002',
    email: 'reception@hospital.co.ke',
    password_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    role: 'receptionist',
    doctor_id: null,
    name: 'Reception Staff',
    is_active: true,
    last_login: '2024-01-10T09:00:00.000Z',
    created_at: '2024-01-01T00:00:00.000Z',
  },
];

export const testVisits = [
  {
    id: 'visit-001',
    patient_id: 'patient-001',
    ticket_number: 'MED001',
    department: 'MED',
    priority: false,
    status: 'waiting',
    room_assigned: null,
    doctor_id: null,
    doctor_notes: null,
    diagnosis: null,
    prescription: null,
    created_at: '2024-01-15T08:00:00.000Z',
    called_at: null,
    started_at: null,
    completed_at: null,
    wait_time_minutes: null,
  },
  {
    id: 'visit-002',
    patient_id: 'patient-002',
    ticket_number: 'MED002',
    department: 'MED',
    priority: true,
    status: 'waiting',
    room_assigned: null,
    doctor_id: null,
    doctor_notes: null,
    diagnosis: null,
    prescription: null,
    created_at: '2024-01-15T08:15:00.000Z',
    called_at: null,
    started_at: null,
    completed_at: null,
    wait_time_minutes: null,
  },
  {
    id: 'visit-003',
    patient_id: 'patient-001',
    ticket_number: 'PED001',
    department: 'PED',
    priority: false,
    status: 'completed',
    room_assigned: 'Room 5',
    doctor_id: 'doctor-002',
    doctor_notes: 'Checkup complete',
    diagnosis: 'Healthy',
    prescription: null,
    created_at: '2024-01-15T07:00:00.000Z',
    called_at: '2024-01-15T08:30:00.000Z',
    started_at: '2024-01-15T08:35:00.000Z',
    completed_at: '2024-01-15T08:50:00.000Z',
    wait_time_minutes: 30,
  },
];

export const testSettings = [
  { key: 'wait_time_per_patient', value: '15' },
  { key: 'hospital_name', value: 'Limuru Cottage Hospital' },
  { key: 'max_queue_size', value: '50' },
];

export const testTriageInputs = {
  emergency: {
    chiefComplaint: 'Chest pain and difficulty breathing',
    symptoms: ['chest pain', 'shortness of breath', 'sweating'],
    symptomDuration: '15 minutes',
    painLevel: 9,
    vitalSigns: {
      bloodPressureSystolic: 160,
      heartRate: 120,
      oxygenSaturation: 88,
      temperature: 37.2,
    },
    medicalHistory: ['hypertension'],
    allergies: ['penicillin'],
  },
  urgent: {
    chiefComplaint: 'High fever and severe headache',
    symptoms: ['fever', 'headache', 'vomiting'],
    symptomDuration: '2 days',
    painLevel: 7,
    vitalSigns: {
      bloodPressureSystolic: 130,
      heartRate: 95,
      temperature: 39.5,
    },
    medicalHistory: [],
    allergies: [],
  },
  normal: {
    chiefComplaint: 'Cough and cold',
    symptoms: ['cough', 'runny nose', 'sore throat'],
    symptomDuration: '3 days',
    painLevel: 3,
    medicalHistory: [],
    allergies: [],
  },
  low: {
    chiefComplaint: 'General checkup',
    symptoms: [],
    symptomDuration: 'N/A',
    painLevel: 1,
    medicalHistory: [],
    allergies: [],
  },
};

export const testNotificationPayloads = {
  queueCalled: {
    type: 'sms' as const,
    recipient: '+254712345678',
    template: 'queue_called',
    variables: {
      name: 'John Doe',
      ticket: 'MED001',
    },
  },
  queueReminder: {
    type: 'whatsapp' as const,
    recipient: '+254798765432',
    template: 'queue_reminder',
    variables: {
      name: 'Jane Smith',
      position: '3',
      wait: '45',
    },
  },
  invalidPhone: {
    type: 'sms' as const,
    recipient: '12345',
    message: 'Test message',
  },
};

export const departments = ['MED', 'PED', 'GYN', 'OBS', 'ORT', 'CAR', 'DER', 'OPT', 'ENT', 'DEN', 'PSY', 'EMG'];

export const validTokens = {
  admin: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTAwMSIsImVtYWlsIjoiYWRtaW5AaG9zcGl0YWwuY28ua2UiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MDQ0NDgwMDB9.test',
  doctor: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkb2N0b3ItMDAxIiwiZW1haWwiOiJlbWlseS53aGl0ZUBob3NwaXRhbC5jby5rZSIsInJvbGUiOiJkb2N0b3IiLCJpYXQiOjE3MDQ0NDgwMDB9.test',
  patient: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJwYXRpZW50LTAwMSIsImVtYWlsIjoiam9obi5kb2VAZXhhbXBsZS5jb20iLCJyb2xlIjoicGF0aWVudCIsImlhdCI6MTcwNDQ0ODAwMH0.test',
  receptionist: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTAwMiIsImVtYWlsIjoicmVjZXB0aW9uQGhvc3BpdGFsLmNvLmtlIiwicm9sZSI6InJlY2VwdGlvbiIsImlhdCI6MTcwNDQ0ODAwMH0.test',
};