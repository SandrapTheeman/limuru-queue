-- ============================================================
-- Limuru Cottage Hospital Queue System - Initial Schema
-- D1 (SQLite) Database Migration
-- Version: 1.0.0
-- Date: 2026-03-20
-- ============================================================
--
-- This migration creates the complete database schema for the
-- Limuru Cottage Hospital Queue Management System. It is designed
-- for Cloudflare D1 (SQLite) compatibility.
--
-- IMPORTANT NOTES:
-- - All IDs use UUID v4 format compatible with D1
-- - Dates use ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)
-- - Foreign keys are explicit and use ON DELETE CASCADE
-- - No stored procedures - all logic in application code
-- - SQLite-specific functions: STRFTIME, JULIANDAY, randomblob
--
-- ============================================================

-- Enable foreign key enforcement
PRAGMA foreign_keys = ON;

-- ============================================================
-- SECTION 1: CORE INFRASTRUCTURE TABLES
-- ============================================================

-- ----------------------------------------------------------
-- 1.1 FACILITIES TABLE
-- ----------------------------------------------------------
-- The root entity representing a hospital or healthcare facility
-- Each facility operates independently with its own configuration
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS facilities (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' || 
    lower(hex(randomblob(2))) || '-4' || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    substr('89ab',abs(random()) % 4 + 1, 1) || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    lower(hex(randomblob(6)))
  ),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  address TEXT,
  city TEXT,
  county TEXT,
  country TEXT DEFAULT 'Kenya',
  postal_code TEXT,
  phone TEXT,
  alternative_phone TEXT,
  email TEXT,
  website TEXT,
  timezone TEXT DEFAULT 'Africa/Nairobi',
  currency TEXT DEFAULT 'KES',
  license_number TEXT,
  license_expiry TEXT,
  bed_capacity INTEGER,
  established_date TEXT,
  logo_url TEXT,
  tagline TEXT,
  description TEXT,
  operating_hours_start TEXT DEFAULT '07:00',
  operating_hours_end TEXT DEFAULT '20:00',
  operating_days TEXT DEFAULT '1,2,3,4,5,6',
  emergency_services INTEGER DEFAULT 1,
  ambulance_services INTEGER DEFAULT 1,
  pharmacy_services INTEGER DEFAULT 1,
  laboratory_services INTEGER DEFAULT 1,
  radiology_services INTEGER DEFAULT 1,
  is_active INTEGER DEFAULT 1,
  requires_appointment INTEGER DEFAULT 0,
  allows_walkins INTEGER DEFAULT 1,
  max_wait_time_minutes INTEGER DEFAULT 120,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')),
  updated_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'))
);

CREATE INDEX IF NOT EXISTS idx_facilities_code ON facilities(code);
CREATE INDEX IF NOT EXISTS idx_facilities_active ON facilities(is_active);
CREATE INDEX IF NOT EXISTS idx_facilities_city ON facilities(city);

-- ----------------------------------------------------------
-- 1.2 DEPARTMENTS TABLE
-- ----------------------------------------------------------
-- Hospital departments/sections that handle specific types of care
-- Each department has its own queue and staff
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' || 
    lower(hex(randomblob(2))) || '-4' || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    substr('89ab',abs(random()) % 4 + 1, 1) || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    lower(hex(randomblob(6)))
  ),
  facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT,
  average_service_time INTEGER DEFAULT 15,
  max_daily_patients INTEGER DEFAULT 100,
  consultation_fee REAL DEFAULT 0,
  followup_fee REAL DEFAULT 0,
  is_emergency INTEGER DEFAULT 0,
  requires_appointment INTEGER DEFAULT 1,
  allows_walkins INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  floor INTEGER DEFAULT 1,
  building TEXT,
  parent_department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  head_doctor_id TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  average_wait_time INTEGER DEFAULT 30,
  peak_hour_start TEXT,
  peak_hour_end TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')),
  updated_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')),
  UNIQUE(facility_id, code)
);

CREATE INDEX IF NOT EXISTS idx_departments_facility ON departments(facility_id);
CREATE INDEX IF NOT EXISTS idx_departments_code ON departments(code);
CREATE INDEX IF NOT EXISTS idx_departments_active ON departments(is_active);
CREATE INDEX IF NOT EXISTS idx_departments_parent ON departments(parent_department_id);
CREATE INDEX IF NOT EXISTS idx_departments_order ON departments(display_order);

-- ----------------------------------------------------------
-- 1.3 ROOMS TABLE
-- ----------------------------------------------------------
-- Physical rooms within departments where consultations occur
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' || 
    lower(hex(randomblob(2))) || '-4' || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    substr('89ab',abs(random()) % 4 + 1, 1) || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    lower(hex(randomblob(6)))
  ),
  facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  room_name TEXT,
  room_type TEXT DEFAULT 'consultation' CHECK (
    room_type IN (
      'consultation', 'examination', 'procedure', 
      'emergency', 'laboratory', 'pharmacy', 
      'imaging', 'waiting', 'staff', 'storage',
      'operation', 'recovery', 'reception', 'conference'
    )
  ),
  floor INTEGER DEFAULT 1,
  building TEXT,
  wing TEXT,
  capacity INTEGER DEFAULT 1,
  current_occupancy INTEGER DEFAULT 0,
  equipment TEXT,
  status TEXT DEFAULT 'available' CHECK (
    status IN ('available', 'occupied', 'maintenance', 'reserved', 'closed')
  ),
  is_active INTEGER DEFAULT 1,
  allow_multiple_patients INTEGER DEFAULT 0,
  has_private_entrance INTEGER DEFAULT 0,
  has_disabled_access INTEGER DEFAULT 1,
  air_conditioned INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')),
  updated_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')),
  UNIQUE(facility_id, room_number)
);

CREATE INDEX IF NOT EXISTS idx_rooms_facility ON rooms(facility_id);
CREATE INDEX IF NOT EXISTS idx_rooms_department ON rooms(department_id);
CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms(is_active);
CREATE INDEX IF NOT EXISTS idx_rooms_type ON rooms(room_type);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);

