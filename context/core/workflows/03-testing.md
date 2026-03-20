## Creating File: `.opencode/context/core/workflows/03-testing.md`

```markdown
# Testing Workflow
**Document ID:** CORE-WORK-03
**Version:** 1.0
**Last Updated:** 2026-03-03
**Owner:** QA Lead

## Purpose

This document defines the testing workflow for the Hospital Queuing System. A structured testing process ensures reliability, patient safety, and data integrity across all system components.

## 1. Testing Philosophy

### 1.1 Core Principles
- **Shift Left**: Test early and often
- **Automation First**: Automate repetitive tests
- **Risk-Based**: Focus on critical paths
- **Continuous Testing**: Integrated into CI/CD
- **Real-World Scenarios**: Test like a user

### 1.2 Testing Pyramid

```
    ╱╲
   ╱  ╲  E2E Tests (10%)
  ╱    ╲ ───────────────
 ╱      ╲ Integration Tests (20%)
╱────────╲───────────────
╲        ╱ Unit Tests (60%)
 ╲      ╱ ───────────────
  ╲    ╱ Manual Tests (10%)
   ╲  ╱
    ╲╱	
```

### 1.3 Test Types and Timing

| Test Type | When Run | Owner | Environment |
|-----------|----------|-------|-------------|
| **Unit Tests** | On every commit | Developer | Local/CI |
| **Integration Tests** | On PR creation | Developer | CI |
| **E2E Tests** | Before merge | QA | Staging |
| **Performance Tests** | Weekly | DevOps | Staging |
| **Security Tests** | Weekly | Security | Staging |
| **Accessibility Tests** | On UI changes | Developer | CI |
| **User Acceptance** | Before release | QA/PO | Staging |
| **Smoke Tests** | After deploy | DevOps | Production |

## 2. Unit Testing Workflow

### 2.1 When to Write Unit Tests

```typescript
// ✅ GOOD: Write unit tests for:
// - Utility functions
// - Business logic
// - Data transformations
// - Validation logic
// - Helper functions

// ❌ NOT for:
// - Third-party code
// - Configuration files
// - Constants
// - Simple getters/setters
```

### 2.2 Unit Test Structure

```typescript
// queue-service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueueService } from './queue-service';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    run: vi.fn(),
    first: vi.fn()
  }
}));

describe('QueueService', () => {
  let queueService: QueueService;
  let mockDb: any;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    mockDb = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      run: vi.fn(),
      first: vi.fn()
    };
    
    queueService = new QueueService(mockDb);
  });

  describe('callNextPatient', () => {
    it('should return the next patient in FIFO order', async () => {
      // Arrange
      const mockPatients = [
        { id: '1', ticketNumber: 'MED001', createdAt: '2026-03-03T09:00:00Z' },
        { id: '2', ticketNumber: 'MED002', createdAt: '2026-03-03T09:05:00Z' }
      ];
      
      mockDb.first.mockResolvedValue(mockPatients[0]);

      // Act
      const result = await queueService.callNextPatient('dr_smith', '204');

      // Assert
      expect(result).toEqual(mockPatients[0]);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at ASC')
      );
    });

    it('should throw QueueEmptyError when no patients waiting', async () => {
      // Arrange
      mockDb.first.mockResolvedValue(null);

      // Act & Assert
      await expect(
        queueService.callNextPatient('dr_smith', '204')
      ).rejects.toThrow('No patients in queue');
    });

    it('should update patient status to "called"', async () => {
      // Arrange
      const mockPatient = { id: '1', ticketNumber: 'MED001' };
      mockDb.first.mockResolvedValue(mockPatient);
      
      // Act
      await queueService.callNextPatient('dr_smith', '204');

      // Assert
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE visits SET status = ?')
      );
      expect(mockDb.bind).toHaveBeenCalledWith('called', '1');
    });
  });

  describe('calculateWaitTime', () => {
    it('should calculate wait time based on queue length', () => {
      // Arrange
      const queueLength = 5;
      const avgConsultationTime = 15;

      // Act
      const result = queueService.calculateWaitTime(queueLength, avgConsultationTime);

      // Assert
      expect(result).toBe(75); // 5 * 15 minutes
    });

    it('should handle empty queue', () => {
      // Arrange
      const queueLength = 0;
      const avgConsultationTime = 15;

      // Act
      const result = queueService.calculateWaitTime(queueLength, avgConsultationTime);

      // Assert
      expect(result).toBe(0);
    });
  });
});
```

### 2.3 Test Coverage Requirements

```javascript
// vitest.config.js
export default {
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        global: {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80
        },
        './src/core/**/*.ts': {
          statements: 90,
          branches: 85
        },
        './src/lib/**/*.ts': {
          statements: 85,
          branches: 80
        }
      }
    }
  }
};
```

## 3. Integration Testing Workflow

### 3.1 Integration Test Structure

```typescript
// tests/integration/queue-api.int.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '@/app';
import { setupTestDb, teardownTestDb, clearTestData } from '../test-utils';

