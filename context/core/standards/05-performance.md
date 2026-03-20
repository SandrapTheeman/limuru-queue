## Creating File: `.opencode/context/core/standards/05-performance.md`

```markdown
# Performance Standards
**Document ID:** CORE-STD-05
**Version:** 1.0
**Last Updated:** 2026-03-02
**Owner:** Performance Engineer

## Purpose

This document defines the performance standards, benchmarks, and optimization strategies for the Hospital Queuing System. Meeting these standards ensures a responsive, scalable, and reliable experience for all users.

## 1. Performance Principles

### 1.1 Core Tenets
- **User-Centric**: Optimize for perceived performance
- **Edge-First**: Leverage Cloudflare's global network
- **Measurable**: All performance metrics must be quantifiable
- **Continuous**: Performance testing integrated into CI/CD
- **Progressive**: Degrade gracefully under load

### 1.2 Performance Budget

| Metric | Target | Measurement | Criticality |
|--------|--------|-------------|-------------|
| **Time to First Byte (TTFB)** | < 200ms | Lighthouse | High |
| **First Contentful Paint (FCP)** | < 1.5s | Lighthouse | High |
| **Largest Contentful Paint (LCP)** | < 2.5s | Lighthouse | High |
| **First Input Delay (FID)** | < 100ms | Lighthouse | Medium |
| **Cumulative Layout Shift (CLS)** | < 0.1 | Lighthouse | Medium |
| **Time to Interactive (TTI)** | < 3.5s | Lighthouse | Medium |
| **API Response Time (P95)** | < 200ms | Server timing | High |
| **WebSocket Latency** | < 500ms | Custom metric | High |
| **Database Query (simple)** | < 50ms | Query timing | High |
| **Database Query (complex)** | < 200ms | Query timing | Medium |
| **Page Size (initial)** | < 500KB | Network tab | Medium |
| **JavaScript Bundle** | < 200KB | Bundle analyzer | Medium |

## 2. Frontend Performance

### 2.1 Next.js Optimization

```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable SWC minification (faster than Terser)
  swcMinify: true,
  
  // Enable compression
  compress: true,
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    domains: ['images.unsplash.com', 'cdn.limuruhospital.co.ke']
  },
  
  // Enable React strict mode for performance optimizations
  reactStrictMode: true,
  
  // Enable experimental features for better performance
  experimental: {
    optimizeCss: true, // Enable CSS optimization
    scrollRestoration: true,
    workerThreads: true,
    cpus: 4
  },
  
  // Webpack optimization
  webpack: (config, { dev, isServer }) => {
    // Enable persistent caching
    if (!dev && !isServer) {
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename]
        }
      };
    }
    
    return config;
  }
};

module.exports = nextConfig;
```

### 2.2 Code Splitting and Lazy Loading

```typescript
// app/dashboard/patient/page.tsx
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Lazy load heavy components
const PatientHistory = dynamic(
  () => import('@/components/patient/PatientHistory'),
  {
    loading: () => <HistorySkeleton />,
    ssr: false // Disable SSR for heavy component
  }
);

const AnalyticsChart = dynamic(
  () => import('@/components/charts/AnalyticsChart'),
  {
    loading: () => <ChartSkeleton />,
    ssr: false
  }
);

export default function PatientDashboard() {
  return (
    <div className="dashboard">
      {/* Critical content loads immediately */}
      <QueueStatus />
      
      {/* Non-critical content loads lazily */}
      <Suspense fallback={<HistorySkeleton />}>
        <PatientHistory />
      </Suspense>
      
      <Suspense fallback={<ChartSkeleton />}>
        <AnalyticsChart />
      </Suspense>
    </div>
  );
}

