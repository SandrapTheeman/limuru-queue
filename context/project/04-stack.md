## Creating File: `.opencode/context/project/04-stack.md`

```markdown
# Technology Stack
**Document ID:** PROJ-04
**Version:** 1.0
**Last Updated:** 2026-03-03
**Owner:** Tech Lead

## Purpose

This document defines the complete technology stack for the Hospital Queuing System, including justifications for each choice, version specifications, and integration patterns.

## 1. Stack Overview

### 1.1 Technology Stack Diagram

```mermaid
graph TB
    subgraph "Frontend Stack"
        A[Next.js 14] --> B[React 18]
        B --> C[TypeScript 5]
        B --> D[Tailwind CSS 3]
        A --> E[tRPC 10]
        A --> F[Zustand 4]
        A --> G[React Query 5]
    end
    
    subgraph "Backend Stack"
        H[Cloudflare Workers] --> I[TypeScript 5]
        H --> J[D1 Database]
        H --> K[KV Store]
        H --> L[R2 Storage]
        H --> M[Durable Objects]
    end
    
    subgraph "DevOps Stack"
        N[GitHub Actions] --> O[Wrangler CLI]
        N --> P[Playwright]
        N --> Q[Vitest]
        O --> R[Cloudflare Pages]
    end
    
    subgraph "External Services"
        S[Resend - Email]
        T[VLC - IPTV]
        U[Web Speech API]
        V[Africa's Talking - SMS]
    end
    
    E --> H
    F --> H
    G --> H
    
    H --> S
    H --> V
    A --> T
    A --> U
```

## 2. Frontend Stack Details

### 2.1 Core Framework: Next.js 14

```json
// package.json - Core Dependencies
{
  "dependencies": {
    "next": "14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "typescript": "^5.4.0"
  }
}
```

**Justification:**
```markdown
## Why Next.js 14?

### ✅ Benefits
1. **App Router**: Modern file-based routing with layouts
2. **Server Components**: Reduced client-side JavaScript
3. **Server Actions**: Direct database mutations from components
4. **Image Optimization**: Automatic image optimization
5. **Font Optimization**: Built-in font loading strategies
6. **API Routes**: Integrated backend endpoints
7. **Middleware**: Edge runtime for authentication
8. **Partial Prerendering**: Hybrid static/dynamic rendering

### 📊 Performance Impact
- 40% smaller JavaScript bundles
- 50% faster Time to Interactive
- Zero-config code splitting
- Automatic static optimization

### 🎯 Use Cases
- Patient dashboard (dynamic)
- Kiosk interface (static)
- Admin panel (dynamic)
- API endpoints (serverless)
```

### 2.2 UI Framework: React 18

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  }
}
```

**Key Features Used:**
```typescript
// 1. Concurrent Rendering
const QueueStatus = () => {
  const [data, setData] = useState(null);
  
  useTransition(() => {
    // Non-blocking updates
    setData(fetchQueueData());
  });
};

// 2. Suspense for Data Fetching
<Suspense fallback={<QueueSkeleton />}>
  <QueueList />
</Suspense>

// 3. Server Components
// app/queue/page.tsx - Server Component
export default async function QueuePage() {
  const queue = await db.query.queue.findAll();
  return <QueueDisplay queue={queue} />;
}
```

### 2.3 Styling: Tailwind CSS 3

```json
{
  "devDependencies": {
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

**Configuration:**
```javascript
// tailwind.config.js
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#E8F5E9',
          100: '#C8E6C9',
          500: '#4CAF50',
          700: '#2E7D32',
          900: '#1B5E20',
        },
        hospital: {
          bg: '#F5F5F5',
          card: '#FFFFFF',
          text: '#212121',
          muted: '#757575',
        }
      },
      fontFamily: {
        sans: ['Inter var', 'system-ui', 'sans-serif'],
      },
      spacing: {
        'touch': '44px', // Minimum touch target
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
```

**Justification:**
```markdown
## Why Tailwind CSS?

### ✅ Benefits
- Utility-first for rapid development
- Consistent design system
- Built-in accessibility features
- Small production CSS (purge unused)
- Dark mode support
- Responsive design utilities
- No CSS conflicts

### 📊 Bundle Impact
- Base CSS: ~10kB after purge
- Zero runtime CSS-in-JS overhead
- Optimal critical CSS extraction
```

### 2.4 State Management

```json
{
  "dependencies": {
    "zustand": "^4.5.0",
    "@tanstack/react-query": "^5.24.0"
  }
}
```

**Zustand Store Example:**
```typescript
// store/queueStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface QueueState {
  patients: Patient[];
  currentPatient: Patient | null;
  waitingCount: number;
  
  // Actions
  addPatient: (patient: Patient) => void;
  callNext: () => void;
  updateQueue: (patients: Patient[]) => void;
  
  // Selectors
  getPosition: (patientId: string) => number;
  getWaitTime: () => number;
}