describe('Queue API Integration', () => {
  let db: any;
  let testPatientId: string;

  beforeAll(async () => {
    db = await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb(db);
  });

  beforeEach(async () => {
    await clearTestData(db);
  });

  describe('POST /api/queue', () => {
    it('should add patient to queue successfully', async () => {
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
      
      // Verify in database
      const dbPatient = await db
        .prepare('SELECT * FROM patients WHERE id = ?')
        .bind(response.body.id)
        .first();
      
      expect(dbPatient).toBeDefined();
      expect(dbPatient.name).toBe(patientData.name);
    });

    it('should return 400 for invalid data', async () => {
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
    beforeEach(async () => {
      // Seed test data
      await db.prepare(`
        INSERT INTO patients (id, name, department, status, created_at)
        VALUES 
          ('p1', 'John Doe', 'MED', 'waiting', datetime('now', '-10 minutes')),
          ('p2', 'Jane Smith', 'MED', 'waiting', datetime('now', '-5 minutes'))
      `).run();
    });

    it('should return queue for department', async () => {
      // Act
      const response = await request(app)
        .get('/api/queue/MED')
        .expect(200);

      // Assert
      expect(response.body.department).toBe('MED');
      expect(response.body.patients).toHaveLength(2);
      expect(response.body.patients[0].name).toBe('John Doe'); // FIFO order
      expect(response.body.estimatedWaitTime).toBeDefined();
    });

    it('should return 404 for invalid department', async () => {
      // Act
      await request(app)
        .get('/api/queue/INVALID')
        .expect(404);
    });
  });
});
```

### 3.2 Test Database Setup

```typescript
// tests/test-utils.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';

const execAsync = promisify(exec);

export async function setupTestDb() {
  const dbName = `test_${randomUUID().replace(/-/g, '_')}`;
  
  // Create test database
  await execAsync(`wrangler d1 create ${dbName}`);
  
  // Run migrations
  await execAsync(`wrangler d1 migrations apply ${dbName}`);
  
  // Get database instance
  const db = new D1Database(dbName);
  
  return db;
}

export async function teardownTestDb(db: any) {
  await execAsync(`wrangler d1 delete ${db.name}`);
}

export async function clearTestData(db: any) {
  await db.exec('DELETE FROM visits');
  await db.exec('DELETE FROM patients');
  await db.exec('DELETE FROM doctors');
}

export async function seedTestData(db: any) {
  // Seed patients
  await db.prepare(`
    INSERT INTO patients (id, name, email, phone, created_at)
    VALUES 
      ('p1', 'John Doe', 'john@example.com', '+1234567890', datetime('now')),
      ('p2', 'Jane Smith', 'jane@example.com', '+0987654321', datetime('now'))
  `).run();

  // Seed visits
  await db.prepare(`
    INSERT INTO visits (id, patient_id, ticket_number, department, status, created_at)
    VALUES 
      ('v1', 'p1', 'MED001', 'MED', 'waiting', datetime('now', '-10 minutes')),
      ('v2', 'p2', 'MED002', 'MED', 'waiting', datetime('now', '-5 minutes'))
  `).run();
}
```

## 4. E2E Testing Workflow

### 4.1 Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    command: 'npm run start:test',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

### 4.2 E2E Test Scenarios

```typescript
// tests/e2e/patient-journey.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Complete Patient Journey', () => {
  test('patient should get ticket, wait, and be called', async ({ page }) => {
    // 1. Patient gets ticket from kiosk
    await test.step('Get ticket from kiosk', async () => {
      await page.goto('/kiosk');
      
      // Select department
      await page.click('text=General Medicine');
      
      // Enter name
      await page.fill('input[name="name"]', 'John Doe');
      
      // Get ticket
      await page.click('button:has-text("Get Ticket")');
      
      // Verify ticket generated
      await expect(page.locator('.ticket-number')).toBeVisible();
      const ticketNumber = await page.locator('.ticket-number').textContent();
      expect(ticketNumber).toMatch(/MED\d{3}/);
      
      // Store for later
      await page.context().storageState({ path: 'state/patient.json' });
    });

    // 2. Patient views waiting display
    await test.step('View waiting display', async () => {
      await page.goto('/waiting-display');
      
      // Verify queue shows patient
      await expect(page.locator('.queue-list')).toContainText('John Doe');
    });

    // 3. Doctor calls next patient
    await test.step('Doctor calls patient', async () => {
      // Create new context for doctor
      const doctorContext = await browser.newContext({
        storageState: 'state/doctor.json'
      });
      const doctorPage = await doctorContext.newPage();
      
      await doctorPage.goto('/dashboard/doctor');
      
      // Click next patient
      await doctorPage.click('button:has-text("Next Patient")');
      
      // Verify patient called
      await expect(doctorPage.locator('.current-patient')).toContainText('John Doe');
      
      await doctorContext.close();
    });

    // 4. Waiting display updates
    await test.step('Waiting display updates', async () => {
      await page.waitForSelector('.now-calling', { timeout: 5000 });
      await expect(page.locator('.now-calling')).toContainText('John Doe');
      await expect(page.locator('.now-calling')).toContainText('Room 204');
    });

    // 5. Patient receives notification
    await test.step('Patient sees call', async () => {
      // Reload patient dashboard
      await page.goto('/dashboard/patient');
      
      await expect(page.locator('.status-message')).toContainText(
        'Please go to Room 204'
      );
    });
  });

  test('receptionist can add walk-in patient', async ({ page }) => {
    await test.step('Login as receptionist', async () => {
      await page.goto('/login');
      await page.fill('input[name="username"]', 'receptionist');
      await page.fill('input[name="password"]', process.env.TEST_PASSWORD!);
      await page.click('button:has-text("Login")');
      
      await expect(page).toHaveURL(/.*dashboard/);
    });

    await test.step('Add patient to queue', async () => {
      await page.click('button:has-text("Add Patient")');
      
      await page.fill('input[name="name"]', 'Jane Smith');
      await page.selectOption('select[name="department"]', 'MED');
      await page.click('button:has-text("Add to Queue")');
      
      // Verify confirmation
      await expect(page.locator('.success-message')).toContainText(
        'Patient added to queue'
      );
    });

    await test.step('Verify in queue', async () => {
      await page.click('text=Queue Status');
      await expect(page.locator('.queue-item')).toContainText('Jane Smith');
    });
  });
});
```

### 4.3 Visual Regression Testing

```typescript
// tests/e2e/visual/visual.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test('patient dashboard matches snapshot', async ({ page }) => {
    await page.goto('/dashboard/patient');
    
    // Wait for dynamic content to load
    await page.waitForSelector('.dashboard-loaded');
    
    // Take screenshot
    await expect(page).toHaveScreenshot('patient-dashboard.png', {
      maxDiffPixels: 100,
      threshold: 0.2
    });
  });

  test('doctor dashboard matches snapshot', async ({ page }) => {
    await page.goto('/dashboard/doctor');
    
    // Set fixed test data
    await page.evaluate(() => {
      window.localStorage.setItem('test-mode', 'true');
    });
    
    await expect(page).toHaveScreenshot('doctor-dashboard.png');
  });

  test('responsive layouts', async ({ page }) => {
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard/patient');
    await expect(page).toHaveScreenshot('mobile-patient.png');
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page).toHaveScreenshot('tablet-patient.png');
    
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page).toHaveScreenshot('desktop-patient.png');
  });
});
```

## 5. Performance Testing Workflow

### 5.1 k6 Load Test Scenarios

```javascript
// tests/performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const errorCounter = new Counter('errors');
const responseTimeTrend = new Trend('response_time');

