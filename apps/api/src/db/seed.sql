-- ============================================================
-- Limuru Cottage Hospital Queue System - Seed Data
-- Run after 0001_initial_schema.sql migration
-- Version: 1.0.0
-- Date: 2026-03-20
-- ============================================================

PRAGMA foreign_keys = ON;

-- ============================================================
-- INSERT FACILITY
-- ============================================================
INSERT INTO facilities (id, name, code, address, phone, email, timezone, is_active)
VALUES (
  'f1000000-0000-4000-8000-000000000001',
  'Limuru Cottage Hospital',
  'LCH',
  'Limuru Town, Kiambu County, Kenya',
  '+254-20-200-1234',
  'info@limuruhospital.co.ke',
  'Africa/Nairobi',
  1
);

-- ============================================================
-- INSERT DEPARTMENTS
-- ============================================================
INSERT INTO departments (id, facility_id, name, code, description, color, average_service_time, is_active)
VALUES
  ('d1000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'General Medicine', 'MED', 'General medical consultations and primary care', '#3B82F6', 15, 1),
  ('d1000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000001', 'Pediatrics', 'PED', 'Children healthcare from infancy to adolescence', '#8B5CF6', 12, 1),
  ('d1000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-000000000001', 'Emergency', 'EMR', 'Emergency and urgent care services', '#EF4444', 5, 1),
  ('d1000000-0000-4000-8000-000000000004', 'f1000000-0000-4000-8000-000000000001', 'Gynecology', 'GYN', 'Women health and reproductive care', '#EC4899', 18, 1),
  ('d1000000-0000-4000-8000-000000000005', 'f1000000-0000-4000-8000-000000000001', 'Orthopedics', 'ORT', 'Bone, joint, and musculoskeletal care', '#F59E0B', 20, 1),
  ('d1000000-0000-4000-8000-000000000006', 'f1000000-0000-4000-8000-000000000001', 'Dental', 'DEN', 'Dental care and oral health services', '#10B981', 15, 1),
  ('d1000000-0000-4000-8000-000000000007', 'f1000000-0000-4000-8000-000000000001', 'Laboratory', 'LAB', 'Lab tests, diagnostics, and sample processing', '#6366F1', 10, 1),
  ('d1000000-0000-4000-8000-000000000008', 'f1000000-0000-4000-8000-000000000001', 'Pharmacy', 'PHM', 'Prescription dispensing and medication counseling', '#14B8A6', 5, 1),
  ('d1000000-0000-4000-8000-000000000009', 'f1000000-0000-4000-8000-000000000001', 'Cardiology', 'CAR', 'Heart and cardiovascular system care', '#F97316', 25, 1),
  ('d1000000-0000-4000-8000-000000000010', 'f1000000-0000-4000-8000-000000000001', 'Radiology', 'RAD', 'X-ray, ultrasound, CT scan, and imaging', '#06B6D4', 20, 1),
  ('d1000000-0000-4000-8000-000000000011', 'f1000000-0000-4000-8000-000000000001', 'Ophthalmology', 'OPH', 'Eye care and vision services', '#84CC16', 15, 1),
  ('d1000000-0000-4000-8000-000000000012', 'f1000000-0000-4000-8000-000000000001', 'ENT', 'ENT', 'Ear, nose, and throat services', '#A855F7', 12, 1);

-- ============================================================
-- INSERT ROOMS
-- ============================================================
INSERT INTO rooms (id, facility_id, department_id, room_number, room_type, floor, capacity, is_active)
VALUES
  -- General Medicine Rooms
  ('r1000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'R101', 'consultation', 1, 1, 1),
  ('r1000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'R102', 'consultation', 1, 1, 1),
  ('r1000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'R103', 'consultation', 1, 1, 1),
  -- Pediatrics Rooms
  ('r1000000-0000-4000-8000-000000000004', 'f1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000002', 'P101', 'consultation', 1, 1, 1),
  ('r1000000-0000-4000-8000-000000000005', 'f1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000002', 'P102', 'consultation', 1, 1, 1),
  -- Emergency Rooms
  ('r1000000-0000-4000-8000-000000000006', 'f1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003', 'E101', 'emergency', 1, 2, 1),
  ('r1000000-0000-4000-8000-000000000007', 'f1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003', 'E102', 'emergency', 1, 1, 1),
  -- Gynecology Rooms
  ('r1000000-0000-4000-8000-000000000008', 'f1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000004', 'G101', 'consultation', 2, 1, 1),
  ('r1000000-0000-4000-8000-000000000009', 'f1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000004', 'G102', 'examination', 2, 1, 1),
  -- Orthopedics Rooms
  ('r1000000-0000-4000-8000-000000000010', 'f1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000005', 'O101', 'consultation', 2, 1, 1),
  ('r1000000-0000-4000-8000-000000000011', 'f1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000005', 'O102', 'procedure', 2, 1, 1),
  -- Dental Rooms
  ('r1000000-0000-4000-8000-000000000012', 'f1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000006', 'D101', 'consultation', 1, 1, 1),
  ('r1000000-0000-4000-8000-000000000013', 'f1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000006', 'D102', 'procedure', 1, 1, 1),
  -- Laboratory
  ('r1000000-0000-4000-8000-000000000014', 'f1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000007', 'L101', 'laboratory', 1, 2, 1),
  ('r1000000-0000-4000-8000-000000000015', 'f1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000007', 'L102', 'laboratory', 1, 1, 1),
  -- Pharmacy
  ('r1000000-0000-4000-8000-000000000016', 'f1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000008', 'PH101', 'pharmacy', 1, 3, 1),
  ('r1000000-0000-4000-8000-000000000017', 'f1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000008', 'PH102', 'pharmacy', 1, 2, 1),
  -- Cardiology
  ('r1000000-0000-4000-8000-000000000018', 'f1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000009', 'C101', 'consultation', 3, 1, 1),
  ('r1000000-0000-4000-8000-000000000019', 'f1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000009', 'C102', 'imaging', 3, 1, 1),
  -- Radiology
  ('r1000000-0000-4000-8000-000000000020', 'f1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000010', 'X101', 'imaging', 1, 1, 1),
  ('r1000000-0000-4000-8000-000000000021', 'f1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000010', 'X102', 'imaging', 1, 1, 1),
  -- Waiting Areas
  ('r1000000-0000-4000-8000-000000000022', 'f1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'WAIT1', 'waiting', 1, 30, 1),
  ('r1000000-0000-4000-8000-000000000023', 'f1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003', 'WAIT2', 'waiting', 1, 15, 1);

-- ============================================================
-- INSERT USERS
-- Password for all: #Limuru_Cottage_Hospital@2026
-- BCrypt hash: $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FRnFJ4p3mKq3K2
-- ============================================================
INSERT INTO users (id, facility_id, role, email, phone, password_hash, first_name, last_name, department_id, is_active)
VALUES
  -- Super Admin
  ('u1000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'super_admin', 'superadmin@limuruhospital.co.ke', '+254712000001', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FRnFJ4p3mKq3K2', 'System', 'Administrator', NULL, 1),
  -- Admin
  ('u1000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000001', 'admin', 'admin@limuruhospital.co.ke', '+254712000002', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FRnFJ4p3mKq3K2', 'Hospital', 'Administrator', NULL, 1),
  -- General Medicine Doctors
  ('u1000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-000000000001', 'doctor', 'dr.odhiambo@limuruhospital.co.ke', '+254712000003', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FRnFJ4p3mKq3K2', 'John', 'Odhiambo', 'd1000000-0000-4000-8000-000000000001', 1),
  ('u1000000-0000-4000-8000-000000000004', 'f1000000-0000-4000-8000-000000000001', 'doctor', 'dr.mutindi@limuruhospital.co.ke', '+254712000004', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FRnFJ4p3mKq3K2', 'Faith', 'Mutindi', 'd1000000-0000-4000-8000-000000000001', 1),
  -- Pediatrics Doctor
  ('u1000000-0000-4000-8000-000000000005', 'f1000000-0000-4000-8000-000000000001', 'doctor', 'dr.wanjiru@limuruhospital.co.ke', '+254712000005', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FRnFJ4p3mKq3K2', 'Grace', 'Wanjiru', 'd1000000-0000-4000-8000-000000000002', 1),
  -- Emergency Doctor
  ('u1000000-0000-4000-8000-000000000006', 'f1000000-0000-4000-8000-000000000001', 'doctor', 'dr.njoroge@limuruhospital.co.ke', '+254712000006', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FRnFJ4p3mKq3K2', 'David', 'Njoroge', 'd1000000-0000-4000-8000-000000000003', 1),
  -- Gynecology Doctor
  ('u1000000-0000-4000-8000-000000000007', 'f1000000-0000-4000-8000-000000000001', 'doctor', 'dr.achebet@limuruhospital.co.ke', '+254712000007', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FRnFJ4p3mKq3K2', 'Mary', 'Achebet', 'd1000000-0000-4000-8000-000000000004', 1),
  -- Orthopedics Doctor
  ('u1000000-0000-4000-8000-000000000008', 'f1000000-0000-4000-8000-000000000001', 'doctor', 'dr.karanja@limuruhospital.co.ke', '+254712000008', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FRnFJ4p3mKq3K2', 'Peter', 'Karanja', 'd1000000-0000-4000-8000-000000000005', 1),
  -- Dental Doctor
  ('u1000000-0000-4000-8000-000000000009', 'f1000000-0000-4000-8000-000000000001', 'doctor', 'dr.mwaura@limuruhospital.co.ke', '+254712000009', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FRnFJ4p3mKq3K2', 'James', 'Mwaura', 'd1000000-0000-4000-8000-000000000006', 1),
  -- Cardiology Doctor
  ('u1000000-0000-4000-8000-000000000010', 'f1000000-0000-4000-8000-000000000001', 'doctor', 'dr.kinyanjui@limuruhospital.co.ke', '+254712000010', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FRnFJ4p3mKq3K2', 'Samuel', 'Kinyanjui', 'd1000000-0000-4000-8000-000000000009', 1),
  -- Nurses - General Medicine
  ('u1000000-0000-4000-8000-000000000011', 'f1000000-0000-4000-8000-000000000001', 'nurse', 'nurse.kariuki@limuruhospital.co.ke', '+254712000011', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FRnFJ4p3mKq3K2', 'Mary', 'Kariuki', 'd1000000-0000-4000-8000-000000000001', 1),
  ('u1000000-0000-4000-8000-000000000012', 'f1000000-0000-4000-8000-000000000001', 'nurse', 'nurse.wambui@limuruhospital.co.ke', '+254712000012', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FRnFJ4p3mKq3K2', 'Ann', 'Wambui', 'd1000000-0000-4000-8000-000000000001', 1),
  -- Nurse - Pediatrics
  ('u1000000-0000-4000-8000-000000000013', 'f1000000-0000-4000-8000-000000000001', 'nurse', 'nurse.mutua@limuruhospital.co.ke', '+254712000013', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FRnFJ4p3mKq3K2', 'James', 'Mutua', 'd1000000-0000-4000-8000-000000000002', 1),
  -- Nurse - Emergency
  ('u1000000-0000-4000-8000-000000000014', 'f1000000-0000-4000-8000-000000000001', 'nurse', 'nurse.kimani@limuruhospital.co.ke', '+254712000014', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FRnFJ4p3mKq3K2', 'Joseph', 'Kimani', 'd1000000-0000-4000-8000-000000000003', 1),
  -- Receptionists
  ('u1000000-0000-4000-8000-000000000015', 'f1000000-0000-4000-8000-000000000001', 'receptionist', 'reception1@limuruhospital.co.ke', '+254712000015', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FRnFJ4p3mKq3K2', 'Sarah', 'Kamau', NULL, 1),
  ('u1000000-0000-4000-8000-000000000016', 'f1000000-0000-4000-8000-000000000001', 'receptionist', 'reception2@limuruhospital.co.ke', '+254712000016', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FRnFJ4p3mKq3K2', 'Peter', 'Ochieng', NULL, 1),
  ('u1000000-0000-4000-8000-000000000017', 'f1000000-0000-4000-8000-000000000001', 'receptionist', 'reception3@limuruhospital.co.ke', '+254712000017', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FRnFJ4p3mKq3K2', 'Grace', 'Njoroge', NULL, 1),
  -- Pharmacist
  ('u1000000-0000-4000-8000-000000000018', 'f1000000-0000-4000-8000-000000000001', 'pharmacist', 'pharmacist@limuruhospital.co.ke', '+254712000018', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FRnFJ4p3mKq3K2', 'Anna', 'Mwende', 'd1000000-0000-4000-8000-000000000008', 1),
  ('u1000000-0000-4000-8000-000000000019', 'f1000000-0000-4000-8000-000000000001', 'pharmacist', 'pharmacist2@limuruhospital.co.ke', '+254712000019', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FRnFJ4p3mKq3K2', 'Daniel', 'Maina', 'd1000000-0000-4000-8000-000000000008', 1),
  -- Lab Technician
  ('u1000000-0000-4000-8000-000000000020', 'f1000000-0000-4000-8000-000000000001', 'lab_tech', 'labtech@limuruhospital.co.ke', '+254712000020', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FRnFJ4p3mKq3K2', 'Michael', 'Otieno', 'd1000000-0000-4000-8000-000000000007', 1),
  ('u1000000-0000-4000-8000-000000000021', 'f1000000-0000-4000-8000-000000000001', 'lab_tech', 'labtech2@limuruhospital.co.ke', '+254712000021', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FRnFJ4p3mKq3K2', 'Susan', 'Achieng', 'd1000000-0000-4000-8000-000000000007', 1),
  -- Facility Manager
  ('u1000000-0000-4000-8000-000000000022', 'f1000000-0000-4000-8000-000000000001', 'facility_manager', 'facility@limuruhospital.co.ke', '+254712000022', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FRnFJ4p3mKq3K2', 'Joseph', 'Mwangi', NULL, 1),
  -- IT Support
  ('u1000000-0000-4000-8000-000000000023', 'f1000000-0000-4000-8000-000000000001', 'it_support', 'itsupport@limuruhospital.co.ke', '+254712000023', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FRnFJ4p3mKq3K2', 'Paul', 'Kibet', NULL, 1);

-- ============================================================
-- INSERT DOCTOR SPECIALTIES
-- ============================================================
INSERT INTO doctors (id, user_id, facility_id, specialty, license_number, qualification, experience_years, consultation_duration, max_daily_patients, consultation_fee, is_available)
VALUES
  ('doc-0001', 'u1000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-000000000001', 'Internal Medicine', 'KMPDU-2015-001', 'MBChB, MMed', 12, 15, 25, 1500.00, 1),
  ('doc-0002', 'u1000000-0000-4000-8000-000000000004', 'f1000000-0000-4000-8000-000000000001', 'Family Medicine', 'KMPDU-2018-003', 'MBChB, MMed', 8, 12, 30, 1200.00, 1),
  ('doc-0003', 'u1000000-0000-4000-8000-000000000005', 'f1000000-0000-4000-8000-000000000001', 'Pediatrics', 'KMPDU-2012-005', 'MBChB, MMed, Fellow', 15, 12, 20, 1800.00, 1),
  ('doc-0004', 'u1000000-0000-4000-8000-000000000006', 'f1000000-0000-4000-8000-000000000001', 'Emergency Medicine', 'KMPDU-2016-007', 'MBChB, MMed', 10, 10, 40, 2000.00, 1),
  ('doc-0005', 'u1000000-0000-4000-8000-000000000007', 'f1000000-0000-4000-8000-000000000001', 'Obstetrics & Gynecology', 'KMPDU-2010-009', 'MBChB, MMed, Fellow', 16, 18, 15, 2000.00, 1),
  ('doc-0006', 'u1000000-0000-4000-8000-000000000008', 'f1000000-0000-4000-8000-000000000001', 'Orthopedics', 'KMPDU-2014-011', 'MBChB, MMed', 12, 20, 12, 2500.00, 1),
  ('doc-0007', 'u1000000-0000-4000-8000-000000000009', 'f1000000-0000-4000-8000-000000000001', 'Dentistry', 'KDA-2017-013', 'BDS, MSc', 9, 15, 18, 1500.00, 1),
  ('doc-0008', 'u1000000-0000-4000-8000-000000000010', 'f1000000-0000-4000-8000-000000000001', 'Cardiology', 'KMPDU-2008-015', 'MBChB, MMed, PhD', 18, 25, 10, 3000.00, 1);

-- ============================================================
-- INSERT TEST PATIENTS
-- ============================================================
INSERT INTO patients (id, facility_id, hms_patient_id, national_id, first_name, last_name, email, phone, date_of_birth, gender, address, emergency_contact_name, emergency_phone, blood_type, allergies, registration_complete, registered_by)
VALUES
  ('p1000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'HMS001', '12345678', 'Jane', 'Wanjiku', 'jane.wanjiku@email.com', '+254721000001', '1985-03-15', 'female', 'Nairobi, Kenya', 'John Wanjiku', '+254721000002', 'A+', 'Penicillin', 1, 'u1000000-0000-4000-8000-000000000015'),
  ('p1000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000001', 'HMS002', '23456789', 'Peter', 'Kamau', 'peter.kamau@email.com', '+254721000003', '1978-07-22', 'male', 'Limuru, Kenya', 'Mary Kamau', '+254721000004', 'O+', NULL, 1, 'u1000000-0000-4000-8000-000000000016'),
  ('p1000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-000000000001', 'HMS003', '34567890', 'Emily', 'Njeri', 'emily.njeri@email.com', '+254721000005', '1992-11-08', 'female', 'Kikuyu, Kenya', 'Daniel Njeri', '+254721000006', 'B+', 'Sulfa drugs', 1, 'u1000000-0000-4000-8000-000000000015'),
  ('p1000000-0000-4000-8000-000000000004', 'f1000000-0000-4000-8000-000000000001', NULL, '45678901', 'Samuel', 'Ochieng', 'sam.ochieng@email.com', '+254721000007', '2015-05-20', 'male', 'Ruiru, Kenya', 'Grace Ochieng', '+254721000008', NULL, NULL, 0, 'u1000000-0000-4000-8000-000000000017'),
  ('p1000000-0000-4000-8000-000000000005', 'f1000000-0000-4000-8000-000000000001', 'HMS005', '56789012', 'Mary', 'Nyambura', 'mary.nyambura@email.com', '+254721000009', '1990-09-30', 'female', 'Thika, Kenya', 'Joseph Nyambura', '+254721000010', 'AB+', 'Aspirin', 1, 'u1000000-0000-4000-8000-000000000016'),
  ('p1000000-0000-4000-8000-000000000006', 'f1000000-0000-4000-8000-000000000001', 'HMS006', '67890123', 'James', 'Kariuki', 'james.kariuki@email.com', '+254721000011', '1982-12-05', 'male', 'Kasarani, Kenya', 'Anne Kariuki', '+254721000012', 'B-', NULL, 1, 'u1000000-0000-4000-8000-000000000015'),
  ('p1000000-0000-4000-8000-000000000007', 'f1000000-0000-4000-8000-000000000001', NULL, '78901234', 'Grace', 'Wambui', 'grace.wambui@email.com', '+254721000013', '1998-02-14', 'female', 'Juja, Kenya', NULL, NULL, 'O-', NULL, 0, 'u1000000-0000-4000-8000-000000000017'),
  ('p1000000-0000-4000-8000-000000000008', 'f1000000-0000-4000-8000-000000000001', 'HMS008', '89012345', 'Daniel', 'Muthoni', 'daniel.muthoni@email.com', '+254721000014', '1975-06-25', 'male', 'Kikuyu, Kenya', 'Sarah Muthoni', '+254721000015', 'A-', 'Ibuprofen', 1, 'u1000000-0000-4000-8000-000000000016');

-- ============================================================
-- INSERT SAMPLE QUEUE TICKETS
-- ============================================================
INSERT INTO queue_tickets (id, facility_id, patient_id, department_id, doctor_id, ticket_number, priority, priority_score, status, complaint, room_assigned, sequence_number, created_at)
VALUES
  ('q1000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'p1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'u1000000-0000-4000-8000-000000000003', 'MED-001', 3, 40.0, 'waiting', 'R101', 1, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW', '-1 hours')),
  ('q1000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000001', 'p1000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000001', 'u1000000-0000-4000-8000-000000000003', 'MED-002', 3, 40.0, 'waiting', 'R101', 2, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW', '-45 minutes')),
  ('q1000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-000000000001', 'p1000000-0000-4000-8000-000000000003', 'd1000000-0000-4000-8000-000000000002', 'u1000000-0000-4000-8000-000000000005', 'PED-001', 2, 70.0, 'waiting', 'P101', 1, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW', '-30 minutes')),
  ('q1000000-0000-4000-8000-000000000004', 'f1000000-0000-4000-8000-000000000001', 'p1000000-0000-4000-8000-000000000005', 'd1000000-0000-4000-8000-000000000001', 'u1000000-0000-4000-8000-000000000004', 'MED-003', 1, 90.0, 'waiting', 'R102', 1, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW', '-20 minutes')),
  ('q1000000-0000-4000-8000-000000000005', 'f1000000-0000-4000-8000-000000000001', 'p1000000-0000-4000-8000-000000000006', 'd1000000-0000-4000-8000-000000000003', 'u1000000-0000-4000-8000-000000000006', 'EMR-001', 1, 95.0, 'serving', 'E101', 1, STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW', '-10 minutes'));

-- ============================================================
-- INSERT SAMPLE APPOINTMENTS
-- ============================================================
INSERT INTO appointments (id, facility_id, patient_id, doctor_id, department_id, appointment_date, appointment_time, reason, status)
VALUES
  ('a1000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'p1000000-0000-4000-8000-000000000001', 'u1000000-0000-4000-8000-000000000003', 'd1000000-0000-4000-8000-000000000001', STRFTIME('%Y-%m-%d', 'NOW'), '09:00', 'Follow-up for blood pressure', 'scheduled'),
  ('a1000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000001', 'p1000000-0000-4000-8000-000000000003', 'u1000000-0000-4000-8000-000000000005', 'd1000000-0000-4000-8000-000000000002', STRFTIME('%Y-%m-%d', 'NOW'), '10:30', 'Vaccination schedule', 'scheduled'),
  ('a1000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-000000000001', 'p1000000-0000-4000-8000-000000000005', 'u1000000-0000-4000-8000-000000000007', 'd1000000-0000-4000-8000-000000000004', STRFTIME('%Y-%m-%d', 'NOW'), '11:00', 'Prenatal checkup', 'scheduled'),
  ('a1000000-0000-4000-8000-000000000004', 'f1000000-0000-4000-8000-000000000001', 'p1000000-0000-4000-8000-000000000008', 'u1000000-0000-4000-8000-000000000010', 'd1000000-0000-4000-8000-000000000009', STRFTIME('%Y-%m-%d', 'NOW'), '14:00', 'ECG review', 'scheduled');

-- ============================================================
-- INSERT DEFAULT SETTINGS
-- ============================================================
INSERT INTO settings (id, facility_id, key, value, category)
VALUES
  -- General Settings
  ('s1000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'hospital_name', 'Limuru Cottage Hospital', 'general'),
  ('s1000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000001', 'hospital_phone', '+254-20-200-1234', 'general'),
  ('s1000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-000000000001', 'hospital_email', 'info@limuruhospital.co.ke', 'general'),
  ('s1000000-0000-4000-8000-000000000004', 'f1000000-0000-4000-8000-000000000001', 'hospital_address', 'Limuru Town, Kiambu County, Kenya', 'general'),
  -- Queue Settings
  ('s1000000-0000-4000-8000-000000000005', 'f1000000-0000-4000-8000-000000000001', 'default_queue_wait_time', '15', 'queue'),
  ('s1000000-0000-4000-8000-000000000006', 'f1000000-0000-4000-8000-000000000001', 'call_timeout_minutes', '5', 'queue'),
  ('s1000000-0000-4000-8000-000000000007', 'f1000000-0000-4000-8000-000000000001', 'max_queue_size', '100', 'queue'),
  ('s1000000-0000-4000-8000-000000000008', 'f1000000-0000-4000-8000-000000000001', 'priority_enabled', 'true', 'queue'),
  ('s1000000-0000-4000-8000-000000000009', 'f1000000-0000-4000-8000-000000000001', 'auto_assign_enabled', 'true', 'queue'),
  -- Notification Settings
  ('s1000000-0000-4000-8000-000000000010', 'f1000000-0000-4000-8000-000000000001', 'sms_enabled', 'true', 'notifications'),
  ('s1000000-0000-4000-8000-000000000011', 'f1000000-0000-4000-8000-000000000001', 'whatsapp_enabled', 'true', 'notifications'),
  ('s1000000-0000-4000-8000-000000000012', 'f1000000-0000-4000-8000-000000000001', 'email_enabled', 'false', 'notifications'),
  ('s1000000-0000-4000-8000-000000000013', 'f1000000-0000-4000-8000-000000000001', 'patient_notification_interval', '5', 'notifications'),
  -- Display Settings
  ('s1000000-0000-4000-8000-000000000014', 'f1000000-0000-4000-8000-000000000001', 'privacy_mode', 'true', 'display'),
  ('s1000000-0000-4000-8000-000000000015', 'f1000000-0000-4000-8000-000000000001', 'branding_enabled', 'true', 'display'),
  ('s1000000-0000-4000-8000-000000000016', 'f1000000-0000-4000-8000-000000000001', 'display_refresh_interval', '10', 'display'),
  -- HMS Settings
  ('s1000000-0000-4000-8000-000000000017', 'f1000000-0000-4000-8000-000000000001', 'hms_adapter_type', 'mock', 'hms'),
  ('s1000000-0000-4000-8000-000000000018', 'f1000000-0000-4000-8000-000000000001', 'hms_auto_sync', 'false', 'hms'),
  -- Business Hours
  ('s1000000-0000-4000-8000-000000000019', 'f1000000-0000-4000-8000-000000000001', 'business_hours_start', '07:00', 'hours'),
  ('s1000000-0000-4000-8000-000000000020', 'f1000000-0000-4000-8000-000000000001', 'business_hours_end', '20:00', 'hours'),
  ('s1000000-0000-4000-8000-000000000021', 'f1000000-0000-4000-8000-000000000001', 'working_days', '1,2,3,4,5,6', 'hours');

-- ============================================================
-- INSERT TV DISPLAYS
-- ============================================================
INSERT INTO tv_displays (id, facility_id, name, location, department_ids, display_mode, auto_switch_interval, iptv_enabled, audio_enabled, branding_enabled, privacy_mode, is_active)
VALUES
  ('tv100000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'Main Waiting Area', 'Ground Floor Main Lobby', '["d1000000-0000-4000-8000-000000000001", "d1000000-0000-4000-8000-000000000002"]', 'auto_switch', 30, 0, 1, 1, 1, 1),
  ('tv100000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000001', 'Emergency Department', 'Emergency Wing', '["d1000000-0000-4000-8000-000000000003"]', 'single', 0, 0, 1, 1, 1, 1),
  ('tv100000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-000000000001', 'Pharmacy Display', 'Pharmacy Counter', '["d1000000-0000-4000-8000-000000000008"]', 'single', 0, 0, 0, 1, 1, 1);

-- ============================================================
-- INSERT ROOM SCHEDULES (Weekdays 7AM - 8PM)
-- ============================================================
INSERT INTO room_schedules (id, room_id, day_of_week, start_time, end_time, is_available)
SELECT 
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))),
  r.id,
  d.day,
  '07:00',
  '20:00',
  1
FROM rooms r
CROSS JOIN (SELECT 1 as day UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6) d
WHERE r.room_type IN ('consultation', 'procedure');

-- ============================================================
-- INSERT SAMPLE MESSAGES
-- ============================================================
INSERT INTO messages (id, facility_id, sender_id, recipient_id, subject, content, type, priority, created_at)
VALUES
  ('msg-0001', 'f1000000-0000-4000-8000-000000000001', 'u1000000-0000-4000-8000-000000000015', 'u1000000-0000-4000-8000-000000000003', 'Patient Arrival', 'Patient Jane Wanjiku has arrived for her 9AM appointment', 'direct', 'normal', STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW', '-30 minutes')),
  ('msg-0002', 'f1000000-0000-4000-8000-000000000001', 'u1000000-0000-4000-8000-000000000011', 'u1000000-0000-4000-8000-000000000018', 'Lab Results Ready', 'Lab results for patient Peter Kamau are ready for pickup', 'direct', 'high', STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW', '-15 minutes')),
  ('msg-0003', 'f1000000-0000-4000-8000-000000000001', 'u1000000-0000-4000-8000-000000000002', NULL, 'Daily Report', 'Daily queue statistics report is now available', 'broadcast', 'normal', STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW', '-1 hour'));

-- ============================================================
-- INSERT SAMPLE NOTIFICATIONS
-- ============================================================
INSERT INTO notifications (id, facility_id, user_id, patient_id, ticket_id, type, recipient, message, status, created_at)
VALUES
  ('notif-001', 'f1000000-0000-4000-8000-000000000001', 'u1000000-0000-4000-8000-000000000001', 'p1000000-0000-4000-8000-000000000001', 'q1000000-0000-4000-8000-000000000001', 'sms', '+254721000001', 'Your queue number is MED-001. Estimated wait: 15 minutes. Thank you for choosing Limuru Cottage Hospital.', 'delivered', STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW', '-1 hours')),
  ('notif-002', 'f1000000-0000-4000-8000-000000000001', 'u1000000-0000-4000-8000-000000000002', 'p1000000-0000-4000-8000-000000000002', 'q1000000-0000-4000-8000-000000000002', 'sms', '+254721000003', 'Your queue number is MED-002. You are next in line. Please proceed to the waiting area.', 'delivered', STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW', '-45 minutes'));

-- ============================================================
-- SUMMARY
-- ============================================================
-- Facilities: 1
-- Departments: 12
-- Rooms: 23
-- Users: 23
-- Doctors (specialties): 8
-- Patients: 8
-- Queue Tickets: 5
-- Appointments: 4
-- Settings: 21
-- TV Displays: 3
-- Messages: 3
-- Notifications: 2
