# Development Guide

## Table of Contents

1. [Local Setup](#1-local-setup)
2. [Architecture](#2-architecture)
3. [API Reference](#3-api-reference)
4. [Components](#4-components)
5. [Testing](#5-testing)
6. [Contributing](#6-contributing)

---

## 1. Local Setup

### 1.1 Prerequisites

```bash
# Required software
- Node.js >= 18.0.0
- pnpm >= 9.0.0
- Wrangler CLI >= 4.0.0
- Git
```

### 1.2 Installation

```bash
# Clone the repository
git clone <repository-url>
cd "Hospital Queueing System"

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env
```

### 1.3 Starting Development

**Option 1: Wrangler (Recommended - No Docker)**

```bash
# Start API with local D1 database
cd apps/api
pnpm dev

# In another terminal, start web app
cd apps/web
pnpm dev
```

**Option 2: Docker for PostgreSQL**

```bash
# Start database
cd services
docker-compose up -d database

# Start API with Wrangler
cd apps/api
wrangler dev --persist

# Start web app
cd apps/web
pnpm dev
```

### 1.4 Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| API | http://localhost:8787 | Backend API |
| Web | http://localhost:3000 | Web dashboard |
| Mobile PWA | http://localhost:3001 | Mobile app |
| D1 Console | `wrangler d1 console` | Database access |

### 1.5 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@limuruhospital.co.ke | password123 |
| Doctor | doctor@hospital.co.ke | password123 |
| Nurse | nurse@hospital.co.ke | password123 |
| Receptionist | reception@hospital.co.ke | password123 |

---

## 2. Architecture

### 2.1 Project Structure

```
Hospital Queueing System/
├── apps/
│   ├── api/                    # Cloudflare Workers API
│   │   ├── src/
│   │   │   ├── routes/        # API route handlers
│   │   │   ├── services/      # Business logic
│   │   │   ├── middleware/     # Auth, validation
│   │   │   ├── durable-objects/ # Real-time features
│   │   │   └── db/            # Migrations
│   │   ├── wrangler.toml      # Cloudflare config
│   │   └── package.json
│   │
│   ├── web/                   # Next.js Web App
│   │   ├── app/              # Pages (App Router)
│   │   ├── lib/              # API client, stores
│   │   └── components/       # UI components
│   │
│   └── mobile/               # React Native PWA
│
├── packages/
│   └── shared/               # Shared types
│
├── services/                  # Docker, infrastructure
├── docs/                      # Documentation
└── scripts/                   # Utility scripts
```

### 2.2 API Architecture

```
Request → Middleware (auth, rateLimit, validate) → Route Handler → Service → Database
         ↓
    Response (formatted with success/error)
```

### 2.3 Data Flow

```
Client → REST API → Route Handler → Service Layer → D1 Database
              ↓
         KV Store (Sessions, Cache)
              ↓
         R2 Storage (Files)
```

---

## 3. API Reference

### 3.1 Authentication

All authenticated endpoints require:

```bash
Authorization: Bearer <token>
```

### 3.2 Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message"
}
```

### 3.3 Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/staff/login` | POST | Staff login |
| `/api/auth/patient/login` | POST | Patient login |
| `/api/queue` | GET | Get queue |
| `/api/queue` | POST | Create ticket |
| `/api/queue/call` | POST | Call patient |
| `/api/patients` | GET/POST | List/create patients |
| `/api/appointments` | GET/POST | Appointments |
| `/api/notes/:queueId` | GET/POST | Clinical notes |
| `/api/messages` | GET/POST | Staff messages |
| `/api/voice/call` | POST | Initiate voice call |

### 3.4 Rate Limits

| Endpoint Type | Limit |
|---------------|-------|
| Public | 30/min |
| Authenticated | 100/min |
| Auth | 5/15min |

---

## 4. Components

### 4.1 Creating a Route

```typescript
// apps/api/src/routes/example.ts
import { Hono } from 'hono';
import { z } from 'zod';
import { successResponse, errorResponse } from '../utils';

type Bindings = {
  DB: D1Database;
  SESSION_KV: KVNamespace;
};

const example = new Hono<{ Bindings: Bindings }>();

// Validation schema
const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

// Middleware
const requireAuth = async (c, next) => {
  const auth = c.req.header('Authorization');
  if (!auth) return c.json(errorResponse('Unauthorized'), 401);
  // ... verify token
  await next();
};

// Route handler
example.post('/', requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const data = createSchema.parse(body);
    
    // Business logic
    const result = await c.env.DB.prepare(
      'INSERT INTO examples (name, email) VALUES (?, ?)'
    ).bind(data.name, data.email).run();
    
    return c.json(successResponse({ id: result.meta.last_row_id }), 201);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return c.json(errorResponse(e.errors.join(', ')), 400);
    }
    return c.json(errorResponse('Server error'), 500);
  }
});

export default example;
```

### 4.2 Service Layer

```typescript
// apps/api/src/services/example-service.ts
export class ExampleService {
  constructor(private db: D1Database) {}
  
  async create(data: CreateExampleInput) {
    const result = await this.db.prepare(
      'INSERT INTO examples (name, email) VALUES (?, ?)'
    ).bind(data.name, data.email).run();
    
    return { id: result.meta.last_row_id, ...data };
  }
  
  async findById(id: string) {
    return this.db.prepare('SELECT * FROM examples WHERE id = ?').bind(id).first();
  }
  
  async list(limit = 20, offset = 0) {
    const { results } = await this.db.prepare(
      'SELECT * FROM examples LIMIT ? OFFSET ?'
    ).bind(limit, offset).all();
    
    return results;
  }
}
```

### 4.3 Database Migrations

```sql
-- apps/api/src/db/migrations/0008_new_feature.sql
-- Migration: Add new_feature table
-- Created: 2026-03-21

BEGIN;

CREATE TABLE IF NOT EXISTS new_feature (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_new_feature_name ON new_feature(name);

COMMIT;
```

### 4.4 Adding to Router Index

```typescript
// apps/api/src/routes/index.ts
import { Hono } from 'hono';
import auth from './auth';
import queue from './queue';
import patients from './patients';
import example from './example'; // Add this

const app = new Hono();

app.route('/auth', auth);
app.route('/queue', queue);
app.route('/patients', patients);
app.route('/example', example); // Add this

export default app;
```

---

## 5. Testing

### 5.1 Running Tests

```bash
# Run all tests
pnpm test

# Run specific package
pnpm --filter @hospital-queue/api test

# Run with coverage
pnpm test --coverage

# Run E2E tests
pnpm test:e2e
```

### 5.2 Writing Tests

```typescript
// apps/api/src/routes/example.test.ts
import { describe, it, expect } from 'vitest';
import { createTestRequest, createTestUser } from '../test-utils';

describe('Example API', () => {
  it('should create example', async () => {
    const { token } = await createTestUser('admin');
    
    const res = await createTestRequest('/api/example', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'Test', email: 'test@example.com' })
    });
    
    expect(res.status).toBe(201);
    expect(res.data.success).toBe(true);
  });
});
```

### 5.3 E2E Testing

```typescript
// apps/web/e2e/example.spec.ts
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'admin@limuruhospital.co.ke');
  await page.fill('[name="password"]', 'password123');
  await page.click('[type="submit"]');
  
  await expect(page).toHaveURL('/dashboard/admin');
});
```

---

## 6. Contributing

### 6.1 Development Workflow

1. **Fork** the repository
2. **Clone** your fork
3. **Create** a feature branch: `git checkout -b feature/my-feature`
4. **Make** your changes
5. **Test** your changes
6. **Commit** with descriptive message
7. **Push** to your fork
8. **Create** Pull Request

### 6.2 Code Style

```bash
# Format code
pnpm format

# Lint
pnpm lint

# Typecheck
pnpm typecheck
```

### 6.3 Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### 6.4 Pull Request Checklist

- [ ] Code follows project style
- [ ] Tests pass
- [ ] Types are correct
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] No hardcoded values

### 6.5 Code Review

Reviewers check for:
- Functionality
- Code quality
- Security concerns
- Performance
- Test coverage
- Documentation

---

## Appendix: Useful Commands

```bash
# Development
pnpm dev                 # Start all apps
pnpm dev:api             # API only
pnpm dev:web             # Web only

# Database
pnpm db:local            # Apply D1 migrations
pnpm db:generate         # Generate types

# Deployment
pnpm deploy:staging      # Deploy to staging
pnpm deploy:prod         # Deploy to production

# Utility
pnpm build               # Build all
pnpm clean               # Clean build artifacts
pnpm logs                # View production logs
```
