// API Client - REST API wrapper
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;
    
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    // Handle both wrapped ({data: ...}) and direct responses
    return data.data || data;
  }

  // Auth
  async patientLogin(identifier: string, password: string) {
    return this.request<{ token: string; user: any }>('/api/auth/patient/login', {
      method: 'POST',
      body: { identifier, password },
    });
  }

  async staffLogin(email: string, password: string) {
    return this.request<{ token: string; user: any }>('/api/auth/staff/login', {
      method: 'POST',
      body: { email, password },
    });
  }

  async doctorPinLogin(pin: string, stationId?: string) {
    return this.request<{ token: string; user: any }>('/api/auth/pin/login', {
      method: 'POST',
      body: { pin, stationId },
    });
  }

  async register(data: { name: string; email?: string; phone?: string; password: string }) {
    return this.request<{ id: string; name: string }>('/api/auth/register', {
      method: 'POST',
      body: data,
    });
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request<{ message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    });
  }

  // Password Reset
  async requestPasswordReset(identifier: string) {
    return this.request<{ message: string; debugToken?: string }>('/api/auth/reset-password/request', {
      method: 'POST',
      body: { identifier },
    });
  }

  async confirmPasswordReset(token: string, newPassword: string) {
    return this.request<{ message: string }>('/api/auth/reset-password/confirm', {
      method: 'POST',
      body: { token, newPassword },
    });
  }

  // Queue
  async getQueue(department: string, limit = 20, offset = 0) {
    return this.request<any>(`/api/queue/${department}?limit=${limit}&offset=${offset}`);
  }

  async addToQueue(data: { name: string; phone?: string; email?: string; department: string; priority?: boolean; patientId?: string }) {
    return this.request<any>('/api/queue', { method: 'POST', body: data });
  }

  async callPatient(visitId: string, room: string, doctorId: string) {
    return this.request<any>(`/api/queue/${visitId}/call`, {
      method: 'POST',
      body: { room, doctorId },
    });
  }

  async startConsultation(visitId: string) {
    return this.request<any>(`/api/queue/${visitId}/start`, { method: 'POST' });
  }

  async completeVisit(visitId: string, notes?: { diagnosis?: string; prescription?: string; doctorNotes?: string }) {
    return this.request<any>(`/api/queue/${visitId}/complete`, {
      method: 'POST',
      body: notes,
    });
  }

  async markNoShow(visitId: string) {
    return this.request<any>(`/api/queue/${visitId}/no-show`, { method: 'POST' });
  }

  async transferPatient(visitId: string, department: string, actorId?: string) {
    return this.request<any>(`/api/queue/${visitId}/transfer`, {
      method: 'POST',
      body: { department, actorId },
    });
  }

  // Patients
  async getPatient(id: string) {
    return this.request<any>(`/api/patients/${id}`);
  }

  async updatePatient(id: string, data: any) {
    return this.request<any>(`/api/patients/${id}`, { method: 'PUT', body: data });
  }

  async searchPatients(query: string, limit = 10) {
    return this.request<any>('/api/patients/search', {
      method: 'POST',
      body: { query, limit },
    });
  }

  async getPatientHistory(patientId: string, limit = 10, offset = 0) {
    return this.request<any>(`/api/patients/${patientId}/history?limit=${limit}&offset=${offset}`);
  }

  // Doctors
  async getDoctors(department?: string) {
    const query = department ? `?department=${department}` : '';
    return this.request<any[]>(`/api/doctors${query}`);
  }

  async getDoctor(id: string) {
    return this.request<any>(`/api/doctors/${id}`);
  }

  async updateDoctorStatus(id: string, isAvailable: boolean, breakUntil?: string) {
    return this.request<any>(`/api/doctors/${id}/status`, {
      method: 'PUT',
      body: { isAvailable, breakUntil },
    });
  }

  // Departments
  async getDepartments() {
    return this.request<any[]>('/api/departments');
  }

  // Queue
  async getQueueSummary() {
    return this.request<any[]>('/api/queue/all/summary');
  }

  // Admin - Departments
  async getAdminDepartments() {
    return this.request<any[]>('/api/admin/departments');
  }

  async createDepartment(data: { code: string; name: string; description?: string; color?: string; icon?: string }) {
    return this.request<any>('/api/admin/departments', { method: 'POST', body: data });
  }

  async updateDepartment(id: string, data: { name?: string; description?: string; color?: string; icon?: string; is_active?: boolean }) {
    return this.request<any>(`/api/admin/departments/${id}`, { method: 'PUT', body: data });
  }

  async deleteDepartment(id: string) {
    return this.request<any>(`/api/admin/departments/${id}`, { method: 'DELETE' });
  }

  // Admin
  async getStats() {
    return this.request<any>('/api/admin/stats');
  }

  async getSettings() {
    return this.request<Record<string, string>>('/api/admin/settings');
  }

  async updateSettings(settings: Record<string, string>) {
    return this.request<any>('/api/admin/settings', { method: 'PUT', body: settings });
  }

  async getIptvChannels() {
    return this.request<any[]>('/api/admin/iptv');
  }

  async addIptvChannel(data: { name: string; url: string; category?: string; logo?: string }) {
    return this.request<any>('/api/admin/iptv', { method: 'POST', body: data });
  }

  // Clinical Notes
  async getClinicalNotes(params?: { patientId?: string; visitId?: string; doctorId?: string; limit?: number; offset?: number }) {
    const query = new URLSearchParams();
    if (params?.patientId) query.set('patientId', params.patientId);
    if (params?.visitId) query.set('visitId', params.visitId);
    if (params?.doctorId) query.set('doctorId', params.doctorId);
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());
    return this.request<any>(`/api/clinical?${query.toString()}`);
  }

  async getClinicalNoteById(id: string) {
    return this.request<any>(`/api/clinical/${id}`);
  }

  async getClinicalNotesByVisit(visitId: string) {
    return this.request<any>(`/api/clinical/visit/${visitId}`);
  }

  async getClinicalNotesByPatient(patientId: string, limit = 20, offset = 0) {
    return this.request<any>(`/api/clinical/patient/${patientId}?limit=${limit}&offset=${offset}`);
  }

  async createClinicalNote(data: any) {
    return this.request<any>('/api/clinical', { method: 'POST', body: data });
  }

  async updateClinicalNote(id: string, data: any) {
    return this.request<any>(`/api/clinical/${id}`, { method: 'PUT', body: data });
  }

  async deleteClinicalNote(id: string) {
    return this.request<any>(`/api/clinical/${id}`, { method: 'DELETE' });
  }

  async searchClinicalNotes(query: string, params?: { patientId?: string; doctorId?: string; fromDate?: string; toDate?: string }) {
    const searchParams = new URLSearchParams({ q: query });
    if (params?.patientId) searchParams.set('patientId', params.patientId);
    if (params?.doctorId) searchParams.set('doctorId', params.doctorId);
    if (params?.fromDate) searchParams.set('fromDate', params.fromDate);
    if (params?.toDate) searchParams.set('toDate', params.toDate);
    return this.request<any>(`/api/clinical/search?${searchParams.toString()}`);
  }

  // Vitals
  async getVitals(patientId: string) {
    return this.request<any>(`/api/vitals/${patientId}`);
  }

  async recordVitals(data: {
    patientId: string;
    visitId?: string;
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    heartRate?: number;
    temperature?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
    weight?: number;
    height?: number;
    chiefComplaint?: string;
    painLevel?: number;
    notes?: string;
  }) {
    return this.request<any>('/api/vitals', { method: 'POST', body: data });
  }

  async getLatestVitals(patientId: string) {
    return this.request<any>(`/api/vitals/triage/${patientId}`);
  }

  async performTriage(data: {
    chiefComplaint: string;
    symptoms?: string[];
    symptomDuration?: string;
    painLevel: number;
    vitalSigns?: {
      bloodPressureSystolic?: number;
      bloodPressureDiastolic?: number;
      heartRate?: number;
      temperature?: number;
      oxygenSaturation?: number;
    };
    medicalHistory?: string[];
    allergies?: string[];
  }) {
    return this.request<any>('/api/vitals/triage', { method: 'POST', body: data });
  }

  // Direct request methods for custom endpoints
  async get(endpoint: string) {
    return this.request<any>(endpoint);
  }

  async post(endpoint: string, data: any) {
    return this.request<any>(endpoint, { method: 'POST', body: data });
  }

  async put(endpoint: string, data: any) {
    return this.request<any>(endpoint, { method: 'PUT', body: data });
  }

  async del(endpoint: string) {
    return this.request<any>(endpoint, { method: 'DELETE' });
  }

  // Health check
  async healthCheck() {
    return this.request<{ status: string }>('/health');
  }
}

export const api = new ApiClient();
