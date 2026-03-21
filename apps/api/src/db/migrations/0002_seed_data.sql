-- Hospital Queue System - Seed Data (SQLite/D1 compatible)
-- Corrected to match the actual schema in 0001_initial_schema.sql

-- =====================================================
-- FACILITY (required - all tables reference it)
-- =====================================================

INSERT OR IGNORE INTO facilities (id, name, code, address, city, county, country, phone, email, timezone, currency, license_number, tagline, description, operating_hours_start, operating_hours_end, operating_days, emergency_services, ambulance_services, pharmacy_services, laboratory_services, radiology_services, is_active, created_at, updated_at)
VALUES (
    lower(hex(randomblob(16))),
    'Limuru Cottage Hospital',
    'LCH',
    'Limuru Town, Kiambu County',
    'Limuru',
    'Kiambu',
    'Kenya',
    '+254-20-1234567',
    'info@limuruhospital.co.ke',
    'Africa/Nairobi',
    'KES',
    'MOH/LCH/2024/001',
    'Quality Healthcare, Close to Home',
    'A community hospital serving Limuru and surrounding areas with comprehensive medical services',
    '07:00',
    '20:00',
    '1,2,3,4,5,6',
    1, 1, 1, 1, 1,
    1,
    STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'),
    STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
);

-- =====================================================
-- DEPARTMENTS
-- =====================================================

INSERT OR IGNORE INTO departments (id, facility_id, name, code, description, color, icon, average_service_time, max_daily_patients, consultation_fee, followup_fee, is_emergency, requires_appointment, allows_walkins, display_order, floor, contact_phone, contact_email, is_active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), id, 'General Medicine', 'MED', 'General medical consultations and treatment', '#3B82F6', 'stethoscope', 15, 100, 500.00, 200.00, 0, 1, 1, 1, 1, '+254-20-1234567', 'med@limuruhospital.co.ke', 1, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'), STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities WHERE code = 'LCH';

INSERT OR IGNORE INTO departments (id, facility_id, name, code, description, color, icon, average_service_time, max_daily_patients, consultation_fee, followup_fee, is_emergency, requires_appointment, allows_walkins, display_order, floor, contact_phone, contact_email, is_active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), id, 'Pediatrics', 'PED', 'Child healthcare services from newborns to adolescents', '#8B5CF6', 'baby', 20, 60, 400.00, 150.00, 0, 1, 1, 2, 2, '+254-20-1234568', 'ped@limuruhospital.co.ke', 1, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'), STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities WHERE code = 'LCH';

INSERT OR IGNORE INTO departments (id, facility_id, name, code, description, color, icon, average_service_time, max_daily_patients, consultation_fee, followup_fee, is_emergency, requires_appointment, allows_walkins, display_order, floor, contact_phone, contact_email, is_active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), id, 'Gynecology', 'GYN', 'Women health and maternity services', '#EC4899', 'heart', 25, 50, 600.00, 250.00, 0, 1, 1, 3, 2, '+254-20-1234569', 'gyn@limuruhospital.co.ke', 1, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'), STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities WHERE code = 'LCH';

INSERT OR IGNORE INTO departments (id, facility_id, name, code, description, color, icon, average_service_time, max_daily_patients, consultation_fee, followup_fee, is_emergency, requires_appointment, allows_walkins, display_order, floor, contact_phone, contact_email, is_active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), id, 'Orthopedics', 'ORTH', 'Bone and joint care', '#F59E0B', 'bone', 30, 40, 700.00, 300.00, 0, 1, 1, 4, 3, '+254-20-1234570', 'ortho@limuruhospital.co.ke', 1, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'), STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities WHERE code = 'LCH';

INSERT OR IGNORE INTO departments (id, facility_id, name, code, description, color, icon, average_service_time, max_daily_patients, consultation_fee, followup_fee, is_emergency, requires_appointment, allows_walkins, display_order, floor, contact_phone, contact_email, is_active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), id, 'Dental', 'DEN', 'Dental care and oral health', '#10B981', 'tooth', 20, 50, 400.00, 150.00, 0, 1, 1, 5, 1, '+254-20-1234571', 'den@limuruhospital.co.ke', 1, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'), STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities WHERE code = 'LCH';

