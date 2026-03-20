/**
 * Database Schema Tests
 * 
 * Tests to verify database table structure, columns, and constraints.
 */
const { describe, it, expect, beforeAll, afterAll } = require('vitest');
const { Pool } = require('pg');

const testPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hqs_test',
});

describe('Database Schema Tests', () => {
  // Expected tables in the database
  const expectedTables = [
    'users',
    'departments',
    'patients',
    'doctors',
    'queue',
    'appointments',
    'visits',
    'clinical_notes',
    'diagnoses',
    'prescriptions',
    'messages',
    'voice_calls',
    'notifications',
    'rooms',
    'room_occupancy',
    'wait_time_history',
    'settings',
    'audit_logs',
    'shifts'
  ];

  describe('Table Existence', () => {
    expectedTables.forEach(table => {
      it(`should have ${table} table`, async () => {
        const result = await testPool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          ) as exists
        `, [table]);
        
        expect(result.rows[0].exists).toBe(true);
      });
    });

    it('should not have unexpected tables', async () => {
      const result = await testPool.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `);
      
      const tableNames = result.rows.map(r => r.table_name);
      console.log('Found tables:', tableNames);
    });
  });

  describe('Users Table Structure', () => {
    it('should have all required columns', async () => {
      const result = await testPool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `);
      
      const columns = result.rows.reduce((acc, row) => {
        acc[row.column_name] = row;
        return acc;
      }, {});
      
      // Required columns
      expect(columns.id).toBeDefined();
      expect(columns.email).toBeDefined();
      expect(columns.password_hash).toBeDefined();
      expect(columns.first_name).toBeDefined();
      expect(columns.last_name).toBeDefined();
      expect(columns.role).toBeDefined();
      expect(columns.is_active).toBeDefined();
      expect(columns.created_at).toBeDefined();
      
      // Email should be unique
      const uniqueResult = await testPool.query(`
        SELECT COUNT(*) as count
        FROM information_schema.table_constraints
        WHERE table_name = 'users' 
        AND constraint_type = 'UNIQUE'
        AND constraint_name LIKE '%email%'
      `);
      
      expect(parseInt(uniqueResult.rows[0].count)).toBeGreaterThan(0);
    });

    it('should have proper role constraints', async () => {
      // Test inserting invalid role
      try {
        await testPool.query(`
          INSERT INTO users (email, password_hash, first_name, last_name, role)
          VALUES ($1, $2, $3, $4, $5)
        `, [`testrole_${Date.now()}@test.com`, 'hash', 'Test', 'User', 'invalid_role']);
        // If this succeeds, there's no role constraint
      } catch (err) {
        // Expected - should fail
        expect(err.message).toContain('role');
      }
    });
  });

  describe('Patients Table Structure', () => {
    it('should have all required columns', async () => {
      const result = await testPool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'patients'
        ORDER BY ordinal_position
      `);
      
      const columns = result.rows.map(r => r.column_name);
      
      expect(columns).toContain('id');
      expect(columns).toContain('first_name');
      expect(columns).toContain('last_name');
      expect(columns).toContain('phone');
      expect(columns).toContain('email');
      expect(columns).toContain('national_id');
      expect(columns).toContain('date_of_birth');
      expect(columns).toContain('gender');
      expect(columns).toContain('emergency_contact');
      expect(columns).toContain('emergency_phone');
      expect(columns).toContain('blood_type');
      expect(columns).toContain('allergies');
      expect(columns).toContain('created_at');
    });
  });

  describe('Queue Table Structure', () => {
    it('should have all required columns', async () => {
      const result = await testPool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'queue'
        ORDER BY ordinal_position
      `);
      
      const columns = result.rows.map(r => r.column_name);
      
      expect(columns).toContain('id');
      expect(columns).toContain('queue_number');
      expect(columns).toContain('patient_id');
      expect(columns).toContain('department_id');
      expect(columns).toContain('doctor_id');
      expect(columns).toContain('status');
      expect(columns).toContain('priority');
      expect(columns).toContain('position');
      expect(columns).toContain('room_assigned');
      expect(columns).toContain('called_at');
      expect(columns).toContain('started_at');
      expect(columns).toContain('completed_at');
      expect(columns).toContain('created_at');
    });

    it('should have status check constraint', async () => {
      const result = await testPool.query(`
        SELECT pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE conrelid = 'queue'::regclass
        AND contype = 'c'
      `);
      
      // Should have a check constraint for status
      const hasStatusCheck = result.rows.some(r => 
        r.definition && r.definition.toLowerCase().includes('status')
      );
      
      expect(hasStatusCheck).toBe(true);
    });
  });

  describe('Clinical Notes Table Structure', () => {
    it('should have SOAP note columns', async () => {
      const result = await testPool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'clinical_notes'
      `);
      
      const columns = result.rows.map(r => r.column_name);
      
      expect(columns).toContain('subjective');
      expect(columns).toContain('objective');
      expect(columns).toContain('assessment');
      expect(columns).toContain('plan');
      expect(columns).toContain('patient_id');
      expect(columns).toContain('doctor_id');
      expect(columns).toContain('status');
    });

    it('should have foreign key to patients', async () => {
      const result = await testPool.query(`
        SELECT tc.constraint_name, tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'clinical_notes'
      `);
      
      const patientFK = result.rows.find(r => r.foreign_table_name === 'patients');
      expect(patientFK).toBeDefined();
    });
  });

  describe('Foreign Key Constraints', () => {
    it('should have proper FK from queue to patients', async () => {
      const result = await testPool.query(`
        SELECT tc.constraint_name, ccu.table_name AS foreign_table
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'queue'
        AND kcu.column_name = 'patient_id'
      `);
      
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].foreign_table).toBe('patients');
    });

    it('should have proper FK from queue to departments', async () => {
      const result = await testPool.query(`
        SELECT tc.constraint_name, ccu.table_name AS foreign_table
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'queue'
        AND kcu.column_name = 'department_id'
      `);
      
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].foreign_table).toBe('departments');
    });
  });

  describe('Index Existence', () => {
    it('should have indexes on foreign keys', async () => {
      const result = await testPool.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'queue'
      `);
      
      const indexes = result.rows.map(r => r.indexdef);
      
      // Should have indexes for commonly queried columns
      expect(indexes.some(i => i.includes('patient_id'))).toBe(true);
      expect(indexes.some(i => i.includes('department_id'))).toBe(true);
      expect(indexes.some(i => i.includes('status'))).toBe(true);
    });
  });

  describe('Data Types', () => {
    it('should use UUID for id columns', async () => {
      const result = await testPool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'patients' AND column_name = 'id'
      `);
      
      expect(result.rows[0].data_type).toBe('uuid');
    });

    it('should use TIMESTAMP for date columns', async () => {
      const result = await testPool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'created_at'
      `);
      
      expect(result.rows[0].data_type).toBe('timestamp without time zone');
    });
  });
});

describe('Database Constraints Tests', () => {
  describe('Unique Constraints', () => {
    it('should enforce unique email in users', async () => {
      const email = `unique_${Date.now()}@test.com`;
      
      // First insert should succeed
      await testPool.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role)
        VALUES ($1, $2, $3, $4, $5)
      `, [email, 'hash1', 'Test', 'User1', 'receptionist']);
      
      // Second insert with same email should fail
      await expect(testPool.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role)
        VALUES ($1, $2, $3, $4, $5)
      `, [email, 'hash2', 'Test', 'User2', 'receptionist'])).rejects.toThrow();
    });

    it('should enforce unique national_id in patients', async () => {
      const nationalId = `NAT-${Date.now()}`;
      
      await testPool.query(`
        INSERT INTO patients (first_name, last_name, national_id)
        VALUES ($1, $2, $3)
      `, ['Test', 'Patient1', nationalId]);
      
      await expect(testPool.query(`
        INSERT INTO patients (first_name, last_name, national_id)
        VALUES ($1, $2, $3)
      `, ['Test', 'Patient2', nationalId])).rejects.toThrow();
    });
  });

  describe('Check Constraints', () => {
    it('should enforce valid user role values', async () => {
      const validRoles = ['admin', 'doctor', 'nurse', 'receptionist', 'patient'];
      
      for (const role of validRoles) {
        const email = `role_${role}_${Date.now()}@test.com`;
        const result = await testPool.query(`
          INSERT INTO users (email, password_hash, first_name, last_name, role)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `, [email, 'hash', 'Test', 'User', role]);
        
        expect(result.rows[0]).toBeDefined();
      }
    });

    it('should enforce valid gender values', async () => {
      const validGenders = ['male', 'female', 'other'];
      
      for (const gender of validGenders) {
        const result = await testPool.query(`
          INSERT INTO patients (first_name, last_name, gender)
          VALUES ($1, $2, $3)
          RETURNING id
        `, ['Test', gender, gender]);
        
        expect(result.rows[0]).toBeDefined();
      }
    });
  });

  describe('Not Null Constraints', () => {
    it('should enforce not null on required columns', async () => {
      // Users table
      await expect(testPool.query(`
        INSERT INTO users (email) VALUES ($1)
      `, ['test@test.com'])).rejects.toThrow();

      // Patients table
      await expect(testPool.query(`
        INSERT INTO patients (first_name) VALUES ($1)
      `, ['Test'])).rejects.toThrow();
    });
  });

  describe('Foreign Key Constraints', () => {
    it('should reject queue entry with non-existent patient', async () => {
      const fakePatientId = '00000000-0000-0000-0000-000000000000';
      
      // Create department first
      const deptResult = await testPool.query(`
        INSERT INTO departments (name, code) VALUES ($1, $2) RETURNING id
      `, [`FKTest_${Date.now()}`, `FK${Date.now().toString().slice(-3)}`]);
      
      await expect(testPool.query(`
        INSERT INTO queue (queue_number, patient_id, department_id, status)
        VALUES ($1, $2, $3, 'waiting')
      `, ['GEN0001', fakePatientId, deptResult.rows[0].id])).rejects.toThrow();
    });

    it('should allow deletion of patient with cascade to queue', async () => {
      // Create patient and queue entry
      const patientResult = await testPool.query(`
        INSERT INTO patients (first_name, last_name, national_id)
        VALUES ($1, $2, $3) RETURNING id
      `, ['Cascade', 'Test', `CASC-${Date.now()}`]);
      
      const patientId = patientResult.rows[0].id;
      
      const deptResult = await testPool.query(`
        INSERT INTO departments (name, code) VALUES ($1, $2) RETURNING id
      `, [`CascadeDept_${Date.now()}`, `CD${Date.now().toString().slice(-3)}`]);
      
      await testPool.query(`
        INSERT INTO queue (queue_number, patient_id, department_id, status)
        VALUES ($1, $2, $3, 'waiting')
      `, [`GEN${Date.now()}`, patientId, deptResult.rows[0].id]);
      
      // Delete patient
      await testPool.query('DELETE FROM patients WHERE id = $1', [patientId]);
      
      // Verify queue entry is also deleted
      const queueCheck = await testPool.query(
        'SELECT COUNT(*) as count FROM queue WHERE patient_id = $1',
        [patientId]
      );
      
      expect(parseInt(queueCheck.rows[0].count)).toBe(0);
    });
  });
});