-- ----------------------------------------------------------
-- 1.4 USERS TABLE
-- ----------------------------------------------------------
-- All system users including staff, doctors, admins, and patients
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' || 
    lower(hex(randomblob(2))) || '-4' || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    substr('89ab',abs(random()) % 4 + 1, 1) || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    lower(hex(randomblob(6)))
  ),
  facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (
    role IN (
      'super_admin', 'admin', 'doctor', 'nurse', 
      'receptionist', 'patient', 'pharmacist', 
      'lab_tech', 'facility_manager', 'it_support',
      'radiographer', 'physiotherapist', 'counselor'
    )
  ),
  email TEXT NOT NULL,
  phone TEXT,
  alternative_phone TEXT,
  password_hash TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  middle_name TEXT,
  date_of_birth TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  national_id TEXT,
  profile_image TEXT,
  department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  room_id TEXT REFERENCES rooms(id) ON DELETE SET NULL,
  title TEXT,
  qualifications TEXT,
  specialization TEXT,
  license_number TEXT,
  years_experience INTEGER,
  bio TEXT,
  languages TEXT DEFAULT '["English", "Swahili"]',
  is_online INTEGER DEFAULT 0,
  last_seen TEXT,
  is_active INTEGER DEFAULT 1,
  is_verified INTEGER DEFAULT 0,
  email_verified_at TEXT,
  phone_verified_at TEXT,
  requires_password_change INTEGER DEFAULT 0,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TEXT,
  last_login TEXT,
  password_changed_at TEXT,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')),
  updated_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')),
  UNIQUE(facility_id, email)
);

CREATE INDEX IF NOT EXISTS idx_users_facility ON users(facility_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_national_id ON users(national_id);

-- ----------------------------------------------------------
-- 1.5 PATIENTS TABLE
-- ----------------------------------------------------------
-- Patient information and demographics
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' || 
    lower(hex(randomblob(2))) || '-4' || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    substr('89ab',abs(random()) % 4 + 1, 1) || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    lower(hex(randomblob(6)))
  ),
  facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  hms_patient_id TEXT,
  patient_number TEXT UNIQUE,
  national_id TEXT,
  huduma_number TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  middle_name TEXT,
  date_of_birth TEXT,
  age INTEGER,
  age_unit TEXT DEFAULT 'years' CHECK (age_unit IN ('days', 'months', 'years')),
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  marital_status TEXT CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed', 'separated')),
  email TEXT,
  phone TEXT NOT NULL,
  alternative_phone TEXT,
  address TEXT,
  city TEXT,
  county TEXT,
  country TEXT DEFAULT 'Kenya',
  postal_code TEXT,
  landmark TEXT,
  latitude REAL,
  longitude REAL,
  emergency_contact_name TEXT,
  emergency_relationship TEXT,
  emergency_phone TEXT,
  emergency_email TEXT,
  blood_type TEXT CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  rh_factor TEXT CHECK (rh_factor IN ('positive', 'negative')),
  allergies TEXT,
  chronic_conditions TEXT,
  current_medications TEXT,
  family_history TEXT,
  surgical_history TEXT,
  smoking_status TEXT CHECK (smoking_status IN ('never', 'former', 'current')),
  alcohol_use TEXT CHECK (alcohol_use IN ('none', 'occasional', 'regular')),
  occupation TEXT,
  employer TEXT,
  employer_phone TEXT,
  insurance_provider TEXT,
  insurance_policy_number TEXT,
  insurance_expiry TEXT,
  nhif_number TEXT,
  nhif_status TEXT CHECK (nhif_status IN ('active', 'inactive', 'expired')),
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'insurance', 'nhif', 'corporate', 'mixed')),
  photo_url TEXT,
  signature_url TEXT,
  registration_source TEXT CHECK (registration_source IN ('walk_in', 'appointment', 'referral', 'emergency', 'online')),
  registration_complete INTEGER DEFAULT 0,
  registered_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  verified_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  verified_at TEXT,
  is_active INTEGER DEFAULT 1,
  is_blacklisted INTEGER DEFAULT 0,
  blacklist_reason TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')),
  updated_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'))
);

CREATE INDEX IF NOT EXISTS idx_patients_facility ON patients(facility_id);
CREATE INDEX IF NOT EXISTS idx_patients_hms ON patients(hms_patient_id);
CREATE INDEX IF NOT EXISTS idx_patients_national_id ON patients(national_id);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_patients_complete ON patients(registration_complete);
CREATE INDEX IF NOT EXISTS idx_patients_patient_number ON patients(patient_number);
CREATE INDEX IF NOT EXISTS idx_patients_nhif ON patients(nhif_number);
CREATE INDEX IF NOT EXISTS idx_patients_insurance ON patients(insurance_policy_number);

-- ============================================================
-- SECTION 2: QUEUE MANAGEMENT TABLES
-- ============================================================

-- ----------------------------------------------------------
-- 2.1 QUEUE_TICKETS TABLE (THE CORE TABLE)
-- ----------------------------------------------------------
-- Manages patient queue tickets and their status
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS queue_tickets (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' || 
    lower(hex(randomblob(2))) || '-4' || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    substr('89ab',abs(random()) % 4 + 1, 1) || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    lower(hex(randomblob(6)))
  ),
  facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  doctor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  ticket_number TEXT NOT NULL,
  sequence_number INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  priority_score REAL DEFAULT 40.0,
  status TEXT DEFAULT 'waiting' CHECK (
    status IN (
      'waiting', 'queued', 'called', 'serving', 
      'completed', 'no_show', 'cancelled', 
      'transferred', 'left_without_seeing', 'on_hold'
    )
  ),
  status_reason TEXT,
  status_changed_at TEXT,
  status_changed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  complaint TEXT,
  complaint_duration TEXT,
  complaint_severity INTEGER CHECK (complaint_severity BETWEEN 1 AND 10),
  vitals_taken INTEGER DEFAULT 0,
  vitals_at TEXT,
  vitals_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  internal_notes TEXT,
  room_assigned TEXT,
  room_assigned_at TEXT,
  called_at TEXT,
  called_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  call_count INTEGER DEFAULT 0,
  first_call_at TEXT,
  last_call_at TEXT,
  no_show_count INTEGER DEFAULT 0,
  started_at TEXT,
  started_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  completed_at TEXT,
  completed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  transferred_to_department TEXT REFERENCES departments(id) ON DELETE SET NULL,
  transfer_reason TEXT,
  transferred_at TEXT,
  transferred_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  appointment_id TEXT,
  hms_appointment_id TEXT,
  estimated_wait_minutes INTEGER,
  actual_wait_minutes INTEGER,
  service_time_seconds INTEGER,
  is_override INTEGER DEFAULT 0,
  override_reason TEXT,
  override_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  is_emergency INTEGER DEFAULT 0,
  is_followup INTEGER DEFAULT 0,
  referring_department TEXT,
  referring_ticket_id TEXT,
  walk_in INTEGER DEFAULT 1,
  check_in_method TEXT CHECK (check_in_method IN ('kiosk', 'reception', 'mobile', 'online', 'phone')),
  check_in_at TEXT,
  check_in_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  feedback_requested INTEGER DEFAULT 0,
  feedback_provided INTEGER DEFAULT 0,
  feedback_rating INTEGER CHECK (feedback_rating BETWEEN 1 AND 5),
  feedback_comment TEXT,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')),
  updated_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'))
);

