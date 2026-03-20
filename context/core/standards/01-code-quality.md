## Creating File: `.opencode/context/core/standards/01-code-quality.md`

```markdown
# Code Quality Standards
**Document ID:** CORE-STD-01
**Version:** 1.0
**Last Updated:** 2026-03-02
**Owner:** Technical Lead

## Purpose

This document defines the code quality standards, architectural patterns, and best practices for the Hospital Queuing System. Adherence to these standards ensures maintainability, scalability, and reliability across the codebase.

## 1. General Principles

### 1.1 Core Tenets
- **Clean Code**: Code should be readable, self-documenting, and follow the principle of least astonishment
- **DRY (Don't Repeat Yourself)**: Abstract common functionality into reusable components
- **SOLID Principles**: Apply object-oriented design principles where appropriate
- **YAGNI (You Ain't Gonna Need It)**: Implement only what's currently required
- **Separation of Concerns**: Each module/component should have a single responsibility

### 1.2 Technology-Specific Standards

#### TypeScript/JavaScript
- Use TypeScript for all production code (strict mode enabled)
- Define interfaces for all data structures
- Avoid `any` type; use `unknown` with type guards when necessary
- Use ES6+ features (async/await, destructuring, spread operators)

#### React/Next.js
- Use functional components with hooks
- Implement proper component composition
- Follow React 18+ best practices
- Use Next.js App Router for routing

#### Cloudflare Workers
- Optimize for edge computing constraints (CPU time, memory)
- Minimize cold start times
- Use environment bindings correctly

## 2. Code Organization

### 2.1 Directory Structure

```
apps/
├── web/                          # Next.js web application
│   ├── app/                      # App router pages
│   │   ├── (auth)/               # Authentication routes
│   │   ├── (dashboard)/          # Dashboard routes
│   │   └── api/                   # API routes
│   ├── components/                # React components
│   │   ├── ui/                    # Reusable UI components
│   │   ├── features/              # Feature-specific components
│   │   └── layout/                 # Layout components
│   ├── lib/                        # Utility functions
│   │   ├── api/                    # API client
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── utils/                  # Helper functions
│   │   └── types/                   # TypeScript type definitions
│   └── public/                      # Static assets
│
├── mobile/                          # Expo mobile application
│   ├── app/                         # Expo Router pages
│   ├── components/                   # React Native components
│   └── lib/                          # Mobile utilities
│
packages/
├── shared-types/                     # Shared TypeScript definitions
│   ├── api/                          # API request/response types
│   ├── database/                     # Database schema types
│   └── events/                        # WebSocket event types
├── trpc-client/                       # tRPC API client
└── ui-components/                      # Shared React components
```

### 2.2 File Naming Conventions

| File Type | Convention | Example |
|-----------|------------|---------|
| React Components | PascalCase | `PatientDashboard.tsx` |
| Utility Functions | camelCase | `formatDate.ts` |
| Type Definitions | PascalCase with .types.ts | `Patient.types.ts` |
| API Routes | kebab-case | `get-queue.ts` |
| Styles | kebab-case | `patient-dashboard.module.css` |
| Tests | *.test.ts or *.spec.ts | `queue-service.test.ts` |

## 3. Code Style Guidelines

### 3.1 Formatting

```typescript
// ✓ GOOD: Consistent formatting with 2 spaces
function calculateWaitTime(queue: Queue, doctors: Doctor[]): number {
  const baseTime = 15; // minutes
  const queueFactor = queue.length * 2;
  const doctorFactor = Math.max(1, doctors.filter(d => d.available).length);
  
  return Math.round((baseTime + queueFactor) / doctorFactor);
}

// ✗ BAD: Inconsistent spacing, no types
function calculateWaitTime(queue,doctors){
  return Math.round((15+queue.length*2)/doctors.filter(d=>d.available).length);
}
```

### 3.2 Naming Conventions

```typescript
// Variables: camelCase
const patientCount = 42;
let isAuthenticated = false;

// Constants: UPPER_SNAKE_CASE
const DEFAULT_PASSWORD = "#Limuru_Cottage_Hospital@2026";
const MAX_RETRY_ATTEMPTS = 3;

