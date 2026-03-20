-- Hospital Queue System - PostgreSQL Schema
-- Single migration file for all core tables
-- Version: 1.0.0

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Departments (must be first due to foreign keys)
CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    floor TEXT,
    building TEXT,
    phone TEXT,
    email TEXT,
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT NOW(),
    updated_at TEXT DEFAULT NOW()
);

-- Users table (staff, admins, etc.)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_tech')),
    department_id TEXT,
    is_active INTEGER DEFAULT 1,
    last_login TEXT,
    created_at TEXT DEFAULT NOW(),
    updated_at TEXT DEFAULT NOW(),
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    national_id TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
    phone TEXT,
    email TEXT,
    address TEXT,
    emergency_contact TEXT,
    emergency_phone TEXT,
    blood_type TEXT,
    allergies TEXT,
    notes TEXT,
    created_at TEXT DEFAULT NOW(),
    updated_at TEXT DEFAULT NOW()
);

-- Doctors table
CREATE TABLE IF NOT EXISTS doctors (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    department_id TEXT NOT NULL,
    license_number TEXT UNIQUE NOT NULL,
    qualification TEXT,
    experience_years INTEGER,
    consultation_duration INTEGER DEFAULT 15,
    max_daily_patients INTEGER DEFAULT 20,
    room_id TEXT,
    is_available INTEGER DEFAULT 1,
    consultation_fee REAL,
    created_at TEXT DEFAULT NOW(),
    updated_at TEXT DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

-- Queue table
CREATE TABLE IF NOT EXISTS queue (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    patient_id TEXT NOT NULL,
    doctor_id TEXT NOT NULL,
    department_id TEXT NOT NULL,
    queue_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'called', 'in_progress', 'completed', 'cancelled', 'no_show')),
    priority INTEGER DEFAULT 0 CHECK (priority >= 0 AND priority <= 10),
    complaint TEXT,
    notes TEXT,
    called_at TEXT,
    started_at TEXT,
    completed_at TEXT,
    estimated_wait_time INTEGER,
    called_by TEXT,
    created_at TEXT DEFAULT NOW(),
    updated_at TEXT DEFAULT NOW(),
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    FOREIGN KEY (called_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    patient_id TEXT NOT NULL,
    doctor_id TEXT NOT NULL,
    department_id TEXT NOT NULL,
    appointment_date TEXT NOT NULL,
    appointment_time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
    type TEXT DEFAULT 'consultation' CHECK (type IN ('consultation', 'follow_up', 'procedure', 'emergency')),
    reason TEXT,
    notes TEXT,
    created_at TEXT DEFAULT NOW(),
    updated_at TEXT DEFAULT NOW(),
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

-- =====================================================
-- MEDICAL & CLINICAL TABLES
-- =====================================================

-- Medical records table
CREATE TABLE IF NOT EXISTS medical_records (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    patient_id TEXT NOT NULL,
    doctor_id TEXT NOT NULL,
    queue_id TEXT,
    appointment_id TEXT,
    record_type TEXT NOT NULL CHECK (record_type IN ('consultation', 'diagnosis', 'prescription', 'lab_order', 'procedure', 'note')),
    diagnosis TEXT,
    treatment TEXT,
    prescription TEXT,
    notes TEXT,
    attachments TEXT,
    created_at TEXT DEFAULT NOW(),
    updated_at TEXT DEFAULT NOW(),
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (queue_id) REFERENCES queue(id) ON DELETE SET NULL,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
);

-- Clinical notes (SOAP format)
CREATE TABLE IF NOT EXISTS clinical_notes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    patient_id TEXT REFERENCES patients(id),
    doctor_id TEXT REFERENCES doctors(id),
    doctor_name TEXT,
    queue_entry_id TEXT,
    subjective TEXT DEFAULT '',
    objective TEXT DEFAULT '',
    assessment TEXT DEFAULT '',
    plan TEXT DEFAULT '',
    vitals JSONB DEFAULT '{}',
    version INTEGER DEFAULT 1,
    source VARCHAR(20) DEFAULT 'typed',
    status VARCHAR(20) DEFAULT 'draft',
    created_at TEXT DEFAULT NOW(),
    updated_at TEXT DEFAULT NOW()
);

-- Prescriptions table
CREATE TABLE IF NOT EXISTS prescriptions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    patient_id TEXT NOT NULL,
    doctor_id TEXT NOT NULL,
    medication TEXT NOT NULL,
    dosage TEXT,
    frequency TEXT,
    duration TEXT,
    instructions TEXT,
    note_id TEXT,
    created_at TEXT DEFAULT NOW(),
    updated_at TEXT DEFAULT NOW(),
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (note_id) REFERENCES clinical_notes(id) ON DELETE SET NULL
);

-- =====================================================
-- FACILITY & ROOM MANAGEMENT
-- =====================================================

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    room_number TEXT UNIQUE NOT NULL,
    name TEXT,
    room_type TEXT DEFAULT 'consultation' CHECK (room_type IN ('consultation', 'procedure', 'waiting', 'emergency')),
    department_id TEXT REFERENCES departments(id),
    floor TEXT,
    building TEXT,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'reserved')),
    capacity INTEGER DEFAULT 1,
    equipment TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT NOW(),
    updated_at TEXT DEFAULT NOW()
);

