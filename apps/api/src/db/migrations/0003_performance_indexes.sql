-- Hospital Queue System - Performance Indexes Migration
-- Version: 0003
-- Purpose: Add performance indexes for slow query optimization

-- =====================================================
-- ADDITIONAL SINGLE COLUMN INDEXES
-- =====================================================

-- Patients indexes (already have national_id, phone, name - add email)
CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);

-- Users indexes (already have email - add more for common lookups)
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_department_role ON users(department_id, role);

-- Queue indexes (already have patient, doctor, department, status, created)
-- Add composite index for common queries
CREATE INDEX IF NOT EXISTS idx_queue_status_priority ON queue(status, priority DESC, created_at ASC);

-- Appointments indexes (already have patient, doctor, date, status)
-- Add composite for doctor schedule lookup
CREATE INDEX IF NOT EXISTS idx_appointments_doc_date_status ON appointments(doctor_id, appointment_date, status);

-- Messages indexes (already have recipient, sender, created)
-- Add index for unread messages query
CREATE INDEX IF NOT EXISTS idx_messages_unread_lookup ON messages(recipient_id, is_read, created_at DESC);

-- Voice calls indexes
CREATE INDEX IF NOT EXISTS idx_voice_calls_caller ON voice_calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_voice_calls_recipient ON voice_calls(recipient_id);
CREATE INDEX IF NOT EXISTS idx_voice_calls_status ON voice_calls(status);
CREATE INDEX IF NOT EXISTS idx_voice_calls_initiated ON voice_calls(initiated_at);

-- Clinical notes indexes
CREATE INDEX IF NOT EXISTS idx_clinical_notes_patient_created ON clinical_notes(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_doctor_created ON clinical_notes(doctor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_status ON clinical_notes(status);

-- Prescriptions indexes
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_note ON prescriptions(note_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_created ON prescriptions(created_at);

-- Audit logs indexes (already have user, timestamp, action)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs(user_id, created_at);

-- Wait time history indexes (already have dept, day_of_week, hour_of_day)
CREATE INDEX IF NOT EXISTS idx_wait_time_history_lookup ON wait_time_history(day_of_week, hour_of_day, department_id);

-- Settings indexes
CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);

-- =====================================================
-- ANALYTICS TABLES (if not exist)
-- =====================================================

CREATE TABLE IF NOT EXISTS analytics_events (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    event_type TEXT NOT NULL,
    user_id TEXT,
    endpoint TEXT,
    method TEXT,
    status_code INTEGER,
    response_time_ms INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TEXT DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_endpoint ON analytics_events(endpoint);

-- =====================================================
-- CACHE TABLES (for counts and summaries)
-- =====================================================

CREATE TABLE IF NOT EXISTS cache_metadata (
    key TEXT PRIMARY KEY,
    value JSONB,
    expires_at TEXT,
    updated_at TEXT DEFAULT NOW()
);

-- =====================================================
-- ANALYZE TABLES (update statistics)
-- =====================================================

ANALYZE patients;
ANALYZE users;
ANALYZE queue;
ANALYZE appointments;
ANALYZE messages;
ANALYZE voice_calls;
ANALYZE clinical_notes;
ANALYZE prescriptions;
ANALYZE audit_logs;
ANALYZE wait_time_history;