export const options = {
  stages: [
    { duration: '1m', target: 10 },  // Ramp up
    { duration: '3m', target: 50 },  // Normal load
    { duration: '1m', target: 100 }, // Peak load
    { duration: '2m', target: 50 },  // Scale down
    { duration: '1m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    response_time: ['p(95)<2000']
  }
};

export default function() {
  const baseUrl = 'https://api.limuruhospital.co.ke';
  
  // Test queue status endpoint
  const queueRes = http.get(`${baseUrl}/queue/MED`);
  
  check(queueRes, {
    'queue status is 200': (r) => r.status === 200,
    'queue has valid response': (r) => {
      try {
        const body = r.json();
        return body.waiting !== undefined;
      } catch {
        return false;
      }
    }
  }) || errorCounter.add(1);
  
  responseTimeTrend.add(queueRes.timings.duration);
  
  // Mix of other API calls
  if (Math.random() < 0.3) { // 30% of requests
    const addRes = http.post(`${baseUrl}/queue`, JSON.stringify({
      name: `Test Patient ${Math.random()}`,
      department: 'MED'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    check(addRes, {
      'add patient is 201': (r) => r.status === 201
    }) || errorCounter.add(1);
  }
  
  sleep(Math.random() * 2);
}
```

### 5.2 Performance Test Reports

```typescript
// scripts/analyze-performance.ts
interface PerformanceReport {
  timestamp: string;
  endpoints: Record<string, {
    avgResponse: number;
    p95Response: number;
    p99Response: number;
    errorRate: number;
    throughput: number;
  }>;
  recommendations: string[];
}

export function generatePerformanceReport(results: any): PerformanceReport {
  const report: PerformanceReport = {
    timestamp: new Date().toISOString(),
    endpoints: {},
    recommendations: []
  };
  
  // Analyze each endpoint
  for (const [endpoint, metrics] of Object.entries(results)) {
    report.endpoints[endpoint] = {
      avgResponse: metrics.avg,
      p95Response: metrics.p95,
      p99Response: metrics.p99,
      errorRate: metrics.errors / metrics.total,
      throughput: metrics.total / metrics.duration
    };
    
    // Generate recommendations
    if (metrics.p95 > 500) {
      report.recommendations.push(
        `${endpoint}: High latency (p95: ${metrics.p95}ms) - consider caching`
      );
    }
    
    if (metrics.errors / metrics.total > 0.05) {
      report.recommendations.push(
        `${endpoint}: High error rate (${(metrics.errors/metrics.total*100).toFixed(2)}%) - check error handling`
      );
    }
  }
  
  return report;
}
```

## 6. Security Testing Workflow

### 6.1 Security Test Suite

```typescript
// tests/security/authentication.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '@/app';

describe('Authentication Security', () => {
  describe('Password Policies', () => {
    it('should reject weak passwords', async () => {
      const weakPasswords = [
        'short',
        'alllowercase',
        '12345678',
        'password123',
        'qwertyuiop'
      ];
      
      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            name: 'Test User',
            password
          });
        
        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Password must contain');
      }
    });
    
    it('should enforce password complexity', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          password: 'ValidPass123!'
        });
      
      expect(response.status).toBe(201);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      const attempts = [];
      
      // Attempt 10 rapid logins
      for (let i = 0; i < 10; i++) {
        attempts.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'test@example.com',
              password: 'wrong-password'
            })
        );
      }
      
      const responses = await Promise.all(attempts);
      
      // At least one should be rate limited
      expect(responses.some(r => r.status === 429)).toBe(true);
    });
  });

  describe('JWT Security', () => {
    it('should expire tokens after 24 hours', async () => {
      // Login
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'ValidPass123!'
        });
      
      const token = loginRes.body.token;
      
      // Advance time (mock)
      vi.setSystemTime(Date.now() + 25 * 60 * 60 * 1000);
      
      // Try to use expired token
      const protectedRes = await request(app)
        .get('/api/patient/profile')
        .set('Authorization', `Bearer ${token}`);
      
      expect(protectedRes.status).toBe(401);
    });
    
    it('should invalidate token on logout', async () => {
      // Login
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'ValidPass123!'
        });
      
      const token = loginRes.body.token;
      
      // Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);
      
      // Try to use token again
      const protectedRes = await request(app)
        .get('/api/patient/profile')
        .set('Authorization', `Bearer ${token}`);
      
      expect(protectedRes.status).toBe(401);
    });
  });
});
```

### 6.2 Vulnerability Scanning

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run CodeQL
        uses: github/codeql-action/init@v2
        with:
          languages: javascript, typescript
      
      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v2

  dependency-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Snyk
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

  zap-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: ZAP Scan
        uses: zaproxy/action-full-scan@v0.4.0
        with:
          target: 'https://staging.limuruhospital.co.ke'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a'
```

