// Mobile Store - Zustand with AsyncStorage persistence
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API URL configuration
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8787';

interface User {
  id: string;
  name: string;
  email?: string;
  role: 'patient' | 'admin' | 'doctor' | 'receptionist' | 'nurse';
  department?: string;
  room?: string;
  requiresPasswordChange?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (email: string, password: string, type: 'patient' | 'staff') => Promise<void>;
  loginWithPin: (pin: string, stationId?: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

// Simple fetch-based API client
export const api = {
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = useAuthStore.getState().token;
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  },

  patientLogin: (identifier: string, password: string) => 
    api.request<{ token: string; user: User }>('/api/auth/patient/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    }),

  staffLogin: (email: string, password: string) =>
    api.request<{ token: string; user: User }>('/api/auth/staff/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  doctorPinLogin: (pin: string, stationId?: string) =>
    api.request<{ token: string; user: User }>('/api/auth/pin/login', {
      method: 'POST',
      body: JSON.stringify({ pin, stationId }),
    }),

  getQueue: (department: string) =>
    api.request<any>(`/api/queue/${department}`),

  requestPasswordReset: (identifier: string) =>
    api.request<{ message: string }>('/api/auth/reset-password/request', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    }),

  confirmPasswordReset: (token: string, newPassword: string) =>
    api.request<{ message: string }>('/api/auth/reset-password/confirm', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }),
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string, type: 'patient' | 'staff') => {
        set({ isLoading: true });
        try {
          const response = type === 'patient'
            ? await api.patientLogin(email, password)
            : await api.staffLogin(email, password);
          
          set({ 
            user: response.user, 
            token: response.token, 
            isAuthenticated: true,
            isLoading: false 
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      loginWithPin: async (pin: string, stationId?: string) => {
        set({ isLoading: true });
        try {
          const response = await api.doctorPinLogin(pin, stationId);
          set({ 
            user: response.user, 
            token: response.token, 
            isAuthenticated: true,
            isLoading: false 
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ 
        token: state.token, 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);

// Queue Store
interface QueueItem {
  id: string;
  ticket_number: string;
  patient_name: string;
  priority: boolean;
  wait_time: number;
  position: number;
  status: string;
}

interface QueueState {
  department: string;
  patients: QueueItem[];
  waiting: number;
  called: number;
  estimated_wait_time: number;
  isLoading: boolean;
  
  setDepartment: (dept: string) => void;
  fetchQueue: () => Promise<void>;
}

export const useQueueStore = create<QueueState>()((set, get) => ({
  department: 'MED',
  patients: [],
  waiting: 0,
  called: 0,
  estimated_wait_time: 0,
  isLoading: false,

  setDepartment: (department) => {
    set({ department });
    get().fetchQueue();
  },
  
  fetchQueue: async () => {
    const { department } = get();
    set({ isLoading: true });
    try {
      const data = await api.getQueue(department);
      set({
        patients: data.patients || [],
        waiting: data.waiting || 0,
        called: data.called || 0,
        estimated_wait_time: data.estimated_wait_time || 0,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
    }
  },
}));