CREATE INDEX IF NOT EXISTS idx_tickets_facility ON queue_tickets(facility_id);
CREATE INDEX IF NOT EXISTS idx_tickets_patient ON queue_tickets(patient_id);
CREATE INDEX IF NOT EXISTS idx_tickets_department ON queue_tickets(department_id);
CREATE INDEX IF NOT EXISTS idx_tickets_doctor ON queue_tickets(doctor_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON queue_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON queue_tickets(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_today ON queue_tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON queue_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_tickets_called ON queue_tickets(called_at) WHERE status = 'called';
CREATE INDEX IF NOT EXISTS idx_tickets_waiting ON queue_tickets(status, department_id) WHERE status = 'waiting';
CREATE INDEX IF NOT EXISTS idx_tickets_emergency ON queue_tickets(is_emergency) WHERE is_emergency = 1;
CREATE INDEX IF NOT EXISTS idx_tickets_checkin ON queue_tickets(check_in_at) WHERE check_in_at IS NOT NULL;

-- ----------------------------------------------------------
-- 2.2 APPOINTMENTS TABLE
-- ----------------------------------------------------------
-- Scheduled patient appointments
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' || 
    lower(hex(randomblob(2))) || '-4' || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    substr('89ab',abs(random()) % 4 + 1, 1) || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    lower(hex(randomblob(6)))
  ),
  facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  appointment_number TEXT UNIQUE,
  appointment_date TEXT NOT NULL,
  appointment_time TEXT NOT NULL,
  end_time TEXT,
  duration_minutes INTEGER DEFAULT 15,
  type TEXT DEFAULT 'consultation' CHECK (
    type IN (
      'consultation', 'follow_up', 'procedure', 
      'emergency', 'vaccination', 'prenatal',
      'post_op', 'therapy', 'counseling'
    )
  ),
  status TEXT DEFAULT 'scheduled' CHECK (
    status IN (
      'scheduled', 'confirmed', 'checked_in', 
      'in_progress', 'completed', 'cancelled',
      'no_show', 'rescheduled', 'pending_confirmation'
    )
  ),
  reason TEXT,
  notes TEXT,
  internal_notes TEXT,
  is_first_visit INTEGER DEFAULT 0,
  is_followup INTEGER DEFAULT 0,
  followup_from TEXT REFERENCES appointments(id) ON DELETE SET NULL,
  followup_reason TEXT,
  cancellation_reason TEXT,
  cancellation_notes TEXT,
  cancelled_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  cancelled_at TEXT,
  reschedule_reason TEXT,
  rescheduled_to TEXT REFERENCES appointments(id) ON DELETE SET NULL,
  room_id TEXT REFERENCES rooms(id) ON DELETE SET NULL,
  reminder_sent INTEGER DEFAULT 0,
  reminder_sent_at TEXT,
  confirmation_sent INTEGER DEFAULT 0,
  confirmation_sent_at TEXT,
  check_in_time TEXT,
  check_in_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  waiting_time_seconds INTEGER,
  service_time_seconds INTEGER,
  hms_appointment_id TEXT,
  external_booking_id TEXT,
  booking_source TEXT CHECK (
    booking_source IN (
      'phone', 'online', 'mobile_app', 
      'reception', 'referral', 'kiosk'
    )
  ),
  payment_status TEXT DEFAULT 'pending' CHECK (
    payment_status IN ('pending', 'paid', 'partial', 'waived', 'insurance')
  ),
  amount_due REAL DEFAULT 0,
  amount_paid REAL DEFAULT 0,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')),
  updated_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'))
);