## 7. Accessibility Testing Workflow

### 7.1 Automated Accessibility Tests

```typescript
// tests/accessibility/a11y.test.tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { PatientDashboard } from '@/components/PatientDashboard';
import { DoctorDashboard } from '@/components/DoctorDashboard';
import { Kiosk } from '@/components/Kiosk';

expect.extend(toHaveNoViolations);

describe('Accessibility Tests', () => {
  it('PatientDashboard should have no violations', async () => {
    const { container } = render(<PatientDashboard patientId="test" />);
    
    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true },
        'aria-allowed-attr': { enabled: true },
        'button-name': { enabled: true }
      }
    });
    
    expect(results).toHaveNoViolations();
  });

  it('DoctorDashboard should have no violations', async () => {
    const { container } = render(<DoctorDashboard doctorId="test" />);
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Kiosk should have no violations', async () => {
    const { container } = render(<Kiosk />);
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper heading hierarchy', () => {
    const { container } = render(<PatientDashboard />);
    
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const levels = Array.from(headings).map(h => parseInt(h.tagName[1]));
    
    // Check headings don't skip levels
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i-1]).toBeLessThanOrEqual(1);
    }
  });

  it('all images should have alt text', () => {
    const { container } = render(<PatientDashboard />);
    
    const images = container.querySelectorAll('img');
    images.forEach(img => {
      expect(img).toHaveAttribute('alt');
      expect(img.getAttribute('alt')).not.toBe('');
    });
  });

  it('form inputs should have associated labels', () => {
    const { container } = render(<Kiosk />);
    
    const inputs = container.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      const id = input.getAttribute('id');
      if (id) {
        const label = container.querySelector(`label[for="${id}"]`);
        expect(label).toBeTruthy();
      } else {
        // If no id, check for aria-label
        expect(input).toHaveAttribute('aria-label');
      }
    });
  });
});
```

