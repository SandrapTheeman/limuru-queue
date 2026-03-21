// Mock D1 Database for testing
export interface MockD1Database {
  prepare: (sql: string) => {
    bind: (...args: any[]) => {
      first: <T = any>() => Promise<T | undefined>;
      run: () => Promise<{ success: boolean; results?: any[] }>;
      all: () => Promise<{ results: any[] }>;
    };
    first: <T = any>() => Promise<T | undefined>;
    run: () => Promise<{ success: boolean; results?: any[] }>;
    all: () => Promise<{ results: any[] }>;
  };
  batch: (statements: any[]) => Promise<any[]>;
  setData: (sql: string, results: any[]) => void;
  setFirstData: (sql: string, result: any) => void;
  clearData: () => void;
}

export function createMockD1(): MockD1Database {
  const data: Map<string, any[]> = new Map();
  const firstData: Map<string, any> = new Map();

  const mockDb: MockD1Database = {
    prepare: (sql: string) => ({
      bind: (..._args: any[]) => ({
        first: async <T = any>() => {
          const key = sql.trim();
          return firstData.get(key) as T | undefined;
        },
        run: async () => {
          const key = sql.trim();
          if (!data.has(key)) {
            data.set(key, []);
          }
          return { success: true };
        },
        all: async () => {
          const key = sql.trim();
          return { results: data.get(key) || [] };
        },
      }),
      first: async <T = any>() => {
        const key = sql.trim();
        return firstData.get(key) as T | undefined;
      },
      run: async () => {
        const key = sql.trim();
        if (!data.has(key)) {
          data.set(key, []);
        }
        return { success: true };
      },
      all: async () => {
        const key = sql.trim();
        return { results: data.get(key) || [] };
      },
    }),
    batch: async () => [],
    setData: (sql: string, results: any[]) => {
      data.set(sql.trim(), results);
    },
    setFirstData: (sql: string, result: any) => {
      firstData.set(sql.trim(), result);
    },
    clearData: () => {
      data.clear();
      firstData.clear();
    },
  };

  return mockDb;
}

// Mock KV Namespace for testing
export interface MockKV {
  get: (key: string, options?: any) => Promise<string | null>;
  put: (key: string, value: string, options?: any) => Promise<void>;
  delete: (key: string) => Promise<boolean>;
  list: (options?: any) => Promise<{ keys: Array<{ name: string }> }>;
}

export function createMockKV(): MockKV & { 
  store: Map<string, string>;
  set: (key: string, value: string) => void;
  getValue: (key: string) => string | undefined;
  clear: () => void;
} {
  const store = new Map<string, string>();

  const mockKV = {
    store,
    get: async (key: string, _options?: any) => {
      return store.get(key) || null;
    },
    put: async (key: string, value: string, _options?: any) => {
      store.set(key, value);
    },
    delete: async (key: string) => {
      return store.delete(key);
    },
    list: async (_options?: any) => {
      return {
        keys: Array.from(store.keys()).map(name => ({ name })),
      };
    },
    set: (key: string, value: string) => {
      store.set(key, value);
    },
    getValue: (key: string) => store.get(key),
    clear: () => store.clear(),
  };

  return mockKV;
}

// Mock Environment for Cloudflare Workers
export interface MockEnv {
  DB: MockD1Database;
  SESSION_KV: MockKV;
  CACHE_KV: MockKV;
  RATE_LIMIT_KV: MockKV;
  ENVIRONMENT: string;
  JWT_SECRET: string;
  DEFAULT_PASSWORD: string;
}

export function createMockEnv(): MockEnv {
  return {
    DB: createMockD1(),
    SESSION_KV: createMockKV(),
    CACHE_KV: createMockKV(),
    RATE_LIMIT_KV: createMockKV(),
    ENVIRONMENT: 'test',
    JWT_SECRET: 'test-secret-key',
    DEFAULT_PASSWORD: 'Test@123',
  };
}

// Helper to populate mock database with test data
export function populateMockData(db: MockD1Database, data: {
  patients?: any[];
  doctors?: any[];
  queue_tickets?: any[];
  users?: any[];
  settings?: any[];
}) {
  if (data.patients) {
    db.setData('SELECT * FROM patients', data.patients);
  }
  if (data.doctors) {
    db.setData('SELECT * FROM doctors', data.doctors);
  }
  if (data.queue_tickets) {
    db.setData('SELECT * FROM queue_tickets WHERE department = ? AND status = \'waiting\'', data.queue_tickets);
    db.setData('SELECT * FROM queue_tickets WHERE status = \'waiting\'', data.queue_tickets);
    db.setData('SELECT * FROM queue_tickets WHERE status = \'completed\' AND date(completed_at) = date(\'now\')', []);
  }
  if (data.users) {
    db.setData('SELECT * FROM users WHERE email = ? AND is_active = 1', data.users);
  }
  if (data.settings) {
    db.setData('SELECT * FROM settings', data.settings);
  }
}