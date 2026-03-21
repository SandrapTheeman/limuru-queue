import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'tests/**/*.test.ts', 'tests/**/*.spec.ts'],
    exclude: ['node_modules/**', 'dist/**', '.turbo/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'dist/**',
        '.turbo/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/migrations/**',
        'tests/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        'wrangler.toml',
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    setupFiles: ['./tests/setup.ts'],
    reporters: ['default', 'verbose'],
    outputFile: {
      json: './coverage/test-results.json',
    },
  },
  resolve: {
    alias: {
      '@': './src',
      '@tests': './tests',
    },
  },
});
