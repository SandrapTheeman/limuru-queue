import { vi } from 'vitest';

vi.mock('../src/db/index.js', () => ({
  query: vi.fn(),
}));

process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '24h';
process.env.ENVIRONMENT = 'test';
process.env.DEFAULT_PASSWORD = 'Test@123';

Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => `test-uuid-${Math.random().toString(36).substr(2, 9)}`,
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256) as any;
      }
      return arr;
    },
    subtle: {
      digest: async (_algorithm: string, data: BufferSource) => {
        const encoded = new TextEncoder().encode('test-hash');
        return encoded.buffer;
      },
      encrypt: () => new ArrayBuffer(0),
      decrypt: () => new ArrayBuffer(0),
      sign: () => new ArrayBuffer(0),
      verify: () => true,
      deriveBits: () => new ArrayBuffer(0),
      deriveKey: () => ({} as CryptoKey),
      importKey: () => ({} as Promise<CryptoKey>),
      exportKey: () => new ArrayBuffer(0),
      wrapKey: () => new ArrayBuffer(0),
      unwrapKey: () => ({} as Promise<CryptoKey>),
    },
    randomFillSync: () => new Uint8Array(0),
    webkitSubtle: {},
  },
  writable: true,
});

global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};
