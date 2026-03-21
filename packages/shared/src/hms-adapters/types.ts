export interface HMSPatient {
  id: string;
  national_id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  address?: string;
  emergency_contact_name?: string;
  emergency_phone?: string;
  blood_type?: string;
  allergies?: string;
}

export interface HMSAppointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  department_id: string;
  date: string;
  time: string;
  status: string;
  reason?: string;
}

export interface HMSDoctor {
  id: string;
  first_name: string;
  last_name: string;
  department: string;
  specialty?: string;
  is_available: boolean;
}

export interface LabOrder {
  id: string;
  patient_id: string;
  doctor_id: string;
  test_name: string;
  test_code: string;
  priority: number;
  notes?: string;
}

export interface HMSAdapter {
  name: string;
  
  getPatient(hmsPatientId: string): Promise<HMSPatient | null>;
  searchPatients(query: string): Promise<HMSPatient[]>;
  getPatientAppointments(hmsPatientId: string): Promise<HMSAppointment[]>;
  createPatient(patient: Partial<HMSPatient>): Promise<HMSPatient>;
  updatePatient(hmsPatientId: string, updates: Partial<HMSPatient>): Promise<HMSPatient>;
  verifyPatient(hmsPatientId: string): Promise<boolean>;
  
  getAppointments(date: string, departmentId?: string): Promise<HMSAppointment[]>;
  createAppointment(data: Omit<HMSAppointment, 'id'>): Promise<HMSAppointment>;
  cancelAppointment(id: string): Promise<boolean>;
  
  getDoctors(departmentId?: string): Promise<HMSDoctor[]>;
  getDoctorAvailability(doctorId: string, date: string): Promise<{ available: boolean; nextSlot?: string }>;
  
  submitLabOrder(order: LabOrder): Promise<boolean>;
  getLabResults(orderId: string): Promise<string | null>;
  getLabOrders(patientId: string): Promise<LabOrder[]>;
  getLabSamples(): Promise<any[]>;
}

export interface HMSSyncStatus {
  lastSync: string | null;
  status: 'idle' | 'syncing' | 'error';
  error?: string;
  patientsSynced: number;
  appointmentsSynced: number;
}
