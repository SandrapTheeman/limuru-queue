import type { HMSAdapter, HMSAdapterType, HMSConfig, HMSPatient, HMSAppointment, LabOrder, HMSSyncStatus } from '@limuru-queue/shared/hms-adapters';
import { createHMSAdapter, validateHMSConfig, HMS_ADAPTER_TYPES } from '@limuru-queue/shared/hms-adapters';

export class HMSService {
  private adapter: HMSAdapter;
  private syncStatus: HMSSyncStatus = {
    lastSync: null,
    status: 'idle',
    patientsSynced: 0,
    appointmentsSynced: 0,
  };

  constructor(adapter: HMSAdapter) {
    this.adapter = adapter;
  }

  getAdapter(): HMSAdapter {
    return this.adapter;
  }

  getSyncStatus(): HMSSyncStatus {
    return { ...this.syncStatus };
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const doctors = await this.adapter.getDoctors();
      return { success: doctors.length >= 0 };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async searchPatients(query: string): Promise<HMSPatient[]> {
    return this.adapter.searchPatients(query);
  }

  async getPatient(hmsPatientId: string): Promise<HMSPatient | null> {
    return this.adapter.getPatient(hmsPatientId);
  }

  async getPatientAppointments(hmsPatientId: string): Promise<HMSAppointment[]> {
    return this.adapter.getPatientAppointments(hmsPatientId);
  }

  async createPatient(patient: Partial<HMSPatient>): Promise<HMSPatient> {
    return this.adapter.createPatient(patient);
  }

  async updatePatient(hmsPatientId: string, updates: Partial<HMSPatient>): Promise<HMSPatient> {
    return this.adapter.updatePatient(hmsPatientId, updates);
  }

  async verifyPatient(hmsPatientId: string): Promise<boolean> {
    return this.adapter.verifyPatient(hmsPatientId);
  }

  async getAppointments(date: string, departmentId?: string): Promise<HMSAppointment[]> {
    return this.adapter.getAppointments(date, departmentId);
  }

  async createAppointment(data: Omit<HMSAppointment, 'id'>): Promise<HMSAppointment> {
    return this.adapter.createAppointment(data);
  }

  async cancelAppointment(id: string): Promise<boolean> {
    return this.adapter.cancelAppointment(id);
  }

  async getDoctors(departmentId?: string) {
    return this.adapter.getDoctors(departmentId);
  }

  async getDoctorAvailability(doctorId: string, date: string) {
    return this.adapter.getDoctorAvailability(doctorId, date);
  }

  async submitLabOrder(order: LabOrder): Promise<boolean> {
    return this.adapter.submitLabOrder(order);
  }

  async getLabResults(orderId: string): Promise<string | null> {
    return this.adapter.getLabResults(orderId);
  }

  async getLabOrders(patientId: string): Promise<LabOrder[]> {
    return this.adapter.getLabOrders(patientId);
  }

  async getLabSamples(): Promise<any[]> {
    return this.adapter.getLabSamples();
  }

  async syncPatients(db: D1Database): Promise<{ success: boolean; synced: number; error?: string }> {
    this.syncStatus.status = 'syncing';
    
    try {
      const hmsPatients = await this.adapter.searchPatients('');
      let synced = 0;

      for (const patient of hmsPatients) {
        const existing = await db.prepare(
          'SELECT id FROM patients WHERE hms_patient_id = ?'
        ).bind(patient.id).first();

        if (!existing) {
          await db.prepare(`
            INSERT INTO patients (id, name, email, phone, hms_patient_id, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
          `).bind(
            `patient-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            `${patient.first_name} ${patient.last_name}`,
            patient.email || null,
            patient.phone || null,
            patient.id
          ).run();
        }
        synced++;
      }

      this.syncStatus = {
        lastSync: new Date().toISOString(),
        status: 'idle',
        patientsSynced: synced,
        appointmentsSynced: this.syncStatus.appointmentsSynced,
      };

      return { success: true, synced };
    } catch (error) {
      this.syncStatus.status = 'error';
      this.syncStatus.error = String(error);
      return { success: false, synced: 0, error: String(error) };
    }
  }

  async syncAppointments(db: D1Database, date: string): Promise<{ success: boolean; synced: number; error?: string }> {
    this.syncStatus.status = 'syncing';
    
    try {
      const appointments = await this.adapter.getAppointments(date);
      let synced = 0;

      for (const appt of appointments) {
        const patient = await db.prepare(
          'SELECT id FROM patients WHERE hms_patient_id = ?'
        ).bind(appt.patient_id).first();

        if (patient) {
          const existing = await db.prepare(
            'SELECT id FROM appointments WHERE hms_appointment_id = ?'
          ).bind(appt.id).first();

          if (!existing) {
            await db.prepare(`
              INSERT INTO appointments (id, patient_id, department, scheduled_at, status, hms_appointment_id, created_at)
              VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            `).bind(
              `appt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              patient.id,
              appt.department_id,
              `${appt.date} ${appt.time}`,
              appt.status,
              appt.id
            ).run();
          }
        }
        synced++;
      }

      this.syncStatus = {
        ...this.syncStatus,
        lastSync: new Date().toISOString(),
        status: 'idle',
        appointmentsSynced: synced,
      };

      return { success: true, synced };
    } catch (error) {
      this.syncStatus.status = 'error';
      this.syncStatus.error = String(error);
      return { success: false, synced: 0, error: String(error) };
    }
  }
}

export function createHMSService(config: HMSConfig): HMSService {
  const validation = validateHMSConfig(config);
  if (!validation.valid) {
    throw new Error(`Invalid HMS config: ${validation.errors.join(', ')}`);
  }
  
  const adapter = createHMSAdapter(config);
  return new HMSService(adapter);
}

export function createHMSServiceFromEnv(env: Record<string, string>): HMSService | null {
  const type = env.HMS_TYPE as HMSAdapterType;
  
  if (!type || type === 'mock') {
    return createHMSService({ type: HMS_ADAPTER_TYPES.MOCK });
  }

  const config: HMSConfig = {
    type,
    baseUrl: env.HMS_BASE_URL,
    username: env.HMS_USERNAME,
    password: env.HMS_PASSWORD,
    facilityId: env.HMS_FACILITY_ID,
  };

  return createHMSService(config);
}