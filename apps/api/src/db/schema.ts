import { D1Database } from '@cloudflare/workers-types';

export type { D1Database };
export type UserRole = 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'patient';
export type VisitStatus = 'waiting' | 'called' | 'serving' | 'completed' | 'no_show' | 'transferred';
export type TriageLevel = 1 | 2 | 3 | 4 | 5;
export type RoomType = 'consultation' | 'examination' | 'procedure' | 'emergency' | 'laboratory' | 'pharmacy' | 'imaging' | 'reception' | 'waiting' | 'staff';
export type RoomStatus = 'available' | 'occupied' | 'maintenance' | 'reserved' | 'out_of_service';
export type NotificationType = 'sms' | 'whatsapp' | 'voice';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'delivered';
export type MessageType = 'internal' | 'broadcast' | 'alert' | 'reminder';
export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';
export type DisplayType = 'queue' | 'waiting_room' | 'doctor_panel' | 'lobby' | 'waiting_hall';

export interface Patient {
  id: string;
  national_id?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email: string | null;
  phone: string | null;
  dob: string | null;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  blood_type?: string;
  allergies?: string;
  password_hash: string | null;
  requires_password_change: boolean;
  created_at: string;
  updated_at: string;
}

export interface Doctor {
  id: string;
  user_id?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email: string;
  specialty?: string;
  department: string;
  department_id?: string;
  room?: string | null;
  room_id?: string | null;
  pin_hash: string | null;
  is_available: boolean;
  break_until: string | null;
  consultation_duration?: number;
  max_daily_patients?: number;
  consultation_fee?: number;
  license_number?: string;
  qualification?: string;
  experience_years?: number;
  created_at: string;
  updated_at?: string;
}

export interface Visit {
  id: string;
  patient_id: string;
  ticket_number: string;
  department: string;
  department_id?: string;
  priority: boolean;
  triage_level?: TriageLevel | null;
  status: VisitStatus;
  room_assigned: string | null;
  doctor_id: string | null;
  doctor_notes: string | null;
  diagnosis: string | null;
  prescription: string | null;
  complaint?: string;
  notes?: string;
  created_at: string;
  called_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  wait_time_minutes: number | null;
}

export interface Queue {
  id: string;
  patient_id: string;
  doctor_id: string;
  department_id: string;
  queue_number: string;
  status: VisitStatus;
  priority: number;
  complaint?: string;
  notes?: string;
  called_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  estimated_wait_time?: number | null;
  called_by?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  doctor_id: string | null;
  name: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Room {
  id: string;
  room_number: string;
  name: string | null;
  room_type: RoomType;
  department_id: string | null;
  floor: string | null;
  building: string | null;
  capacity: number;
  status: RoomStatus;
  equipment: string | null;
  amenities: string | null;
  notes: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface RoomSchedule {
  id: string;
  room_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  recurring: string;
  effective_from: string | null;
  effective_until: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoomAssignment {
  id: string;
  room_id: string;
  doctor_id: string;
  assignment_type: 'primary' | 'secondary' | 'temporary';
  start_date: string;
  end_date: string | null;
  schedule: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoomOccupancy {
  id: string;
  room_id: string;
  queue_id: string | null;
  doctor_id: string | null;
  patient_id: string | null;
  check_in_time: string;
  check_out_time: string | null;
  status: 'occupied' | 'cleaning' | 'ready' | 'maintenance';
  duration_minutes: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  floor: string | null;
  building: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface VitalSign {
  id: string;
  visit_id: string;
  recorded_by: string;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  heart_rate: number | null;
  temperature: number | null;
  respiratory_rate: number | null;
  oxygen_saturation: number | null;
  weight: number | null;
  height: number | null;
  notes: string | null;
  recorded_at: string;
}

export interface SoapNote {
  id: string;
  visit_id: string;
  recorded_by: string;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  created_at: string;
  updated_at: string;
}

export interface Prescription {
  id: string;
  visit_id: string;
  prescribed_by: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string | null;
  instructions: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Allergy {
  id: string;
  patient_id: string;
  allergen: string;
  reaction: string | null;
  severity: 'mild' | 'moderate' | 'severe' | 'life_threatening' | null;
  recorded_by: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  patient_id: string | null;
  type: NotificationType;
  recipient: string;
  message: string;
  status: NotificationStatus;
  twilio_sid: string | null;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  user_role: string | null;
  action: string;
  resource: string;
  resource_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  success: boolean;
  phi_accessed: boolean;
  details: string | null;
  timestamp: string;
}

export interface Message {
  id: string;
  sender_id: string | null;
  sender_type: 'user' | 'system' | 'patient';
  sender_name: string | null;
  recipient_id: string | null;
  recipient_type: 'user' | 'department' | 'all' | 'patient';
  message_type: MessageType;
  subject: string | null;
  content: string;
  priority: MessagePriority;
  is_read: boolean;
  read_at: string | null;
  expires_at: string | null;
  metadata: string | null;
  created_at: string;
}

export interface DisplayConfig {
  id: string;
  display_type: DisplayType;
  display_name: string;
  location: string | null;
  department_id: string | null;
  screen_orientation: 'landscape' | 'portrait';
  auto_refresh_seconds: number;
  show_ip_tv: boolean;
  ip_tv_channel_id: string | null;
  ip_tv_volume: number;
  theme: 'light' | 'dark';
  language: string;
  is_active: boolean;
  last_seen: string | null;
  created_at: string;
  updated_at: string;
}

export interface IPTVChannel {
  id: string;
  name: string;
  url: string;
  category: string | null;
  logo: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface Setting {
  key: string;
  value: string;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface QueueHistory {
  id: string;
  visit_id: string;
  action: string;
  actor_id: string | null;
  actor_type: string | null;
  timestamp: string;
  metadata: string | null;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  department_id: string;
  appointment_date: string;
  appointment_time: string;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  type: 'consultation' | 'follow_up' | 'procedure' | 'emergency';
  reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MedicalRecord {
  id: string;
  patient_id: string;
  doctor_id: string;
  queue_id: string | null;
  appointment_id: string | null;
  record_type: 'consultation' | 'diagnosis' | 'prescription' | 'lab_order' | 'procedure' | 'note';
  diagnosis: string | null;
  treatment: string | null;
  prescription: string | null;
  notes: string | null;
  attachments: string | null;
  created_at: string;
  updated_at: string;
}

export interface QueueItem {
  id: string;
  ticket_number: string;
  patient_name: string;
  priority: boolean;
  wait_time: number;
  position: number;
  status: VisitStatus;
  joined_at: string;
}

export interface QueueResponse {
  department: string;
  waiting: number;
  called: number;
  patients: QueueItem[];
  estimated_wait_time: number;
  next_call_estimate: string;
}

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

export interface AuthPayload {
  userId: string;
  email: string;
  role: UserRole;
  patientId?: string;
  doctorId?: string;
}

export interface JWTPayload {
  sub: string;
  userId: string;
  email: string;
  role: UserRole;
  patientId?: string;
  doctorId?: string;
  exp?: number;
  iat?: number;
}

export interface Context {
  env: {
    DB: D1Database;
    SESSION_KV: KVNamespace;
    CACHE_KV: KVNamespace;
    RATE_LIMIT_KV: KVNamespace;
    ASSETS_BUCKET: R2Bucket;
    BACKUP_BUCKET: R2Bucket;
    QUEUE_ROOM: DurableObjectNamespace;
    PATIENT_SYNC: DurableObjectNamespace;
    JWT_SECRET: string;
    DEFAULT_PASSWORD: string;
    ENVIRONMENT: string;
  };
  user: AuthPayload | null;
}
