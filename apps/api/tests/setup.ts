import { vi } from 'vitest';

vi.mock('../src/db/index.js', () => ({
  query: vi.fn(),
}));

process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '24h';

global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};
