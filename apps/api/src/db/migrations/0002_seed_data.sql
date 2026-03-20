-- Hospital Queue System - Seed Data
-- Run after 0001_complete_schema.sql

-- =====================================================
-- DEPARTMENTS
-- =====================================================

INSERT INTO departments (id, name, code, description, floor, building, phone, email, is_active, display_order, created_at, updated_at) 
SELECT gen_random_uuid()::text, 'General Medicine', 'MED', 'General medical consultations', '1st Floor', 'Main Building', '+254-20-1234567', 'med@limuruhospital.co.ke', 1, 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code = 'MED');

INSERT INTO departments (id, name, code, description, floor, building, phone, email, is_active, display_order, created_at, updated_at) 
SELECT gen_random_uuid()::text, 'Pediatrics', 'PED', 'Child healthcare services', '2nd Floor', 'Main Building', '+254-20-1234568', 'ped@limuruhospital.co.ke', 1, 2, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code = 'PED');

INSERT INTO departments (id, name, code, description, floor, building, phone, email, is_active, display_order, created_at, updated_at) 
SELECT gen_random_uuid()::text, 'Gynecology', 'GYN', 'Women health and maternity', '2nd Floor', 'Women Wing', '+254-20-1234569', 'gyn@limuruhospital.co.ke', 1, 3, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code = 'GYN');

INSERT INTO departments (id, name, code, description, floor, building, phone, email, is_active, display_order, created_at, updated_at) 
SELECT gen_random_uuid()::text, 'Orthopedics', 'ORTHO', 'Bone and joint care', '3rd Floor', 'Main Building', '+254-20-1234570', 'ortho@limuruhospital.co.ke', 1, 4, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code = 'ORTHO');

INSERT INTO departments (id, name, code, description, floor, building, phone, email, is_active, display_order, created_at, updated_at) 
SELECT gen_random_uuid()::text, 'Dental', 'DEN', 'Dental care and oral health', '1st Floor', 'Annex', '+254-20-1234571', 'den@limuruhospital.co.ke', 1, 5, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code = 'DEN');

INSERT INTO departments (id, name, code, description, floor, building, phone, email, is_active, display_order, created_at, updated_at) 
SELECT gen_random_uuid()::text, 'Ophthalmology', 'OPH', 'Eye care services', '3rd Floor', 'Main Building', '+254-20-1234572', 'oph@limuruhospital.co.ke', 1, 6, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code = 'OPH');

INSERT INTO departments (id, name, code, description, floor, building, phone, email, is_active, display_order, created_at, updated_at) 
SELECT gen_random_uuid()::text, 'Cardiology', 'CARD', 'Heart and cardiovascular care', '4th Floor', 'Specialty Wing', '+254-20-1234573', 'card@limuruhospital.co.ke', 1, 7, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code = 'CARD');

INSERT INTO departments (id, name, code, description, floor, building, phone, email, is_active, display_order, created_at, updated_at) 
SELECT gen_random_uuid()::text, 'Emergency', 'EMER', 'Emergency and urgent care', 'Ground Floor', 'Emergency Building', '+254-20-1234574', 'emer@limuruhospital.co.ke', 1, 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code = 'EMER');

-- =====================================================
-- USERS (Admin, Doctor, Nurse, Receptionist)
-- Password for all users: password123
-- bcrypt hash: $2a$10$7duNb9ZVGczj/xLxc694vuCuehQv1ljJJGknhvH2Xekp1H1hYadma
-- =====================================================

DO $$
DECLARE
    med_dept_id TEXT;
    admin_id TEXT;
    doctor_id TEXT;
    nurse_id TEXT;
    receptionist_id TEXT;
