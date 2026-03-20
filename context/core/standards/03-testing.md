## Creating File: `.opencode/context/core/standards/03-testing.md`

```markdown
# Testing Standards
**Document ID:** CORE-STD-03
**Version:** 1.0
**Last Updated:** 2026-03-02
**Owner:** QA Lead

## Purpose

This document defines the testing standards, strategies, and requirements for the Hospital Queuing System. Comprehensive testing ensures system reliability, patient safety, and data integrity.

## 1. Testing Philosophy

### 1.1 Core Principles
- **Shift Left**: Test early and often in the development cycle
- **Automation First**: Automate repetitive tests, manual for exploratory
- **Risk-Based**: Focus testing efforts on critical paths
- **Continuous Testing**: Integrate testing into CI/CD pipeline
- **Real-World Scenarios**: Test with production-like data and conditions

### 1.2 Testing Pyramid

```
    ╱╲
   ╱  ╲  E2E Tests (10%)
  ╱    ╲ ───────────────
 ╱      ╲ Integration Tests (20%)
╱────────╲───────────────
╲        ╱ Unit Tests (70%)
 ╲      ╱ ───────────────
  ╲    ╱
   ╲  ╱
    ╲╱
```

| Layer | Coverage | Speed | Responsibility |
|-------|----------|-------|----------------|
| Unit Tests | 70% | Fast (<100ms) | Individual functions, components |
| Integration Tests | 20% | Medium (<2s) | API, database, service interactions |
| E2E Tests | 10% | Slow (>5s) | Critical user journeys |

## 2. Testing Types and Requirements

### 2.1 Unit Testing

#### Framework: Jest
#### Location: `/[module]/__tests__/` or `/*.test.ts`

**Requirements:**
- Test all business logic functions
- Mock external dependencies
- Aim for 80% coverage on critical paths
- Test edge cases and error conditions

```typescript
// queue-service.test.ts
import { QueueService } from '../queue-service';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('QueueService', () => {
  let queueService: QueueService;
  let mockDb: any;

  beforeEach(() => {
    // Mock database
    mockDb = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      first: vi.fn(),
      all: vi.fn()
    };
    
    queueService = new QueueService(mockDb);
  });

  describe('callNextPatient', () => {
    it('should return the next patient in FIFO order', async () => {
      // Arrange
      const mockPatients = [
        { id: '1', ticketNumber: 'MED001', createdAt: '2026-03-02T09:00:00Z' },
        { id: '2', ticketNumber: 'MED002', createdAt: '2026-03-02T09:05:00Z' }
      ];
      
      mockDb.all.mockResolvedValue({ results: mockPatients });
      
      // Act
      const result = await queueService.callNextPatient('dr_smith');
      
      // Assert
      expect(result.ticketNumber).toBe('MED001');
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('ORDER BY created_at'));
    });

    it('should throw QueueEmptyError when no patients waiting', async () => {
      // Arrange
      mockDb.all.mockResolvedValue({ results: [] });
      
      // Act & Assert
      await expect(queueService.callNextPatient('dr_smith'))
        .rejects.toThrow('No patients in queue');
    });

    it('should update patient status to "called"', async () => {
      // Arrange
      const mockPatient = { id: '1', ticketNumber: 'MED001' };
      mockDb.all.mockResolvedValue({ results: [mockPatient] });
      mockDb.prepare.mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true })
        })
      });
      
      // Act
      await queueService.callNextPatient('dr_smith');
      
      // Assert
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE visits SET status = ?')
      );
    });
  });

  describe('calculateWaitTime', () => {
    it('should calculate wait time based on queue length and doctors', () => {
      // Arrange
      const queue = { length: 5 };
      const doctors = [
        { available: true },
        { available: true },
        { available: false }
      ];
      
      // Act
      const waitTime = queueService.calculateWaitTime(queue, doctors);
      
      // Assert
      expect(waitTime).toBe(20); // (5 * 8) / 2 = 20 minutes
    });

    it('should handle empty queue', () => {
      // Arrange
      const queue = { length: 0 };
      const doctors = [{ available: true }];
      
      // Act
      const waitTime = queueService.calculateWaitTime(queue, doctors);
      
      // Assert
      expect(waitTime).toBe(0);
    });
  });
});
```

### 2.2 React Component Testing

#### Framework: React Testing Library + Vitest
#### Location: `/*.test.tsx`

```typescript
// PatientDashboard.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PatientDashboard } from './PatientDashboard';
import { vi } from 'vitest';

// Mock API calls
vi.mock('@/lib/api', () => ({
  fetchPatientQueue: vi.fn(),
  saveDoctorNotes: vi.fn()
}));

describe('PatientDashboard', () => {
  it('should display patient queue position', async () => {
    // Arrange
    const mockQueueData = {
      position: 3,
      totalWaiting: 8,
      estimatedWaitTime: 15
    };
    
    vi.mocked(fetchPatientQueue).mockResolvedValue(mockQueueData);
    
    // Act
    render(<PatientDashboard patientId="p123" />);
    
    // Assert
    await waitFor(() => {
      expect(screen.getByText('Position: 3 of 8')).toBeInTheDocument();
      expect(screen.getByText('Est. wait: 15 min')).toBeInTheDocument();
    });
  });

  it('should show call notification when patient is called', async () => {
    // Arrange
    const { rerender } = render(<PatientDashboard patientId="p123" />);
    
    // Simulate WebSocket event
    const mockEvent = new MessageEvent('message', {
      data: JSON.stringify({
        type: 'patient-called',
        room: '204'
      })
    });
    
    // Act
    window.dispatchEvent(mockEvent);
    
    // Assert
    await waitFor(() => {
      expect(screen.getByText('Please go to Room 204')).toBeInTheDocument();
    });
  });

  it('should allow profile editing', async () => {
    // Arrange
    render(<PatientDashboard patientId="p123" />);
    
    // Act
    await userEvent.click(screen.getByRole('button', { name: /edit profile/i }));
    await userEvent.type(screen.getByLabelText(/phone/i), '555-0123');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    
    // Assert
    await waitFor(() => {
      expect(screen.getByText('Profile updated successfully')).toBeInTheDocument();
    });
  });
});
```

### 2.3 Integration Testing

#### Framework: Supertest + Vitest
#### Location: `/tests/integration/`

```typescript
// queue-api.test.ts
import request from 'supertest';
import { app } from '@/app';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Queue API Integration', () => {
  let testPatientId: string;

  describe('POST /api/queue', () => {
    it('should add patient to queue', async () => {
      // Arrange
      const patientData = {
        name: 'John Doe',
        department: 'MED',
        priority: false
      };
      
      // Act
      const response = await request(app)
        .post('/api/queue')
        .send(patientData)
        .expect(201);
      
      // Assert
      expect(response.body).toHaveProperty('id');
      expect(response.body.ticketNumber).toMatch(/^MED\d{3}$/);
      expect(response.body.status).toBe('waiting');
      
      testPatientId = response.body.id;
    });

    it('should validate required fields', async () => {
      // Arrange
      const invalidData = {
        department: 'MED'
        // Missing name
      };
      
      // Act
      const response = await request(app)
        .post('/api/queue')
        .send(invalidData)
        .expect(400);
      
      // Assert
      expect(response.body.error).toContain('name is required');
    });
  });

  describe('GET /api/queue/:department', () => {
    it('should return queue for department', async () => {
      // Act
      const response = await request(app)
        .get('/api/queue/MED')
        .expect(200);
      
      // Assert
      expect(response.body.department).toBe('MED');
      expect(Array.isArray(response.body.patients)).toBe(true);
      expect(response.body).toHaveProperty('estimatedWaitTime');
    });

    it('should return 404 for invalid department', async () => {
      // Act
      await request(app)
        .get('/api/queue/INVALID')
        .expect(404);
    });
  });

  describe('POST /api/queue/call/:patientId', () => {
    it('should call next patient', async () => {
      // Act
      const response = await request(app)
        .post(`/api/queue/call/${testPatientId}`)
        .send({ doctorId: 'dr_smith', room: '204' })
        .expect(200);
      
      // Assert
      expect(response.body.status).toBe('called');
      expect(response.body.roomAssigned).toBe('204');
    });

    it('should return 404 for non-existent patient', async () => {
      // Act
      await request(app)
        .post('/api/queue/call/invalid-id')
        .send({ doctorId: 'dr_smith', room: '204' })
        .expect(404);
    });
  });
});
```

### 2.4 Database Integration Testing

```typescript
// database.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, migrate, seed } from './test-utils';

describe('Database Operations', () => {
  let db: D1Database;

  beforeAll(async () => {
    db = await createTestDb();
    await migrate(db);
    await seed(db);
  });

  afterAll(async () => {
    await db.exec('DROP TABLE IF EXISTS patients');
    await db.exec('DROP TABLE IF EXISTS visits');
  });

  it('should insert and retrieve patient', async () => {
    // Arrange
    const patient = {
      id: 'test-123',
      name: 'Jane Doe',
      email: 'jane@example.com'
    };
    
    // Act
    await db
      .prepare('INSERT INTO patients (id, name, email) VALUES (?, ?, ?)')
      .bind(patient.id, patient.name, patient.email)
      .run();
    
    const result = await db
      .prepare('SELECT * FROM patients WHERE id = ?')
      .bind(patient.id)
      .first();
    
    // Assert
    expect(result.name).toBe(patient.name);
    expect(result.email).toBe(patient.email);
  });

  it('should enforce foreign key constraints', async () => {
    // Arrange
    const invalidVisit = {
      patientId: 'non-existent',
      ticketNumber: 'MED001'
    };
    
    // Act & Assert
    await expect(
      db
        .prepare('INSERT INTO visits (patient_id, ticket_number) VALUES (?, ?)')
        .bind(invalidVisit.patientId, invalidVisit.ticketNumber)
        .run()
    ).rejects.toThrow();
  });
});
```

### 2.5 E2E Testing

#### Framework: Playwright
#### Location: `/tests/e2e/`

```typescript
// patient-journey.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Complete Patient Journey', () => {
  test('patient should get ticket, wait, and be called', async ({ page }) => {
    // 1. Patient gets ticket from kiosk
    await page.goto('/kiosk');
    await page.click('text=General Medicine');
    await page.fill('input[name="name"]', 'John Doe');
    await page.click('button:has-text("Get Ticket")');
    
    // Verify ticket is generated
    await expect(page.locator('.ticket-number')).toBeVisible();
    const ticketNumber = await page.locator('.ticket-number').textContent();
    
    // 2. Patient views waiting display
    await page.goto('/waiting-display');
    await expect(page.locator(`text=${ticketNumber}`)).toBeVisible();
    
    // 3. Doctor calls next patient (simulate in another context)
    // Using API directly for test
    const response = await fetch('/api/queue/call-next', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctorId: 'dr_smith', room: '204' })
    });
    
    // 4. Waiting display updates
    await expect(page.locator('.now-calling')).toContainText(ticketNumber);
    await expect(page.locator('.now-calling')).toContainText('Room 204');
    
    // 5. Patient dashboard shows called status
    await page.goto(`/patient/${ticketNumber}`);
    await expect(page.locator('.status')).toContainText('Please go to Room 204');
  });

  test('admin can manage IPTV channels', async ({ page }) => {
    // Login as admin
    await page.goto('/admin/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', process.env.ADMIN_PASSWORD!);
    await page.click('button:has-text("Login")');
    
    // Navigate to IPTV settings
    await page.click('text=IPTV Settings');
    
    // Add new channel
    await page.click('button:has-text("Add Channel")');
    await page.fill('input[name="name"]', 'News 24/7');
    await page.fill('input[name="url"]', 'https://example.com/stream.m3u8');
    await page.click('button:has-text("Save")');
    
    // Verify channel appears
    await expect(page.locator('text=News 24/7')).toBeVisible();
    
    // Switch channel
    await page.click('text=News 24/7');
    await page.click('button:has-text("Activate")');
    
    // Verify waiting display updates
    const waitingDisplay = await page.context().newPage();
    await waitingDisplay.goto('/waiting-display');
    await expect(waitingDisplay.locator('.channel-name')).toContainText('News 24/7');
  });
});
```

### 2.6 Load Testing

#### Framework: k6
#### Location: `/tests/load/`

```javascript
// queue-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const errorCounter = new Counter('errors');

export const options = {
  stages: [
    { duration: '1m', target: 10 }, // Ramp up to 10 users
    { duration: '3m', target: 50 }, // Ramp to 50 users
    { duration: '1m', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% failure rate
  },
};

export default function () {
  // Test adding patient to queue
  const addPayload = JSON.stringify({
    name: `Test Patient ${Math.random()}`,
    department: 'MED',
  });
  
  const addRes = http.post('https://api.hospital.com/queue', addPayload, {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(addRes, {
    'add patient status 201': (r) => r.status === 201,
  }) || errorCounter.add(1);
  
  const patientId = addRes.json().id;
  
  // Test getting queue status
  const queueRes = http.get('https://api.hospital.com/queue/MED');
  
  check(queueRes, {
    'get queue status 200': (r) => r.status === 200,
    'queue has patients': (r) => r.json('patients').length > 0,
  }) || errorCounter.add(1);
  
  // Test calling patient
  if (patientId) {
    const callRes = http.post(
      `https://api.hospital.com/queue/call/${patientId}`,
      JSON.stringify({ doctorId: 'dr_smith', room: '204' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    check(callRes, {
      'call patient status 200': (r) => r.status === 200,
    }) || errorCounter.add(1);
  }
  
  sleep(1);
}
```

### 2.7 Security Testing

#### Vulnerability Scanning
```bash
# Run npm audit
npm audit

# Run Snyk
snyk test

# Run OWASP Dependency Check
dependency-check --scan ./ --format HTML
```

#### Penetration Testing Checklist

| Test | Tool | Frequency |
|------|------|-----------|
| SQL Injection | sqlmap | Quarterly |
| XSS | OWASP ZAP | Quarterly |
| JWT Testing | jwt_tool | Per Release |
| Rate Limiting | Custom script | Per Release |
| Authentication Bypass | Burp Suite | Quarterly |

```typescript
// security/authentication.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '@/app';

describe('Authentication Security', () => {
  it('should rate limit login attempts', async () => {
    const attempts = [];
    
    // Attempt 10 rapid logins
    for (let i = 0; i < 10; i++) {
      attempts.push(
        request(app)
          .post('/api/auth/login')
          .send({
            patientId: 'p123',
            password: 'wrong-password'
          })
      );
    }
    
    const responses = await Promise.all(attempts);
    
    // At least one should be rate limited
    expect(responses.some(r => r.status === 429)).toBe(true);
  });

  it('should enforce password complexity', async () => {
    const weakPasswords = [
      'short',
      'alllowercase',
      'ALLUPPERCASE',
      '12345678',
      'password123'
    ];
    
    for (const password of weakPasswords) {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', 'Bearer valid-token')
        .send({
          currentPassword: 'oldpass',
          newPassword: password
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Password must contain');
    }
  });

  it('should expire reset tokens after 1 hour', async () => {
    // Request reset
    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: 'patient@example.com' });
    
    const token = resetRes.body.token;
    
    // Advance time (mock)
    vi.setSystemTime(Date.now() + 61 * 60 * 1000);
    
    // Attempt to use expired token
    const useRes = await request(app)
      .post('/api/auth/reset-password/confirm')
      .send({ token, newPassword: 'NewPass123!' });
    
    expect(useRes.status).toBe(401);
    expect(useRes.body.error).toContain('Token expired');
  });
});
```

## 3. Test Data Management

### 3.1 Test Fixtures

```typescript
// tests/fixtures/patients.ts
export const mockPatients = [
  {
    id: 'p001',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    createdAt: '2026-03-01T09:00:00Z'
  },
  {
    id: 'p002',
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+0987654321',
    createdAt: '2026-03-01T09:30:00Z'
  }
];

export const mockQueue = [
  {
    id: 'v001',
    patientId: 'p001',
    ticketNumber: 'MED001',
    department: 'MED',
    status: 'waiting',
    createdAt: '2026-03-02T10:00:00Z'
  },
  {
    id: 'v002',
    patientId: 'p002',
    ticketNumber: 'MED002',
    department: 'MED',
    status: 'waiting',
    createdAt: '2026-03-02T10:05:00Z'
  }
];
```

### 3.2 Test Database Setup

```typescript
// tests/test-utils.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function createTestDb(): Promise<D1Database> {
  // Use test-specific database
  const db = new D1Database('test-db');
  
  // Run migrations
  await execAsync('wrangler d1 migrations apply test-db');
  
  return db;
}

export async function seedTestData(db: D1Database) {
  // Insert test patients
  for (const patient of mockPatients) {
    await db
      .prepare('INSERT INTO patients (id, name, email, phone, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(patient.id, patient.name, patient.email, patient.phone, patient.createdAt)
      .run();
  }
  
  // Insert test queue
  for (const visit of mockQueue) {
    await db
      .prepare('INSERT INTO visits (id, patient_id, ticket_number, department, status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(visit.id, visit.patientId, visit.ticketNumber, visit.department, visit.status, visit.createdAt)
      .run();
  }
}

export async function clearTestData(db: D1Database) {
  await db.exec('DELETE FROM visits');
  await db.exec('DELETE FROM patients');
}
```

## 4. CI/CD Integration

### 4.1 GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run unit tests
        run: npm run test:unit
        env:
          CI: true
          
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        
      - name: Install dependencies
        run: npm ci
        
      - name: Start test database
        run: npm run db:test:start
        
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
          
      - name: Stop test database
        run: npm run db:test:stop

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        
      - name: Install dependencies
        run: npm ci
        
      - name: Install Playwright
        run: npx playwright install --with-deps
        
      - name: Start application
        run: npm run start:test &
        
      - name: Run E2E tests
        run: npm run test:e2e
        
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/

  load-tests:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup k6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A
          sudo apt-add-repository "deb https://dl.k6.io/deb stable main"
          sudo apt-get update
          sudo apt-get install k6
          
      - name: Run load tests
        run: k6 run tests/load/queue-load-test.js
        env:
          K6_WEB_DASHBOARD: true
```

### 4.2 Test Commands

```json
// package.json
{
  "scripts": {
    "test": "npm run test:unit && npm run test:integration",
    "test:unit": "vitest run --dir src",
    "test:unit:watch": "vitest --dir src",
    "test:unit:coverage": "vitest run --coverage --dir src",
    "test:integration": "vitest run --dir tests/integration",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:load": "k6 run tests/load/queue-load-test.js",
    "test:security": "npm audit && snyk test",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e"
  }
}
```

## 5. Coverage Requirements

### 5.1 Coverage Targets by Module

| Module | Unit Test Coverage | Integration Test Coverage |
|--------|-------------------|--------------------------|
| Core Queue Logic | 90% | 100% |
| Authentication | 85% | 100% |
| Patient Portal | 80% | 90% |
| Doctor Dashboard | 75% | 85% |
| Admin Panel | 70% | 80% |
| API Routes | 85% | 100% |
| Database Operations | 90% | 100% |
| IPTV Integration | 60% | 70% |

### 5.2 Critical Paths Requiring 100% Coverage

- Patient ticket generation
- Queue position calculation
- Next patient selection logic
- Password hashing and verification
- JWT token generation/validation
- Database transaction integrity
- Patient data privacy controls
- Emergency priority overrides

## 6. Test Environment Management

### 6.1 Environment Matrix

| Environment | Purpose | Data | Access |
|-------------|---------|------|--------|
| **Local** | Developer testing | Mock/fixtures | Developer |
| **CI** | PR validation | Isolated test DB | CI pipeline |
| **Staging** | Pre-release validation | Anonymized copy of prod | QA team |
| **Production** | Live system | Real patient data | End users |

### 6.2 Test Data Isolation

```typescript
// tests/setup.ts
import { randomUUID } from 'crypto';

// Generate unique test identifiers
const testRunId = randomUUID();

// Prefix all test data with run ID
export function testPatient(name: string) {
  return {
    id: `test-${testRunId}-${Date.now()}`,
    name: `[TEST] ${name}`,
    email: `test-${Date.now()}@example.com`
  };
}

// Cleanup after tests
export async function cleanupTestData(db: D1Database) {
  await db
    .prepare('DELETE FROM patients WHERE id LIKE ?')
    .bind(`test-${testRunId}%`)
    .run();
}
```

## 7. Test Reporting

### 7.1 Report Formats

```typescript
// Generate JUnit XML for CI
// tests/reporters/junit-reporter.ts
export function generateJUnitReport(results: TestResults) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="Unit Tests" tests="${results.total}" failures="${results.failures}">
    ${results.tests.map(test => `
    <testcase name="${test.name}" classname="${test.class}" time="${test.duration}">
      ${test.failure ? `<failure message="${test.failure.message}"/>` : ''}
    </testcase>
    `).join('')}
  </testsuite>
</testsuites>`;
  
  return xml;
}
```

### 7.2 Dashboard Integration

```typescript
// Send test results to monitoring
export async function reportTestMetrics(results: TestResults) {
  await fetch('https://api.cloudflare.com/client/v4/accounts/.../analytics', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CLOUDFLARE_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      testRun: {
        id: testRunId,
        timestamp: new Date().toISOString(),
        total: results.total,
        passed: results.passed,
        failed: results.failed,
        coverage: results.coverage
      }
    })
  });
}
```

## 8. Testing Checklist

### Pre-Merge Checklist
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] No regression in critical paths
- [ ] Test coverage meets thresholds
- [ ] No flaky tests (all pass consistently)
- [ ] Performance tests show no degradation
- [ ] Security scans pass

### Pre-Release Checklist
- [ ] Full test suite run on staging
- [ ] Load tests pass with expected traffic
- [ ] Penetration testing completed
- [ ] Backup/restore tested
- [ ] Disaster recovery tested
- [ ] Documentation updated with test results

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-02 | System | Initial version |

**Review Date:** 2026-06-02
```

**File created successfully: `.opencode/context/core/standards/03-testing.md`**

Please confirm if I should proceed with the next file: `.opencode/context/core/standards/04-security.md`
