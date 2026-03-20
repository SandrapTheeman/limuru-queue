-- Hospital Queue System Database Initialization
-- PostgreSQL Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('patient', 'doctor', 'nurse', 'receptionist', 'admin')),
    department VARCHAR(50),
    room VARCHAR(20),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Patients Table
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(20),
    address TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(20),
    icon VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Doctors Table
CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id),
    specialization VARCHAR(100),
    license_number VARCHAR(50),
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Queue Table
CREATE TABLE IF NOT EXISTS queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(20) UNIQUE NOT NULL,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id),
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'called', 'in_progress', 'completed', 'cancelled', 'no_show')),
    priority BOOLEAN DEFAULT false,
    position INTEGER,
    wait_time INTEGER DEFAULT 0,
    consultation_duration INTEGER DEFAULT 0,
    room_assigned VARCHAR(20),
    doctor_id UUID REFERENCES users(id),
    called_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Queue History (for analytics)
CREATE TABLE IF NOT EXISTS queue_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_id UUID REFERENCES queue(id),
    patient_id UUID REFERENCES patients(id),
    department_id UUID REFERENCES departments(id),
    ticket_number VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    wait_time INTEGER,
    consultation_duration INTEGER,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id),
    doctor_id UUID REFERENCES users(id),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clinical Notes Table
CREATE TABLE IF NOT EXISTS clinical_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_id UUID REFERENCES queue(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES users(id),
    diagnosis TEXT,
    symptoms TEXT,
    prescription TEXT,
    notes TEXT,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- IPTV Channels Table
CREATE TABLE IF NOT EXISTS iptv_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    category VARCHAR(100),
    country VARCHAR(50),
    language VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default departments
INSERT INTO departments (code, name, description, color, icon) VALUES
('MED', 'General Medicine', 'General medical consultations', '#3b82f6', '🩺'),
('PED', 'Pediatrics', 'Child healthcare', '#10b981', '👶'),
('GYN', 'Gynecology', 'Women health', '#ec4899', '🌸'),
('ORTHO', 'Orthopedics', 'Bone and joint', '#8b5cf6', '🦴'),
('DEN', 'Dental', 'Dental care', '#f59e0b', '🦷'),
('OPH', 'Ophthalmology', 'Eye care', '#06b6d4', '👁️'),
('CARD', 'Cardiology', 'Heart care', '#ef4444', '❤️'),
('EMER', 'Emergency', 'Emergency services', '#f59e0b', '🚨')
ON CONFLICT (code) DO NOTHING;

-- Insert default admin user (password: admin123)
INSERT INTO users (email, password_hash, name, role, department)
VALUES ('admin@limuruhospital.co.ke', '$2a$10$YourHashedPasswordHere', 'System Administrator', 'admin', 'IT')
ON CONFLICT (email) DO NOTHING;

-- Insert default receptionist
INSERT INTO users (email, password_hash, name, role)
VALUES ('reception@hospital.co.ke', '$2a$10$YourHashedPasswordHere', 'Jane Smith', 'receptionist')
ON CONFLICT (email) DO NOTHING;

-- Insert default doctors
INSERT INTO users (email, password_hash, name, role, department, room) VALUES
('doctor@hospital.co.ke', '$2a$10$YourHashedPasswordHere', 'Dr. John Doe', 'doctor', 'MED', '101'),
('doctor2@hospital.co.ke', '$2a$10$YourHashedPasswordHere', 'Dr. Sarah Kimani', 'doctor', 'PED', '102')
ON CONFLICT (email) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_queue_status ON queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_department ON queue(department_id);
CREATE INDEX IF NOT EXISTS idx_queue_created_at ON queue(created_at);
CREATE INDEX IF NOT EXISTS idx_patients_number ON patients(patient_number);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_queue_updated_at BEFORE UPDATE ON queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO hospital_queue;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO hospital_queue;
