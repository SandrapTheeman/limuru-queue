// Shared types for Cottage Queuing System
// This package is used by all apps (API, Web, Mobile)

// =====================================================
// USER TYPES
// =====================================================

export type UserRole = 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'patient';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  room?: string;
}

export interface Patient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  dob: string | null;
  requiresPasswordChange: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Doctor {
  id: string;
  name: string;
  email: string;
  department: string;
  room: string | null;
  isAvailable: boolean;
  breakUntil: string | null;
}

// =====================================================
// QUEUE TYPES
// =====================================================

export type VisitStatus = 'waiting' | 'called' | 'in_progress' | 'completed' | 'no_show' | 'transferred';

export interface Visit {
  id: string;
  patientId: string;
  ticketNumber: string;
  department: string;
  priority: boolean;
  status: VisitStatus;
  roomAssigned: string | null;
  doctorId: string | null;
  doctorNotes: string | null;
  diagnosis: string | null;
  prescription: string | null;
  createdAt: string;
  calledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  waitTimeMinutes: number | null;
}

export interface QueueItem {
  id: string;
  ticketNumber: string;
  patientName: string;
  priority: boolean;
  waitTime: number;
  position: number;
  status: VisitStatus;
  joinedAt: string;
}

export interface QueueResponse {
  department: string;
  waiting: number;
  called: number;
  patients: QueueItem[];
  estimatedWaitTime: number;
  nextCallEstimate: string;
}

// =====================================================
// AUTH TYPES
// =====================================================

export interface AuthPayload {
  userId: string;
  email: string;
  role: UserRole;
  patientId?: string;
  doctorId?: string;
}

export interface JWTPayload {
  sub: string;
  email: string;
  role: UserRole;
  patientId?: string;
  doctorId?: string;
  exp?: number;
  iat?: number;
}

export interface LoginResponse {
  token: string;
  expiresIn: number;
  user: User;
}

export interface PatientLoginResponse {
  token: string;
  expiresIn: number;
  user: {
    id: string;
    name: string;
    email: string;
    requiresPasswordChange: boolean;
  };
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// =====================================================
// ADMIN TYPES
// =====================================================

export interface IPTVChannel {
  id: string;
  name: string;
  url: string;
  category: string | null;
  logo: string | null;
  isActive: boolean;
  displayOrder: number;
}

export interface SystemSettings {
  clinicName: string;
  clinicAddress: string;
  departments: string;
  waitTimePerPatient: number;
  defaultPassword: string;
}

export interface AdminStats {
  todayVisits: number;
  waiting: number;
  completed: number;
  totalPatients: number;
}

// =====================================================
// DEPARTMENT CODES
// =====================================================

export const DEPARTMENT_CODES = [
  { code: 'MED', name: 'General Medicine' },
  { code: 'PED', name: 'Pediatrics' },
  { code: 'GYN', name: 'Gynecology' },
  { code: 'OPH', name: 'Orthopedics' },
  { code: 'DEN', name: 'Dental' },
  { code: 'ORTH', name: 'Ophthalmology' },
] as const;

// Voice call types
export * from './voice';

export type DepartmentCode = typeof DEPARTMENT_CODES[number]['code'];