export const useQueueStore = create<QueueState>()(
  persist(
    (set, get) => ({
      patients: [],
      currentPatient: null,
      waitingCount: 0,
      
      addPatient: (patient) => set((state) => ({
        patients: [...state.patients, patient],
        waitingCount: state.waitingCount + 1
      })),
      
      callNext: () => set((state) => {
        const [next, ...rest] = state.patients;
        return {
          patients: rest,
          currentPatient: next,
          waitingCount: rest.length
        };
      }),
      
      updateQueue: (patients) => set({ 
        patients,
        waitingCount: patients.length 
      }),
      
      getPosition: (patientId) => {
        return get().patients.findIndex(p => p.id === patientId) + 1;
      },
      
      getWaitTime: () => {
        return get().patients.length * 15; // 15 minutes per patient
      }
    }),
    {
      name: 'queue-storage',
      partialize: (state) => ({ 
        patients: state.patients 
      }),
    }
  )
);
```

**React Query Configuration:**
```typescript
// lib/react-query.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes
      retry: 3,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 2,
    },
  },
});

// Usage
const { data: queue, isLoading } = useQuery({
  queryKey: ['queue', department],
  queryFn: () => api.queue.get(department),
  staleTime: 1000 * 30, // 30 seconds for real-time data
});

const { mutate: callPatient } = useMutation({
  mutationFn: (patientId: string) => api.queue.call(patientId),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['queue'] });
  },
});
```

### 2.5 API Communication: tRPC

```json
{
  "dependencies": {
    "@trpc/server": "^10.45.0",
    "@trpc/client": "^10.45.0",
    "@trpc/next": "^10.45.0",
    "@trpc/react-query": "^10.45.0",
    "superjson": "^2.2.0"
  }
}
```

**tRPC Router Definition:**
```typescript
// server/api/root.ts
import { router } from '../trpc';
import { queueRouter } from './routers/queue';
import { patientRouter } from './routers/patient';
import { doctorRouter } from './routers/doctor';
import { authRouter } from './routers/auth';

export const appRouter = router({
  queue: queueRouter,
  patient: patientRouter,
  doctor: doctorRouter,
  auth: authRouter,
});

export type AppRouter = typeof appRouter;

// server/api/routers/queue.ts
import { z } from 'zod';
import { publicProcedure, protectedProcedure } from '../trpc';

export const queueRouter = router({
  get: publicProcedure
    .input(z.object({ department: z.string() }))
    .query(async ({ input, ctx }) => {
      const { db } = ctx;
      return await db.queue.findMany({
        where: { department: input.department },
        orderBy: { createdAt: 'asc' }
      });
    }),
    
  add: protectedProcedure
    .input(z.object({
      name: z.string(),
      department: z.string(),
      priority: z.boolean().default(false)
    }))
    .mutation(async ({ input, ctx }) => {
      const { db } = ctx;
      const patient = await db.patients.create({
        data: {
          name: input.name,
          department: input.department,
          priority: input.priority
        }
      });
      
      // Broadcast update
      await ctx.broadcast.queueUpdate(input.department);
      
      return patient;
    }),
    
  call: protectedProcedure
    .input(z.object({ patientId: z.string(), room: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { db } = ctx;
      const patient = await db.queue.update({
        where: { id: input.patientId },
        data: {
          status: 'called',
          room: input.room,
          calledAt: new Date()
        }
      });
      
      await ctx.broadcast.patientCalled(patient);
      
      return patient;
    }),
});
```

## 3. Backend Stack Details

### 3.1 Cloudflare Workers

```toml
# wrangler.toml
name = "hospital-queue-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[build]
command = "npm run build"

[env.production]
vars = { ENVIRONMENT = "production" }
route = "api.limuruhospital.co.ke/*"

[[d1_databases]]
binding = "DB"
database_name = "hospital-queue"
database_id = "abc123"

[[kv_namespaces]]
binding = "KV"
id = "def456"

[[r2_buckets]]
binding = "R2"
bucket_name = "hospital-queue-assets"
```

**Worker Configuration:**
```typescript
// src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { trpcServer } from '@hono/trpc-server';
import { appRouter } from './router';

const app = new Hono();

// Middleware
app.use('*', cors({
  origin: ['https://app.limuruhospital.co.ke'],
  credentials: true,
}));

app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  c.header('X-Response-Time', `${ms}ms`);
});

