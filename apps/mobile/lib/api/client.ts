import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8787';

const TOKEN_KEY = 'auth_token';
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 1000;

interface RequestQueueItem {
  id: string;
  endpoint: string;
  method: string;
  data?: unknown;
  timestamp: number;
  retries: number;
}

let requestQueue: RequestQueueItem[] = [];
let isProcessing = false;
let isOnline = true;

interface ApiClientOptions extends RequestInit {
  skipAuth?: boolean;
  retry?: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  private async setAuthToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }

  private async clearAuthToken(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }

  private calculateBackoff(retries: number): number {
    return Math.min(BASE_RETRY_DELAY * Math.pow(2, retries), 10000);
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async processQueue(): Promise<void> {
    if (isProcessing || !isOnline || requestQueue.length === 0) {
      return;
    }

    isProcessing = true;

    while (requestQueue.length > 0 && isOnline) {
      const item = requestQueue[0];

      try {
        const token = await this.getAuthToken();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${this.baseUrl}${item.endpoint}`, {
          method: item.method,
          headers,
          body: item.data ? JSON.stringify(item.data) : undefined,
        });

        if (response.ok) {
          requestQueue.shift();
        } else if (response.status === 401) {
          await this.clearAuthToken();
          requestQueue = [];
          break;
        } else {
          item.retries++;
          if (item.retries >= MAX_RETRIES) {
            requestQueue.shift();
          }
          await this.sleep(this.calculateBackoff(item.retries));
        }
      } catch {
        item.retries++;
        if (item.retries >= MAX_RETRIES) {
          requestQueue.shift();
        } else {
          await this.sleep(this.calculateBackoff(item.retries));
        }
      }
    }

    isProcessing = false;
  }

  private async request<T>(
    endpoint: string,
    options: ApiClientOptions = {}
  ): Promise<T> {
    const { skipAuth = false, retry = true, ...fetchOptions } = options;

    const token = skipAuth ? null : await this.getAuthToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${this.baseUrl}${endpoint}`;
    const requestOptions: RequestInit = {
      ...fetchOptions,
      headers,
    };

    let lastError: Error | null = null;
    let retries = 0;

    while (retries < MAX_RETRIES) {
      try {
        const response = await fetch(url, requestOptions);

        if (response.status === 401) {
          await this.clearAuthToken();
          throw new Error('Unauthorized');
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        return response.json();
      } catch (error) {
        lastError = error as Error;

        if (!retry || retries >= MAX_RETRIES - 1) {
          if (!isOnline) {
            this.queueRequest(endpoint, requestOptions.method || 'GET', fetchOptions.body);
          }
          throw lastError;
        }

        retries++;
        await this.sleep(this.calculateBackoff(retries));
      }
    }

    throw lastError || new Error('Request failed');
  }

  private queueRequest(
    endpoint: string,
    method: string,
    data?: unknown
  ): string {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    requestQueue.push({
      id,
      endpoint,
      method,
      data,
      timestamp: Date.now(),
      retries: 0,
    });

    return id;
  }

  setOnlineStatus(online: boolean): void {
    isOnline = online;
    if (online) {
      this.processQueue();
    }
  }

  async get<T>(endpoint: string, options?: ApiClientOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(
    endpoint: string,
    data?: unknown,
    options?: ApiClientOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data,
    });
  }

  async put<T>(
    endpoint: string,
    data?: unknown,
    options?: ApiClientOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data,
    });
  }

  async delete<T>(endpoint: string, options?: ApiClientOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  async patch<T>(
    endpoint: string,
    data?: unknown,
    options?: ApiClientOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data,
    });
  }

  getPendingCount(): number {
    return requestQueue.length;
  }

  clearQueue(): void {
    requestQueue = [];
  }

  async getQueuedRequests(): Promise<RequestQueueItem[]> {
    return [...requestQueue];
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export { API_BASE_URL };
export type { ApiClientOptions };