CREATE INDEX IF NOT EXISTS idx_appointments_facility ON appointments(facility_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_department ON appointments(department_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_time ON appointments(appointment_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_today ON appointments(appointment_date, status);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON appointments(doctor_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);

-- ============================================================
-- SECTION 3: CLINICAL TABLES
-- ============================================================

-- ----------------------------------------------------------
-- 3.1 CLINICAL_NOTES TABLE (SOAP Format)
-- ----------------------------------------------------------
-- Doctor's clinical notes for patient encounters
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical_notes (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' || 
    lower(hex(randomblob(2))) || '-4' || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    substr('89ab',abs(random()) % 4 + 1, 1) || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    lower(hex(randomblob(6)))
  ),
  ticket_id TEXT NOT NULL REFERENCES queue_tickets(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  appointment_id TEXT REFERENCES appointments(id) ON DELETE SET NULL,
  visit_date TEXT NOT NULL,
  visit_type TEXT DEFAULT 'consultation',
  subjective TEXT,
  objective TEXT,
  assessment TEXT,
  plan TEXT,
  diagnosis TEXT,
  differential_diagnosis TEXT,
  icd10_codes TEXT,
  icd10_descriptions TEXT,
  vitals TEXT,
  vitals_temperature REAL,
  vitals_bp_systolic INTEGER,
  vitals_bp_diastolic INTEGER,
  vitals_heart_rate INTEGER,
  vitals_respiratory_rate INTEGER,
  vitals_spo2 REAL,
  vitals_weight REAL,
  vitals_height REAL,
  vitals_bmi REAL,
  vitals_blood_glucose REAL,
  notes TEXT,
  instructions TEXT,
  follow_up_required INTEGER DEFAULT 0,
  follow_up_days INTEGER,
  follow_up_date TEXT,
  referral_required INTEGER DEFAULT 0,
  referral_department TEXT,
  referral_notes TEXT,
  work_restriction TEXT,
  work_restriction_days INTEGER,
  is_draft INTEGER DEFAULT 1,
  is_finalized INTEGER DEFAULT 0,
  finalized_at TEXT,
  finalized_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  signed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  signed_at TEXT,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')),
  updated_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'))
);

CREATE INDEX IF NOT EXISTS idx_notes_ticket ON clinical_notes(ticket_id);
CREATE INDEX IF NOT EXISTS idx_notes_patient ON clinical_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_notes_doctor ON clinical_notes(doctor_id);
CREATE INDEX IF NOT EXISTS idx_notes_date ON clinical_notes(visit_date);
CREATE INDEX IF NOT EXISTS idx_notes_draft ON clinical_notes(is_draft) WHERE is_draft = 1;

-- ----------------------------------------------------------
-- 3.2 PRESCRIPTIONS TABLE
-- ----------------------------------------------------------
-- Patient prescriptions from doctors
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS prescriptions (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' || 
    lower(hex(randomblob(2))) || '-4' || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    substr('89ab',abs(random()) % 4 + 1, 1) || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    lower(hex(randomblob(6)))
  ),
  ticket_id TEXT NOT NULL REFERENCES queue_tickets(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  prescription_number TEXT UNIQUE,
  medication TEXT NOT NULL,
  generic_name TEXT,
  brand_name TEXT,
  dosage TEXT NOT NULL,
  dosage_unit TEXT,
  frequency TEXT NOT NULL,
  frequency_times TEXT,
  frequency_interval_hours INTEGER,
  duration TEXT NOT NULL,
  duration_days INTEGER,
  quantity_prescribed INTEGER,
  quantity_dispensed INTEGER DEFAULT 0,
  instructions TEXT,
  special_instructions TEXT,
  warnings TEXT,
  side_effects TEXT,
  contraindications TEXT,
  drug_interactions TEXT,
  refills_allowed INTEGER DEFAULT 0,
  refills_remaining INTEGER DEFAULT 0,
  is_controlled INTEGER DEFAULT 0,
  controlled_class TEXT,
  pharmacy_notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (
    status IN ('pending', 'verified', 'dispensed', 'partially_dispensed', 'cancelled', 'expired')
  ),
  dispensed_at TEXT,
  dispensed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  verified_at TEXT,
  verified_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  cancelled_at TEXT,
  cancelled_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  cancellation_reason TEXT,
  price REAL DEFAULT 0,
  is_free INTEGER DEFAULT 0,
  insurance_covered INTEGER DEFAULT 0,
  insurance_amount REAL DEFAULT 0,
  patient_amount REAL DEFAULT 0,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')),
  updated_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'))
);

CREATE INDEX IF NOT EXISTS idx_rx_ticket ON prescriptions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_rx_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_rx_doctor ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_rx_status ON prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_rx_medication ON prescriptions(medication);
CREATE INDEX IF NOT EXISTS idx_rx_dispensed ON prescriptions(dispensed_at);

-- ----------------------------------------------------------
-- 3.3 LAB_ORDERS TABLE
-- ----------------------------------------------------------
-- Laboratory test orders
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS lab_orders (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' || 
    lower(hex(randomblob(2))) || '-4' || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    substr('89ab',abs(random()) % 4 + 1, 1) || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    lower(hex(randomblob(6)))
  ),
  ticket_id TEXT NOT NULL REFERENCES queue_tickets(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  order_number TEXT UNIQUE,
  test_name TEXT NOT NULL,
  test_code TEXT NOT NULL,
  test_category TEXT,
  priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  urgency TEXT DEFAULT 'routine' CHECK (urgency IN ('routine', 'stat', 'urgent')),
  status TEXT DEFAULT 'ordered' CHECK (
    status IN (
      'ordered', 'specimen_collected', 'in_transit',
      'received', 'processing', 'completed',
      'verified', 'cancelled', 'rejected'
    )
  ),
  clinical_notes TEXT,
  diagnosis TEXT,
  icd10_code TEXT,
  specimen_type TEXT,
  specimen_collected_at TEXT,
  specimen_collected_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  specimen_id TEXT,
  collection_site TEXT,
  results TEXT,
  results_json TEXT,
  results_at TEXT,
  results_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  verified_at TEXT,
  verified_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  normal_range TEXT,
  interpretation TEXT,
  is_abnormal INTEGER DEFAULT 0,
  critical_value INTEGER DEFAULT 0,
  critical_value_reported_at TEXT,
  critical_value_reported_to TEXT,
  report_generated_at TEXT,
  report_url TEXT,
  is_fasted INTEGER DEFAULT 0,
  fasting_hours INTEGER,
  price REAL DEFAULT 0,
  insurance_covered INTEGER DEFAULT 0,
  patient_amount REAL DEFAULT 0,
  paid_at TEXT,
  paid_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  cancelled_at TEXT,
  cancelled_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  cancellation_reason TEXT,
  rejection_reason TEXT,
  turnaround_time_hours INTEGER,
  ordered_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')),
  completed_at TEXT,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')),
  updated_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'))
);

CREATE INDEX IF NOT EXISTS idx_lab_ticket ON lab_orders(ticket_id);
CREATE INDEX IF NOT EXISTS idx_lab_patient ON lab_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_doctor ON lab_orders(doctor_id);
CREATE INDEX IF NOT EXISTS idx_lab_status ON lab_orders(status);
CREATE INDEX IF NOT EXISTS idx_lab_test_code ON lab_orders(test_code);
CREATE INDEX IF NOT EXISTS idx_lab_priority ON lab_orders(priority);
CREATE INDEX IF NOT EXISTS idx_lab_ordered ON lab_orders(ordered_at);

-- ============================================================
-- SECTION 4: DOCTOR SPECIALTIES
-- ============================================================

CREATE TABLE IF NOT EXISTS doctors (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' || 
    lower(hex(randomblob(2))) || '-4' || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    substr('89ab',abs(random()) % 4 + 1, 1) || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    lower(hex(randomblob(6)))
  ),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  specialty TEXT NOT NULL,
  sub_specialty TEXT,
  qualification TEXT,
  qualification_year TEXT,
  medical_school TEXT,
  internship_institution TEXT,
  residency_program TEXT,
  fellowship TEXT,
  license_number TEXT UNIQUE,
  license_expiry TEXT,
  license_status TEXT DEFAULT 'active',
  kmpdu_number TEXT,
  other_registrations TEXT,
  years_in_practice INTEGER,
  consultation_duration INTEGER DEFAULT 15,
  max_daily_patients INTEGER DEFAULT 20,
  consultation_fee REAL DEFAULT 0,
  followup_fee REAL DEFAULT 0,
  emergency_fee REAL DEFAULT 0,
  is_accepting_new_patients INTEGER DEFAULT 1,
  is_accepting_insurance INTEGER DEFAULT 1,
  insurance_providers TEXT,
  special_interests TEXT,
  languages TEXT DEFAULT '["English", "Swahili"]',
  bio TEXT,
  research_interests TEXT,
  publications TEXT,
  awards TEXT,
  is_available INTEGER DEFAULT 1,
  availability_notes TEXT,
  on_leave INTEGER DEFAULT 0,
  leave_start TEXT,
  leave_end TEXT,
  leave_reason TEXT,
  rating REAL,
  review_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')),
  updated_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'))
);

CREATE INDEX IF NOT EXISTS idx_doctors_user ON doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_facility ON doctors(facility_id);
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors(specialty);
CREATE INDEX IF NOT EXISTS idx_doctors_available ON doctors(is_available);
CREATE INDEX IF NOT EXISTS idx_doctors_license ON doctors(license_number);

-- ============================================================
-- SECTION 5: ROOM MANAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS room_schedules (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' || 
    lower(hex(randomblob(2))) || '-4' || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    substr('89ab',abs(random()) % 4 + 1, 1) || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    lower(hex(randomblob(6)))
  ),
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  is_available INTEGER DEFAULT 1,
  max_appointments INTEGER,
  notes TEXT,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'))
);

CREATE INDEX IF NOT EXISTS idx_room_schedules_room ON room_schedules(room_id);
CREATE INDEX IF NOT EXISTS idx_room_schedules_day ON room_schedules(day_of_week);

CREATE TABLE IF NOT EXISTS room_assignments (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' || 
    lower(hex(randomblob(2))) || '-4' || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    substr('89ab',abs(random()) % 4 + 1, 1) || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    lower(hex(randomblob(6)))
  ),
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  doctor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  purpose TEXT,
  appointment_id TEXT REFERENCES appointments(id) ON DELETE SET NULL,
  ticket_id TEXT REFERENCES queue_tickets(id) ON DELETE SET NULL,
  notes TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')),
  updated_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'))
);

