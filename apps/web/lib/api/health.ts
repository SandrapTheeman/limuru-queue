import { apiClient } from './client';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  services?: {
    database?: ServiceHealth;
    cache?: ServiceHealth;
    queue?: ServiceHealth;
  };
}

export interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  message?: string;
}

export const healthApi = {
  check: () => apiClient.get<HealthStatus>('/health'),
  
  checkDetailed: () => apiClient.get<HealthStatus>('/health/detailed'),
  
  ping: async (): Promise<boolean> => {
    try {
      await apiClient.get<{ message: string }>('/health/ping');
      return true;
    } catch {
      return false;
    }
  },
  
  getApiHealth: async (): Promise<ServiceHealth> => {
    try {
      const start = Date.now();
      const response = await apiClient.get<{ status: string }>('/health');
      const latency = Date.now() - start;
      
      return {
        status: response.status === 'ok' ? 'up' : 'degraded',
        latency,
      };
    } catch (error) {
      return {
        status: 'down',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
};
