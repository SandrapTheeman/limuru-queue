import { create } from 'zustand';
import { queueApi, departmentApi, type QueuePosition, type Department } from '@/lib/api/endpoints';

interface QueueState {
  currentPosition: QueuePosition | null;
  departmentQueue: QueuePosition[];
  departments: Department[];
  selectedDepartment: Department | null;
  isLoading: boolean;
  error: string | null;
  fetchDepartments: () => Promise<void>;
  selectDepartment: (department: Department) => void;
  joinQueue: (departmentId: string) => Promise<QueuePosition>;
  leaveQueue: (positionId: string) => Promise<void>;
  fetchMyPosition: () => Promise<void>;
  fetchDepartmentQueue: (departmentId: string) => Promise<void>;
  callNext: (departmentId: string) => Promise<QueuePosition | null>;
  updateQueueStatus: (positionId: string, status: QueuePosition['status']) => Promise<void>;
  clearError: () => void;
}

export const useQueueStore = create<QueueState>((set, get) => ({
  currentPosition: null,
  departmentQueue: [],
  departments: [],
  selectedDepartment: null,
  isLoading: false,
  error: null,

  fetchDepartments: async () => {
    set({ isLoading: true, error: null });
    try {
      const departments = await departmentApi.getAll();
      set({ departments, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch departments',
        isLoading: false,
      });
    }
  },

  selectDepartment: (department: Department) => {
    set({ selectedDepartment: department });
  },

  joinQueue: async (departmentId: string) => {
    set({ isLoading: true, error: null });
    try {
      const position = await queueApi.joinQueue(departmentId);
      set({ currentPosition: position, isLoading: false });
      return position;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to join queue',
        isLoading: false,
      });
      throw error;
    }
  },

  leaveQueue: async (positionId: string) => {
    set({ isLoading: true, error: null });
    try {
      await queueApi.leaveQueue(positionId);
      set({ currentPosition: null, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to leave queue',
        isLoading: false,
      });
      throw error;
    }
  },

  fetchMyPosition: async () => {
    set({ isLoading: true, error: null });
    try {
      const position = await queueApi.getMyPosition();
      set({ currentPosition: position, isLoading: false });
    } catch {
      set({ currentPosition: null, isLoading: false });
    }
  },

  fetchDepartmentQueue: async (departmentId: string) => {
    set({ isLoading: true, error: null });
    try {
      const queue = await queueApi.getQueueByDepartment(departmentId);
      set({ departmentQueue: queue, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch queue',
        isLoading: false,
      });
    }
  },

  callNext: async (departmentId: string) => {
    set({ isLoading: true, error: null });
    try {
      const position = await queueApi.callNext(departmentId);
      set({ isLoading: false });
      return position;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'No one in queue',
        isLoading: false,
      });
      return null;
    }
  },

  updateQueueStatus: async (positionId: string, status: QueuePosition['status']) => {
    set({ isLoading: true, error: null });
    try {
      await queueApi.updateStatus(positionId, status);
      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update status',
        isLoading: false,
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