CREATE INDEX IF NOT EXISTS idx_room_assignments_room ON room_assignments(room_id);
CREATE INDEX IF NOT EXISTS idx_room_assignments_doctor ON room_assignments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_room_assignments_date ON room_assignments(date);

-- ============================================================
-- SECTION 6: MEDICAL RECORDS
-- ============================================================

CREATE TABLE IF NOT EXISTS medical_records (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' || 
    lower(hex(randomblob(2))) || '-4' || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    substr('89ab',abs(random()) % 4 + 1, 1) || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    lower(hex(randomblob(6)))
  ),
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  ticket_id TEXT REFERENCES queue_tickets(id) ON DELETE SET NULL,
  appointment_id TEXT REFERENCES appointments(id) ON DELETE SET NULL,
  record_type TEXT NOT NULL CHECK (
    record_type IN (
      'consultation', 'diagnosis', 'prescription', 
      'lab_result', 'imaging_result', 'procedure',
      'note', 'immunization', 'allergy', 'condition'
    )
  ),
  record_number TEXT UNIQUE,
  title TEXT,
  diagnosis TEXT,
  treatment TEXT,
  prescription TEXT,
  notes TEXT,
  attachments TEXT,
  icd10_codes TEXT,
  attachments_urls TEXT,
  is_confidential INTEGER DEFAULT 0,
  access_level TEXT DEFAULT 'standard',
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')),
  updated_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'))
);

CREATE INDEX IF NOT EXISTS idx_med_records_patient ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_med_records_doctor ON medical_records(doctor_id);
CREATE INDEX IF NOT EXISTS idx_med_records_type ON medical_records(record_type);
CREATE INDEX IF NOT EXISTS idx_med_records_facility ON medical_records(facility_id);
CREATE INDEX IF NOT EXISTS idx_med_records_date ON medical_records(created_at);

CREATE TABLE IF NOT EXISTS allergies (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' || 
    lower(hex(randomblob(2))) || '-4' || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    substr('89ab',abs(random()) % 4 + 1, 1) || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    lower(hex(randomblob(6)))
  ),
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  allergen TEXT NOT NULL,
  allergen_type TEXT CHECK (
    allergen_type IN ('medication', 'food', 'environmental', 'other')
  ),
  reaction TEXT,
  severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe', 'life_threatening')),
  onset_date TEXT,
  confirmed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  verified_at TEXT,
  notes TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'))
);

CREATE INDEX IF NOT EXISTS idx_allergies_patient ON allergies(patient_id);
CREATE INDEX IF NOT EXISTS idx_allergies_allergen ON allergies(allergen);

CREATE TABLE IF NOT EXISTS immunizations (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' || 
    lower(hex(randomblob(2))) || '-4' || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    substr('89ab',abs(random()) % 4 + 1, 1) || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    lower(hex(randomblob(6)))
  ),
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  vaccine_name TEXT NOT NULL,
  vaccine_code TEXT,
  manufacturer TEXT,
  lot_number TEXT,
  expiration_date TEXT,
  dose_number INTEGER,
  total_doses INTEGER,
  administration_date TEXT NOT NULL,
  administered_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  site TEXT,
  route TEXT,
  next_due_date TEXT,
  adverse_reactions TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'))
);

CREATE INDEX IF NOT EXISTS idx_immunizations_patient ON immunizations(patient_id);
CREATE INDEX IF NOT EXISTS idx_immunizations_date ON immunizations(administration_date);

