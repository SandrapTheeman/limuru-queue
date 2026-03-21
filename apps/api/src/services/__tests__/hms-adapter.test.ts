import { describe, it, expect, vi, beforeEach } from 'vitest';

interface HMSPatient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email?: string;
  nationalId?: string;
}

interface HMSAppointment {
  id: string;
  patientId: string;
  doctorId: string;
  departmentId: string;
  date: string;
  time: string;
  reason: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
}

interface HMSAdapter {
  getPatient(patientId: string): Promise<HMSPatient | null>;
  searchPatients(query: string): Promise<HMSPatient[]>;
  getPatientAppointments(patientId: string): Promise<HMSAppointment[]>;
  getDoctorSchedule(doctorId: string, date: string): Promise<HMSAppointment[]>;
}

function createMockHMSAdapter(): HMSAdapter & { _setPatient: (id: string, patient: HMSPatient) => void; _setAppointments: (patientId: string, appointments: HMSAppointment[]) => void } {
  const patients = new Map<string, HMSPatient>();
  const appointments = new Map<string, HMSAppointment[]>();

  return {
    _setPatient(id: string, patient: HMSPatient) {
      patients.set(id, patient);
    },
    _setAppointments(patientId: string, appts: HMSAppointment[]) {
      appointments.set(patientId, appts);
    },
    async getPatient(patientId: string): Promise<HMSPatient | null> {
      return patients.get(patientId) || null;
    },
    async searchPatients(query: string): Promise<HMSPatient[]> {
      const lowerQuery = query.toLowerCase();
      return Array.from(patients.values()).filter(
        p => p.firstName.toLowerCase().includes(lowerQuery) ||
             p.lastName.toLowerCase().includes(lowerQuery) ||
             p.nationalId?.includes(query)
      );
    },
    async getPatientAppointments(patientId: string): Promise<HMSAppointment[]> {
      return appointments.get(patientId) || [];
    },
    async getDoctorSchedule(doctorId: string, date: string): Promise<HMSAppointment[]> {
      const allAppointments: HMSAppointment[] = [];
      appointments.forEach(appts => {
        appts.forEach(a => {
          if (a.doctorId === doctorId && a.date === date) {
            allAppointments.push(a);
          }
        });
      });
      return allAppointments;
    },
  };
}

