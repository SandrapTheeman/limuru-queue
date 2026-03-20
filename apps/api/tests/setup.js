/**
 * Test Setup - Global configuration for API tests
 */

// Set test environment variables before any imports
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only-minimum-32-chars';
process.env.JWT_EXPIRES_IN = '24h';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hqs_test';
process.env.PORT = '8788';

// Mock console methods to reduce noise during tests
const originalConsole = { ...console };

beforeAll(() => {
  // Suppress console output during tests (optional - uncomment if needed)
  // console.log = vi.fn();
  // console.error = vi.fn();
  // console.warn = vi.fn();
  // console.info = vi.fn();
});

afterAll(() => {
  // Restore console
  Object.assign(console, originalConsole);
});

// Global test timeout
jest.setTimeout(30000);