// tRPC endpoint
app.use('/trpc/*', trpcServer({
  router: appRouter,
  createContext: (c) => ({
    db: c.env.DB,
    kv: c.env.KV,
    user: c.get('user'),
  }),
}));

// Health check
app.get('/health', (c) => c.json({
  status: 'healthy',
  timestamp: new Date().toISOString()
}));

export default app;
```

### 3.2 Cloudflare D1 Database

```sql
-- schema.sql
-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Patients table
CREATE TABLE patients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  dob TEXT,
  password_hash TEXT,
  requires_password_change BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_patients_email ON patients(email);
CREATE INDEX idx_patients_phone ON patients(phone);

-- Visits table
CREATE TABLE visits (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  ticket_number TEXT NOT NULL,
  department TEXT NOT NULL,
  priority BOOLEAN DEFAULT false,
  status TEXT CHECK(status IN ('waiting', 'called', 'completed', 'no-show')),
  room TEXT,
  doctor_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  called_at DATETIME,
  completed_at DATETIME,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

CREATE INDEX idx_visits_status ON visits(status);
CREATE INDEX idx_visits_department ON visits(department);
CREATE INDEX idx_visits_patient_id ON visits(patient_id);

-- Doctors table
CREATE TABLE doctors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  room TEXT,
  email TEXT UNIQUE,
  is_available BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Queue history for audit
CREATE TABLE queue_history (
  id TEXT PRIMARY KEY,
  visit_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT,
  FOREIGN KEY (visit_id) REFERENCES visits(id)
);
```

### 3.3 Cloudflare KV Store

```typescript
// lib/kv.ts
export class KVStore {
  constructor(private kv: KVNamespace) {}

  // Session management
  async createSession(userId: string, data: any): Promise<string> {
    const sessionId = crypto.randomUUID();
    await this.kv.put(
      `session:${sessionId}`,
      JSON.stringify({
        userId,
        data,
        createdAt: Date.now()
      }),
      { expirationTtl: 86400 } // 24 hours
    );
    return sessionId;
  }

  async getSession(sessionId: string) {
    const data = await this.kv.get(`session:${sessionId}`, 'json');
    return data;
  }

  async deleteSession(sessionId: string) {
    await this.kv.delete(`session:${sessionId}`);
  }

  // Rate limiting
  async checkRateLimit(key: string, limit: number, window: number) {
    const count = await this.kv.get<number>(`ratelimit:${key}`, 'json') || 0;
    
    if (count >= limit) {
      return { allowed: false, remaining: 0 };
    }
    
    await this.kv.put(
      `ratelimit:${key}`,
      (count + 1).toString(),
      { expirationTtl: window }
    );
    
    return { allowed: true, remaining: limit - count - 1 };
  }

  // Cache
  async cacheGet<T>(key: string, ttl: number = 300): Promise<T | null> {
    const data = await this.kv.get<T>(`cache:${key}`, 'json');
    return data;
  }

  async cacheSet(key: string, data: any, ttl: number = 300) {
    await this.kv.put(
      `cache:${key}`,
      JSON.stringify(data),
      { expirationTtl: ttl }
    );
  }

  async cacheInvalidate(prefix: string) {
    const keys = await this.kv.list({ prefix: `cache:${prefix}` });
    for (const key of keys.keys) {
      await this.kv.delete(key.name);
    }
  }
}
```

### 3.4 Cloudflare R2 Storage

```typescript
// lib/r2.ts
export class R2Storage {
  constructor(private r2: R2Bucket) {}

  // Upload file
  async uploadFile(key: string, file: File | Blob, metadata?: Record<string, string>) {
    const buffer = await file.arrayBuffer();
    
    await this.r2.put(key, buffer, {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: metadata,
    });
    
    return {
      key,
      url: `/api/files/${key}`,
      size: buffer.byteLength
    };
  }

  // Get file
  async getFile(key: string) {
    const object = await this.r2.get(key);
    
    if (!object) {
      return null;
    }
    
    return {
      body: object.body,
      type: object.httpMetadata?.contentType,
      size: object.size,
      metadata: object.customMetadata
    };
  }

  // List files
  async listFiles(prefix: string) {
    const objects = await this.r2.list({ prefix });
    return objects.objects;
  }

  // Delete file
  async deleteFile(key: string) {
    await this.r2.delete(key);
  }

  // Generate temporary URL for IPTV playlist
  async getSignedUrl(key: string, expiresIn: number = 3600) {
    // Use Cloudflare signed URLs
    const url = new URL(`https://storage.limuruhospital.co.ke/${key}`);
    // Add signature logic
    return url.toString();
  }
}
```

### 3.5 Durable Objects for Real-time

```typescript
// durable-objects/queue-room.ts
export class QueueRoomDurableObject {
  private state: DurableObjectState;
  private env: Env;
  private sessions: Map<WebSocket, any> = new Map();
  private queue: Patient[] = [];

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    
    // Load persisted state
    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get('queue');
      if (stored) this.queue = stored;
    });
  }

  async fetch(request: Request) {
    const url = new URL(request.url);
    
    // WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }
    
    // HTTP endpoints
    switch (url.pathname) {
      case '/add':
        return this.handleAdd(request);
      case '/call':
        return this.handleCall(request);
      case '/status':
        return this.handleStatus();
      default:
        return new Response('Not found', { status: 404 });
    }
  }

  private async handleWebSocket(request: Request) {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    
    this.sessions.set(server, {
      id: crypto.randomUUID(),
      joinedAt: Date.now()
    });
    
    server.accept();
    
    server.addEventListener('message', (event) => {
      // Handle client messages
    });
    
    server.addEventListener('close', () => {
      this.sessions.delete(server);
    });
    
    // Send initial state
    server.send(JSON.stringify({
      type: 'init',
      queue: this.queue,
      timestamp: Date.now()
    }));
    
    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }

  private async broadcast(message: any, exclude: WebSocket | null = null) {
    const msg = JSON.stringify(message);
    
    for (const [ws] of this.sessions) {
      if (ws !== exclude && ws.readyState === 1) {
        ws.send(msg);
      }
    }
  }

  private async handleAdd(request: Request) {
    const patient = await request.json();
    
    this.queue.push({
      ...patient,
      position: this.queue.length + 1,
      joinedAt: Date.now()
    });
    
    await this.state.storage.put('queue', this.queue);
    
    this.broadcast({
      type: 'patient-added',
      patient
    });
    
    return new Response(JSON.stringify({ success: true }));
  }

  private async handleCall(request: Request) {
    const { patientId, room } = await request.json();
    
    const index = this.queue.findIndex(p => p.id === patientId);
    if (index === -1) {
      return new Response('Patient not found', { status: 404 });
    }
    
    const patient = this.queue[index];
    this.queue.splice(index, 1);
    
    await this.state.storage.put('queue', this.queue);
    
    this.broadcast({
      type: 'patient-called',
      patient: { ...patient, room },
      timestamp: Date.now()
    });
    
    return new Response(JSON.stringify(patient));
  }

  private async handleStatus() {
    return new Response(JSON.stringify({
      queueLength: this.queue.length,
      patients: this.queue,
      activeConnections: this.sessions.size
    }));
  }
}
```

## 4. DevOps Stack Details

### 4.1 GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Type check
        run: npm run type-check
        
      - name: Lint
        run: npm run lint
        
      - name: Unit tests
        run: npm run test:unit
        
      - name: Integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
          
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Wrangler
        run: npm install -g wrangler
        
      - name: Deploy to Cloudflare
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        run: |
          wrangler pages deploy ./out --project-name=hospital-queue --branch=production
          wrangler d1 migrations apply hospital-queue --remote
```