describe('HMS Adapter - Mock Tests', () => {
  let mockAdapter: HMSAdapter & { _setPatient: (id: string, patient: HMSPatient) => void; _setAppointments: (patientId: string, appointments: HMSAppointment[]) => void };

  beforeEach(() => {
    mockAdapter = createMockHMSAdapter();
  });

  describe('Patient Retrieval', () => {
    it('should retrieve existing patient by ID', async () => {
      const patient: HMSPatient = {
        id: 'hms-patient-001',
        firstName: 'Jane',
        lastName: 'Wanjiku',
        dateOfBirth: '1985-03-15',
        gender: 'female',
        phone: '+254721000001',
        email: 'jane.wanjiku@email.com',
        nationalId: '12345678',
      };

      mockAdapter._setPatient('hms-patient-001', patient);

      const result = await mockAdapter.getPatient('hms-patient-001');

      expect(result).not.toBeNull();
      expect(result!.firstName).toBe('Jane');
      expect(result!.lastName).toBe('Wanjiku');
    });

    it('should return null for non-existent patient', async () => {
      const result = await mockAdapter.getPatient('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('Patient Search', () => {
    it('should search patients by first name', async () => {
      mockAdapter._setPatient('p1', {
        id: 'p1', firstName: 'John', lastName: 'Doe',
        dateOfBirth: '1990-01-01', gender: 'male', phone: '+254700000001'
      });
      mockAdapter._setPatient('p2', {
        id: 'p2', firstName: 'Jane', lastName: 'Smith',
        dateOfBirth: '1985-05-15', gender: 'female', phone: '+254700000002'
      });

      const results = await mockAdapter.searchPatients('John');

      expect(results).toHaveLength(1);
      expect(results[0].firstName).toBe('John');
    });

    it('should search patients by last name', async () => {
      mockAdapter._setPatient('p1', {
        id: 'p1', firstName: 'John', lastName: 'Doe',
        dateOfBirth: '1990-01-01', gender: 'male', phone: '+254700000001'
      });
      mockAdapter._setPatient('p2', {
        id: 'p2', firstName: 'Jane', lastName: 'Smith',
        dateOfBirth: '1985-05-15', gender: 'female', phone: '+254700000002'
      });

      const results = await mockAdapter.searchPatients('Smith');

      expect(results).toHaveLength(1);
      expect(results[0].lastName).toBe('Smith');
    });

    it('should search patients by national ID', async () => {
      mockAdapter._setPatient('p1', {
        id: 'p1', firstName: 'John', lastName: 'Doe',
        dateOfBirth: '1990-01-01', gender: 'male', phone: '+254700000001',
        nationalId: '12345678'
      });

      const results = await mockAdapter.searchPatients('12345678');

      expect(results).toHaveLength(1);
      expect(results[0].nationalId).toBe('12345678');
    });

    it('should return empty array for no matches', async () => {
      mockAdapter._setPatient('p1', {
        id: 'p1', firstName: 'John', lastName: 'Doe',
        dateOfBirth: '1990-01-01', gender: 'male', phone: '+254700000001'
      });

      const results = await mockAdapter.searchPatients('XYZ123');

      expect(results).toHaveLength(0);
    });
  });

  describe('Appointments', () => {
    it('should retrieve patient appointments', async () => {
      const appointments: HMSAppointment[] = [
        {
          id: 'apt-1',
          patientId: 'p1',
          doctorId: 'doc-1',
          departmentId: 'dept-1',
          date: '2024-01-15',
          time: '09:00',
          reason: 'Follow-up visit',
          status: 'scheduled',
        },
        {
          id: 'apt-2',
          patientId: 'p1',
          doctorId: 'doc-2',
          departmentId: 'dept-2',
          date: '2024-01-20',
          time: '14:00',
          reason: 'Lab results review',
          status: 'scheduled',
        },
      ];

      mockAdapter._setAppointments('p1', appointments);

      const results = await mockAdapter.getPatientAppointments('p1');

      expect(results).toHaveLength(2);
      expect(results[0].reason).toBe('Follow-up visit');
    });

    it('should return empty array for patient with no appointments', async () => {
      const results = await mockAdapter.getPatientAppointments('patient-no-appointments');

      expect(results).toHaveLength(0);
    });

    it('should retrieve doctor schedule for specific date', async () => {
      const appointments: HMSAppointment[] = [
        {
          id: 'apt-1',
          patientId: 'p1',
          doctorId: 'doc-1',
          departmentId: 'dept-1',
          date: '2024-01-15',
          time: '09:00',
          reason: 'Checkup',
          status: 'scheduled',
        },
        {
          id: 'apt-2',
          patientId: 'p2',
          doctorId: 'doc-1',
          departmentId: 'dept-1',
          date: '2024-01-15',
          time: '10:00',
          reason: 'Consultation',
          status: 'scheduled',
        },
      ];

      mockAdapter._setAppointments('p1', appointments);
      mockAdapter._setAppointments('p2', appointments);

      const results = await mockAdapter.getDoctorSchedule('doc-1', '2024-01-15');

      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('HMS Adapter Switching', () => {
  type AdapterType = 'mock' | 'openmrs' | 'fhhir';

  interface AdapterFactory {
    createAdapter(type: AdapterType): HMSAdapter;
  }

  function createAdapterFactory(): AdapterFactory {
    return {
      createAdapter(type: AdapterType): HMSAdapter {
        switch (type) {
          case 'mock':
            return createMockHMSAdapter();
          case 'openmrs':
            return {
              async getPatient(id: string) { return null; },
              async searchPatients(query: string) { return []; },
              async getPatientAppointments(patientId: string) { return []; },
              async getDoctorSchedule(doctorId: string, date: string) { return []; },
            };
          case 'fhhir':
            return {
              async getPatient(id: string) { return null; },
              async searchPatients(query: string) { return []; },
              async getPatientAppointments(patientId: string) { return []; },
              async getDoctorSchedule(doctorId: string, date: string) { return []; },
            };
          default:
            throw new Error(`Unknown adapter type: ${type}`);
        }
      },
    };
  }

  it('should create mock adapter', () => {
    const factory = createAdapterFactory();
    const adapter = factory.createAdapter('mock');
    
    expect(adapter).toBeDefined();
    expect(typeof adapter.getPatient).toBe('function');
  });

  it('should create openmrs adapter', () => {
    const factory = createAdapterFactory();
    const adapter = factory.createAdapter('openmrs');
    
    expect(adapter).toBeDefined();
    expect(typeof adapter.getPatient).toBe('function');
  });

  it('should create fhhir adapter', () => {
    const factory = createAdapterFactory();
    const adapter = factory.createAdapter('fhhir');
    
    expect(adapter).toBeDefined();
    expect(typeof adapter.getPatient).toBe('function');
  });

  it('should throw error for unknown adapter type', () => {
    const factory = createAdapterFactory();
    
    expect(() => factory.createAdapter('unknown' as any)).toThrow('Unknown adapter type');
  });

  it('should switch between adapters', () => {
    const factory = createAdapterFactory();
    
    const mockAdapter = factory.createAdapter('mock');
    const openMrsAdapter = factory.createAdapter('openmrs');
    
    expect(mockAdapter).not.toBe(openMrsAdapter);
  });
});

describe('HMS Data Mapping', () => {
  interface HMSPatientData {
    uuid: string;
    givenName: string;
    familyName: string;
    birthdate: string;
    gender: 'M' | 'F';
    attributes: Array<{ attributeType: { uuid: string }; value: string }>;
  }

  interface LocalPatient {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    phone?: string;
    email?: string;
    nationalId?: string;
  }

  function mapHMSToLocal(hmsPatient: HMSPatientData): LocalPatient {
    const phoneAttr = hmsPatient.attributes.find(a => a.attributeType.uuid === 'phone-attribute-uuid');
    const emailAttr = hmsPatient.attributes.find(a => a.attributeType.uuid === 'email-attribute-uuid');
    const nationalIdAttr = hmsPatient.attributes.find(a => a.attributeType.uuid === 'national-id-uuid');

    return {
      id: hmsPatient.uuid,
      firstName: hmsPatient.givenName,
      lastName: hmsPatient.familyName,
      dateOfBirth: hmsPatient.birthdate,
      gender: hmsPatient.gender === 'M' ? 'male' : 'female',
      phone: phoneAttr?.value,
      email: emailAttr?.value,
      nationalId: nationalIdAttr?.value,
    };
  }

  it('should map HMS patient to local format', () => {
    const hmsData: HMSPatientData = {
      uuid: 'hms-uuid-123',
      givenName: 'Jane',
      familyName: 'Wanjiku',
      birthdate: '1985-03-15',
      gender: 'F',
      attributes: [
        { attributeType: { uuid: 'phone-attribute-uuid' }, value: '+254721000001' },
        { attributeType: { uuid: 'email-attribute-uuid' }, value: 'jane@example.com' },
        { attributeType: { uuid: 'national-id-uuid' }, value: '12345678' },
      ],
    };

    const localPatient = mapHMSToLocal(hmsData);

    expect(localPatient.id).toBe('hms-uuid-123');
    expect(localPatient.firstName).toBe('Jane');
    expect(localPatient.lastName).toBe('Wanjiku');
    expect(localPatient.gender).toBe('female');
    expect(localPatient.phone).toBe('+254721000001');
    expect(localPatient.email).toBe('jane@example.com');
    expect(localPatient.nationalId).toBe('12345678');
  });

  it('should handle missing attributes', () => {
    const hmsData: HMSPatientData = {
      uuid: 'hms-uuid-456',
      givenName: 'John',
      familyName: 'Doe',
      birthdate: '1990-01-01',
      gender: 'M',
      attributes: [],
    };

    const localPatient = mapHMSToLocal(hmsData);

    expect(localPatient.phone).toBeUndefined();
    expect(localPatient.email).toBeUndefined();
    expect(localPatient.nationalId).toBeUndefined();
  });
});
