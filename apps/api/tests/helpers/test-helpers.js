/**
 * Test Helpers - Shared utilities for API tests
 */
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Database pool for tests
const testPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

/**
 * Clean up all test data
 */
async function cleanup() {
  const client = await testPool.connect();
  try {
    await client.query('BEGIN');
    
    // Disable FK constraints temporarily
    await client.query('SET CONSTRAINTS ALL DEFERRED');
    
    // Delete in correct order to respect FK constraints
    const tables = [
      'note_history',
      'diagnoses', 
      'prescriptions',
      'clinical_notes',
      'notifications',
      'messages',
      'voice_calls',
      'appointments',
      'queue',
      'visits',
      'patients',
      'wait_time_history',
      'rooms',
      'shifts',
      'doctors',
      'audit_logs',
      'settings',
      'users'
    ];
    
    for (const table of tables) {
      try {
        await client.query(`DELETE FROM ${table}`);
      } catch (e) {
        // Table might not exist
      }
    }
    
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Create a test user
 */
async function createUser(userData = {}) {
  const {
    email = `test_${Date.now()}@example.com`,
    password = 'password123',
    first_name = 'Test',
    last_name = 'User',
    role = 'receptionist',
    department_id = null,
    is_active = true
  } = userData;
  
  const passwordHash = await bcrypt.hash(password, 10);
  
  const result = await testPool.query(`
    INSERT INTO users (email, password_hash, first_name, last_name, role, department_id, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, email, first_name, last_name, role, is_active
  `, [email, passwordHash, first_name, last_name, role, department_id, is_active ? 1 : 0]);
  
  return {
    ...result.rows[0],
    password,
    passwordHash
  };
}

/**
 * Create multiple test users at once
 */
async function createUsers(users) {
  const createdUsers = [];
  for (const userData of users) {
    const user = await createUser(userData);
    createdUsers.push(user);
  }
  return createdUsers;
}

/**
 * Generate JWT token for a user
 */
function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    name: `${user.first_name} ${user.last_name}`.trim(),
    role: user.role,
    department: user.department_name || null
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
}

/**
 * Create admin user and return token
 */
async function createAdminUser() {
  const admin = await createUser({
    email: 'admin@limuruhospital.co.ke',
    role: 'admin',
    first_name: 'Admin',
    last_name: 'User'
  });
  
  return {
    ...admin,
    token: generateToken(admin)
  };
}

/**
 * Create doctor user and return token
 */
async function createDoctorUser() {
  const doctor = await createUser({
    email: 'doctor@hospital.co.ke',
    role: 'doctor',
    first_name: 'Doctor',
    last_name: 'User'
  });
  
  return {
    ...doctor,
    token: generateToken(doctor)
  };
}

/**
 * Create nurse user and return token
 */
async function createNurseUser() {
  const nurse = await createUser({
    email: 'nurse@hospital.co.ke',
    role: 'nurse',
    first_name: 'Nurse',
    last_name: 'User'
  });
  
  return {
    ...nurse,
    token: generateToken(nurse)
  };
}

/**
 * Create receptionist user and return token
 */
async function createReceptionistUser() {
  const receptionist = await createUser({
    email: 'reception@hospital.co.ke',
    role: 'receptionist',
    first_name: 'Reception',
    last_name: 'User'
  });
  
  return {
    ...receptionist,
    token: generateToken(receptionist)
  };
}

/**
 * Create a test department
 */
async function createDepartment(deptData = {}) {
  const {
    name = `Test Department ${Date.now()}`,
    code = `TST${Date.now().toString().slice(-3)}`,
    description = 'Test department'
  } = deptData;
  
  const result = await testPool.query(`
    INSERT INTO departments (name, code, description)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [name, code, description]);
  
  return result.rows[0];
}

/**
 * Create a test patient
 */
async function createPatient(patientData = {}) {
  const {
    first_name = 'Test',
    last_name = 'Patient',
    phone = '+254700000000',
    email = `patient_${Date.now()}@example.com`,
    national_id = `NAT-${Date.now()}`,
    gender = 'male',
    date_of_birth = '1990-01-01'
  } = patientData;
  
  const result = await testPool.query(`
    INSERT INTO patients (first_name, last_name, phone, email, national_id, gender, date_of_birth)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [first_name, last_name, phone, email, national_id, gender, date_of_birth]);
  
  return result.rows[0];
}

/**
 * Create a queue entry
 */
async function createQueueEntry(queueData = {}) {
  const {
    patient_id,
    department_id,
    doctor_id = null,
    priority = false,
    notes = null,
    status = 'waiting'
  } = queueData;
  
  // Generate queue number
  const ticketResult = await testPool.query(`
    SELECT COALESCE(MAX(CAST(SUBSTRING(queue_number, 4) AS INTEGER)), 0) + 1 as next_num
    FROM queue
    WHERE department_id = $1 AND created_at::date = CURRENT_DATE
  `, [department_id]);
  
  const deptResult = await testPool.query('SELECT code FROM departments WHERE id = $1', [department_id]);
  const deptCode = deptResult.rows[0]?.code || 'GEN';
  const queueNumber = `${deptCode}${String(ticketResult.rows[0].next_num).padStart(4, '0')}`;
  
  const result = await testPool.query(`
    INSERT INTO queue (queue_number, patient_id, department_id, doctor_id, priority, notes, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [queueNumber, patient_id, department_id, doctor_id, priority, notes, status]);
  
  return result.rows[0];
}

/**
 * Create a test appointment
 */
async function createAppointment(apptData = {}) {
  const {
    patient_id,
    doctor_id,
    department_id,
    appointment_date = new Date().toISOString().split('T')[0],
    appointment_time = '09:00',
    notes = null,
    status = 'scheduled'
  } = apptData;
  
  const result = await testPool.query(`
    INSERT INTO appointments (patient_id, doctor_id, department_id, appointment_date, appointment_time, notes, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [patient_id, doctor_id, department_id, appointment_date, appointment_time, notes, status]);
  
  return result.rows[0];
}

/**
 * Create a test room
 */
async function createRoom(roomData = {}) {
  const {
    room_number = `R${Date.now()}`,
    department_id = null,
    floor = 1,
    capacity = 1,
    room_type = 'consultation'
  } = roomData;
  
  const result = await testPool.query(`
    INSERT INTO rooms (room_number, department_id, floor, capacity, room_type)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [room_number, department_id, floor, capacity, room_type]);
  
  return result.rows[0];
}

/**
 * Create a test message
 */
async function createMessage(messageData = {}) {
  const {
    sender_id,
    recipient_id,
    message = 'Test message',
    message_type = 'text',
    priority = 'normal'
  } = messageData;
  
  const result = await testPool.query(`
    INSERT INTO messages (sender_id, recipient_id, message, message_type, priority)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [sender_id, recipient_id, message, message_type, priority]);
  
  return result.rows[0];
}

/**
 * Create a clinical note
 */
async function createClinicalNote(noteData = {}) {
  const {
    queue_entry_id = null,
    patient_id,
    doctor_id,
    subjective = 'Patient reports symptoms',
    objective = 'Examination findings',
    assessment = 'Assessment notes',
    plan = 'Treatment plan',
    status = 'final'
  } = noteData;
  
  const result = await testPool.query(`
    INSERT INTO clinical_notes (queue_entry_id, patient_id, doctor_id, subjective, objective, assessment, plan, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [queue_entry_id, patient_id, doctor_id, subjective, objective, assessment, plan, status]);
  
  return result.rows[0];
}

/**
 * Create a prescription
 */
async function createPrescription(rxData = {}) {
  const {
    note_id,
    patient_id,
    doctor_id,
    medication,
    dosage = '500mg',
    frequency = 'twice daily',
    duration = '7 days',
    instructions = null,
    refills = 0
  } = rxData;
  
  const result = await testPool.query(`
    INSERT INTO prescriptions (note_id, patient_id, doctor_id, medication, dosage, frequency, duration, instructions, refills)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [note_id, patient_id, doctor_id, medication, dosage, frequency, duration, instructions, refills]);
  
  return result.rows[0];
}

/**
 * Create a voice call record
 */
async function createVoiceCall(callData = {}) {
  const {
    caller_id,
    caller_name,
    recipient_id,
    recipient_name,
    call_type = 'staff',
    status = 'initiated'
  } = callData;
  
  const result = await testPool.query(`
    INSERT INTO voice_calls (caller_id, caller_name, recipient_id, recipient_name, call_type, status)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [caller_id, caller_name, recipient_id, recipient_name, call_type, status]);
  
  return result.rows[0];
}

/**
 * Fixtures object with all helpers
 */
const fixtures = {
  cleanup,
  createUser,
  createUsers,
  createDepartment,
  createPatient,
  createQueueEntry,
  createAppointment,
  createRoom,
  createMessage,
  createClinicalNote,
  createPrescription,
  createVoiceCall,
  createAdminUser,
  createDoctorUser,
  createNurseUser,
  createReceptionistUser,
  generateToken
};

/**
 * Test database object
 */
const testDb = {
  pool: testPool,
  query: (...args) => testPool.query(...args)
};

module.exports = {
  testDb,
  fixtures,
  cleanup,
  createUser,
  createUsers,
  createDepartment,
  createPatient,
  createQueueEntry,
  createAppointment,
  createRoom,
  createMessage,
  createClinicalNote,
  createPrescription,
  createVoiceCall,
  createAdminUser,
  createDoctorUser,
  createNurseUser,
  createReceptionistUser,
  generateToken
};
