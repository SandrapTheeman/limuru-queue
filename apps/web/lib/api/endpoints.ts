import { apiClient } from './client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role?: 'patient' | 'staff' | 'admin';
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export interface Department {
  id: string;
  name: string;
  description: string;
  averageWaitTime: number;
  currentQueueLength: number;
}

export interface QueuePosition {
  id: string;
  patientId: string;
  departmentId: string;
  queueNumber: number;
  status: 'waiting' | 'called' | 'in-progress' | 'completed' | 'skipped';
  estimatedWaitTime: number;
  calledAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export const authApi = {
  login: (data: LoginRequest) => apiClient.post<AuthResponse>('/auth/login', data),
  register: (data: RegisterRequest) => apiClient.post<AuthResponse>('/auth/register', data),
  logout: () => apiClient.post<void>('/auth/logout'),
  me: () => apiClient.get<AuthResponse['user']>('/auth/me'),
};

export const departmentApi = {
  getAll: () => apiClient.get<Department[]>('/departments'),
  getById: (id: string) => apiClient.get<Department>(`/departments/${id}`),
  getQueueStats: (id: string) => apiClient.get<{ current: number; average: number }>(`/departments/${id}/stats`),
};

export const queueApi = {
  getMyPosition: () => apiClient.get<QueuePosition>('/queue/my-position'),
  joinQueue: (departmentId: string) => apiClient.post<QueuePosition>('/queue/join', { departmentId }),
  leaveQueue: (id: string) => apiClient.delete<void>(`/queue/${id}`),
  getQueueByDepartment: (departmentId: string) => apiClient.get<QueuePosition[]>(`/queue/department/${departmentId}`),
  callNext: (departmentId: string) => apiClient.post<QueuePosition>(`/queue/call-next`, { departmentId }),
  updateStatus: (id: string, status: QueuePosition['status']) => apiClient.patch<QueuePosition>(`/queue/${id}/status`, { status }),
};

export const patientApi = {
  getProfile: () => apiClient.get('/patients/me'),
  updateProfile: (data: Partial<{ name: string; phone: string }>) => apiClient.patch('/patients/me', data),
};