-- Room schedules
CREATE TABLE IF NOT EXISTS room_schedules (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    room_id TEXT NOT NULL,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TEXT,
    end_time TEXT,
    is_available INTEGER DEFAULT 1,
    created_at TEXT DEFAULT NOW(),
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- Room assignments
CREATE TABLE IF NOT EXISTS room_assignments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    room_id TEXT NOT NULL,
    doctor_id TEXT,
    date TEXT,
    start_time TEXT,
    end_time TEXT,
    purpose TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT NOW(),
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL
);

-- =====================================================
-- COMMUNICATION TABLES
-- =====================================================

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    sender_id TEXT NOT NULL,
    sender_type TEXT DEFAULT 'user' CHECK (sender_type IN ('user', 'patient', 'system')),
    recipient_id TEXT NOT NULL,
    recipient_type TEXT DEFAULT 'user' CHECK (recipient_type IN ('user', 'patient', 'system')),
    message TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'alert', 'system', 'reminder')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    is_read INTEGER DEFAULT 0,
    read_at TEXT,
    created_at TEXT NOT NULL DEFAULT NOW()
);

-- Voice calls table
CREATE TABLE IF NOT EXISTS voice_calls (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    caller_id TEXT NOT NULL,
    caller_name TEXT,
    recipient_id TEXT NOT NULL,
    recipient_name TEXT,
    call_type TEXT DEFAULT 'staff' CHECK (call_type IN ('staff', 'patient', 'emergency')),
    status TEXT DEFAULT 'initiated' CHECK (status IN ('initiated', 'ringing', 'answered', 'ended', 'missed', 'rejected')),
    duration INTEGER DEFAULT 0,
    initiated_at TEXT DEFAULT NOW(),
    answered_at TEXT,
    ended_at TEXT
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT,
    patient_id TEXT,
    type TEXT NOT NULL CHECK (type IN ('sms', 'whatsapp', 'email', 'push', 'in_app')),
    channel TEXT NOT NULL,
    recipient TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'sent', 'delivered', 'failed')),
    sent_at TEXT,
    delivered_at TEXT,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TEXT DEFAULT NOW(),
    updated_at TEXT DEFAULT NOW()
);

-- =====================================================
-- ANALYTICS & HISTORY TABLES
-- =====================================================

-- Wait time history (for predictions)
CREATE TABLE IF NOT EXISTS wait_time_history (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    department_id TEXT NOT NULL,
    day_of_week INTEGER,
    hour_of_day INTEGER,
    avg_wait_time REAL,
    avg_service_time REAL,
    patient_count INTEGER,
    recorded_date TEXT,
    created_at TEXT DEFAULT NOW(),
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

-- =====================================================
-- AUDIT & COMPLIANCE TABLES
-- =====================================================

-- Audit logs (HIPAA compliant)
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    table_name TEXT,
    record_id TEXT,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'login', 'logout', 'create', 'read', 'update', 'delete')),
    old_data TEXT,
    new_data TEXT,
    user_id TEXT,
    user_role TEXT,
    user_name TEXT,
    ip_address TEXT,
    user_agent TEXT,
    phi_accessed INTEGER DEFAULT 0,
    session_id TEXT,
    timestamp TEXT DEFAULT NOW(),
    created_at TEXT DEFAULT NOW()
);

-- Login attempts tracking
CREATE TABLE IF NOT EXISTS login_attempts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT,
    email TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    success INTEGER DEFAULT 0,
    failure_reason TEXT,
    timestamp TEXT DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- SETTINGS & CONFIGURATION
-- =====================================================

-- System settings
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    description TEXT,
    category TEXT DEFAULT 'general',
    is_encrypted INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Patients indexes
CREATE INDEX IF NOT EXISTS idx_patients_national_id ON patients(national_id);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(last_name, first_name);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);

-- Doctors indexes
CREATE INDEX IF NOT EXISTS idx_doctors_department ON doctors(department_id);
CREATE INDEX IF NOT EXISTS idx_doctors_user ON doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors(specialty);

-- Queue indexes
CREATE INDEX IF NOT EXISTS idx_queue_patient ON queue(patient_id);
CREATE INDEX IF NOT EXISTS idx_queue_doctor ON queue(doctor_id);
CREATE INDEX IF NOT EXISTS idx_queue_department ON queue(department_id);
CREATE INDEX IF NOT EXISTS idx_queue_status ON queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_created ON queue(created_at);
CREATE INDEX IF NOT EXISTS idx_queue_status_dept ON queue(status, department_id);

-- Appointments indexes
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_doc_date ON appointments(doctor_id, appointment_date);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(recipient_id, is_read) WHERE is_read = 0;

-- Clinical notes indexes
CREATE INDEX IF NOT EXISTS idx_clinical_notes_patient ON clinical_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_doctor ON clinical_notes(doctor_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_created ON clinical_notes(created_at);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Wait time history indexes
CREATE INDEX IF NOT EXISTS idx_wait_time_dept ON wait_time_history(department_id);
CREATE INDEX IF NOT EXISTS idx_wait_time_dow ON wait_time_history(day_of_week);
CREATE INDEX IF NOT EXISTS idx_wait_time_hour ON wait_time_history(hour_of_day);

-- Rooms indexes
CREATE INDEX IF NOT EXISTS idx_rooms_department ON rooms(department_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_number ON rooms(room_number);