### 4.2 Testing Tools

```json
{
  "devDependencies": {
    "vitest": "^1.4.0",
    "@vitest/coverage-v8": "^1.4.0",
    "@testing-library/react": "^14.2.0",
    "@testing-library/jest-dom": "^6.4.0",
    "@playwright/test": "^1.42.0",
    "happy-dom": "^13.0.0"
  }
}
```

**Vitest Configuration:**
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80
      }
    }
  }
});
```

## 5. External Services

### 5.1 Email Service: Resend

```typescript
// lib/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordReset(email: string, token: string) {
  const resetLink = `https://app.limuruhospital.co.ke/reset-password?token=${token}`;
  
  await resend.emails.send({
    from: 'Limuru Cottage Hospital <no-reply@limuruhospital.co.ke>',
    to: email,
    subject: 'Reset Your Password',
    html: `
      <h1>Password Reset Request</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `
  });
}

export async function sendQueueUpdate(email: string, position: number) {
  await resend.emails.send({
    from: 'Limuru Cottage Hospital <no-reply@limuruhospital.co.ke>',
    to: email,
    subject: 'Queue Update',
    html: `
      <h1>Your Queue Position</h1>
      <p>You are currently #${position} in line.</p>
      <p>Estimated wait time: ${position * 15} minutes.</p>
    `
  });
}
```

### 5.2 SMS Service: Africa's Talking

```typescript
// lib/sms.ts
import AfricasTalking from 'africastalking';