INSERT OR IGNORE INTO departments (id, facility_id, name, code, description, color, icon, average_service_time, max_daily_patients, consultation_fee, followup_fee, is_emergency, requires_appointment, allows_walkins, display_order, floor, contact_phone, contact_email, is_active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), id, 'Ophthalmology', 'OPH', 'Eye care and vision services', '#06B6D4', 'eye', 20, 40, 500.00, 200.00, 0, 1, 1, 6, 3, '+254-20-1234572', 'oph@limuruhospital.co.ke', 1, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'), STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities WHERE code = 'LCH';

INSERT OR IGNORE INTO departments (id, facility_id, name, code, description, color, icon, average_service_time, max_daily_patients, consultation_fee, followup_fee, is_emergency, requires_appointment, allows_walkins, display_order, floor, contact_phone, contact_email, is_active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), id, 'Cardiology', 'CARD', 'Heart and cardiovascular care', '#EF4444', 'heart-pulse', 30, 30, 800.00, 400.00, 0, 1, 1, 7, 4, '+254-20-1234573', 'card@limuruhospital.co.ke', 1, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'), STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities WHERE code = 'LCH';

INSERT OR IGNORE INTO departments (id, facility_id, name, code, description, color, icon, average_service_time, max_daily_patients, consultation_fee, followup_fee, is_emergency, requires_appointment, allows_walkins, display_order, floor, contact_phone, contact_email, is_active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), id, 'Emergency', 'EMER', 'Emergency and urgent care services', '#DC2626', 'alert', 0, 200, 1000.00, 0.00, 1, 0, 1, 0, 0, '+254-20-1234574', 'emer@limuruhospital.co.ke', 1, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'), STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities WHERE code = 'LCH';

-- =====================================================
-- USERS (Staff)
-- Default password: #Limuru_Cottage_Hospital@2026
-- bcrypt hash: $2a$12$aMQtgKLdQfLunC1ZjFHxGOREU.GSI0sq5tcQHRPRb.X.gDbe0X3wO
-- =====================================================

INSERT OR IGNORE INTO users (id, facility_id, role, email, phone, password_hash, first_name, last_name, department_id, title, qualifications, specialization, languages, is_active, requires_password_change, created_at, updated_at)
SELECT lower(hex(randomblob(16))), f.id, 'super_admin', 'superadmin@limuruhospital.co.ke', '+254700000001', '$2a$12$aMQtgKLdQfLunC1ZjFHxGOREU.GSI0sq5tcQHRPRb.X.gDbe0X3wO', 'James', 'Wanjiku', d.id, 'Dr.', 'MBChB, MMed', 'Internal Medicine', '["English", "Swahili"]', 1, 1, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'), STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities f, departments d WHERE f.code = 'LCH' AND d.code = 'MED';

INSERT OR IGNORE INTO users (id, facility_id, role, email, phone, password_hash, first_name, last_name, department_id, title, is_active, requires_password_change, created_at, updated_at)
SELECT lower(hex(randomblob(16))), f.id, 'admin', 'admin@limuruhospital.co.ke', '+254700000002', '$2a$12$aMQtgKLdQfLunC1ZjFHxGOREU.GSI0sq5tcQHRPRb.X.gDbe0X3wO', 'Grace', 'Njoroge', d.id, 'Mrs.', 1, 1, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'), STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities f, departments d WHERE f.code = 'LCH' AND d.code = 'MED';

INSERT OR IGNORE INTO users (id, facility_id, role, email, phone, password_hash, first_name, last_name, department_id, title, qualifications, specialization, is_active, requires_password_change, created_at, updated_at)
SELECT lower(hex(randomblob(16))), f.id, 'doctor', 'dr.odhiambo@limuruhospital.co.ke', '+254700000003', '$2a$12$aMQtgKLdQfLunC1ZjFHxGOREU.GSI0sq5tcQHRPRb.X.gDbe0X3wO', 'Peter', 'Odhiambo', d.id, 'Dr.', 'MBChB', 'General Medicine', 1, 1, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'), STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities f, departments d WHERE f.code = 'LCH' AND d.code = 'MED';