-- ============================================================
-- SECTION 7: COMMUNICATION TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' || 
    lower(hex(randomblob(2))) || '-4' || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    substr('89ab',abs(random()) % 4 + 1, 1) || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    lower(hex(randomblob(6)))
  ),
  facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  department_id TEXT REFERENCES departments(id) ON DELETE CASCADE,
  subject TEXT,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'direct' CHECK (
    type IN ('direct', 'broadcast', 'alert', 'announcement', 'system')
  ),
  priority TEXT DEFAULT 'normal' CHECK (
    priority IN ('low', 'normal', 'high', 'urgent', 'emergency')
  ),
  category TEXT,
  related_ticket_id TEXT REFERENCES queue_tickets(id) ON DELETE SET NULL,
  related_patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
  attachment_urls TEXT,
  is_read INTEGER DEFAULT 0,
  read_at TEXT,
  read_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  expires_at TEXT,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'))
);

CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_department ON messages(department_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(recipient_id, is_read) WHERE is_read = 0;
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_priority ON messages(priority);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

CREATE TABLE IF NOT EXISTS voice_calls (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' || 
    lower(hex(randomblob(2))) || '-4' || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    substr('89ab',abs(random()) % 4 + 1, 1) || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    lower(hex(randomblob(6)))
  ),
  facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  caller_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  call_direction TEXT DEFAULT 'outbound' CHECK (
    call_direction IN ('inbound', 'outbound')
  ),
  call_type TEXT DEFAULT 'staff' CHECK (
    call_type IN ('staff', 'patient', 'emergency', 'external')
  ),
  status TEXT DEFAULT 'initiated' CHECK (
    status IN ('initiated', 'ringing', 'answered', 'ended', 'missed', 'rejected', 'voicemail', 'failed')
  ),
  duration_seconds INTEGER DEFAULT 0,
  recording_url TEXT,
  recording_duration INTEGER,
  wait_time_seconds INTEGER,
  notes TEXT,
  related_ticket_id TEXT REFERENCES queue_tickets(id) ON DELETE SET NULL,
  initiated_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')),
  ringing_at TEXT,
  answered_at TEXT,
  ended_at TEXT,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'))
);

CREATE INDEX IF NOT EXISTS idx_calls_caller ON voice_calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_calls_recipient ON voice_calls(recipient_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON voice_calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_date ON voice_calls(initiated_at);

-- ============================================================
-- SECTION 8: NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' || 
    lower(hex(randomblob(2))) || '-4' || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    substr('89ab',abs(random()) % 4 + 1, 1) || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    lower(hex(randomblob(6)))
  ),
  facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
  ticket_id TEXT REFERENCES queue_tickets(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (
    notification_type IN (
      'sms', 'whatsapp', 'email', 'push', 
      'in_app', 'voice', 'telegram'
    )
  ),
  recipient TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  template_id TEXT,
  template_variables TEXT,
  status TEXT DEFAULT 'pending' CHECK (
    status IN (
      'pending', 'queued', 'scheduled', 'sent',
      'delivered', 'read', 'failed', 'cancelled'
    )
  ),
  provider TEXT,
  provider_message_id TEXT,
  external_id TEXT,
  provider_response TEXT,
  sent_at TEXT,
  delivered_at TEXT,
  read_at TEXT,
  failure_reason TEXT,
  failure_code TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  scheduled_at TEXT,
  expires_at TEXT,
  cost REAL,
  metadata TEXT,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')),
  updated_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'))
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_patient ON notifications(patient_id);
CREATE INDEX IF NOT EXISTS idx_notif_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notif_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notif_scheduled ON notifications(scheduled_at) WHERE status = 'scheduled';

CREATE TABLE IF NOT EXISTS notification_templates (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' || 
    lower(hex(randomblob(2))) || '-4' || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    substr('89ab',abs(random()) % 4 + 1, 1) || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    lower(hex(randomblob(6)))
  ),
  facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (
    type IN ('sms', 'whatsapp', 'email', 'push', 'in_app')
  ),
  subject TEXT,
  body TEXT NOT NULL,
  variables TEXT,
  category TEXT,
  is_active INTEGER DEFAULT 1,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')),
  updated_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')),
  UNIQUE(facility_id, code)
);

CREATE INDEX IF NOT EXISTS idx_templates_facility ON notification_templates(facility_id);
CREATE INDEX IF NOT EXISTS idx_templates_type ON notification_templates(type);
CREATE INDEX IF NOT EXISTS idx_templates_code ON notification_templates(code);

-- ============================================================
-- SECTION 9: TV DISPLAYS & DIGITAL SIGNAGE
-- ============================================================

CREATE TABLE IF NOT EXISTS tv_displays (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' || 
    lower(hex(randomblob(2))) || '-4' || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    substr('89ab',abs(random()) % 4 + 1, 1) || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    lower(hex(randomblob(6)))
  ),
  facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  room_id TEXT REFERENCES rooms(id) ON DELETE SET NULL,
  department_ids TEXT DEFAULT '[]',
  display_mode TEXT DEFAULT 'single' CHECK (
    display_mode IN ('single', 'multi', 'auto_switch', 'announcement')
  ),
  auto_switch_interval INTEGER DEFAULT 30,
  layout_template TEXT DEFAULT 'standard',
  show_waiting_time INTEGER DEFAULT 1,
  show_doctor_name INTEGER DEFAULT 1,
  show_department INTEGER DEFAULT 1,
  show_ticket_number INTEGER DEFAULT 1,
  show_position INTEGER DEFAULT 1,
  iptv_enabled INTEGER DEFAULT 0,
  iptv_url TEXT,
  iptv_layout TEXT DEFAULT 'split_70_30',
  iptv_channel TEXT,
  pip_position TEXT DEFAULT 'top_right',
  pip_size TEXT DEFAULT 'small',
  audio_enabled INTEGER DEFAULT 1,
  audio_volume INTEGER DEFAULT 70,
  audio_language TEXT DEFAULT 'en',
  branding_enabled INTEGER DEFAULT 1,
  logo_url TEXT,
  tagline TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#1E40AF',
  privacy_mode INTEGER DEFAULT 1,
  show_full_names INTEGER DEFAULT 0,
  auto_refresh INTEGER DEFAULT 1,
  refresh_interval INTEGER DEFAULT 10,
  is_active INTEGER DEFAULT 1,
  current_content TEXT,
  last_content_update TEXT,
  last_seen TEXT,
  ip_address TEXT,
  mac_address TEXT,
  hardware_version TEXT,
  software_version TEXT,
  settings TEXT,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')),
  updated_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'))
);

