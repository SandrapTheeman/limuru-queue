-- Hospital Queue System - Critical Performance Indexes Migration
-- Version: 0004
-- Purpose: Sub-100ms query optimization for queue operations
-- Priority: Critical for production performance

-- =====================================================
-- QUEUE_TICKETS CRITICAL INDEXES
-- =====================================================

-- Composite index for getQueue() - covers status filter + department + priority ordering
CREATE INDEX IF NOT EXISTS idx_queue_tickets_status_dept_priority
ON queue_tickets(facility_id, status, department_id, priority_score DESC, created_at ASC)
WHERE status IN ('waiting', 'called', 'serving');

-- Index for callNextPatient() - find next waiting ticket by priority
CREATE INDEX IF NOT EXISTS idx_queue_tickets_next_patient
ON queue_tickets(facility_id, status, priority_score DESC, created_at ASC)
WHERE status = 'waiting';

-- Index for getPatientPosition() - count patients ahead in queue
CREATE INDEX IF NOT EXISTS idx_queue_tickets_patients_ahead
ON queue_tickets(facility_id, department_id, status, priority_score DESC)
WHERE status = 'waiting';

-- Index for sequence number generation (ticket number)
CREATE INDEX IF NOT EXISTS idx_queue_tickets_sequence
ON queue_tickets(facility_id, department_id, DATE(created_at), sequence_number DESC);

-- Index for getStats() - today's stats aggregation
CREATE INDEX IF NOT EXISTS idx_queue_tickets_daily_stats
ON queue_tickets(facility_id, DATE(created_at), status);

-- =====================================================
-- VISITS TABLE INDEXES (mapped to queue_tickets table)
-- =====================================================
-- Note: The "visits" service uses queue_tickets table
-- Creating equivalent indexes for compatibility

-- Composite index for getQueue() - queue_tickets equivalent
CREATE INDEX IF NOT EXISTS idx_visits_queue_status
ON queue_tickets(department_id, status, priority DESC, created_at ASC)
WHERE status = 'waiting';

-- Index for getPatientPosition()
CREATE INDEX IF NOT EXISTS idx_visits_queue_position
ON queue_tickets(department_id, status, priority, created_at ASC)
WHERE status = 'waiting';

-- Index for patient history queries
CREATE INDEX IF NOT EXISTS idx_visits_patient_created
ON queue_tickets(patient_id, created_at DESC);

-- Index for daily statistics
CREATE INDEX IF NOT EXISTS idx_visits_daily_stats
ON queue_tickets(department_id, status, DATE(created_at));

-- =====================================================
-- PATIENTS TABLE INDEXES
-- =====================================================

-- Composite index for patient search (name, phone, email, national_id)
CREATE INDEX IF NOT EXISTS idx_patients_search
ON patients(phone, national_id);

-- Index for quick-register by phone lookup
CREATE INDEX IF NOT EXISTS idx_patients_phone_lookup
ON patients(phone)
WHERE phone IS NOT NULL;

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_patients_email_lookup
ON patients(email)
WHERE email IS NOT NULL;

-- =====================================================
-- CLINICAL NOTES INDEXES
-- =====================================================

-- Composite index for clinical notes search
CREATE INDEX IF NOT EXISTS idx_clinical_notes_search
ON clinical_notes(patient_id, created_at DESC);

-- Index for doctor notes lookup
CREATE INDEX IF NOT EXISTS idx_clinical_notes_doctor
ON clinical_notes(doctor_id, created_at DESC);

-- Index for visit notes lookup
CREATE INDEX IF NOT EXISTS idx_clinical_notes_visit
ON clinical_notes(ticket_id);

-- =====================================================
-- DEPARTMENTS INDEXES
-- =====================================================

-- Index for facility-based department lookup
CREATE INDEX IF NOT EXISTS idx_departments_active
ON departments(facility_id, is_active, display_order);

-- =====================================================
-- AUDIT LOGS INDEXES (for compliance queries)
-- =====================================================

-- Index for recent audit queries (last 30 days)
CREATE INDEX IF NOT EXISTS idx_audit_logs_recent
ON audit_logs(user_id, created_at DESC)
WHERE created_at > datetime('now', '-30 days');

-- Index for PHI access auditing
CREATE INDEX IF NOT EXISTS idx_audit_logs_phi
ON audit_logs(phi_accessed, created_at DESC)
WHERE phi_accessed = 1;

-- =====================================================
-- ANALYTICS EVENTS INDEXES
-- =====================================================

-- Index for slow query detection
CREATE INDEX IF NOT EXISTS idx_analytics_slow_queries
ON analytics_events(endpoint, response_time_ms DESC, created_at DESC)
WHERE response_time_ms > 100;