INSERT OR IGNORE INTO users (id, facility_id, role, email, phone, password_hash, first_name, last_name, department_id, title, qualifications, specialization, is_active, requires_password_change, created_at, updated_at)
SELECT lower(hex(randomblob(16))), f.id, 'doctor', 'dr.wanjiku@limuruhospital.co.ke', '+254700000004', '$2a$12$aMQtgKLdQfLunC1ZjFHxGOREU.GSI0sq5tcQHRPRb.X.gDbe0X3wO', 'Sarah', 'Wanjiku', d.id, 'Dr.', 'MBChB, MMed Ped', 'Pediatrics', 1, 1, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'), STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities f, departments d WHERE f.code = 'LCH' AND d.code = 'PED';

INSERT OR IGNORE INTO users (id, facility_id, role, email, phone, password_hash, first_name, last_name, department_id, title, is_active, requires_password_change, created_at, updated_at)
SELECT lower(hex(randomblob(16))), f.id, 'nurse', 'nurse.kariuki@limuruhospital.co.ke', '+254700000005', '$2a$12$aMQtgKLdQfLunC1ZjFHxGOREU.GSI0sq5tcQHRPRb.X.gDbe0X3wO', 'Mary', 'Kariuki', d.id, 'Sr.', 1, 1, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'), STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities f, departments d WHERE f.code = 'LCH' AND d.code = 'MED';

INSERT OR IGNORE INTO users (id, facility_id, role, email, phone, password_hash, first_name, last_name, department_id, is_active, requires_password_change, created_at, updated_at)
SELECT lower(hex(randomblob(16))), f.id, 'receptionist', 'reception1@limuruhospital.co.ke', '+254700000006', '$2a$12$aMQtgKLdQfLunC1ZjFHxGOREU.GSI0sq5tcQHRPRb.X.gDbe0X3wO', 'Faith', 'Muthoni', d.id, 1, 1, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'), STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities f, departments d WHERE f.code = 'LCH' AND d.code = 'MED';

INSERT OR IGNORE INTO users (id, facility_id, role, email, phone, password_hash, first_name, last_name, department_id, is_active, requires_password_change, created_at, updated_at)
SELECT lower(hex(randomblob(16))), f.id, 'pharmacist', 'pharmacist@limuruhospital.co.ke', '+254700000007', '$2a$12$aMQtgKLdQfLunC1ZjFHxGOREU.GSI0sq5tcQHRPRb.X.gDbe0X3wO', 'Joseph', 'Kamau', d.id, 1, 1, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'), STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities f, departments d WHERE f.code = 'LCH' AND d.code = 'MED';

INSERT OR IGNORE INTO users (id, facility_id, role, email, phone, password_hash, first_name, last_name, department_id, is_active, requires_password_change, created_at, updated_at)
SELECT lower(hex(randomblob(16))), f.id, 'lab_tech', 'labtech@limuruhospital.co.ke', '+254700000008', '$2a$12$aMQtgKLdQfLunC1ZjFHxGOREU.GSI0sq5tcQHRPRb.X.gDbe0X3wO', 'Catherine', 'Wambui', d.id, 1, 1, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'), STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities f, departments d WHERE f.code = 'LCH' AND d.code = 'MED';

INSERT OR IGNORE INTO users (id, facility_id, role, email, phone, password_hash, first_name, last_name, department_id, is_active, requires_password_change, created_at, updated_at)
SELECT lower(hex(randomblob(16))), f.id, 'facility_manager', 'facility@limuruhospital.co.ke', '+254700000009', '$2a$12$aMQtgKLdQfLunC1ZjFHxGOREU.GSI0sq5tcQHRPRb.X.gDbe0X3wO', 'David', 'Maina', d.id, 1, 1, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'), STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities f, departments d WHERE f.code = 'LCH' AND d.code = 'MED';

