# Test Suite for Limuru Cottage Hospital Queue Management System

This document provides comprehensive testing guidelines for the Limuru Cottage Hospital Queue Management System, covering unit tests, integration tests, E2E tests, and specialized testing for healthcare-critical functionality.

## Overview

The testing strategy focuses on:
- **Patient Safety**: Priority testing for registration, emergency workflows, and data privacy
- **Security**: Authentication, RBAC, and input validation
- **Performance**: API response times, queue operations, and real-time updates
- **Accessibility**: WCAG AA compliance

## Test Structure

```
apps/
├── api/
│   ├── src/
│   │   ├── services/
│   │   │   ├── __tests__/
│   │   │   │   ├── queue-engine.test.ts
│   │   │   │   ├── auth.test.ts
│   │   │   │   ├── hms-adapter.test.ts
│   │   │   │   ├── validation.test.ts
│   │   │   │   └── mocks.ts
│   │   │   └── whatsapp/
│   │   │       └── chatbot.test.ts
│   │   └── routes/
│   └── tests/
│       ├── integration/
│       │   └── healthcare-flows.test.ts
│       ├── performance.test.ts
│       ├── auth.test.ts
│       ├── queue.test.ts
│       ├── patients.test.ts
│       └── setup.ts
└── web/
    ├── e2e/
    │   ├── auth.spec.ts
    │   ├── queue.spec.ts
    │   ├── doctor-dashboard.spec.ts
    │   ├── admin.spec.ts
    │   └── healthcare-flows.spec.ts
    └── tests/
        ├── login.spec.ts
        ├── dashboard.spec.js
        └── tv-display.spec.ts
```

## Prerequisites

```bash
# Install dependencies
pnpm install

# Install Playwright browsers
pnpm exec playwright install --with-deps chromium

# Apply database migrations
pnpm db:local
```

## Running Tests

### Unit Tests

```bash
# Run all unit tests
pnpm --filter @hospital-queue/api test

# Run unit tests with coverage
pnpm --filter @hospital-queue/api test:coverage

# Run specific test file
pnpm --filter @hospital-queue/api test -- src/services/__tests__/queue-engine.test.ts

# Run tests in watch mode
pnpm --filter @hospital-queue/api test:watch
```

### Integration Tests

```bash
# Run integration tests
pnpm --filter @hospital-queue/api test -- tests/integration/

# Run healthcare-critical flow tests
pnpm --filter @hospital-queue/api test -- tests/integration/healthcare-flows.test.ts
```

### E2E Tests (Playwright)

```bash
# Run all E2E tests
pnpm --filter @hospital-queue/web test:e2e

# Run specific E2E test file
pnpm exec playwright test e2e/auth.spec.ts

# Run tests with UI
pnpm exec playwright test --ui

# Run tests matching a pattern
pnpm exec playwright test --grep "patient registration"
```

### Performance Tests

```bash
# Run performance benchmarks
pnpm --filter @hospital-queue/api test -- tests/performance.test.ts
```

## Coverage Targets

| Module | Target Coverage |
|--------|----------------|
| Queue Engine | 85% |
| HMS Adapter | 80% |
| WhatsApp Chatbot | 85% |
| Auth Utilities | 90% |
| Validation Schemas | 95% |
| Overall | 80% |

## Priority Test Modules

### 1. Queue Engine Tests

Tests for the core queue management logic:

- Priority score calculation
- Ticket number generation
- Queue position calculation
- Emergency override handling
- Queue transfer logic
- TV display state management
- Cache invalidation

```typescript
describe('Queue Engine', () => {
  describe('Priority Score Calculation', () => {
    it('should calculate correct priority score for emergency priority');
    it('should add wait boost for longer waiting patients');
    it('should add appointment bonus for scheduled patients');
  });
});
```

### 2. WhatsApp Chatbot Tests

Tests for the WhatsApp chatbot state machine:

- Session management
- Language detection
- Command handling (REGISTER, CANCEL, STATUS, HELP)
- Name, phone, and department input validation
- Booking confirmation flow
- Swahili and English language support

### 3. Auth Utilities Tests

Tests for authentication and security:

- Password hashing and verification
- JWT token creation and verification
- ID generation
- Input validation (email, phone)
- Pagination helpers
- Response formatting

### 4. HMS Adapter Tests

Tests for hospital management system integration:

- Patient retrieval
- Patient search
- Appointment management
- Adapter switching (mock → OpenMRS → FHIR)
- Data mapping

### 5. Validation Schema Tests

Tests for Zod validation schemas:

- Patient registration schema
- Queue ticket creation schema
- Emergency override schema
- Patient search schema
- WhatsApp message schema

## Healthcare-Critical Test Flows

### Patient Registration → Ticket Generation → Queue Position

Tests complete patient journey from registration to queue management:

- Full patient registration flow
- Priority score calculation
- Estimated wait time calculation
- Patient name masking for privacy

### Doctor Call Patient → TV Display Update → Notification

Tests the doctor workflow:

- Ticket status updates
- Room assignment
- Actual wait time calculation
- Patient notifications

### Emergency Override → Priority Bump → Staff Alert

Tests critical emergency handling:

- Highest priority assignment
- Override reason validation
- Audit trail for overrides
- Staff alert triggering

### Queue Transfer → Multi-Department Routing

Tests patient transfers:

- Department transfer validation
- Priority preservation
- Queue position recalculation

### HMS Adapter Switching (Mock → OpenMRS)

Tests adapter switching:

- Mock to OpenMRS transition
- Data consistency during switch
- FHIR compatibility

## E2E Test Scenarios

### Patient Registration Flow

1. Patient visits kiosk
2. Selects department
3. Enters patient information
4. Receives ticket number
5. Views queue status

### Doctor Dashboard Flow

1. Doctor logs in
2. Views queue
3. Calls next patient
4. Starts consultation
5. Completes visit

### Receptionist Quick Register Flow

1. Receptionist logs in
2. Searches for existing patient
3. Creates quick registration
4. Issues ticket

### WhatsApp Registration Flow

1. Patient sends REGISTER to WhatsApp
2. Enters name
3. Enters phone number
4. Selects department
5. Confirms booking
6. Receives ticket number

## Security Testing

### Authentication Tests

- Invalid credentials handling
- Rate limiting after failed attempts
- Session expiration
- Logout functionality

### RBAC Tests

- Patient cannot access admin routes
- Doctor cannot access admin settings
- Admin can access settings
- Super admin has full access

### Input Validation Tests

- SQL injection prevention
- XSS attack prevention
- Phone number format validation
- Email validation

## Accessibility Testing

### WCAG AA Compliance

```typescript
describe('Accessibility Tests', () => {
  it('keyboard navigation on login');
  it('form labels are accessible');
  it('color contrast meets WCAG AA');
  it('focus indicators are visible');
});
```

Run accessibility tests:
```bash
pnpm exec playwright test --grep "@a11y"
```

## Performance Testing

### Benchmarks

| Operation | Target Time |
|-----------|-------------|
| Simple query | < 100ms |
| Queue position calculation | < 100ms |
| Bulk queue updates | < 300ms |
| Priority score calculation | < 0.1ms per calculation |
| Patient name masking | < 0.01ms per name |
| Cache retrieval | < 0.1ms |
| Validation (phone/email) | < 0.01ms |

### Load Testing Scenarios

- Concurrent ticket creation (50 users)
- Peak hour queue load (500 in queue, 100 check-ins/minute)
- Response time maintenance under load (P95 < 400ms)

## Mock Setup

### Mock D1 Database

```typescript
import { createMockD1 } from './services/__tests__/mocks';

const mockDb = createMockD1();
mockDb.setData('SELECT * FROM patients', testPatients);
mockDb.setFirstData('SELECT * FROM patients WHERE id = ?', patient);
```

### Mock KV Store

```typescript
import { createMockKV } from './services/__tests__/mocks';

const mockKV = createMockKV();
mockKV.set('tv:display-1', JSON.stringify(displayState));
```

### Mock HMS Adapter

```typescript
const mockAdapter = createMockHMSAdapter();
mockAdapter._setPatient('patient-1', patientData);
mockAdapter._setAppointments('patient-1', appointments);
```

## Test Data

### Using seed.sql

