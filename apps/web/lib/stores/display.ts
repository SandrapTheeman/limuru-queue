import { create } from 'zustand';
import { apiClient } from '@/lib/api/client';

interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  averageWaitTime: number;
  currentQueueLength: number;
}

interface QueuePatient {
  id: string;
  ticket_number: string;
  patient_number: string;
  patient_name?: string;
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

interface Channel {
  id: string;
  name: string;
  url: string;
  category: string;
  is_active: boolean;
  display_order: number;
}

interface DisplayState {
  departments: Department[];
  selectedDepartment: Department | null;
  currentPatient: QueuePatient | null;
  waitingPatients: QueuePatient[];
  announcement: string | null;
  activeChannel: Channel | null;
  channels: Channel[];
  isLoading: boolean;
  error: string | null;
  refreshInterval: number;
  
  fetchDepartments: () => Promise<void>;
  selectDepartment: (department: Department) => void;
  fetchQueue: (departmentId: string) => Promise<void>;
  setAnnouncement: (text: string | null) => void;
  setActiveChannel: (channel: Channel) => void;
  setChannels: (channels: Channel[]) => void;
  clearError: () => void;
}

const DEFAULT_DEPARTMENTS: Department[] = [
  { id: 'med', name: 'General Medicine', code: 'MED', description: 'General medical consultations', averageWaitTime: 15, currentQueueLength: 0 },
  { id: 'ped', name: 'Pediatrics', code: 'PED', description: 'Child healthcare', averageWaitTime: 12, currentQueueLength: 0 },
  { id: 'gyn', name: 'Gynecology', code: 'GYN', description: 'Women\'s health', averageWaitTime: 18, currentQueueLength: 0 },
  { id: 'ortho', name: 'Orthopedics', code: 'ORTH', description: 'Bone and joint care', averageWaitTime: 20, currentQueueLength: 0 },
  { id: 'den', name: 'Dental', code: 'DEN', description: 'Dental care', averageWaitTime: 10, currentQueueLength: 0 },
];

const DEMO_WAITING_PATIENTS: QueuePatient[] = [
  { id: '1', ticket_number: 'MED001', patient_number: 'PT-001', patient_name: 'John Mwangi', department: 'MED', priority: false, wait_time: 5, position: 1, status: 'called', joined_at: new Date().toISOString() },
  { id: '2', ticket_number: 'MED002', patient_number: 'PT-002', patient_name: 'Mary Wanjiku', department: 'MED', priority: false, wait_time: 18, position: 2, status: 'waiting', joined_at: new Date().toISOString() },
  { id: '3', ticket_number: 'MED003', patient_number: 'PT-003', patient_name: 'Peter Otieno', department: 'MED', priority: true, wait_time: 12, position: 3, status: 'waiting', joined_at: new Date().toISOString() },
  { id: '4', ticket_number: 'MED004', patient_number: 'PT-004', patient_name: 'Grace Nyongo', department: 'MED', priority: false, wait_time: 25, position: 4, status: 'waiting', joined_at: new Date().toISOString() },
  { id: '5', ticket_number: 'MED005', patient_number: 'PT-005', patient_name: 'James Kimani', department: 'MED', priority: false, wait_time: 30, position: 5, status: 'waiting', joined_at: new Date().toISOString() },
];

export const useDisplayStore = create<DisplayState>((set, get) => ({
  departments: DEFAULT_DEPARTMENTS,
  selectedDepartment: DEFAULT_DEPARTMENTS[0],
  currentPatient: DEMO_WAITING_PATIENTS[0],
  waitingPatients: DEMO_WAITING_PATIENTS.slice(1),
  announcement: null,
  activeChannel: null,
  channels: [],
  isLoading: false,
  error: null,
  refreshInterval: 30000,

  fetchDepartments: async () => {
    set({ isLoading: true, error: null });
    try {
      const departments = await apiClient.get<Department[]>('/departments');
      if (departments && departments.length > 0) {
        set({ departments, selectedDepartment: departments[0], isLoading: false });
      } else {
        set({ departments: DEFAULT_DEPARTMENTS, isLoading: false });
      }
    } catch {
      set({ departments: DEFAULT_DEPARTMENTS, isLoading: false });
    }
  },

  selectDepartment: (department: Department) => {
    set({ selectedDepartment: department });
    get().fetchQueue(department.id);
  },

  fetchQueue: async (departmentId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get<{
        currentPatient: QueuePatient | null;
        waitingPatients: QueuePatient[];
        stats: { waiting: number; averageWaitTime: number };
      }>(`/queue/department/${departmentId}`);

      if (response) {
        set({
          currentPatient: response.currentPatient,
          waitingPatients: response.waitingPatients || [],
          isLoading: false,
        });
      } else {
        const deptPatients = DEMO_WAITING_PATIENTS.filter(p => p.department === departmentId.toUpperCase());
        set({
          currentPatient: deptPatients[0] || null,
          waitingPatients: deptPatients.slice(1),
          isLoading: false,
        });
      }
    } catch {
      const deptPatients = DEMO_WAITING_PATIENTS.filter(p => p.department === departmentId.toUpperCase());
      set({
        currentPatient: deptPatients[0] || null,
        waitingPatients: deptPatients.slice(1),
        isLoading: false,
      });
    }
  },

  setAnnouncement: (text: string | null) => {
    set({ announcement: text });
  },

  setActiveChannel: (channel: Channel) => {
    set({ activeChannel: channel });
  },

  setChannels: (channels: Channel[]) => {
    set({ channels });
  },

  clearError: () => set({ error: null }),
}));