const africastalking = AfricasTalking({
  apiKey: process.env.AT_API_KEY,
  username: process.env.AT_USERNAME
});

export async function sendSMS(phone: string, message: string) {
  try {
    const result = await africastalking.SMS.send({
      to: phone,
      message,
      from: 'LIMURU-HOSP'
    });
    
    return result;
  } catch (error) {
    console.error('SMS failed:', error);
    // Fallback to email
    return null;
  }
}

export async function notifyPatientCalled(phone: string, room: string) {
  await sendSMS(
    phone,
    `Please go to Room ${room} now. Your doctor is ready. - Limuru Cottage Hospital`
  );
}
```

### 5.3 IPTV Integration: VLC

```typescript
// lib/iptv.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class IPTVManager {
  private currentChannel: string | null = null;
  private process: any = null;

  async startChannel(channel: Channel) {
    // Stop current stream
    if (this.process) {
      this.process.kill();
    }

    // Start VLC in background
    const command = `cvlc ${channel.url} --no-audio --qt-minimal-view`;
    
    this.process = exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('VLC error:', error);
      }
    });

    this.currentChannel = channel.id;
  }

  async getPlaylist() {
    // Fetch from database
    const channels = await db.iptv.findMany({
      where: { active: true },
      orderBy: { order: 'asc' }
    });
    
    // Generate M3U
    const m3u = ['#EXTM3U'];
    
    for (const channel of channels) {
      m3u.push(`#EXTINF:-1 tvg-logo="${channel.logo}",${channel.name}`);
      m3u.push(channel.url);
    }
    
    return m3u.join('\n');
  }

  async switchChannel(channelId: string) {
    const channel = await db.iptv.findUnique({
      where: { id: channelId }
    });
    
    if (channel) {
      await this.startChannel(channel);
      return true;
    }
    
    return false;
  }
}
```

## 6. Development Tools

### 6.1 Code Quality Tools

```json
{
  "devDependencies": {
    "eslint": "^8.57.0",
    "prettier": "^3.2.0",
    "@typescript-eslint/eslint-plugin": "^7.1.0",
    "husky": "^9.0.0",
    "lint-staged": "^15.2.0"
  }
}
```

**ESLint Configuration:**
```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_'
    }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn'
  }
};
```

### 6.2 Git Hooks

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm test"
    }
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

## 7. Version Specifications Summary

### 7.1 Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| next | 14.2.0 | Framework |
| react | 18.3.0 | UI library |
| typescript | 5.4.0 | Language |
| tailwindcss | 3.4.0 | Styling |
| @trpc/server | 10.45.0 | API |
| zustand | 4.5.0 | State |
| @tanstack/react-query | 5.24.0 | Data fetching |

### 7.2 Cloudflare Bindings

| Binding | Version | Purpose |
|---------|---------|---------|
| wrangler | 3.0.0 | CLI |
| @cloudflare/workers-types | 4.0.0 | Types |
| D1 | latest | Database |
| KV | latest | Cache |
| R2 | latest | Storage |
| Durable Objects | latest | Real-time |

### 7.3 Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| vitest | 1.4.0 | Testing |
| @playwright/test | 1.42.0 | E2E testing |
| eslint | 8.57.0 | Linting |
| prettier | 3.2.0 | Formatting |
| husky | 9.0.0 | Git hooks |

## 8. Stack Decision Matrix

### 8.1 Framework Comparison

| Criteria | Next.js | Remix | Gatsby | Weight |
|----------|---------|-------|--------|--------|
| Performance | 9/10 | 9/10 | 8/10 | 25% |
| Cloudflare Support | 10/10 | 8/10 | 7/10 | 25% |
| Learning Curve | 8/10 | 6/10 | 8/10 | 15% |
| Community | 10/10 | 7/10 | 8/10 | 15% |
| Bundle Size | 8/10 | 9/10 | 7/10 | 10% |
| SEO | 9/10 | 8/10 | 9/10 | 10% |
| **Total** | **9.0** | **8.0** | **7.8** | |

### 8.2 Database Comparison

| Criteria | D1 | PostgreSQL | SQLite | Weight |
|----------|-----|------------|--------|--------|
| Serverless | 10/10 | 6/10 | 8/10 | 30% |
| Free Tier | 10/10 | 5/10 | 10/10 | 25% |
| Performance | 7/10 | 9/10 | 8/10 | 20% |
| Integration | 10/10 | 7/10 | 6/10 | 15% |
| Scalability | 8/10 | 9/10 | 5/10 | 10% |
| **Total** | **9.1** | **7.0** | **7.7** | |

### 8.3 State Management Comparison

| Criteria | Zustand | Redux | Context | Weight |
|----------|---------|-------|---------|--------|
| Bundle Size | 10/10 | 5/10 | 9/10 | 30% |
| Performance | 9/10 | 8/10 | 6/10 | 25% |
| Dev Tools | 7/10 | 10/10 | 5/10 | 20% |
| Learning Curve | 9/10 | 5/10 | 8/10 | 15% |
| TypeScript | 8/10 | 8/10 | 7/10 | 10% |
| **Total** | **8.8** | **7.0** | **7.2** | |

## 9. Cost Analysis (Cloudflare Free Tier)

### 9.1 Monthly Usage Projections

| Service | Free Limit | Projected Usage | Buffer |
|---------|------------|-----------------|--------|
| Workers | 100k req/day | 30-50k | 50-70% |
| D1 Reads | 5M/month | 1-2M | 60-80% |
| D1 Writes | 100k/month | 20-40k | 60-80% |
| KV Reads | 1M/day | 100-200k | 80-90% |
| KV Writes | 1k/day | 100-200 | 80-90% |
| R2 Storage | 10GB | 2-3GB | 70-80% |
| Pages Builds | 500/month | 50-100 | 80-90% |

### 9.2 Scaling Triggers

```typescript
// lib/monitoring/limits.ts
export const freeTierLimits = {
  workers: {
    daily: 100000,
    alert: 80000, // Alert at 80%
    critical: 95000
  },
  d1Reads: {
    monthly: 5000000,
    alert: 4000000,
    critical: 4750000
  },
  d1Writes: {
    monthly: 100000,
    alert: 80000,
    critical: 95000
  }
};

export async function checkUsage(env: Env) {
  const usage = await getCurrentUsage(env);
  
  for (const [service, limits] of Object.entries(freeTierLimits)) {
    const current = usage[service];
    const percent = (current / limits.monthly) * 100;
    
    if (current > limits.critical) {
      await sendAlert(`${service} usage critical: ${percent}%`);
    } else if (current > limits.alert) {
      await sendWarning(`${service} usage high: ${percent}%`);
    }
  }
}
```

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-03 | System | Initial version |

**Review Date:** 2026-06-03
```

**File created successfully: `.opencode/context/project/04-stack.md`**

Please confirm if I should proceed with the next file: `.opencode/context/project/05-patterns.md`