INSERT OR IGNORE INTO users (id, facility_id, role, email, phone, password_hash, first_name, last_name, department_id, is_active, requires_password_change, created_at, updated_at)
SELECT lower(hex(randomblob(16))), f.id, 'it_support', 'itsupport@limuruhospital.co.ke', '+254700000010', '$2a$12$aMQtgKLdQfLunC1ZjFHxGOREU.GSI0sq5tcQHRPRb.X.gDbe0X3wO', 'Thomas', 'Kinyanjui', d.id, 1, 1, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'), STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities f, departments d WHERE f.code = 'LCH' AND d.code = 'MED';

-- =====================================================
-- ROOMS
-- =====================================================

INSERT OR IGNORE INTO rooms (id, facility_id, department_id, room_number, room_name, room_type, floor, building, wing, capacity, status, is_active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), f.id, d.id, 'R101', 'Consultation Room 1', 'consultation', 1, 'Main Building', 'West Wing', 1, 'available', 1, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'), STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities f, departments d WHERE f.code = 'LCH' AND d.code = 'MED';

INSERT OR IGNORE INTO rooms (id, facility_id, department_id, room_number, room_name, room_type, floor, building, wing, capacity, status, is_active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), f.id, d.id, 'R102', 'Consultation Room 2', 'consultation', 1, 'Main Building', 'East Wing', 1, 'available', 1, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'), STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities f, departments d WHERE f.code = 'LCH' AND d.code = 'MED';

INSERT OR IGNORE INTO rooms (id, facility_id, department_id, room_number, room_name, room_type, floor, building, wing, capacity, status, is_active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), f.id, d.id, 'R103', 'Consultation Room 3', 'consultation', 1, 'Main Building', 'East Wing', 1, 'available', 1, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'), STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities f, departments d WHERE f.code = 'LCH' AND d.code = 'MED';

INSERT OR IGNORE INTO rooms (id, facility_id, department_id, room_number, room_name, room_type, floor, building, wing, capacity, status, is_active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), f.id, d.id, 'PED1', 'Pediatric Room 1', 'consultation', 2, 'Main Building', 'Children Wing', 1, 'available', 1, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'), STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities f, departments d WHERE f.code = 'LCH' AND d.code = 'PED';

INSERT OR IGNORE INTO rooms (id, facility_id, department_id, room_number, room_name, room_type, floor, building, wing, capacity, status, is_active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), f.id, d.id, 'GYN1', 'Gynecology Room 1', 'consultation', 2, 'Women Wing', 'Women Wing', 1, 'available', 1, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'), STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities f, departments d WHERE f.code = 'LCH' AND d.code = 'GYN';

-- =====================================================
-- SETTINGS (System Configuration)
-- =====================================================

INSERT OR IGNORE INTO settings (id, facility_id, key, value, type, category, description, is_public, is_encrypted, updated_at)
SELECT lower(hex(randomblob(16))), f.id, 'clinic_name', 'Limuru Cottage Hospital', 'string', 'general', 'Hospital/clinic name', 1, 0, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities f WHERE f.code = 'LCH';

INSERT OR IGNORE INTO settings (id, facility_id, key, value, type, category, description, is_public, is_encrypted, updated_at)
SELECT lower(hex(randomblob(16))), f.id, 'clinic_phone', '+254-20-1234567', 'string', 'general', 'Main contact phone', 1, 0, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities f WHERE f.code = 'LCH';

INSERT OR IGNORE INTO settings (id, facility_id, key, value, type, category, description, is_public, is_encrypted, updated_at)
SELECT lower(hex(randomblob(16))), f.id, 'clinic_email', 'info@limuruhospital.co.ke', 'string', 'general', 'Main contact email', 1, 0, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities f WHERE f.code = 'LCH';