// Functions: camelCase, verb-first
async function fetchPatientHistory(patientId: string) {}
function formatTicketNumber(department: string, number: number) {}

// Classes/Components: PascalCase
class QueueService {}
function PatientDashboard() {}

// Interfaces: PascalCase with I prefix (optional, be consistent)
interface IPatient {
  id: string;
  name: string;
}

// Types: PascalCase
type QueueStatus = 'waiting' | 'called' | 'completed';

// Enums: PascalCase, singular
enum Department {
  GeneralMedicine = 'GENERAL',
  Pediatrics = 'PEDIATRICS',
  Cardiology = 'CARDIOLOGY'
}
```

### 3.3 Comments

```typescript
// ✓ GOOD: Explain why, not what
// Use fallback to default password only during first login
// or after explicit admin reset
function resetPasswordToDefault(patientId: string): void {
  // Implementation
}

// ✗ BAD: Obvious comments
// This function resets password
function resetPassword() {}
```

## 4. Error Handling

### 4.1 Try-Catch Patterns

```typescript
// ✓ GOOD: Specific error handling
async function addPatientToQueue(patientData: PatientInput): Promise<Patient> {
  try {
    validatePatientData(patientData);
    
    const patient = await db.insert(patients).values(patientData).returning();
    
    // Broadcast real-time update
    await broadcastQueueUpdate('patient-added', patient);
    
    return patient;
  } catch (error) {
    if (error instanceof ValidationError) {
      // Handle validation errors (user-facing)
      throw new AppError(400, 'Invalid patient data', error);
    } else if (error instanceof DatabaseError) {
      // Handle database errors (technical)
      console.error('Database error:', error);
      throw new AppError(500, 'Unable to add patient');
    } else {
      // Unexpected errors
      console.error('Unexpected error:', error);
      throw new AppError(500, 'An unexpected error occurred');
    }
  }
}

// ✗ BAD: Generic error handling
try {
  await riskyOperation();
} catch (error) {
  console.log('Something went wrong');
  throw error;
}
```

### 4.2 Custom Error Classes

```typescript
// lib/errors/app-error.ts
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  
  constructor(
    statusCode: number,
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    
    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, cause?: Error) {
    super(400, message, cause);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(401, message);
    this.name = 'AuthenticationError';
  }
}
```

## 5. Testing Requirements

### 5.1 Coverage Targets

| Type | Coverage Target | Critical Paths |
|------|-----------------|----------------|
| Unit Tests | 80% | Business logic, utilities |
| Integration Tests | 70% | API endpoints, database operations |
| E2E Tests | Key user flows | Queue operations, patient flow |

### 5.2 Test Structure

```typescript
// ✓ GOOD: Arrange-Act-Assert pattern
describe('QueueService', () => {
  describe('callNextPatient', () => {
    it('should return the next patient in FIFO order', async () => {
      // Arrange
      const queue = createTestQueue(['MED001', 'MED002']);
      const service = new QueueService(queue);
      
      // Act
      const nextPatient = await service.callNextPatient('dr_smith');
      
      // Assert
      expect(nextPatient.ticketNumber).toBe('MED001');
    });
    
    it('should throw error when queue is empty', async () => {
      // Arrange
      const emptyQueue = createTestQueue([]);
      const service = new QueueService(emptyQueue);
      
      // Act & Assert
      await expect(service.callNextPatient('dr_smith'))
        .rejects.toThrow('No patients in queue');
    });
  });
});
```

## 6. Performance Standards

### 6.1 Benchmarks

| Operation | Target | Measurement |
|-----------|--------|-------------|
| API Response (P95) | < 200ms | Server timing |
| Page Load (FCP) | < 1.5s | Lighthouse |
| Queue Update Broadcast | < 500ms | WebSocket latency |
| Database Query (simple) | < 50ms | Query timing |
| Database Query (complex) | < 200ms | Query timing |
| IPTV Channel Switch | < 2s | User perception |

### 6.2 Optimization Techniques

```typescript
// ✓ GOOD: Memoization for expensive computations
import { useMemo } from 'react';