CREATE INDEX IF NOT EXISTS idx_tv_facility ON tv_displays(facility_id);
CREATE INDEX IF NOT EXISTS idx_tv_active ON tv_displays(is_active);
CREATE INDEX IF NOT EXISTS idx_tv_room ON tv_displays(room_id);

CREATE TABLE IF NOT EXISTS display_content (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' || 
    lower(hex(randomblob(2))) || '-4' || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    substr('89ab',abs(random()) % 4 + 1, 1) || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    lower(hex(randomblob(6)))
  ),
  display_id TEXT NOT NULL REFERENCES tv_displays(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (
    content_type IN ('queue', 'announcement', 'health_tip', 'advertisement', 'emergency')
  ),
  title TEXT,
  message TEXT,
  priority INTEGER DEFAULT 0,
  start_time TEXT,
  end_time TEXT,
  is_active INTEGER DEFAULT 1,
  display_count INTEGER DEFAULT 0,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'))
);

CREATE INDEX IF NOT EXISTS idx_display_content_display ON display_content(display_id);
CREATE INDEX IF NOT EXISTS idx_display_content_type ON display_content(content_type);

-- ============================================================
-- SECTION 10: AUDIT & COMPLIANCE
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' || 
    lower(hex(randomblob(2))) || '-4' || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    substr('89ab',abs(random()) % 4 + 1, 1) || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    lower(hex(randomblob(6)))
  ),
  facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  description TEXT,
  old_values TEXT,
  new_values TEXT,
  changes TEXT,
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  request_id TEXT,
  request_method TEXT,
  request_url TEXT,
  response_status INTEGER,
  execution_time_ms INTEGER,
  phi_accessed INTEGER DEFAULT 0,
  data_classification TEXT DEFAULT 'internal',
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'))
);

CREATE INDEX IF NOT EXISTS idx_audit_facility ON audit_logs(facility_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_phi ON audit_logs(phi_accessed) WHERE phi_accessed = 1;

CREATE TABLE IF NOT EXISTS login_attempts (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' || 
    lower(hex(randomblob(2))) || '-4' || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    substr('89ab',abs(random()) % 4 + 1, 1) || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    lower(hex(randomblob(6)))
  ),
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  phone TEXT,
  ip_address TEXT,
  user_agent TEXT,
  device_info TEXT,
  location TEXT,
  success INTEGER DEFAULT 0,
  failure_reason TEXT,
  failure_code TEXT,
  mfa_used INTEGER DEFAULT 0,
  mfa_method TEXT,
  timestamp TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'))
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_user ON login_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_timestamp ON login_attempts(timestamp);
CREATE INDEX IF NOT EXISTS idx_login_attempts_success ON login_attempts(success) WHERE success = 0;

-- ============================================================
-- SECTION 11: ANALYTICS & REPORTING
-- ============================================================

CREATE TABLE IF NOT EXISTS wait_time_history (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' || 
    lower(hex(randomblob(2))) || '-4' || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    substr('89ab',abs(random()) % 4 + 1, 1) || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    lower(hex(randomblob(6)))
  ),
  facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  department_id TEXT REFERENCES departments(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  hour_of_day INTEGER,
  day_of_week INTEGER,
  period_type TEXT DEFAULT 'hourly' CHECK (
    period_type IN ('hourly', 'daily', 'weekly', 'monthly')
  ),
  avg_wait_seconds INTEGER,
  max_wait_seconds INTEGER,
  min_wait_seconds INTEGER,
  median_wait_seconds INTEGER,
  percentile_90_seconds INTEGER,
  patient_count INTEGER,
  served_count INTEGER,
  abandoned_count INTEGER,
  no_show_count INTEGER,
  avg_service_seconds INTEGER,
  max_service_seconds INTEGER,
  min_service_seconds INTEGER,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'))
);

CREATE INDEX IF NOT EXISTS idx_wait_department ON wait_time_history(department_id);
CREATE INDEX IF NOT EXISTS idx_wait_date ON wait_time_history(date);
CREATE INDEX IF NOT EXISTS idx_wait_hour ON wait_time_history(hour_of_day);
CREATE INDEX IF NOT EXISTS idx_wait_dow ON wait_time_history(day_of_week);

CREATE TABLE IF NOT EXISTS daily_statistics (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' || 
    lower(hex(randomblob(2))) || '-4' || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    substr('89ab',abs(random()) % 4 + 1, 1) || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    lower(hex(randomblob(6)))
  ),
  facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  department_id TEXT REFERENCES departments(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  new_patients INTEGER DEFAULT 0,
  returning_patients INTEGER DEFAULT 0,
  total_visits INTEGER DEFAULT 0,
  appointments_scheduled INTEGER DEFAULT 0,
  appointments_completed INTEGER DEFAULT 0,
  appointments_cancelled INTEGER DEFAULT 0,
  appointments_no_show INTEGER DEFAULT 0,
  walk_ins INTEGER DEFAULT 0,
  tickets_issued INTEGER DEFAULT 0,
  tickets_served INTEGER DEFAULT 0,
  tickets_waiting INTEGER DEFAULT 0,
  avg_wait_time_minutes REAL,
  avg_service_time_minutes REAL,
  peak_wait_time_minutes INTEGER,
  peak_hour TEXT,
  staff_on_duty INTEGER,
  doctor_utilization REAL,
  room_utilization REAL,
  prescriptions_issued INTEGER DEFAULT 0,
  lab_orders_issued INTEGER DEFAULT 0,
  revenue REAL DEFAULT 0,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')),
  UNIQUE(facility_id, department_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_stats_facility ON daily_statistics(facility_id);
CREATE INDEX IF NOT EXISTS idx_daily_stats_dept ON daily_statistics(department_id);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_statistics(date);

-- ============================================================
-- SECTION 12: CONFIGURATION & SETTINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' || 
    lower(hex(randomblob(2))) || '-4' || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    substr('89ab',abs(random()) % 4 + 1, 1) || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    lower(hex(randomblob(6)))
  ),
  facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  type TEXT DEFAULT 'string' CHECK (
    type IN ('string', 'number', 'boolean', 'json', 'array')
  ),
  category TEXT DEFAULT 'general',
  description TEXT,
  is_public INTEGER DEFAULT 0,
  is_encrypted INTEGER DEFAULT 0,
  validation_rules TEXT,
  default_value TEXT,
  min_value REAL,
  max_value REAL,
  options TEXT,
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')),
  UNIQUE(facility_id, key)
);

CREATE INDEX IF NOT EXISTS idx_settings_facility ON settings(facility_id);
CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- ============================================================
-- SECTION 13: BACKUP & MAINTENANCE
-- ============================================================

CREATE TABLE IF NOT EXISTS backups (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' || 
    lower(hex(randomblob(2))) || '-4' || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    substr('89ab',abs(random()) % 4 + 1, 1) || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    lower(hex(randomblob(6)))
  ),
  facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  backup_type TEXT DEFAULT 'full' CHECK (
    backup_type IN ('full', 'incremental', 'differential')
  ),
  filename TEXT NOT NULL,
  file_path TEXT,
  size_bytes INTEGER,
  checksum TEXT,
  status TEXT DEFAULT 'in_progress' CHECK (
    status IN ('in_progress', 'completed', 'failed', 'verified', 'restored')
  ),
  error_message TEXT,
  error_details TEXT,
  started_at TEXT,
  completed_at TEXT,
  verified_at TEXT,
  expires_at TEXT,
  storage_location TEXT,
  storage_provider TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  restored_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  restored_at TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'))
);

