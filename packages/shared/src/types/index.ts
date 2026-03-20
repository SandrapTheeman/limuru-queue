// Shared TypeScript types for Limuru Cottage Hospital Queue Management System

export type UserRole = 
  | 'super_admin' 
  | 'admin' 
  | 'doctor' 
  | 'nurse' 
  | 'receptionist' 
  | 'patient' 
  | 'pharmacist' 
  | 'lab_tech' 
  | 'facility_manager' 
  | 'it_support';

export type QueueStatus = 'waiting' | 'called' | 'in_progress' | 'completed' | 'no_show' | 'transferred' | 'cancelled';

export type PriorityLevel = 1 | 2 | 3 | 4; // 1=Emergency, 2=Urgent, 3=Normal, 4=Low

export type DepartmentCode = 
  | 'MED'   // General Medicine
  | 'PED'   // Pediatrics
  | 'EMR'   // Emergency
  | 'GYN'   // Gynecology
  | 'ORT'   // Orthopedics
  | 'DEN'   // Dental
  | 'LAB'   // Laboratory
  | 'PHM'   // Pharmacy
  | 'CAR'   // Cardiology
  | 'RAD';  // Radiology

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = unknown> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface QueueTicket {
  id: string;
  ticket_number: string;
  patient_id: string;
  patient_name: string;
  department: DepartmentCode;
  room_assigned: string | null;
  priority: PriorityLevel;
  priority_score: number;
  status: QueueStatus;
  called_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  wait_time_minutes: number;
  created_at: string;
  notes: string | null;
  is_override: boolean;
  override_reason: string | null;
}

export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other' | null;
  hms_patient_id: string | null;
  registration_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department: DepartmentCode | null;
  facility_id: string | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface Department {
  code: DepartmentCode;
  name: string;
  description: string | null;
  color: string;
  display_order: number;
  is_active: boolean;
  avg_service_time: number;
}

export interface Room {
  id: string;
  name: string;
  room_number: string;
  department: DepartmentCode;
  room_type: 'consultation' | 'procedure' | 'emergency' | 'pharmacy' | 'lab';
  status: 'available' | 'occupied' | 'maintenance' | 'closed';
  floor: string | null;
  building: string | null;
  capacity: number;
}

export interface Appointment {
  id: string;
  patient_id: string;
  department: DepartmentCode;
  doctor_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  reason: string | null;
  status: 'scheduled' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';
  notes: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'sms' | 'whatsapp' | 'email' | 'push' | 'voice';
  channel: string;
  recipient: string;
  message: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sent_at: string | null;
  delivered_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  sender_type: 'user' | 'patient' | 'system';
  sender_name: string;
  recipient_id: string | null;
  recipient_type: 'user' | 'patient' | 'broadcast';
  subject: string | null;
  content: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface TVDisplay {
  id: string;
  name: string;
  location: string;
  facility_id: string;
  mode: 'single' | 'multi' | 'auto';
  department_filter: DepartmentCode[];
  show_waiting: boolean;
  show_called: boolean;
  show_completed: boolean;
  tts_enabled: boolean;
  tts_volume: number;
  tts_language: 'en' | 'sw' | 'both';
  iptv_url: string | null;
  pip_enabled: boolean;
  pip_position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  is_active: boolean;
  last_ping: string | null;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  user_role: string | null;
  action: string;
  resource: string;
  resource_id: string | null;
  ip_address: string;
  user_agent: string;
  success: boolean;
  phi_accessed: boolean;
  details: Record<string, unknown> | null;
  timestamp: string;
}

export interface HMSPatient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other' | null;
  phone: string | null;
  email: string | null;
  identifier: string | null;
}

export interface HMSAppointment {
  id: string;
  patient_id: string;
  provider_id: string | null;
  location_id: string | null;
  start_time: string;
  end_time: string | null;
  status: string;
  reason: string | null;
  visit_type: string | null;
}
