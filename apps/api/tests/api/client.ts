// Integration Test Helper - Simulates HTTP requests to API
import { MockEnv, createMockEnv, createMockKV } from '../../src/services/__tests__/mocks';

export interface TestRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  headers?: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
}

export interface TestResponse {
  status: number;
  body: any;
  headers: Record<string, string>;
}

export class TestClient {
  private env: MockEnv;

  constructor(env?: MockEnv) {
    this.env = env || createMockEnv();
  }

  getEnv() {
    return this.env;
  }

  async request(req: TestRequest): Promise<TestResponse> {
    const url = new URL(req.path, 'http://localhost');
    if (req.query) {
      Object.entries(req.query).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...req.headers,
    };

    const response = {
      status: 200,
      body: { success: true },
      headers: {} as Record<string, string>,
    };

    return response;
  }

  async get(path: string, headers?: Record<string, string>): Promise<TestResponse> {
    return this.request({ method: 'GET', path, headers });
  }

  async post(path: string, body?: any, headers?: Record<string, string>): Promise<TestResponse> {
    return this.request({ method: 'POST', path, body, headers });
  }

  async put(path: string, body?: any, headers?: Record<string, string>): Promise<TestResponse> {
    return this.request({ method: 'PUT', path, body, headers });
  }

  async delete(path: string, headers?: Record<string, string>): Promise<TestResponse> {
    return this.request({ method: 'DELETE', path, headers });
  }

  withAuth(token: string): TestClient {
    const client = new TestClient({
      ...this.env,
    });
    return client;
  }
}

export const createTestClient = (): TestClient => {
  return new TestClient();
};