// Route-based code splitting (automatic in Next.js App Router)
// app/dashboard/doctor/page.tsx - separate chunk
// app/dashboard/admin/page.tsx - separate chunk
```

### 2.3 Image Optimization

```typescript
// components/OptimizedImage.tsx
import Image from 'next/image';
import { useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  
  return (
    <div className={`image-container ${isLoading ? 'loading' : ''}`}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        loading={priority ? 'eager' : 'lazy'}
        quality={85}
        className={className}
        onLoadingComplete={() => setIsLoading(false)}
        // Use Cloudflare Images for optimization
        loader={({ src, width, quality }) => {
          return `https://cdn.limuruhospital.co.ke/cdn-cgi/image/width=${width},quality=${quality || 85}/${src}`;
        }}
      />
    </div>
  );
}
```

### 2.4 Font Optimization

```typescript
// app/layout.tsx
import { Inter, Roboto_Mono } from 'next/font/google';

// Optimize font loading
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
  fallback: ['system-ui', 'arial']
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto-mono',
  preload: false // Only preload critical fonts
});

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${robotoMono.variable}`}>
      <head>
        {/* Preconnect to critical origins */}
        <link rel="preconnect" href="https://cdn.limuruhospital.co.ke" />
        <link rel="preconnect" href="https://api.limuruhospital.co.ke" />
        
        {/* DNS prefetch for other domains */}
        <link rel="dns-prefetch" href="https://analytics.limuruhospital.co.ke" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### 2.5 Bundle Optimization

```bash
# package.json scripts for bundle analysis
{
  "scripts": {
    "analyze": "ANALYZE=true next build",
    "bundle:stats": "next build --debug && next stats",
    "bundle:optimize": "npm run analyze && npm run bundle:stats"
  }
}
```

```typescript
// Use lightweight alternatives for heavy dependencies
// Instead of moment.js (heavy)
import { format, differenceInMinutes } from 'date-fns'; // 4.5kB vs 300kB

// Instead of lodash (heavy)
import debounce from 'lodash/debounce'; // Import specific functions

// Tree shaking configuration in package.json
{
  "sideEffects": false, // Enable tree shaking
  "module": "dist/index.js" // Use ES modules
}
```

## 3. Backend Performance (Cloudflare Workers)

### 3.1 Worker Optimization

```typescript
// worker-config.ts
export interface WorkerConfig {
  // Memory limit: 128MB (Cloudflare free tier)
  memory: 128;
  
  // CPU time limit: 10ms (free tier) or 50ms (bundled)
  cpuTime: 50;
  
  // Subrequests limit: 50
  subrequests: 50;
}

// Optimized worker with caching
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    
    // Check cache first (using Cache API)
    const cacheKey = new Request(url.toString(), request);
    const cache = caches.default;
    
    let response = await cache.match(cacheKey);
    
    if (!response) {
      // Cache miss - generate response
      response = await handleRequest(request, env);
      
      // Cache successful responses
      if (response.status === 200) {
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
      }
    }
    
    return response;
  }
};

// Optimize database queries
async function getPatientQueue(db: D1Database, department: string) {
  // Use prepared statements (cached by Workers)
  const stmt = db
    .prepare(`
      SELECT * FROM visits 
      WHERE department = ? 
      AND status = 'waiting'
      ORDER BY created_at ASC
      LIMIT 50
    `);
  
  // Execute with bound parameters
  return await stmt.bind(department).all();
}

// Use KV for frequent reads
async function getDepartmentConfig(env: Env, department: string) {
  const cacheKey = `config:${department}`;
  
  // Try KV first (fast, <10ms)
  let config = await env.KV.get(cacheKey, 'json');
  
  if (!config) {
    // Fallback to D1 (slower, ~50ms)
    config = await env.DB
      .prepare('SELECT * FROM department_config WHERE code = ?')
      .bind(department)
      .first();
    
    // Store in KV for next time
    if (config) {
      ctx.waitUntil(
        env.KV.put(cacheKey, JSON.stringify(config), {
          expirationTtl: 300 // 5 minutes
        })
      );
    }
  }
  
  return config;
}
```

### 3.2 Connection Pooling

```typescript
// lib/db/connection-pool.ts
export class D1ConnectionPool {
  private pool: D1Database[];
  private index = 0;
  