### 7.2 Manual Accessibility Checklist

```typescript
// docs/testing/manual-accessibility.md
export const manualAccessibilityChecklist = {
  keyboard: [
    {
      test: 'Tab through all interactive elements',
      pass: 'Focus moves in logical order, no traps',
      fail: 'Focus jumps randomly or gets stuck'
    },
    {
      test: 'Use Enter/Space to activate buttons',
      pass: 'All buttons work with keyboard',
      fail: 'Some buttons require mouse'
    },
    {
      test: 'Use arrow keys for sliders/dropdowns',
      pass: 'Arrow keys work as expected',
      fail: 'Arrow keys have no effect'
    },
    {
      test: 'Escape closes modals/dialogs',
      pass: 'Escape works consistently',
      fail: 'Can\'t close with keyboard'
    },
    {
      test: 'Focus indicator visible',
      pass: 'Clear focus outline on all elements',
      fail: 'No visible focus or hard to see'
    }
  ],

  screenReader: [
    {
      test: 'Read page title',
      pass: 'Title is announced correctly',
      fail: 'Title missing or wrong'
    },
    {
      test: 'Navigate by headings',
      pass: 'Can jump between sections with heading navigation',
      fail: 'No heading structure'
    },
    {
      test: 'Read image alt text',
      pass: 'Alt text describes image meaningfully',
      fail: 'Missing or poor alt text'
    },
    {
      test: 'Form labels announced',
      pass: 'Each input has label read before it',
      fail: 'Inputs without labels'
    },
    {
      test: 'Error messages announced',
      pass: 'Errors are announced immediately',
      fail: 'Errors appear silently'
    }
  ],

  visual: [
    {
      test: 'Color contrast',
      pass: 'All text meets 4.5:1 contrast',
      fail: 'Low contrast text'
    },
    {
      test: 'Text resizing to 200%',
      pass: 'Layout works at 200% zoom',
      fail: 'Content cuts off or overlaps'
    },
    {
      test: 'Information without color',
      pass: 'Can understand without color',
      fail: 'Color used as sole indicator'
    },
    {
      test: 'Touch targets (mobile)',
      pass: 'All targets at least 44x44px',
      fail: 'Small touch targets'
    }
  ],

  cognitive: [
    {
      test: 'Clear instructions',
      pass: 'Instructions are easy to understand',
      fail: 'Confusing or missing instructions'
    },
    {
      test: 'Consistent navigation',
      pass: 'Navigation consistent across pages',
      fail: 'Navigation changes between pages'
    },
    {
      test: 'Error messages helpful',
      pass: 'Errors explain how to fix',
      fail: 'Vague error messages'
    },
    {
      test: 'Sufficient time',
      pass: 'No time limits or can extend',
      fail: 'Forms time out too quickly'
    }
  ]
};
```

