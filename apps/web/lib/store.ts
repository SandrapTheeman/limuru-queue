// Zustand Store for Authentication and App State
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';

// Demo/Mock users for testing without backend
const DEMO_USERS = {
  // Admin
  'admin@limuruhospital.co.ke': {
    id: 'admin-001',
    name: 'System Administrator',
    email: 'admin@limuruhospital.co.ke',
    role: 'admin' as const,
  },
  // Doctor
  'doctor@hospital.co.ke': {
    id: 'doc-001',
    name: 'Dr. John Doe',
    email: 'doctor@hospital.co.ke',
    role: 'doctor' as const,
    department: 'MED',
    room: '101',
  },
  // Receptionist
  'reception@hospital.co.ke': {
    id: 'rec-001',
    name: 'Jane Smith',
    email: 'reception@hospital.co.ke',
    role: 'receptionist' as const,
  },
  // Patient
  'patient@demo.com': {
    id: 'patient-001',
    name: 'John Doe',
    email: 'patient@demo.com',
    role: 'patient' as const,
  },
};

// PIN-based demo doctor
const DEMO_PINS: Record<string, any> = {
  '1234': {
    id: 'doc-001',
    name: 'Dr. John Doe',
    role: 'doctor',
    department: 'MED',
    room: '101',
  },
  '5678': {
    id: 'doc-002',
    name: 'Dr. Sarah Kimani',
    role: 'doctor',
    department: 'PED',
    room: '102',
  },
};

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

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string, type: 'patient' | 'staff') => {
        set({ isLoading: true });
        
        // Try actual API login first
        try {
          const response = type === 'patient' 
            ? await api.patientLogin(email, password)
            : await api.staffLogin(email, password);
          
          api.setToken(response.token);
          set({ 
            user: response.user, 
            token: response.token, 
            isAuthenticated: true,
            isLoading: false 
          });
        } catch (apiError) {
          // Fallback to demo credentials if API fails
          console.warn('API login failed, trying demo credentials:', apiError);
          
          const demoEmail = email.toLowerCase();
          if (DEMO_USERS[demoEmail as keyof typeof DEMO_USERS]) {
            const demoUser = DEMO_USERS[demoEmail as keyof typeof DEMO_USERS];
            api.setToken('demo-token-' + Date.now());
            set({ 
              user: demoUser, 
              token: 'demo-token-' + Date.now(), 
              isAuthenticated: true,
              isLoading: false 
            });
            return;
          }
          
          set({ isLoading: false });
          throw apiError;
        }
      },

      loginWithPin: async (pin: string, stationId?: string) => {
        set({ isLoading: true });
        
        // Try actual API login first
        try {
          const response = await api.doctorPinLogin(pin, stationId);
          api.setToken(response.token);
          set({ 
            user: response.user, 
            token: response.token, 
            isAuthenticated: true,
            isLoading: false 
          });
        } catch (apiError) {
          // Fallback to demo PINs if API fails
          console.warn('API PIN login failed, trying demo PINs:', apiError);
          
          if (DEMO_PINS[pin]) {
            const demoDoctor = DEMO_PINS[pin];
            api.setToken('demo-pin-token-' + Date.now());
            set({ 
              user: demoDoctor, 
              token: 'demo-pin-token-' + Date.now(), 
              isAuthenticated: true,
              isLoading: false 
            });
            return;
          }
          
          set({ isLoading: false });
          throw apiError;
        }
      },

      logout: () => {
        api.setToken(null);
        set({ user: null, token: null, isAuthenticated: false });
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        token: state.token, 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);

// Queue Store for real-time queue state
interface QueueItem {
  id: string;
  ticket_number: string;
  patient_number: string;  // Unique patient identifier (not name)
  patient_name?: string;   // Optional - for internal use only
  patient_phone?: string;
  patient_email?: string;
  department: string;
  priority: boolean;
  wait_time: number;
  position: number;
  status: string;
  joined_at: string;
  room_assigned?: string;
  doctor_name?: string;
}

interface QueueState {
  department: string;
  patients: QueueItem[];
  waiting: number;
  called: number;
  estimated_wait_time: number;
  next_call_estimate: string;
  isLoading: boolean;
  currentPatient: QueueItem | null;
  
  // Actions
  setDepartment: (dept: string) => void;
  setQueue: (data: any) => void;
  addPatient: (patient: QueueItem) => void;
  removePatient: (id: string) => void;
  callPatient: (patient: QueueItem) => void;
  setLoading: (loading: boolean) => void;
}

// Initial demo patients
const INITIAL_PATIENTS: QueueItem[] = [
  { id: '1', ticket_number: 'MED001', patient_number: 'PT-001', patient_name: 'John Mwangi', department: 'MED', priority: false, wait_time: 0, position: 1, status: 'called', joined_at: new Date().toISOString() },
  { id: '2', ticket_number: 'MED002', patient_number: 'PT-002', patient_name: 'Mary Wanjiku', department: 'MED', priority: false, wait_time: 15, position: 2, status: 'waiting', joined_at: new Date().toISOString() },
  { id: '3', ticket_number: 'MED003', patient_number: 'PT-003', patient_name: 'Peter Otieno', department: 'MED', priority: true, wait_time: 10, position: 3, status: 'waiting', joined_at: new Date().toISOString() },
  { id: '4', ticket_number: 'PED001', patient_number: 'PT-004', patient_name: 'Grace Nyongo', department: 'PED', priority: false, wait_time: 20, position: 1, status: 'waiting', joined_at: new Date().toISOString() },
  { id: '5', ticket_number: 'GYN001', patient_number: 'PT-005', patient_name: 'Jane Adhiambo', department: 'GYN', priority: true, wait_time: 5, position: 1, status: 'waiting', joined_at: new Date().toISOString() },
];

export const useQueueStore = create<QueueState>()((set) => ({
  department: 'MED',
  patients: INITIAL_PATIENTS,
  waiting: 4,
  called: 1,
  estimated_wait_time: 0,
  next_call_estimate: '',
  isLoading: false,
  currentPatient: INITIAL_PATIENTS[0],

  setDepartment: (department) => set({ department }),
  
  setQueue: (data) => set({
    patients: data.patients || [],
    waiting: data.waiting || 0,
    called: data.called || 0,
    estimated_wait_time: data.estimated_wait_time || 0,
    next_call_estimate: data.next_call_estimate || '',
  }),

  addPatient: (patient) => set((state) => ({
    patients: [...state.patients, patient],
    waiting: state.waiting + 1,
  })),

  removePatient: (id) => set((state) => ({
    patients: state.patients.filter(p => p.id !== id),
    waiting: Math.max(0, state.waiting - 1),
  })),

  callPatient: (patient) => set({ currentPatient: patient }),

  setLoading: (isLoading) => set({ isLoading }),
}));
