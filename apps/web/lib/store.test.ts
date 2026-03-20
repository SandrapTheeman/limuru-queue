// Tests for Zustand store
import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore, useQueueStore } from './store';

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it('should have initial state', () => {
    const state = useAuthStore.getState();
    
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
  });

  it('should set user correctly', () => {
    const testUser = {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'patient' as const,
    };
    
    useAuthStore.getState().setUser(testUser);
    
    expect(useAuthStore.getState().user).toEqual(testUser);
  });

  it('should logout correctly', () => {
    // First set a user
    useAuthStore.setState({
      user: { id: 'user-1', name: 'Test', role: 'patient' as const },
      token: 'test-token',
      isAuthenticated: true,
    });
    
    // Then logout
    useAuthStore.getState().logout();
    
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});

describe('Queue Store', () => {
  beforeEach(() => {
    useQueueStore.setState({
      department: 'MED',
      patients: [],
      waiting: 0,
      called: 0,
      estimated_wait_time: 0,
      next_call_estimate: '',
      isLoading: false,
      currentPatient: null,
    });
  });

  it('should have initial state', () => {
    const state = useQueueStore.getState();
    
    expect(state.department).toBe('MED');
    expect(state.patients).toEqual([]);
    expect(state.waiting).toBe(0);
  });

  it('should set department correctly', () => {
    useQueueStore.getState().setDepartment('PED');
    
    expect(useQueueStore.getState().department).toBe('PED');
  });

  it('should update queue data', () => {
    const mockData = {
      patients: [
        { id: '1', ticket_number: 'MED001', patient_name: 'John', priority: false, wait_time: 5, position: 1, status: 'waiting', joined_at: '' }
      ],
      waiting: 1,
      called: 0,
      estimated_wait_time: 15,
      next_call_estimate: new Date().toISOString(),
    };
    
    useQueueStore.getState().setQueue(mockData);
    
    const state = useQueueStore.getState();
    expect(state.patients).toHaveLength(1);
    expect(state.waiting).toBe(1);
  });

  it('should add patient to queue', () => {
    const newPatient = { 
      id: '1', 
      ticket_number: 'MED001', 
      patient_name: 'John', 
      priority: false, 
      wait_time: 5, 
      position: 1, 
      status: 'waiting', 
      joined_at: '' 
    };
    
    useQueueStore.getState().addPatient(newPatient);
    
    expect(useQueueStore.getState().patients).toHaveLength(1);
    expect(useQueueStore.getState().waiting).toBe(1);
  });

  it('should remove patient from queue', () => {
    // First add a patient
    const newPatient = { 
      id: '1', 
      ticket_number: 'MED001', 
      patient_name: 'John', 
      priority: false, 
      wait_time: 5, 
      position: 1, 
      status: 'waiting', 
      joined_at: '' 
    };
    useQueueStore.getState().addPatient(newPatient);
    
    // Then remove
    useQueueStore.getState().removePatient('1');
    
    expect(useQueueStore.getState().patients).toHaveLength(0);
  });
});
