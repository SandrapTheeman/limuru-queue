# Test Suite for Limuru Cottage Hospital Queue Management System

This document describes how to run the test suite for the Limuru Cottage Hospital Queue Management System.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL running (local or Docker)
- Dependencies installed (`npm install` in `/apps/api`)

## Test Database Setup

### 1. Create Test Database

```bash
# Connect to PostgreSQL
psql -U postgres -h localhost

# Create test database
CREATE DATABASE hqs_test;
CREATE DATABASE hqs_test OWNER postgres;

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE hqs_test TO postgres;
```

### 2. Run Migrations on Test Database

```bash
cd apps/api
npm run db:migrate:test
```

Or manually:
```bash
PGPASSWORD=hospital_queue_secure_password psql -h localhost -U postgres -d hqs_test -f src/db/migrations/0001_complete_schema.sql
PGPASSWORD=hospital_queue_secure_password psql -h localhost -U postgres -d hqs_test -f src/db/migrations/0002_seed_data.sql
```

### 3. Set Environment Variables

Create a `.env.test` file in `/apps/api`:

```env
NODE_ENV=test
PORT=8788
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hqs_test
JWT_SECRET=test-secret-key-for-testing-only
JWT_EXPIRES_IN=24h
```

## Running Tests

### Run All API Tests

```bash
cd apps/api
npm test
```

### Run Tests with Coverage

```bash
cd apps/api
npm run test:coverage
```

### Run Tests in Watch Mode

```bash
cd apps/api
npm run test:watch
```

### Run Specific Test File

```bash
cd apps/api
npx vitest run tests/api/auth.test.js
```

### Run Integration Tests Only

```bash
cd apps/api
npx vitest run tests/integration/
```

### Run Database Tests Only

```bash
cd apps/api
npx vitest run tests/database/
```

### Run Frontend E2E Tests

```bash
cd apps/web
npx playwright test
```

### Run All Tests (API + E2E)

```bash
# From project root
npm test
```

## Test Structure

```
apps/api/
├── tests/
│   ├── setup.js              # Global test setup
│   ├── teardown.js           # Cleanup after tests
│   ├── api/
│   │   ├── auth.test.js      # Authentication tests
│   │   ├── users.test.js      # User management tests
│   │   ├── patients.test.js   # Patient CRUD tests
│   │   ├── queue.test.js      # Queue management tests
│   │   ├── appointments.test.js # Appointment tests
│   │   ├── messages.test.js   # Messaging tests
│   │   ├── voice-calls.test.js # Voice call tests
│   │   ├── analytics.test.js  # Analytics endpoints
│   │   ├── doctor-notes.test.js # Clinical notes tests
│   │   ├── prescriptions.test.js # Prescription tests
│   │   ├── rooms.test.js      # Room management tests
│   │   ├── notifications.test.js # Notification tests
│   │   ├── admin.test.js      # Admin settings tests
│   │   ├── websocket.test.js  # WebSocket tests
│   │   └── middleware.test.js # Middleware tests
│   ├── integration/
│   │   ├── auth-flow.test.js           # Complete auth flow
│   │   ├── patient-queue-flow.test.js   # Patient journey
│   │   ├── appointment-flow.test.js     # Appointment workflow
│   │   ├── doctor-workflow.test.js     # Doctor's workflow
│   │   └── message-notification-flow.test.js # Notifications
│   └── database/
│       ├── schema.test.js      # Table structure tests
│       ├── constraints.test.js  # FK/unique constraint tests
│       └── seeds.test.js        # Seed data validation

apps/web/
├── tests/
│   ├── auth.spec.js         # Login/logout tests
│   ├── dashboard.spec.js    # Dashboard functionality
│   ├── queue.spec.js        # Queue management UI
│   ├── appointments.spec.js # Appointment UI
│   ├── doctor-notes.spec.js  # Clinical notes UI
│   ├── notifications.spec.js # Notification UI
│   ├── kiosk.spec.js        # Kiosk mode tests
│   ├── waiting-display.spec.js # Display board tests
│   ├── settings.spec.js     # Settings page
│   └── analytics.spec.js    # Analytics charts
├── page-components.spec.js  # Shared page objects
└── playwright.config.js     # Playwright configuration
```

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@limuruhospital.co.ke | password123 |
| Doctor | doctor@hospital.co.ke | password123 |
| Nurse | nurse@hospital.co.ke | password123 |
| Receptionist | reception@hospital.co.ke | password123 |

## Coverage Requirements

- **Statements**: 80%
- **Branches**: 70%
- **Functions**: 80%
- **Lines**: 80%

## CI/CD

Tests run automatically on:
- Pull requests to `main` branch
- Push to `main` branch

See `.github/workflows/tests.yml` for configuration.

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Check test database exists
psql -U postgres -h localhost -l | grep hqs_test
```

### Port Already in Use

If port 8788 is in use during tests:
```bash
# Find and kill the process
lsof -i :8788
kill -9 <PID>
```

### Flaky Tests

If tests are flaky:
1. Check database cleanup in `teardown.js`
2. Ensure `beforeEach` creates fresh test data
3. Verify WebSocket connections are closed

## Writing New Tests

### API Test Template

```javascript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server.js';
import { testDb, fixtures, cleanup } from '../helpers/test-helpers.js';

describe('Feature Name', () => {
  let adminToken;
  let doctorToken;

  beforeAll(async () => {
    // Setup test data
    adminToken = await fixtures.createAdminUser();
    doctorToken = await fixtures.createDoctorUser();
  });

  afterAll(async () => {
    // Cleanup
    await cleanup();
  });

  describe('GET /api/endpoint', () => {
    it('should return data successfully', async () => {
      const res = await request(app)
        .get('/api/endpoint')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app)
        .get('/api/endpoint')
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });
});
```

### E2E Test Template

```javascript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should do something', async ({ page }) => {
    await page.fill('[data-testid="email"]', 'admin@limuruhospital.co.ke');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    await expect(page).toHaveURL('/dashboard');
  });
});
```