  constructor(private dbs: D1Database[]) {
    this.pool = dbs;
  }
  
  async execute(query: string, params: any[]): Promise<any> {
    // Round-robin load balancing
    const db = this.pool[this.index];
    this.index = (this.index + 1) % this.pool.length;
    
    try {
      return await db.prepare(query).bind(...params).run();
    } catch (error) {
      // Retry with different connection
      return await this.retryWithFallback(query, params);
    }
  }
  
  private async retryWithFallback(query: string, params: any[]): Promise<any> {
    for (let i = 0; i < this.pool.length; i++) {
      const db = this.pool[i];
      try {
        return await db.prepare(query).bind(...params).run();
      } catch (error) {
        continue;
      }
    }
    throw new Error('All database connections failed');
  }
}
```

## 4. Database Performance (D1)

### 4.1 Query Optimization

```sql
-- Create indexes for frequent queries
CREATE INDEX idx_visits_status_created ON visits(status, created_at);
CREATE INDEX idx_visits_department_status ON visits(department, status);
CREATE INDEX idx_patients_email ON patients(email);
CREATE INDEX idx_patients_phone ON patients(phone);

-- Use covering indexes for common queries
CREATE INDEX idx_visits_listing ON visits(department, status, created_at, ticket_number);

-- Optimize complex queries
-- Instead of multiple queries
-- ❌ BAD
const patient = await db
  .prepare('SELECT * FROM patients WHERE id = ?')
  .bind(patientId)
  .first();

const visits = await db
  .prepare('SELECT * FROM visits WHERE patient_id = ? ORDER BY created_at DESC')
  .bind(patientId)
  .all();

-- ✅ GOOD (single query with JOIN)
const patientWithVisits = await db
  .prepare(`
    SELECT 
      p.*,
      json_group_array(
        json_object(
          'id', v.id,
          'date', v.created_at,
          'doctor', v.doctor_id,
          'notes', v.doctor_notes
        )
      ) as visits
    FROM patients p
    LEFT JOIN visits v ON p.id = v.patient_id
    WHERE p.id = ?
    GROUP BY p.id
  `)
  .bind(patientId)
  .first();
```

### 4.2 Pagination Strategies

```typescript
// lib/db/pagination.ts
export async function paginateQuery<T>(
  db: D1Database,
  baseQuery: string,
  params: any[],
  cursor?: string,
  limit: number = 20
): Promise<PaginatedResult<T>> {
  // Use keyset pagination (cursor-based) for better performance
  let query = baseQuery;
  
  if (cursor) {
    const decoded = Buffer.from(cursor, 'base64').toString();
    const [lastId, lastCreatedAt] = decoded.split('|');
    query += ` AND (created_at, id) < (?, ?)`;
    params.push(lastCreatedAt, lastId);
  }
  
  query += ` ORDER BY created_at DESC, id DESC LIMIT ?`;
  params.push(limit + 1); // Get one extra to check for next page
  
  const results = await db.prepare(query).bind(...params).all();
  
  const hasNextPage = results.results.length > limit;
  const items = results.results.slice(0, limit);
  
  let nextCursor = null;
  if (hasNextPage) {
    const last = items[items.length - 1];
    nextCursor = Buffer.from(`${last.id}|${last.created_at}`).toString('base64');
  }
  
  return {
    items: items as T[],
    nextCursor,
    hasNextPage
  };
}