## 8. Test Data Management

### 8.1 Test Data Factories

```typescript
// tests/factories/patient.factory.ts
import { faker } from '@faker-js/faker';

export class PatientFactory {
  static create(overrides = {}) {
    return {
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      dob: faker.date.past({ years: 50 }).toISOString().split('T')[0],
      createdAt: faker.date.recent().toISOString(),
      ...overrides
    };
  }

  static createMany(count: number, overrides = {}) {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createQueuePatient(position: number) {
    return {
      ...this.create(),
      ticketNumber: `MED${String(position).padStart(3, '0')}`,
      department: 'MED',
      status: 'waiting',
      position
    };
  }
}

export class VisitFactory {
  static create(patientId: string, overrides = {}) {
    return {
      id: faker.string.uuid(),
      patientId,
      ticketNumber: `MED${faker.number.int({ min: 1, max: 999 })}`,
      department: faker.helpers.arrayElement(['MED', 'PED', 'CARD']),
      status: faker.helpers.arrayElement(['waiting', 'called', 'completed']),
      doctorNotes: faker.lorem.paragraph(),
      createdAt: faker.date.recent().toISOString(),
      ...overrides
    };
  }
}
```

### 8.2 Test Database Seeding

```typescript
// scripts/seed-test-data.ts
import { PatientFactory, VisitFactory } from '../tests/factories/patient.factory';
import { db } from '@/lib/db';

async function seedTestData() {
  console.log('🌱 Seeding test data...');
  
  // Create patients
  const patients = PatientFactory.createMany(50);
  
  for (const patient of patients) {
    await db
      .prepare(`
        INSERT INTO patients (id, name, email, phone, dob, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .bind(
        patient.id,
        patient.name,
        patient.email,
        patient.phone,
        patient.dob,
        patient.createdAt
      )
      .run();
    
    // Create 1-5 visits per patient
    const visitCount = faker.number.int({ min: 1, max: 5 });
    const visits = VisitFactory.createMany(visitCount, { patientId: patient.id });
    
    for (const visit of visits) {
      await db
        .prepare(`
          INSERT INTO visits (id, patient_id, ticket_number, department, status, doctor_notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          visit.id,
          visit.patientId,
          visit.ticketNumber,
          visit.department,
          visit.status,
          visit.doctorNotes,
          visit.createdAt
        )
        .run();
    }
  }
  
  console.log(`✅ Seeded ${patients.length} patients with visits`);
}

seedTestData().catch(console.error);
```

## 9. CI/CD Integration

### 9.1 GitHub Actions Test Workflow

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
          cache: 'npm'
      
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
          flags: unittests

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run migrations
        run: npm run db:migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/postgres
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/postgres

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps chromium
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          CI: true
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/

  accessibility-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run a11y tests
        run: npm run test:a11y
      
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v10
        with:
          urls: |
            https://staging.limuruhospital.co.ke
            https://staging.limuruhospital.co.ke/dashboard/patient
          budgetPath: ./lighthouse-budget.json
          uploadArtifacts: true
```

### 9.2 Test Status Badges

```markdown
# README.md

## Test Status

| Test Suite | Status | Coverage |
|------------|--------|----------|
| Unit Tests | ![unit](https://img.shields.io/github/actions/workflow/status/limuru-hospital/queuing-system/test.yml?label=unit) | ![coverage](https://codecov.io/gh/limuru-hospital/queuing-system/branch/main/graph/badge.svg) |
| Integration | ![integration](https://img.shields.io/github/actions/workflow/status/limuru-hospital/queuing-system/integration.yml?label=integration) | - |
| E2E Tests | ![e2e](https://img.shields.io/github/actions/workflow/status/limuru-hospital/queuing-system/e2e.yml?label=e2e) | - |
| Accessibility | ![a11y](https://img.shields.io/github/actions/workflow/status/limuru-hospital/queuing-system/a11y.yml?label=a11y) | - |
| Performance | ![perf](https://img.shields.io/github/actions/workflow/status/limuru-hospital/queuing-system/performance.yml?label=perf) | - |
| Security | ![security](https://img.shields.io/github/actions/workflow/status/limuru-hospital/queuing-system/security.yml?label=security) | - |
```

## 10. Test Reporting

### 10.1 Test Report Generation

```typescript
// scripts/generate-test-report.ts
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

interface TestReport {
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
  suites: TestSuite[];
  failures: TestFailure[];
  coverage: CoverageReport;
}

interface TestSuite {
  name: string;
  total: number;
  passed: number;
  failed: number;
  duration: number;
}

export async function generateTestReport() {
  const report: TestReport = {
    summary: { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0 },
    suites: [],
    failures: [],
    coverage: JSON.parse(readFileSync('./coverage/coverage-summary.json', 'utf-8'))
  };
  
  // Parse JUnit XML results
  const junitFiles = await glob('test-results/*.xml');
  
  for (const file of junitFiles) {
    const content = readFileSync(file, 'utf-8');
    const suite = parseJUnitXML(content);
    report.suites.push(suite);
    
    report.summary.total += suite.total;
    report.summary.passed += suite.passed;
    report.summary.failed += suite.failed;
    report.summary.duration += suite.duration;
  }
  
  // Generate HTML report
  const html = generateHTMLReport(report);
  writeFileSync('test-report.html', html);
  
  // Send to monitoring
  await sendReportToMonitoring(report);
  
  return report;
}

function generateHTMLReport(report: TestReport): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Test Report - ${new Date().toISOString().split('T')[0]}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; }
    .pass { color: green; }
    .fail { color: red; }
    .suite { margin: 20px 0; padding: 10px; border: 1px solid #ddd; }
    .progress-bar { height: 20px; background: #eee; border-radius: 10px; }
    .progress-fill { height: 100%; background: #4CAF50; border-radius: 10px; }
  </style>
</head>
<body>
  <h1>Test Report</h1>
  <div class="summary">
    <h2>Summary</h2>
    <p>Total Tests: ${report.summary.total}</p>
    <p class="pass">Passed: ${report.summary.passed}</p>
    <p class="fail">Failed: ${report.summary.failed}</p>
    <p>Skipped: ${report.summary.skipped}</p>
    <p>Duration: ${(report.summary.duration / 1000).toFixed(2)}s</p>
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${(report.summary.passed / report.summary.total * 100)}%"></div>
    </div>
  </div>
  
  <h2>Test Suites</h2>
  ${report.suites.map(suite => `
    <div class="suite">
      <h3>${suite.name}</h3>
      <p>Passed: ${suite.passed}/${suite.total}</p>
      <p>Duration: ${(suite.duration / 1000).toFixed(2)}s</p>
    </div>
  `).join('')}
  
  ${report.failures.length > 0 ? `
    <h2>Failures</h2>
    ${report.failures.map(failure => `
      <div class="fail">
        <p><strong>${failure.test}</strong> - ${failure.message}</p>
      </div>
    `).join('')}
  ` : ''}
  
  <h2>Coverage</h2>
  <table>
    <tr>
      <th>File</th>
      <th>Statements</th>
      <th>Branches</th>
      <th>Functions</th>
      <th>Lines</th>
    </tr>
    ${Object.entries(report.coverage).map(([file, cov]) => `
      <tr>
        <td>${file}</td>
        <td>${cov.statements.pct}%</td>
        <td>${cov.branches.pct}%</td>
        <td>${cov.functions.pct}%</td>
        <td>${cov.lines.pct}%</td>
      </tr>
    `).join('')}
  </table>
</body>
</html>
  `;
}
```

## 11. Test Environment Management

### 11.1 Environment Configuration

```typescript
// config/test.config.ts
export const testConfig = {
  environments: {
    local: {
      baseUrl: 'http://localhost:3000',
      apiUrl: 'http://localhost:8787',
      database: 'file:./test.db'
    },
    ci: {
      baseUrl: process.env.BASE_URL || 'http://localhost:3000',
      apiUrl: process.env.API_URL || 'http://localhost:8787',
      database: process.env.DATABASE_URL || 'file:./test.db'
    },
    staging: {
      baseUrl: 'https://staging.limuruhospital.co.ke',
      apiUrl: 'https://staging-api.limuruhospital.co.ke',
      database: process.env.STAGING_DATABASE_URL
    }
  },

  testUsers: {
    patient: {
      email: 'test-patient@example.com',
      password: 'TestPass123!'
    },
    doctor: {
      email: 'test-doctor@example.com',
      password: 'TestPass123!'
    },
    receptionist: {
      email: 'test-reception@example.com',
      password: 'TestPass123!'
    },
    admin: {
      email: 'test-admin@example.com',
      password: 'TestPass123!'
    }
  },

  timeouts: {
    unit: 5000,
    integration: 10000,
    e2e: 30000,
    performance: 60000
  },

  retries: {
    unit: 1,
    integration: 2,
    e2e: 2,
    flaky: 3
  }
};
```

## 12. Testing Best Practices

### 12.1 Test Naming Conventions

```typescript
// ✅ GOOD: Descriptive test names
describe('QueueService', () => {
  it('should return next patient in FIFO order when multiple patients waiting', () => {});
  it('should throw QueueEmptyError when no patients in queue', () => {});
  it('should update patient status to called when calling next', () => {});
});

// ❌ BAD: Vague test names
describe('QueueService', () => {
  it('should work', () => {});
  it('test1', () => {});
  it('handles error', () => {});
});
```

### 12.2 Test Isolation

```typescript
// ✅ GOOD: Isolated tests
describe('PatientService', () => {
  beforeEach(() => {
    // Fresh state for each test
    vi.clearAllMocks();
    db = createTestDatabase();
  });

  afterEach(async () => {
    // Clean up
    await db.clearAllData();
  });

  it('test 1', () => {});
  it('test 2', () => {});
});

// ❌ BAD: Shared state
let sharedData;
beforeAll(() => {
  sharedData = setup(); // Tests can interfere
});
```

### 12.3 Testing Anti-Patterns

```typescript
// ❌ DON'T: Test implementation details
it('should call setState with true', () => {
  const setStateSpy = vi.spyOn(React, 'useState');
  render(<Component />);
  expect(setStateSpy).toHaveBeenCalledWith(true);
});

// ✅ DO: Test behavior
it('should show loading state then data', async () => {
  render(<PatientDashboard />);
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  
  await waitFor(() => {
    expect(screen.getByText('Patient Data')).toBeInTheDocument();
  });
});

// ❌ DON'T: Mock everything
vi.mock('@/lib/api', () => ({
  fetchData: vi.fn().mockResolvedValue({})
}));

// ✅ DO: Mock at boundaries
vi.mock('@/lib/db', () => ({
  db: mockDatabase
}));
```

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-03 | System | Initial version |

**Review Date:** 2026-06-03
```

**File created successfully: `.opencode/context/core/workflows/03-testing.md`**

Please confirm if I should proceed with the next file: `.opencode/context/core/workflows/04-deployment.md`