function QueueDashboard({ patients }: { patients: Patient[] }) {
  const waitTimeStats = useMemo(() => {
    return patients.reduce(
      (acc, p) => ({
        total: acc.total + p.waitTime,
        count: acc.count + 1,
        max: Math.max(acc.max, p.waitTime)
      }),
      { total: 0, count: 0, max: 0 }
    );
  }, [patients]);
  
  // Render...
}

// ✓ GOOD: Debouncing for frequent updates
import { debounce } from 'lodash';

const saveNotes = useCallback(
  debounce(async (notes: string) => {
    await api.saveDoctorNotes(notes);
  }, 1000),
  []
);
```

## 7. Security Standards

### 7.1 Input Validation

```typescript
// ✓ GOOD: Validate all inputs
import { z } from 'zod';

const PatientSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  dob: z.string().datetime().optional()
});

function validatePatientInput(data: unknown): Patient {
  try {
    return PatientSchema.parse(data);
  } catch (error) {
    throw new ValidationError('Invalid patient data', error);
  }
}
```

### 7.2 SQL Injection Prevention

```typescript
// ✓ GOOD: Use parameterized queries
// In Cloudflare D1
const patient = await db
  .prepare('SELECT * FROM patients WHERE id = ?')
  .bind(patientId)
  .first();

// ✗ BAD: String concatenation
const query = `SELECT * FROM patients WHERE id = '${patientId}'`; // NEVER DO THIS
```

## 8. Documentation Requirements

### 8.1 Code Documentation

```typescript
/**
 * Calls the next patient in the queue for a specific doctor
 * 
 * @param doctorId - The ID of the doctor making the call
 * @param roomNumber - The room where the patient should go
 * @returns The called patient object
 * @throws {QueueEmptyError} When no patients are waiting
 * @throws {DoctorOfflineError} When doctor is not available
 * 
 * @example
 * ```ts
 * const patient = await queueService.callNextPatient(
 *   'dr_smith',
 *   '204'
 * );
 * console.log(`Called ${patient.name} to room 204`);
 * ```
 */
async function callNextPatient(
  doctorId: string,
  roomNumber: string
): Promise<Patient> {
  // Implementation
}
```

### 8.2 README Standards

Every module/package must include a README.md with:
- Purpose and functionality
- Installation instructions
- Usage examples
- API reference (if applicable)
- Dependencies
- Environment variables required

## 9. Version Control

### 9.1 Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

**Examples:**
```
feat(queue): add priority override for emergency patients

Adds ability for doctors to mark patients as priority,
moving them to front of queue.

Closes #123
```

```
fix(auth): resolve password reset token expiration

Tokens now properly expire after 1 hour and are invalidated
after use.

Fixes #456
```

### 9.2 Branch Strategy

```
main                    # Production-ready code
├── staging            # Pre-production validation
├── develop            # Integration branch
│   ├── feature/queue-management
│   ├── feature/patient-portal
│   ├── bugfix/password-reset
│   └── release/v1.0.0
```

## 10. Code Review Checklist

### Pre-Submission Checklist
- [ ] Code follows style guidelines
- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] No debug code or console.logs
- [ ] Error handling implemented
- [ ] Performance considered
- [ ] Security reviewed (input validation, auth)
- [ ] Types defined and used correctly

### Review Focus Areas
1. **Correctness**: Does it work as expected?
2. **Maintainability**: Is it easy to understand and modify?
3. **Performance**: Are there any bottlenecks?
4. **Security**: Any vulnerabilities introduced?
5. **Test Coverage**: Are edge cases covered?

## 11. Enforcement

### Automated Enforcement
- ESLint with custom rules
- Prettier for formatting
- TypeScript strict mode
- Husky pre-commit hooks
- CI pipeline with linting/tests

### Manual Enforcement
- Code reviews for all PRs
- Architecture reviews for major changes
- Performance profiling in staging
- Security audits quarterly

---

**Document Version History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-02 | System | Initial version |

**Review Date:** 2026-06-02
```

**File created successfully: `.opencode/context/core/standards/01-code-quality.md`**

Please confirm if I should proceed with the next file: `.opencode/context/core/standards/02-documentation.md`