BEGIN
    -- Get General Medicine department ID
    SELECT id INTO med_dept_id FROM departments WHERE code = 'MED';
    
    -- Create Admin (if not exists)
    SELECT id INTO admin_id FROM users WHERE email = 'admin@limuruhospital.co.ke';
    IF admin_id IS NULL THEN
        INSERT INTO users (id, email, password_hash, first_name, last_name, role, department_id, is_active, created_at, updated_at)
        VALUES (
            gen_random_uuid()::text,
            'admin@limuruhospital.co.ke',
            '$2a$10$7duNb9ZVGczj/xLxc694vuCuehQv1ljJJGknhvH2Xekp1H1hYadma',
            'System',
            'Administrator',
            'admin',
            med_dept_id,
            1,
            NOW(),
            NOW()
        );
    END IF;
    
    -- Create Doctor (if not exists)
    SELECT id INTO doctor_id FROM users WHERE email = 'doctor@hospital.co.ke';
    IF doctor_id IS NULL THEN
        INSERT INTO users (id, email, password_hash, first_name, last_name, role, department_id, is_active, created_at, updated_at)
        VALUES (
            gen_random_uuid()::text,
            'doctor@hospital.co.ke',
            '$2a$10$7duNb9ZVGczj/xLxc694vuCuehQv1ljJJGknhvH2Xekp1H1hYadma',
            'John',
            'Doctor',
            'doctor',
            med_dept_id,
            1,
            NOW(),
            NOW()
        );
    END IF;
    
    -- Create Nurse (if not exists)
    SELECT id INTO nurse_id FROM users WHERE email = 'nurse@hospital.co.ke';
    IF nurse_id IS NULL THEN
        INSERT INTO users (id, email, password_hash, first_name, last_name, role, department_id, is_active, created_at, updated_at)
        VALUES (
            gen_random_uuid()::text,
            'nurse@hospital.co.ke',
            '$2a$10$7duNb9ZVGczj/xLxc694vuCuehQv1ljJJGknhvH2Xekp1H1hYadma',
            'Jane',
            'Nurse',
            'nurse',
            med_dept_id,
            1,
            NOW(),
            NOW()
        );
    END IF;
    
    -- Create Receptionist (if not exists)
    SELECT id INTO receptionist_id FROM users WHERE email = 'reception@hospital.co.ke';
    IF receptionist_id IS NULL THEN
        INSERT INTO users (id, email, password_hash, first_name, last_name, role, department_id, is_active, created_at, updated_at)
        VALUES (
            gen_random_uuid()::text,
            'reception@hospital.co.ke',
            '$2a$10$7duNb9ZVGczj/xLxc694vuCuehQv1ljJJGknhvH2Xekp1H1hYadma',
            'Bob',
            'Receptionist',
            'receptionist',
            med_dept_id,
            1,
            NOW(),
            NOW()
        );
    END IF;
END $$;

-- =====================================================
-- ROOMS (Sample consultation rooms)
-- =====================================================

INSERT INTO rooms (id, room_number, name, room_type, department_id, floor, building, status, capacity, is_active, created_at, updated_at)
SELECT gen_random_uuid()::text, 'R101', 'Consultation Room 1', 'consultation', id, '1st Floor', 'Main Building', 'available', 1, 1, NOW(), NOW()
FROM departments WHERE code = 'MED'
AND NOT EXISTS (SELECT 1 FROM rooms WHERE room_number = 'R101');

INSERT INTO rooms (id, room_number, name, room_type, department_id, floor, building, status, capacity, is_active, created_at, updated_at)
SELECT gen_random_uuid()::text, 'R102', 'Consultation Room 2', 'consultation', id, '1st Floor', 'Main Building', 'available', 1, 1, NOW(), NOW()
FROM departments WHERE code = 'MED'
AND NOT EXISTS (SELECT 1 FROM rooms WHERE room_number = 'R102');

INSERT INTO rooms (id, room_number, name, room_type, department_id, floor, building, status, capacity, is_active, created_at, updated_at)
SELECT gen_random_uuid()::text, 'PED1', 'Pediatric Room 1', 'consultation', id, '2nd Floor', 'Main Building', 'available', 1, 1, NOW(), NOW()
FROM departments WHERE code = 'PED'
AND NOT EXISTS (SELECT 1 FROM rooms WHERE room_number = 'PED1');

-- =====================================================
-- DEFAULT SETTINGS
-- =====================================================

INSERT INTO settings (key, value, description, category, updated_at)
VALUES ('clinic_name', 'Limuru Cottage Hospital', 'Hospital/clinic name', 'general', NOW())
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, description, category, updated_at)
VALUES ('clinic_phone', '+254-20-1234567', 'Main contact phone', 'general', NOW())
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, description, category, updated_at)
VALUES ('clinic_email', 'info@limuruhospital.co.ke', 'Main contact email', 'general', NOW())
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, description, category, updated_at)
VALUES ('queue_prefix', 'LCH', 'Queue ticket prefix', 'queue', NOW())
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, description, category, updated_at)
VALUES ('avg_consultation_time', '15', 'Average consultation time in minutes', 'queue', NOW())
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, description, category, updated_at)
VALUES ('max_queue_size', '50', 'Maximum patients per department per day', 'queue', NOW())
ON CONFLICT (key) DO NOTHING;