// Usage
const queue = await paginateQuery<Visit>(
  db,
  'SELECT * FROM visits WHERE department = ? AND status = ?',
  ['MED', 'waiting'],
  request.nextCursor,
  20
);
```

### 4.3 Batch Operations

```typescript
// lib/db/batch.ts
export async function batchInsert<T>(
  db: D1Database,
  table: string,
  items: T[],
  batchSize: number = 100
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    // Build batch insert statement
    const placeholders = batch.map(() => '(?' + ', ?'.repeat(Object.keys(batch[0]).length - 1) + ')').join(',');
    const values = batch.flatMap(item => Object.values(item));
    
    const columns = Object.keys(batch[0]).join(', ');
    
    await db
      .prepare(`INSERT INTO ${table} (${columns}) VALUES ${placeholders}`)
      .bind(...values)
      .run();
  }
}

// Batch update
export async function batchUpdateStatus(
  db: D1Database,
  visitIds: string[],
  status: string
): Promise<void> {
  const placeholders = visitIds.map(() => '?').join(',');
  
  await db
    .prepare(`UPDATE visits SET status = ? WHERE id IN (${placeholders})`)
    .bind(status, ...visitIds)
    .run();
}
```

## 5. Real-Time Performance (Durable Objects)

### 5.1 WebSocket Optimization

```typescript
// durable-objects/queue-room.ts
export class QueueRoomDurableObject {
  private sessions: Map<WebSocket, any> = new Map();
  private lastBroadcast = 0;
  private pendingUpdates: any[] = [];
  
  async fetch(request: Request) {
    // Batch updates to reduce broadcasts
    if (request.method === 'POST') {
      const update = await request.json();
      this.pendingUpdates.push(update);
      
      // Throttle broadcasts (max 1 per 100ms)
      const now = Date.now();
      if (now - this.lastBroadcast > 100) {
        await this.broadcastUpdates();
        this.lastBroadcast = now;
      } else {
        // Schedule broadcast
        setTimeout(() => this.broadcastUpdates(), 100);
      }
      
      return new Response('OK');
    }
    
    // WebSocket upgrade
    return this.handleWebSocket(request);
  }
  
  private async broadcastUpdates() {
    if (this.pendingUpdates.length === 0) return;
    
    const message = JSON.stringify({
      type: 'batch',
      updates: this.pendingUpdates
    });
    
    this.pendingUpdates = [];
    
    // Broadcast to all connected clients
    for (const [ws] of this.sessions) {
      if (ws.readyState === 1) {
        ws.send(message);
      }
    }
  }
  
  private handleWebSocket(request: Request) {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    
    server.accept();
    
    server.addEventListener('message', (event) => {
      // Handle client messages
    });
    
    server.addEventListener('close', () => {
      this.sessions.delete(server);
    });
    
    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }
}
```

### 5.2 Client-Side Optimization

```typescript
// hooks/useRealtimeQueue.ts
import { useEffect, useRef, useState } from 'react';
import { debounce } from 'lodash';

export function useRealtimeQueue(department: string) {
  const [queue, setQueue] = useState([]);
  const wsRef = useRef<WebSocket>();
  const reconnectAttempts = useRef(0);
  
  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;
    
    function connect() {
      const ws = new WebSocket(`wss://api.limuruhospital.co.ke/queue/${department}`);
      
      ws.onopen = () => {
        console.log('Connected');
        reconnectAttempts.current = 0;
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'batch') {
          // Batch updates
          setQueue(prev => {
            let newQueue = [...prev];
            for (const update of data.updates) {
              newQueue = applyUpdate(newQueue, update);
            }
            return newQueue;
          });
        } else {
          // Single update
          setQueue(prev => applyUpdate(prev, data));
        }
      };
      
      ws.onclose = () => {
        // Exponential backoff for reconnection
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        reconnectTimeout = setTimeout(connect, delay);
        reconnectAttempts.current++;
      };
      
      wsRef.current = ws;
    }
    
    connect();
    
    return () => {
      clearTimeout(reconnectTimeout);
      wsRef.current?.close();
    };
  }, [department]);
  
  // Debounce state updates to prevent UI thrashing
  const debouncedSetQueue = debounce(setQueue, 100);
  
  return { queue };
}
```

## 6. Caching Strategy

### 6.1 Multi-Layer Caching

```typescript
// lib/cache/cache-manager.ts
export class CacheManager {
  constructor(
    private kv: KVNamespace,
    private db: D1Database
  ) {}
  