CREATE INDEX IF NOT EXISTS idx_backup_facility ON backups(facility_id);
CREATE INDEX IF NOT EXISTS idx_backup_status ON backups(status);
CREATE INDEX IF NOT EXISTS idx_backup_type ON backups(backup_type);
CREATE INDEX IF NOT EXISTS idx_backup_date ON backups(created_at);

-- ============================================================
-- SECTION 14: HMS INTEGRATION
-- ============================================================

CREATE TABLE IF NOT EXISTS hms_sync_logs (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' || 
    lower(hex(randomblob(2))) || '-4' || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    substr('89ab',abs(random()) % 4 + 1, 1) || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    lower(hex(randomblob(6)))
  ),
  facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (
    sync_type IN (
      'patient', 'appointment', 'prescription', 
      'lab_order', 'medical_record', 'doctor'
    )
  ),
  direction TEXT NOT NULL CHECK (direction IN ('import', 'export', 'bidirectional')),
  local_id TEXT,
  hms_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (
    status IN ('pending', 'syncing', 'completed', 'failed', 'conflict')
  ),
  operation TEXT CHECK (operation IN ('create', 'update', 'delete', 'fetch')),
  request_payload TEXT,
  response_payload TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TEXT,
  hms_response_code INTEGER,
  hms_response_message TEXT,
  synced_at TEXT,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')),
  updated_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'))
);

CREATE INDEX IF NOT EXISTS idx_hms_sync_facility ON hms_sync_logs(facility_id);
CREATE INDEX IF NOT EXISTS idx_hms_sync_type ON hms_sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_hms_sync_status ON hms_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_hms_sync_local ON hms_sync_logs(local_id);
CREATE INDEX IF NOT EXISTS idx_hms_sync_hms ON hms_sync_logs(hms_id);
CREATE INDEX IF NOT EXISTS idx_hms_sync_created ON hms_sync_logs(created_at);

CREATE TABLE IF NOT EXISTS hms_config (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' || 
    lower(hex(randomblob(2))) || '-4' || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    substr('89ab',abs(random()) % 4 + 1, 1) || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    lower(hex(randomblob(6)))
  ),
  facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  hms_type TEXT NOT NULL CHECK (
    hms_type IN ('openmrs', 'bahmni', 'openelis', 'dhis2', 'custom')
  ),
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  api_version TEXT,
  username TEXT,
  password_encrypted TEXT,
  api_key_encrypted TEXT,
  oauth_client_id TEXT,
  oauth_client_secret_encrypted TEXT,
  oauth_token TEXT,
  token_expires_at TEXT,
  sync_enabled INTEGER DEFAULT 1,
  sync_interval_minutes INTEGER DEFAULT 60,
  sync_tables TEXT,
  auto_sync_patients INTEGER DEFAULT 1,
  auto_sync_appointments INTEGER DEFAULT 1,
  auto_sync_results INTEGER DEFAULT 1,
  last_sync_at TEXT,
  last_sync_status TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')),
  updated_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'))
);

CREATE INDEX IF NOT EXISTS idx_hms_config_facility ON hms_config(facility_id);
CREATE INDEX IF NOT EXISTS idx_hms_config_active ON hms_config(is_active);

-- ============================================================
-- SECTION 15: WAITLIST MANAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS waitlist (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' || 
    lower(hex(randomblob(2))) || '-4' || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    substr('89ab',abs(random()) % 4 + 1, 1) || 
    substr(lower(hex(randomblob(2))),2) || '-' || 
    lower(hex(randomblob(6)))
  ),
  facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  doctor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  preferred_date TEXT,
  preferred_time TEXT,
  preferred_days TEXT,
  priority INTEGER DEFAULT 3,
  reason TEXT,
  notes TEXT,
  status TEXT DEFAULT 'waiting' CHECK (
    status IN ('waiting', 'notified', 'booked', 'expired', 'cancelled')
  ),
  notified_at TEXT,
  notification_count INTEGER DEFAULT 0,
  booked_appointment_id TEXT REFERENCES appointments(id) ON DELETE SET NULL,
  expires_at TEXT,
  cancelled_at TEXT,
  cancelled_reason TEXT,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')),
  updated_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'))
);

CREATE INDEX IF NOT EXISTS idx_waitlist_facility ON waitlist(facility_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_patient ON waitlist(patient_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_department ON waitlist(department_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_priority ON waitlist(priority);
CREATE INDEX IF NOT EXISTS idx_waitlist_date ON waitlist(preferred_date);

-- ============================================================
-- END OF MIGRATION
-- ============================================================