The test data from `apps/api/src/db/seed.sql` provides:

- 1 facility (Limuru Cottage Hospital)
- 12 departments
- 23 rooms
- 23 users (doctors, nurses, receptionists)
- 8 doctors with specialties
- 8 test patients
- 5 sample queue tickets
- 4 appointments
- 21 settings
- 3 TV displays

### Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@limuruhospital.co.ke | #Limuru_Cottage_Hospital@2026 |
| Doctor | dr.odhiambo@limuruhospital.co.ke | #Limuru_Cottage_Hospital@2026 |
| Super Admin | superadmin@limuruhospital.co.ke | #Limuru_Cottage_Hospital@2026 |
| Receptionist | reception1@limuruhospital.co.ke | #Limuru_Cottage_Hospital@2026 |

## Continuous Integration

The GitHub Actions workflow runs:

1. **Unit Tests** - All packages
2. **Integration Tests** - API flows
3. **E2E Tests** - Playwright browser tests
4. **Accessibility Tests** - WCAG compliance
5. **Security Tests** - Authentication and RBAC
6. **Performance Tests** - Benchmarks
7. **Type Check** - TypeScript compilation
8. **Lint** - Code quality
9. **Build** - Application build verification

### GitHub Actions Configuration

See `.github/workflows/test.yml` for the complete CI configuration.

## Writing New Tests

### Unit Test Template

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Module Name', () => {
  let mockDb: any;
  let mockCache: any;

  beforeEach(() => {
    mockDb = createMockD1();
    mockCache = createMockKV();
  });

  describe('Core Function', () => {
    it('should perform expected behavior', async () => {
      const result = await module.function(mockDb, mockCache, params);
      expect(result).toEqual(expected);
    });

    it('should handle error cases', async () => {
      await expect(module.function(mockDb, mockCache, invalidParams))
        .rejects.toThrow('Error message');
    });
  });
});
```

### Integration Test Template

```typescript
describe('Healthcare Critical Flow', () => {
  it('should complete patient registration to queue flow', async () => {
    // 1. Register patient
    const patient = await registerPatient(patientData);
    expect(patient.id).toBeDefined();

    // 2. Create queue ticket
    const ticket = await createTicket(patient.id, departmentId);
    expect(ticket.ticketNumber).toBeDefined();

    // 3. Verify queue position
    const position = await getQueuePosition(ticket.id);
    expect(position).toBeGreaterThan(0);
  });
});
```

### E2E Test Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should complete user flow', async ({ page }) => {
    await page.fill('input[type="email"]', 'user@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
```

## Debugging Tests

### Run with verbose output

```bash
pnpm --filter @hospital-queue/api test -- --reporter=verbose
```

### Run single test

```bash
pnpm --filter @hospital-queue/api test -- --run -t "test name"
```

### Inspect coverage report

```bash
# Open coverage HTML report
open apps/api/coverage/index.html
```

## Common Issues

### Module resolution errors

If you see "Cannot find module" errors, ensure:

```bash
# Clear node_modules and reinstall
rm -rf node_modules
pnpm install

# Clear vitest cache
rm -rf apps/api/node_modules/.vitest
```

### Playwright browser not installed

```bash
pnpm exec playwright install --with-deps chromium
```

### Database connection issues

For local D1 testing, ensure:

```bash
# Use local database
wrangler d1 migrations apply limuru-queue-db --local
```

## Best Practices

1. **Test Naming**: Use descriptive names that explain what is being tested
2. **Arrange-Act-Assert**: Structure tests with clear AAA pattern
3. **Isolation**: Each test should be independent
4. **Coverage**: Aim for 80%+ coverage on critical modules
5. **Healthcare Focus**: Prioritize tests for patient safety features
6. **Security**: Test authentication, authorization, and data privacy
7. **Performance**: Include benchmarks for critical operations

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
1. Check database cleanup in `setup.ts`
2. Ensure `beforeEach` creates fresh test data
3. Verify WebSocket connections are closed
4. Check for race conditions in async tests

## CI/CD

Tests run automatically on:
- Pull requests to `main` branch
- Push to `main` branch
- Push to `develop` branch

See `.github/workflows/test.yml` for complete configuration.