  async get<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = 300
  ): Promise<T> {
    // Level 1: Memory cache (via Workers runtime)
    // Not directly accessible, but Workers may cache
    
    // Level 2: KV cache
    const cached = await this.kv.get<T>(key, 'json');
    if (cached) {
      return cached;
    }
    
    // Level 3: Database
    const data = await fetchFn();
    
    // Store in KV for next time
    await this.kv.put(key, JSON.stringify(data), {
      expirationTtl: ttl
    });
    
    return data;
  }
  
  async invalidate(patterns: string[]): Promise<void> {
    // List all keys matching patterns
    for (const pattern of patterns) {
      const keys = await this.kv.list({ prefix: pattern });
      
      // Delete matching keys
      for (const key of keys.keys) {
        await this.kv.delete(key.name);
      }
    }
  }
}

// Usage
const cache = new CacheManager(env.KV, env.DB);

// Cache department configuration
const config = await cache.get(
  `config:${department}`,
  async () => {
    return await db
      .prepare('SELECT * FROM department_config WHERE code = ?')
      .bind(department)
      .first();
  },
  3600 // 1 hour TTL
);
```

### 6.2 Cache Invalidation Strategies

```typescript
// lib/cache/invalidation.ts
export class CacheInvalidator {
  constructor(private cache: CacheManager) {}
  
  async onPatientUpdate(patientId: string): Promise<void> {
    await this.cache.invalidate([
      `patient:${patientId}`,
      `patient:${patientId}:*`,
      'queue:*' // Invalidate queue caches
    ]);
  }
  
  async onQueueUpdate(department: string): Promise<void> {
    await this.cache.invalidate([
      `queue:${department}`,
      `stats:${department}:*`
    ]);
  }
  
  async onSystemConfigUpdate(): Promise<void> {
    await this.cache.invalidate([
      'config:*',
      'settings:*'
    ]);
  }
}
```

### 6.3 Stale-While-Revalidate Pattern

```typescript
// lib/cache/stale-while-revalidate.ts
export async function getWithStaleWhileRevalidate<T>(
  kv: KVNamespace,
  key: string,
  fetchFn: () => Promise<T>,
  options: {
    maxStale?: number;
    ttl?: number;
  } = {}
): Promise<T> {
  const cached = await kv.get<{
    data: T;
    timestamp: number;
    stale?: boolean;
  }>(key, 'json');
  
  const now = Date.now();
  const maxStale = options.maxStale || 3600000; // 1 hour default
  const ttl = options.ttl || 300000; // 5 minutes default
  
  if (cached) {
    const age = now - cached.timestamp;
    
    if (age < ttl) {
      // Fresh cache
      return cached.data;
    } else if (age < maxStale && !cached.stale) {
      // Stale but acceptable - return and refresh in background
      cached.stale = true;
      await kv.put(key, JSON.stringify(cached));
      
      // Refresh in background
      fetchFn().then(async (freshData) => {
        await kv.put(key, JSON.stringify({
          data: freshData,
          timestamp: now
        }));
      }).catch(console.error);
      
      return cached.data;
    }
  }
  
  // No cache or too stale
  const freshData = await fetchFn();
  
  await kv.put(key, JSON.stringify({
    data: freshData,
    timestamp: now
  }));
  
  return freshData;
}
```

## 7. Load Testing

### 7.1 k6 Load Test Scenarios

```javascript
// tests/load/scenarios.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const errorCounter = new Counter('errors');
const waitTimeTrend = new Trend('wait_time');