INSERT OR IGNORE INTO settings (id, facility_id, key, value, type, category, description, is_public, is_encrypted, updated_at)
SELECT lower(hex(randomblob(16))), f.id, 'clinic_address', 'Limuru Town, Kiambu County, Kenya', 'string', 'general', 'Physical address', 1, 0, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities f WHERE f.code = 'LCH';

INSERT OR IGNORE INTO settings (id, facility_id, key, value, type, category, description, is_public, is_encrypted, updated_at)
SELECT lower(hex(randomblob(16))), f.id, 'queue_prefix', 'LCH', 'string', 'queue', 'Queue ticket prefix', 1, 0, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities f WHERE f.code = 'LCH';

INSERT OR IGNORE INTO settings (id, facility_id, key, value, type, category, description, is_public, is_encrypted, updated_at)
SELECT lower(hex(randomblob(16))), f.id, 'avg_consultation_time', '15', 'number', 'queue', 'Average consultation time in minutes', 0, 0, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities f WHERE f.code = 'LCH';

INSERT OR IGNORE INTO settings (id, facility_id, key, value, type, category, description, is_public, is_encrypted, updated_at)
SELECT lower(hex(randomblob(16))), f.id, 'max_queue_size', '50', 'number', 'queue', 'Maximum patients per department per day', 0, 0, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities f WHERE f.code = 'LCH';

INSERT OR IGNORE INTO settings (id, facility_id, key, value, type, category, description, is_public, is_encrypted, updated_at)
SELECT lower(hex(randomblob(16))), f.id, 'reminder_interval', '3', 'number', 'notifications', 'Send reminder when position reaches this number', 0, 0, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities f WHERE f.code = 'LCH';

INSERT OR IGNORE INTO settings (id, facility_id, key, value, type, category, description, is_public, is_encrypted, updated_at)
SELECT lower(hex(randomblob(16))), f.id, 'language', 'en', 'string', 'general', 'Default language (en/sw)', 0, 0, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities f WHERE f.code = 'LCH';

INSERT OR IGNORE INTO settings (id, facility_id, key, value, type, category, description, is_public, is_encrypted, updated_at)
SELECT lower(hex(randomblob(16))), f.id, 'whatsapp_enabled', 'false', 'boolean', 'notifications', 'Enable WhatsApp notifications', 0, 0, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities f WHERE f.code = 'LCH';

INSERT OR IGNORE INTO settings (id, facility_id, key, value, type, category, description, is_public, is_encrypted, updated_at)
SELECT lower(hex(randomblob(16))), f.id, 'operating_hours_start', '07:00', 'string', 'general', 'Start of operating hours', 1, 0, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities f WHERE f.code = 'LCH';

INSERT OR IGNORE INTO settings (id, facility_id, key, value, type, category, description, is_public, is_encrypted, updated_at)
SELECT lower(hex(randomblob(16))), f.id, 'operating_hours_end', '20:00', 'string', 'general', 'End of operating hours', 1, 0, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities f WHERE f.code = 'LCH';

INSERT OR IGNORE INTO settings (id, facility_id, key, value, type, category, description, is_public, is_encrypted, updated_at)
SELECT lower(hex(randomblob(16))), f.id, 'emergency_contact', '+254-20-1234574', 'string', 'general', 'Emergency contact number', 1, 0, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities f WHERE f.code = 'LCH';

INSERT OR IGNORE INTO settings (id, facility_id, key, value, type, category, description, is_public, is_encrypted, updated_at)
SELECT lower(hex(randomblob(16))), f.id, 'tts_enabled', 'true', 'boolean', 'display', 'Enable text-to-speech for TV displays', 0, 0, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities f WHERE f.code = 'LCH';

INSERT OR IGNORE INTO settings (id, facility_id, key, value, type, category, description, is_public, is_encrypted, updated_at)
SELECT lower(hex(randomblob(16))), f.id, 'tts_language', 'en', 'string', 'display', 'TV display language (en/sw)', 0, 0, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')
FROM facilities f WHERE f.code = 'LCH';
