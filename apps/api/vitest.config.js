import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    teardownTimeout: 30000,
    include: ['tests/**/*.test.js', 'tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80
      },
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        '**/*.config.js',
        '**/*.config.ts',
        'coverage/**'
      ]
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