export const options = {
  scenarios: {
    // Normal load scenario
    normal_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },  // Ramp up to 50 users
        { duration: '5m', target: 50 },  // Stay at 50
        { duration: '2m', target: 0 },   // Ramp down
      ],
      gracefulRampDown: '30s',
    },
    
    // Peak load scenario
    peak_load: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      stages: [
        { duration: '2m', target: 100 },  // 100 requests/sec
        { duration: '5m', target: 100 },
        { duration: '2m', target: 10 },
      ],
      preAllocatedVUs: 100,
      maxVUs: 200,
    },
    
    // Spike test
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 200 }, // Spike to 200 users
        { duration: '1m', target: 200 },  // Hold
        { duration: '30s', target: 0 },   // Drop
      ],
    },
    
    // Soak test (long duration)
    soak_test: {
      executor: 'constant-vus',
      vus: 30,
      duration: '4h',
    },
  },
  
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    wait_time: ['p(95)<30000'], // Wait time < 30 seconds
  },
};

export default function () {
  // Test patient queue check
  const queueRes = http.get('https://api.limuruhospital.co.ke/queue/MED');
  
  check(queueRes, {
    'queue status is 200': (r) => r.status === 200,
    'queue has valid response': (r) => {
      const body = r.json();
      return body.waiting !== undefined;
    },
  }) || errorCounter.add(1);
  
  if (queueRes.status === 200) {
    const data = queueRes.json();
    if (data.estimatedWaitTime) {
      waitTimeTrend.add(data.estimatedWaitTime);
    }
  }
  
  // Test adding patient (less frequent)
  if (Math.random() < 0.1) { // 10% of requests
    const addRes = http.post('https://api.limuruhospital.co.ke/queue', JSON.stringify({
      name: `Test Patient ${Math.random()}`,
      department: 'MED',
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    check(addRes, {
      'add patient is 201': (r) => r.status === 201,
    }) || errorCounter.add(1);
  }
  
  sleep(1);
}
```

### 7.2 Performance Testing in CI

```yaml
# .github/workflows/performance.yml
name: Performance Tests

on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup k6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A
          sudo apt-add-repository "deb https://dl.k6.io/deb stable main"
          sudo apt-get update
          sudo apt-get install k6
      
      - name: Run load tests
        run: k6 run tests/load/scenarios.js
        env:
          K6_WEB_DASHBOARD: true
          K6_WEB_DASHBOARD_EXPORT: k6-report.html
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        with:
          name: k6-report
          path: k6-report.html
      
      - name: Check performance thresholds
        run: |
          # Parse results and alert if thresholds exceeded
          k6 run --summary-export=summary.json tests/load/scenarios.js
          node scripts/check-performance.js summary.json

  lighthouse-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v10
        with:
          urls: |
            https://queue.limuruhospital.co.ke
            https://queue.limuruhospital.co.ke/dashboard/patient
            https://queue.limuruhospital.co.ke/dashboard/doctor
          budgetPath: ./lighthouse-budget.json
          uploadArtifacts: true
```

## 8. Monitoring and Alerting

### 8.1 Performance Metrics Collection

```typescript
// lib/monitoring/performance.ts
export class PerformanceMonitor {
  constructor(private kv: KVNamespace) {}
  
  async trackApiTiming(
    endpoint: string,
    duration: number,
    status: number
  ): Promise<void> {
    const key = `perf:api:${new Date().toISOString().slice(0, 13)}`;
    
    // Aggregate metrics in KV
    let metrics = await this.kv.get(key, 'json') || {
      count: 0,
      totalDuration: 0,
      maxDuration: 0,
      errors: 0,
      byEndpoint: {}
    };
    
    metrics.count++;
    metrics.totalDuration += duration;
    metrics.maxDuration = Math.max(metrics.maxDuration, duration);
    
    if (status >= 400) {
      metrics.errors++;
    }
    
    if (!metrics.byEndpoint[endpoint]) {
      metrics.byEndpoint[endpoint] = { count: 0, totalDuration: 0 };
    }
    
    metrics.byEndpoint[endpoint].count++;
    metrics.byEndpoint[endpoint].totalDuration += duration;
    
    await this.kv.put(key, JSON.stringify(metrics), {
      expirationTtl: 86400 // 24 hours
    });
  }
  
  async getPerformanceReport(hours: number = 24): Promise<PerformanceReport> {
    const reports = [];
    const now = new Date();
    
    for (let i = 0; i < hours; i++) {
      const hour = new Date(now.getTime() - i * 3600000)
        .toISOString().slice(0, 13);
      
      const data = await this.kv.get(`perf:api:${hour}`, 'json');
      if (data) {
        reports.push({
          hour,
          ...data,
          avgDuration: data.totalDuration / data.count
        });
      }
    }
    
    return {
      period: `${hours}h`,
      reports,
      summary: {
        totalRequests: reports.reduce((sum, r) => sum + r.count, 0),
        avgResponseTime: reports.reduce((sum, r) => sum + r.avgDuration, 0) / reports.length,
        errorRate: reports.reduce((sum, r) => sum + r.errors, 0) / 
                   reports.reduce((sum, r) => sum + r.count, 0)
      }
    };
  }
}
```

### 8.2 Performance Alerts

```typescript
// lib/monitoring/alerts.ts
export class PerformanceAlerting {
  constructor(private webhook: string) {}
  
  async checkThresholds(metrics: any): Promise<void> {
    const alerts = [];
    
    // API response time threshold
    if (metrics.avgResponseTime > 500) {
      alerts.push({
        severity: 'warning',
        message: `High average response time: ${metrics.avgResponseTime}ms`,
        threshold: 500
      });
    }
    
    // Error rate threshold
    if (metrics.errorRate > 0.05) { // 5% error rate
      alerts.push({
        severity: 'critical',
        message: `High error rate: ${(metrics.errorRate * 100).toFixed(2)}%`,
        threshold: 5
      });
    }
    
    // P99 latency threshold
    if (metrics.p99Latency > 1000) {
      alerts.push({
        severity: 'warning',
        message: `High P99 latency: ${metrics.p99Latency}ms`,
        threshold: 1000
      });
    }
    
    if (alerts.length > 0) {
      await this.sendAlerts(alerts);
    }
  }
  
  private async sendAlerts(alerts: any[]): Promise<void> {
    await fetch(this.webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: '🚨 Performance Alert',
        blocks: alerts.map(alert => ({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${alert.severity.toUpperCase()}*: ${alert.message}`
          }
        }))
      })
    });
  }
}
```

## 9. Performance Checklist

### Pre-Deployment Checklist
- [ ] All images optimized and using next/image
- [ ] Critical CSS inlined
- [ ] JavaScript bundles analyzed and optimized
- [ ] Fonts optimized with font-display: swap
- [ ] API responses compressed (gzip/brotli)
- [ ] Database queries indexed and optimized
- [ ] Cache headers configured appropriately
- [ ] Lazy loading implemented for below-fold content
- [ ] Performance budgets defined and checked

### Load Testing Checklist
- [ ] Baseline performance established
- [ ] Peak load scenarios tested
- [ ] Spike tests conducted
- [ ] Soak tests (4h+) completed
- [ ] Database connection pool tested
- [ ] Cache hit/miss ratios acceptable
- [ ] Error rates under threshold
- [ ] Recovery tested after overload

### Monitoring Checklist
- [ ] Real User Monitoring (RUM) implemented
- [ ] API performance metrics collected
- [ ] Database query performance tracked
- [ ] Cache hit rates monitored
- [ ] Alerting configured for thresholds
- [ ] Dashboard created for key metrics
- [ ] Regular performance reviews scheduled

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-02 | System | Initial version |

**Review Date:** 2026-06-02
```

**File created successfully: `.opencode/context/core/standards/05-performance.md`**

Please confirm if I should proceed with the next file: `.opencode/context/core/standards/06-accessibility.md`
