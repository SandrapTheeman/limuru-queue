import type { HMSPatient, HMSAppointment, HMSDoctor, HMSAdapter, LabOrder, HMSSyncStatus } from './types';

export type { HMSPatient, HMSAppointment, HMSDoctor, HMSAdapter, LabOrder, HMSSyncStatus };

export const HMS_ADAPTER_TYPES = {
  MOCK: 'mock',
  OPENMRS: 'openmrs',
  BAHMNI: 'bahmni',
  OPENELIS: 'openelis',
  DHIS2: 'dhis2',
} as const;

export type HMSAdapterType = (typeof HMS_ADAPTER_TYPES)[keyof typeof HMS_ADAPTER_TYPES];

export interface HMSConfig {
  type: HMSAdapterType;
  baseUrl?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  facilityId?: string;
  timeout?: number;
  retryAttempts?: number;
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 1000, maxDelayMs = 10000 } = options;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
        console.log(`[HMS Retry] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

export function createHMSAdapter(config: HMSConfig): HMSAdapter {
  switch (config.type) {
    case HMS_ADAPTER_TYPES.MOCK:
      return new MockHMSAdapter();
    case HMS_ADAPTER_TYPES.OPENMRS:
      if (!config.baseUrl || !config.username || !config.password) {
        throw new Error('OpenMRS adapter requires baseUrl, username, and password');
      }
      return new OpenMRSHMSAdapter(config.baseUrl, config.username, config.password, config.facilityId);
    case HMS_ADAPTER_TYPES.BAHMNI:
      if (!config.baseUrl) {
        throw new Error('Bahmni adapter requires baseUrl');
      }
      return new BahmniHMSAdapter(config.baseUrl, config.username, config.password, config.facilityId);
    case HMS_ADAPTER_TYPES.OPENELIS:
      if (!config.baseUrl) {
        throw new Error('OpenELIS adapter requires baseUrl');
      }
      return new OpenELISHMSAdapter(config.baseUrl, config.username, config.password);
    default:
      throw new Error(`Unknown HMS adapter type: ${config.type}`);
  }
}

export class MockHMSAdapter implements HMSAdapter {
  name = 'mock';
  private patients: Map<string, HMSPatient> = new Map();
  private appointments: Map<string, HMSAppointment> = new Map();

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData(): void {
    const mockPatients: HMSPatient[] = [
      {
        id: 'HMS001',
        national_id: '12345678',
        first_name: 'Jane',
        last_name: 'Wanjiku',
        email: 'jane@email.com',
        phone: '+254721000001',
        date_of_birth: '1985-03-15',
        gender: 'female',
        address: 'Nairobi, Kenya',
        emergency_contact_name: 'John Wanjiku',
        emergency_phone: '+254721000002',
        blood_type: 'A+',
        allergies: 'Penicillin',
      },
      {
        id: 'HMS002',
        national_id: '23456789',
        first_name: 'Peter',
        last_name: 'Kamau',
        email: 'peter@email.com',
        phone: '+254721000003',
        date_of_birth: '1978-07-22',
        gender: 'male',
        address: 'Limuru, Kenya',
        emergency_contact_name: 'Mary Kamau',
        emergency_phone: '+254721000004',
        blood_type: 'O+',
      },
      {
        id: 'HMS003',
        national_id: '34567890',
        first_name: 'Emily',
        last_name: 'Njeri',
        email: 'emily@email.com',
        phone: '+254721000005',
        date_of_birth: '1992-11-08',
        gender: 'female',
        address: 'Kikuyu, Kenya',
        emergency_contact_name: 'Daniel Njeri',
        emergency_phone: '+254721000006',
        blood_type: 'B+',
        allergies: 'Sulfa drugs',
      },
    ];

    mockPatients.forEach((p) => this.patients.set(p.id, p));
  }

  async getPatient(hmsPatientId: string): Promise<HMSPatient | null> {
    await this.simulateNetworkDelay();
    return this.patients.get(hmsPatientId) || null;
  }

  async searchPatients(query: string): Promise<HMSPatient[]> {
    await this.simulateNetworkDelay();
    const lowerQuery = query.toLowerCase();
    return Array.from(this.patients.values()).filter(
      (p) =>
        p.first_name.toLowerCase().includes(lowerQuery) ||
        p.last_name.toLowerCase().includes(lowerQuery) ||
        p.national_id?.includes(query) ||
        p.phone.includes(query)
    );
  }

  async getPatientAppointments(hmsPatientId: string): Promise<HMSAppointment[]> {
    await this.simulateNetworkDelay();
    return Array.from(this.appointments.values()).filter((a) => a.patient_id === hmsPatientId);
  }

  async createPatient(patient: Partial<HMSPatient>): Promise<HMSPatient> {
    await this.simulateNetworkDelay();
    const newPatient: HMSPatient = {
      id: `HMS_${Date.now()}`,
      first_name: patient.first_name || '',
      last_name: patient.last_name || '',
      phone: patient.phone || '',
      email: patient.email,
      date_of_birth: patient.date_of_birth,
      gender: patient.gender,
      address: patient.address,
      national_id: patient.national_id,
      emergency_contact_name: patient.emergency_contact_name,
      emergency_phone: patient.emergency_phone,
      blood_type: patient.blood_type,
      allergies: patient.allergies,
    };
    this.patients.set(newPatient.id, newPatient);
    return newPatient;
  }

  async updatePatient(hmsPatientId: string, updates: Partial<HMSPatient>): Promise<HMSPatient> {
    await this.simulateNetworkDelay();
    const existing = this.patients.get(hmsPatientId);
    if (!existing) {
      throw new Error(`Patient not found: ${hmsPatientId}`);
    }
    const updated = { ...existing, ...updates };
    this.patients.set(hmsPatientId, updated);
    return updated;
  }

  async verifyPatient(hmsPatientId: string): Promise<boolean> {
    await this.simulateNetworkDelay();
    return this.patients.has(hmsPatientId);
  }

  async getAppointments(date: string, departmentId?: string): Promise<HMSAppointment[]> {
    await this.simulateNetworkDelay();
    const appointments = Array.from(this.appointments.values()).filter((a) => {
      if (a.date !== date) return false;
      if (departmentId && a.department_id !== departmentId) return false;
      return true;
    });
    return appointments;
  }

  async createAppointment(data: Omit<HMSAppointment, 'id'>): Promise<HMSAppointment> {
    await this.simulateNetworkDelay();
    const appointment: HMSAppointment = {
      ...data,
      id: `HMS_APPT_${Date.now()}`,
    };
    this.appointments.set(appointment.id, appointment);
    return appointment;
  }

  async cancelAppointment(id: string): Promise<boolean> {
    await this.simulateNetworkDelay();
    const appointment = this.appointments.get(id);
    if (!appointment) return false;
    this.appointments.set(id, { ...appointment, status: 'cancelled' });
    return true;
  }

  async getDoctors(departmentId?: string): Promise<HMSDoctor[]> {
    await this.simulateNetworkDelay();
    return [
      {
        id: 'HMS_DOC_001',
        first_name: 'John',
        last_name: 'Odhiambo',
        department: 'General Medicine',
        specialty: 'Internal Medicine',
        is_available: true,
      },
      {
        id: 'HMS_DOC_002',
        first_name: 'Grace',
        last_name: 'Wanjiru',
        department: 'Pediatrics',
        specialty: 'Pediatric Medicine',
        is_available: true,
      },
    ].filter((d) => !departmentId || d.department === departmentId);
  }

  async getDoctorAvailability(doctorId: string, date: string): Promise<{ available: boolean; nextSlot?: string }> {
    await this.simulateNetworkDelay();
    return { available: true, nextSlot: '09:00' };
  }

  async submitLabOrder(order: LabOrder): Promise<boolean> {
    await this.simulateNetworkDelay();
    console.log('[MockHMS] Lab order submitted:', order);
    return true;
  }

  async getLabResults(orderId: string): Promise<string | null> {
    await this.simulateNetworkDelay();
    return JSON.stringify({
      order_id: orderId,
      status: 'completed',
      results: { hemoglobin: 14.5, wbc: 7500, platelets: 250000 },
    });
  }

  async getLabOrders(patientId: string): Promise<LabOrder[]> {
    await this.simulateNetworkDelay();
    return [
      {
        id: 'LAB001',
        patient_id: patientId,
        doctor_id: 'HMS_DOC_001',
        test_name: 'Complete Blood Count',
        test_code: 'CBC',
        priority: 1,
        notes: 'Routine checkup',
      },
    ];
  }

  async getLabSamples(): Promise<any[]> {
    await this.simulateNetworkDelay();
    return [
      { id: 'SAMPLE001', orderId: 'LAB001', status: 'collected', collectedAt: new Date().toISOString() },
    ];
  }

  private async simulateNetworkDelay(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 100));
  }
}

export class OpenMRSHMSAdapter implements HMSAdapter {
  name = 'openmrs';
  private baseUrl: string;
  private auth: string;
  private facilityId?: string;
  private retryAttempts: number = 3;

  constructor(baseUrl: string, username: string, password: string, facilityId?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.auth = btoa(`${username}:${password}`);
    this.facilityId = facilityId;
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/ws/rest/v1${endpoint}`;
    
    return withRetry(async () => {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${this.auth}`,
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`OpenMRS API error: ${response.status} ${response.statusText}`);
      }

      return response.json() as T;
    }, { maxRetries: this.retryAttempts });
  }

  setRetryAttempts(count: number): void {
    this.retryAttempts = count;
  }

  async getPatient(hmsPatientId: string): Promise<HMSPatient | null> {
    try {
      const data = await this.fetch<any>(`/patient/${hmsPatientId}?v=full`);
      const person = data.person;
      return {
        id: data.uuid,
        first_name: person.givenName || '',
        last_name: person.familyName || '',
        phone: this.getAttribute(person, 'Telephone Number') || '',
        date_of_birth: person.birthdate,
        gender: person.gender === 'M' ? 'male' : person.gender === 'F' ? 'female' : 'other',
        address: this.getPersonAddress(person),
      };
    } catch (error) {
      console.error('[OpenMRS] Error fetching patient:', error);
      return null;
    }
  }

  async searchPatients(query: string): Promise<HMSPatient[]> {
    try {
      const data = await this.fetch<any>(`/patient?q=${encodeURIComponent(query)}&v=full`);
      return (data.results || []).map((p: any) => ({
        id: p.uuid,
        first_name: p.person.givenName || '',
        last_name: p.person.familyName || '',
        phone: this.getAttribute(p.person, 'Telephone Number') || '',
        national_id: p.identifiers?.[0]?.identifier,
      }));
    } catch (error) {
      console.error('[OpenMRS] Error searching patients:', error);
      return [];
    }
  }

  async verifyPatient(hmsPatientId: string): Promise<boolean> {
    const patient = await this.getPatient(hmsPatientId);
    return patient !== null;
  }

  async getPatientAppointments(hmsPatientId: string): Promise<HMSAppointment[]> {
    try {
      const data = await this.fetch<any>(`/appointment?patient=${hmsPatientId}&v=full`);
      return (data.results || []).map((a: any) => ({
        id: a.uuid,
        patient_id: a.patient.uuid,
        doctor_id: a.provider?.uuid || '',
        department_id: a.service?.uuid || '',
        date: a.startDate?.split('T')[0] || '',
        time: a.startDate?.split('T')[1]?.substring(0, 5) || '',
        status: a.status || 'scheduled',
        reason: a.service?.name || '',
      }));
    } catch (error) {
      console.error('[OpenMRS] Error fetching patient appointments:', error);
      return [];
    }
  }

  async createPatient(patient: Partial<HMSPatient>): Promise<HMSPatient> {
    try {
      const response = await this.fetch<any>('/person', {
        method: 'POST',
        body: JSON.stringify({
          names: [{ givenName: patient.first_name, familyName: patient.last_name }],
          gender: patient.gender === 'male' ? 'M' : patient.gender === 'female' ? 'F' : 'O',
          birthdate: patient.date_of_birth,
          attributes: [
            { attributeType: 'Telephone Number', value: patient.phone },
            patient.email && { attributeType: 'Email', value: patient.email },
            patient.national_id && { attributeType: 'National ID', value: patient.national_id },
          ].filter(Boolean),
          addresses: patient.address ? [{ address1: patient.address }] : [],
        }),
      });

      return {
        id: response.uuid,
        first_name: patient.first_name || '',
        last_name: patient.last_name || '',
        phone: patient.phone || '',
        email: patient.email,
        date_of_birth: patient.date_of_birth,
        gender: patient.gender,
        address: patient.address,
        national_id: patient.national_id,
      };
    } catch (error) {
      console.error('[OpenMRS] Error creating patient:', error);
      throw error;
    }
  }

  async updatePatient(hmsPatientId: string, updates: Partial<HMSPatient>): Promise<HMSPatient> {
    try {
      const current = await this.getPatient(hmsPatientId);
      if (!current) {
        throw new Error(`Patient not found: ${hmsPatientId}`);
      }

      const updated = { ...current, ...updates };
      await this.fetch(`/person/${hmsPatientId}`, {
        method: 'POST',
        body: JSON.stringify({
          names: [{ givenName: updated.first_name, familyName: updated.last_name }],
          gender: updated.gender === 'male' ? 'M' : updated.gender === 'female' ? 'F' : 'O',
          birthdate: updated.date_of_birth,
        }),
      });

      return updated;
    } catch (error) {
      console.error('[OpenMRS] Error updating patient:', error);
      throw error;
    }
  }

  async getAppointments(date: string, departmentId?: string): Promise<HMSAppointment[]> {
    try {
      const params = new URLSearchParams({ date, v: 'full' });
      if (departmentId) params.append('location', departmentId);
      
      const data = await this.fetch<any>(`/appointment?${params}`);
      return (data.results || []).map((a: any) => ({
        id: a.uuid,
        patient_id: a.patient.uuid,
        doctor_id: a.provider?.uuid || '',
        department_id: a.service?.uuid || '',
        date: a.startDate?.split('T')[0] || '',
        time: a.startDate?.split('T')[1]?.substring(0, 5) || '',
        status: a.status || 'scheduled',
        reason: a.service?.name || '',
      }));
    } catch (error) {
      console.error('[OpenMRS] Error fetching appointments:', error);
      return [];
    }
  }

  async createAppointment(data: Omit<HMSAppointment, 'id'>): Promise<HMSAppointment> {
    try {
      const appointment = {
        patient: data.patient_id,
        provider: data.doctor_id,
        service: data.department_id,
        startDate: `${data.date}T${data.time}:00`,
        status: data.status,
        kind: 'Scheduled',
      };
      
      const response = await this.fetch<any>('/appointment', {
        method: 'POST',
        body: JSON.stringify(appointment),
      });
      
      return {
        ...data,
        id: response.uuid,
      };
    } catch (error) {
      console.error('[OpenMRS] Error creating appointment:', error);
      throw error;
    }
  }

  async cancelAppointment(id: string): Promise<boolean> {
    try {
      await this.fetch(`/appointment/${id}`, {
        method: 'POST',
        body: JSON.stringify({ status: 'Cancelled' }),
      });
      return true;
    } catch (error) {
      console.error('[OpenMRS] Error cancelling appointment:', error);
      return false;
    }
  }

  async getDoctors(departmentId?: string): Promise<HMSDoctor[]> {
    try {
      const params = departmentId ? `?location=${departmentId}` : '';
      const data = await this.fetch<any>(`/provider${params}`);
      return (data.results || []).map((p: any) => ({
        id: p.uuid,
        first_name: p.person?.preferredName?.givenName || '',
        last_name: p.person?.preferredName?.familyName || '',
        department: p.location?.name || '',
        specialty: p.attributes?.find((a: any) => a.attributeType === 'Specialty')?.value || '',
        is_available: p.retired !== true,
      }));
    } catch (error) {
      console.error('[OpenMRS] Error fetching doctors:', error);
      return [];
    }
  }

  async getDoctorAvailability(doctorId: string, date: string): Promise<{ available: boolean; nextSlot?: string }> {
    try {
      const data = await this.fetch<any>(`/appointment/doctor/${doctorId}/availability?date=${date}`);
      return {
        available: data.available || false,
        nextSlot: data.nextSlot,
      };
    } catch (error) {
      console.error('[OpenMRS] Error checking availability:', error);
      return { available: false };
    }
  }

  async submitLabOrder(order: LabOrder): Promise<boolean> {
    try {
      await this.fetch('/lab/order', {
        method: 'POST',
        body: JSON.stringify({
          patient: order.patient_id,
          provider: order.doctor_id,
          concept: order.test_code,
          priority: order.priority,
          orderNumber: order.id,
        }),
      });
      return true;
    } catch (error) {
      console.error('[OpenMRS] Error submitting lab order:', error);
      return false;
    }
  }

  async getLabResults(orderId: string): Promise<string | null> {
    try {
      const data = await this.fetch<any>(`/lab/results?orderNumber=${orderId}`);
      return JSON.stringify(data.results);
    } catch (error) {
      console.error('[OpenMRS] Error fetching lab results:', error);
      return null;
    }
  }

  async getLabOrders(patientId: string): Promise<LabOrder[]> {
    try {
      const data = await this.fetch<any>(`/lab/order?patient=${patientId}`);
      return (data.results || []).map((o: any) => ({
        id: o.orderNumber,
        patient_id: o.patient,
        doctor_id: o.provider,
        test_name: o.test?.name || '',
        test_code: o.test?.code || '',
        priority: o.priority === 'STAT' ? 1 : 2,
        notes: o.comments,
      }));
    } catch (error) {
      console.error('[OpenMRS] Error fetching lab orders:', error);
      return [];
    }
  }

  async getLabSamples(): Promise<any[]> {
    try {
      const data = await this.fetch<any>('/lab/sample');
      return data.results || [];
    } catch (error) {
      console.error('[OpenMRS] Error fetching lab samples:', error);
      return [];
    }
  }

  private getAttribute(person: any, attributeType: string): string | undefined {
    return person.attributes?.find((a: any) => a.attributeType?.display === attributeType)?.value;
  }

  private getPersonAddress(person: any): string | undefined {
    const addr = person.preferredAddress;
    if (!addr) return undefined;
    return [addr.address1, addr.address2, addr.cityVillage, addr.stateProvince].filter(Boolean).join(', ');
  }
}

export class BahmniHMSAdapter implements HMSAdapter {
  name = 'bahmni';
  private baseUrl: string;
  private auth: string;
  private facilityId?: string;
  private retryAttempts: number = 3;

  constructor(baseUrl: string, username?: string, password?: string, facilityId?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.auth = btoa(`${username || 'admin'}:${password || 'admin'}`);
    this.facilityId = facilityId;
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/openmrs/ws/rest/v1${endpoint}`;
    
    return withRetry(async () => {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${this.auth}`,
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`Bahmni API error: ${response.status} ${response.statusText}`);
      }

      return response.json() as T;
    }, { maxRetries: this.retryAttempts });
  }

  setRetryAttempts(count: number): void {
    this.retryAttempts = count;
  }

  async getPatient(hmsPatientId: string): Promise<HMSPatient | null> {
    try {
      const data = await this.fetch<any>(`/patient/${hmsPatientId}?v=full`);
      const person = data.person;
      return {
        id: data.uuid,
        first_name: person.givenName || '',
        last_name: person.familyName || '',
        phone: this.getAttribute(person, 'phoneNumber') || '',
        date_of_birth: person.birthdate,
        gender: person.gender === 'M' ? 'male' : person.gender === 'F' ? 'female' : 'other',
        address: this.getPersonAddress(person),
      };
    } catch (error) {
      console.error('[Bahmni] Error fetching patient:', error);
      return null;
    }
  }

  async searchPatients(query: string): Promise<HMSPatient[]> {
    try {
      const data = await this.fetch<any>(`/patient?q=${encodeURIComponent(query)}&v=full`);
      return (data.results || []).map((p: any) => ({
        id: p.uuid,
        first_name: p.person.givenName || '',
        last_name: p.person.familyName || '',
        phone: this.getAttribute(p.person, 'phoneNumber') || '',
      }));
    } catch (error) {
      console.error('[Bahmni] Error searching patients:', error);
      return [];
    }
  }

  async verifyPatient(hmsPatientId: string): Promise<boolean> {
    const patient = await this.getPatient(hmsPatientId);
    return patient !== null;
  }

  async getPatientAppointments(hmsPatientId: string): Promise<HMSAppointment[]> {
    try {
      const data = await this.fetch<any>(`/appointment?patientUuid=${hmsPatientId}`);
      return (data.results || []).map((a: any) => ({
        id: a.uuid,
        patient_id: a.patient.uuid,
        doctor_id: a.provider?.uuid || '',
        department_id: a.service?.uuid || '',
        date: a.startDateTime?.split('T')[0] || '',
        time: a.startDateTime?.split('T')[1]?.substring(0, 5) || '',
        status: a.status || 'scheduled',
        reason: a.service?.name || '',
      }));
    } catch (error) {
      console.error('[Bahmni] Error fetching patient appointments:', error);
      return [];
    }
  }

  async createPatient(patient: Partial<HMSPatient>): Promise<HMSPatient> {
    try {
      const response = await this.fetch<any>('/bahmnicore/patient', {
        method: 'POST',
        body: JSON.stringify({
          person: {
            names: [{ givenName: patient.first_name, familyName: patient.last_name }],
            gender: patient.gender === 'male' ? 'M' : patient.gender === 'female' ? 'F' : 'O',
            birthdate: patient.date_of_birth,
          },
          identifiers: patient.national_id ? [{ identifier: patient.national_id, identifierType: 'National ID' }] : [],
        }),
      });

      return {
        id: response.uuid,
        first_name: patient.first_name || '',
        last_name: patient.last_name || '',
        phone: patient.phone || '',
        email: patient.email,
        date_of_birth: patient.date_of_birth,
        gender: patient.gender,
        address: patient.address,
        national_id: patient.national_id,
      };
    } catch (error) {
      console.error('[Bahmni] Error creating patient:', error);
      throw error;
    }
  }

  async updatePatient(hmsPatientId: string, updates: Partial<HMSPatient>): Promise<HMSPatient> {
    try {
      const current = await this.getPatient(hmsPatientId);
      if (!current) {
        throw new Error(`Patient not found: ${hmsPatientId}`);
      }

      const updated = { ...current, ...updates };
      await this.fetch(`/bahmnicore/patient/${hmsPatientId}`, {
        method: 'POST',
        body: JSON.stringify({
          person: {
            names: [{ givenName: updated.first_name, familyName: updated.last_name }],
            gender: updated.gender === 'male' ? 'M' : updated.gender === 'female' ? 'F' : 'O',
            birthdate: updated.date_of_birth,
          },
        }),
      });

      return updated;
    } catch (error) {
      console.error('[Bahmni] Error updating patient:', error);
      throw error;
    }
  }

  async getAppointments(date: string, departmentId?: string): Promise<HMSAppointment[]> {
    try {
      const params = new URLSearchParams({ appointmentDate: date });
      if (departmentId) params.append('locationUuid', departmentId);
      
      const data = await this.fetch<any>(`/appointment?${params}`);
      return (data.results || []).map((a: any) => ({
        id: a.uuid,
        patient_id: a.patient.uuid,
        doctor_id: a.provider?.uuid || '',
        department_id: a.service?.uuid || '',
        date: a.startDateTime?.split('T')[0] || '',
        time: a.startDateTime?.split('T')[1]?.substring(0, 5) || '',
        status: a.status || 'scheduled',
        reason: a.service?.name || '',
      }));
    } catch (error) {
      console.error('[Bahmni] Error fetching appointments:', error);
      return [];
    }
  }

  async createAppointment(data: Omit<HMSAppointment, 'id'>): Promise<HMSAppointment> {
    try {
      const response = await this.fetch<any>('/appointment', {
        method: 'POST',
        body: JSON.stringify({
          patientUuid: data.patient_id,
          providerUuid: data.doctor_id,
          serviceUuid: data.department_id,
          startDateTime: `${data.date}T${data.time}:00`,
          status: data.status,
        }),
      });
      
      return { ...data, id: response.uuid };
    } catch (error) {
      console.error('[Bahmni] Error creating appointment:', error);
      throw error;
    }
  }

  async cancelAppointment(id: string): Promise<boolean> {
    try {
      await this.fetch(`/appointment/${id}`, {
        method: 'DELETE',
      });
      return true;
    } catch (error) {
      console.error('[Bahmni] Error cancelling appointment:', error);
      return false;
    }
  }

  async getDoctors(departmentId?: string): Promise<HMSDoctor[]> {
    try {
      const data = await this.fetch<any>('/provider');
      return (data.results || []).map((p: any) => ({
        id: p.uuid,
        first_name: p.person?.givenName || '',
        last_name: p.person?.familyName || '',
        department: p.location?.name || '',
        specialty: '',
        is_available: true,
      }));
    } catch (error) {
      console.error('[Bahmni] Error fetching doctors:', error);
      return [];
    }
  }

  async getDoctorAvailability(doctorId: string, date: string): Promise<{ available: boolean; nextSlot?: string }> {
    return { available: true, nextSlot: '09:00' };
  }

  async submitLabOrder(order: LabOrder): Promise<boolean> {
    try {
      await this.fetch('/lab', {
        method: 'POST',
        body: JSON.stringify({
          patientUuid: order.patient_id,
          providerUuid: order.doctor_id,
          conceptUuid: order.test_code,
        }),
      });
      return true;
    } catch (error) {
      console.error('[Bahmni] Error submitting lab order:', error);
      return false;
    }
  }

  async getLabResults(orderId: string): Promise<string | null> {
    try {
      const data = await this.fetch<any>(`/lab/results?orderUuid=${orderId}`);
      return JSON.stringify(data);
    } catch (error) {
      console.error('[Bahmni] Error fetching lab results:', error);
      return null;
    }
  }

  async getLabOrders(patientId: string): Promise<LabOrder[]> {
    try {
      const data = await this.fetch<any>(`/lab/orders?patientUuid=${patientId}`);
      return (data.results || []).map((o: any) => ({
        id: o.uuid,
        patient_id: o.patientUuid,
        doctor_id: o.providerUuid,
        test_name: o.testName || '',
        test_code: o.testUuid || '',
        priority: o.priority === 'STAT' ? 1 : 2,
        notes: o.comments,
      }));
    } catch (error) {
      console.error('[Bahmni] Error fetching lab orders:', error);
      return [];
    }
  }

  async getLabSamples(): Promise<any[]> {
    try {
      const data = await this.fetch<any>('/lab/samples');
      return data.results || [];
    } catch (error) {
      console.error('[Bahmni] Error fetching lab samples:', error);
      return [];
    }
  }

  private getAttribute(person: any, attributeType: string): string | undefined {
    return person.attributes?.find((a: any) => a.attributeType?.display === attributeType)?.value;
  }

  private getPersonAddress(person: any): string | undefined {
    const addr = person.preferredAddress;
    if (!addr) return undefined;
    return [addr.address1, addr.address2, addr.cityVillage].filter(Boolean).join(', ');
  }
}

export class OpenELISHMSAdapter implements HMSAdapter {
  name = 'openelis';
  private baseUrl: string;
  private auth: string;

  constructor(baseUrl: string, username?: string, password?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.auth = btoa(`${username || 'admin'}:${password || 'admin'}`);
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${this.auth}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`OpenELIS API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as T;
  }

  async getPatient(hmsPatientId: string): Promise<HMSPatient | null> {
    return null;
  }

  async searchPatients(query: string): Promise<HMSPatient[]> {
    return [];
  }

  async verifyPatient(hmsPatientId: string): Promise<boolean> {
    return true;
  }

  async getPatientAppointments(hmsPatientId: string): Promise<HMSAppointment[]> {
    return [];
  }

  async createPatient(patient: Partial<HMSPatient>): Promise<HMSPatient> {
    return {
      id: crypto.randomUUID(),
      first_name: patient.first_name || '',
      last_name: patient.last_name || '',
      phone: patient.phone || '',
      email: patient.email,
      date_of_birth: patient.date_of_birth,
      gender: patient.gender,
      address: patient.address,
      national_id: patient.national_id,
    };
  }

  async updatePatient(hmsPatientId: string, updates: Partial<HMSPatient>): Promise<HMSPatient> {
    return {
      id: hmsPatientId,
      first_name: updates.first_name || '',
      last_name: updates.last_name || '',
      phone: updates.phone || '',
      email: updates.email,
      date_of_birth: updates.date_of_birth,
      gender: updates.gender,
      address: updates.address,
      national_id: updates.national_id,
    };
  }

  async getAppointments(date: string, departmentId?: string): Promise<HMSAppointment[]> {
    return [];
  }

  async createAppointment(data: Omit<HMSAppointment, 'id'>): Promise<HMSAppointment> {
    return { ...data, id: crypto.randomUUID() };
  }

  async cancelAppointment(id: string): Promise<boolean> {
    return true;
  }

  async getDoctors(departmentId?: string): Promise<HMSDoctor[]> {
    return [];
  }

  async getDoctorAvailability(doctorId: string, date: string): Promise<{ available: boolean; nextSlot?: string }> {
    return { available: true };
  }

  async submitLabOrder(order: LabOrder): Promise<boolean> {
    try {
      const response = await this.fetch<any>('/rest/labOrder', {
        method: 'POST',
        body: JSON.stringify({
          patientId: order.patient_id,
          providerId: order.doctor_id,
          testId: order.test_code,
          priority: order.priority,
        }),
      });
      return !!response.id;
    } catch (error) {
      console.error('[OpenELIS] Error submitting lab order:', error);
      return false;
    }
  }

  async getLabResults(orderId: string): Promise<string | null> {
    try {
      const data = await this.fetch<any>(`/rest/labOrder/${orderId}/results`);
      return JSON.stringify(data);
    } catch (error) {
      console.error('[OpenELIS] Error fetching lab results:', error);
      return null;
    }
  }

  async getLabOrders(patientId: string): Promise<LabOrder[]> {
    try {
      const data = await this.fetch<any>(`/rest/labOrder?patientId=${patientId}`);
      return (data || []).map((o: any) => ({
        id: o.id,
        patient_id: o.patientId,
        doctor_id: o.providerId,
        test_name: o.testName || '',
        test_code: o.testId || '',
        priority: o.priority || 2,
        notes: o.notes,
      }));
    } catch (error) {
      console.error('[OpenELIS] Error fetching lab orders:', error);
      return [];
    }
  }

  async getLabSamples(): Promise<any[]> {
    try {
      const data = await this.fetch<any>('/rest/sample');
      return data || [];
    } catch (error) {
      console.error('[OpenELIS] Error fetching lab samples:', error);
      return [];
    }
  }
}

export function validateHMSConfig(config: HMSConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.type) {
    errors.push('Adapter type is required');
  }

  switch (config.type) {
    case HMS_ADAPTER_TYPES.OPENMRS:
      if (!config.baseUrl) errors.push('OpenMRS requires baseUrl');
      if (!config.username) errors.push('OpenMRS requires username');
      if (!config.password) errors.push('OpenMRS requires password');
      break;
    case HMS_ADAPTER_TYPES.BAHMNI:
      if (!config.baseUrl) errors.push('Bahmni requires baseUrl');
      break;
    case HMS_ADAPTER_TYPES.OPENELIS:
      if (!config.baseUrl) errors.push('OpenELIS requires baseUrl');
      break;
  }

  return { valid: errors.length === 0, errors };
}
