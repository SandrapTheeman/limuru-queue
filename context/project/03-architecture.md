## Creating File: `.opencode/context/project/03-architecture.md`

```markdown
# System Architecture
**Document ID:** PROJ-03
**Version:** 1.0
**Last Updated:** 2026-03-03
**Owner:** System Architect

## Purpose

This document defines the system architecture for the Hospital Queuing System. It provides a comprehensive overview of the technical architecture, component interactions, and design decisions.

## 1. Architecture Overview

### 1.1 High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        A1[Web Browser - Kiosk]
        A2[Web Browser - Doctor Station]
        A3[Web Browser - Reception]
        A4[Web Browser - Admin]
        A5[TV Display - Waiting Area]
        A6[Mobile App - Patient]
    end
    
    subgraph "Edge Layer (Cloudflare)"
        B1[Cloudflare Pages - Hosting]
        B2[Cloudflare Workers - API]
        B3[Cloudflare D1 - Database]
        B4[Cloudflare KV - Cache/Sessions]
        B5[Cloudflare R2 - Storage]
        B6[Cloudflare Durable Objects - Real-time]
    end
    
    subgraph "External Services"
        C1[SMTP - Email]
        C2[VLC - IPTV]
        C3[Web Speech API - Voice]
    end
    
    subgraph "Hardware Layer"
        D1[Thermal Printers]
        D2[Raspberry Pi - TV Display]
        D3[Touch Screens - Kiosk]
    end
    
    A1 --> B1
    A2 --> B1
    A3 --> B1
    A4 --> B1
    A5 --> B1
    A6 --> B1
    
    B1 --> B2
    B2 --> B3
    B2 --> B4
    B2 --> B5
    B2 --> B6
    
    B2 --> C1
    A5 --> C2
    A2 --> C3
    
    A1 --> D3
    A5 --> D2
    A1 --> D1
```

### 1.2 Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    TECHNOLOGY STACK                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  FRONTEND                               BACKEND             │
│  ┌───────────────────┐                 ┌──────────────────┐ │
│  │ Next.js 14        │                 │ Cloudflare Workers│ │
│  │ React 18          │                 │ TypeScript       │ │
│  │ TypeScript        │                 │ D1 SQLite        │ │
│  │ Tailwind CSS      │                 │ KV Store         │ │
│  │ tRPC              │                 │ R2 Storage       │ │
│  │ Socket.IO Client  │                 │ Durable Objects  │ │
│  └───────────────────┘                 └──────────────────┘ │
│                                                             │
│  STATE MANAGEMENT                     TESTING               │
│  ┌───────────────────┐                 ┌──────────────────┐ │
│  │ Zustand           │                 │ Vitest           │ │
│  │ React Query       │                 │ Playwright       │ │
│  │ LocalStorage      │                 │ Testing Library  │ │
│  │ IndexedDB         │                 │ k6               │ │
│  └───────────────────┘                 └──────────────────┘ │
│                                                             │
│  DEPLOYMENT                             MONITORING          │
│  ┌───────────────────┐                 ┌──────────────────┐ │
│  │ Cloudflare Pages  │                 │ Cloudflare Analytics│
│  │ GitHub Actions    │                 │ Custom Metrics   │ │
│  │ Wrangler CLI      │                 │ Error Tracking   │ │
│  └───────────────────┘                 └──────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 2. Component Architecture

### 2.1 Frontend Architecture

```mermaid
graph TD
    subgraph "Next.js Application"
        A[App Router] --> B[Layouts]
        B --> C[Pages]
        
        subgraph "Components"
            D[UI Components]
            E[Feature Components]
            F[Layout Components]
        end
        
        subgraph "State"
            G[Zustand Stores]
            H[React Query Cache]
            I[Local Storage]
        end
        
        subgraph "Services"
            J[API Client]
            K[WebSocket Client]
            L[Auth Service]
        end
    end
    
    C --> D
    C --> E
    C --> F
    C --> G
    C --> H
    C --> J
    C --> K
    C --> L
```

### 2.2 Backend Architecture

```mermaid
graph TD
    subgraph "Cloudflare Workers"
        A[API Gateway] --> B[Route Handler]
        
        subgraph "Services"
            C[Queue Service]
            D[Patient Service]
            E[Auth Service]
            F[Doctor Service]
            G[Admin Service]
            H[IPTV Service]
        end
        
        subgraph "Data Layer"
            I[D1 Database]
            J[KV Store]
            K[R2 Storage]
        end
        
        subgraph "Real-time"
            L[Durable Objects]
            M[WebSocket Handler]
        end
    end
    
    B --> C
    B --> D
    B --> E
    B --> F
    B --> G
    B --> H
    
    C --> I
    C --> J
    C --> L
    
    L --> M
```

## 3. Data Architecture

### 3.1 Database Schema

```mermaid
erDiagram
    PATIENTS ||--o{ VISITS : has
    PATIENTS {
        string id PK
        string name
        string email
        string phone
        date dob
        string password_hash
        boolean requires_password_change
        datetime created_at
        datetime updated_at
    }
    
    VISITS ||--o{ DOCTOR_NOTES : contains
    VISITS {
        string id PK
        string patient_id FK
        string ticket_number
        string department
        boolean priority
        string status
        string room_assigned
        string doctor_id
        datetime created_at
        datetime called_at
        datetime completed_at
        int wait_time
    }
    
    DOCTORS ||--o{ VISITS : attends
    DOCTORS {
        string id PK
        string name
        string specialization
        string department
        string room
        string email
        string pin_hash
        boolean is_available
        datetime break_until
    }
    
    DOCTOR_NOTES {
        string id PK
        string visit_id FK
        string doctor_id FK
        text notes
        text diagnosis
        text prescription
        datetime created_at
        datetime updated_at
    }
    
    QUEUE_HISTORY {
        string id PK
        string visit_id FK
        string action
        string actor_id
        datetime timestamp
    }
    
    IPTV_CHANNELS {
        string id PK
        string name
        string url
        string category
        boolean is_active
        int display_order
    }
    
    SYSTEM_SETTINGS {
        string key PK
        string value
        string description
        datetime updated_at
    }
```

### 3.2 Data Flow

```mermaid
graph LR
    subgraph "Write Path"
        A[Client Request] --> B[API Worker]
        B --> C[Validate]
        C --> D[Process]
        D --> E[Write to D1]
        E --> F[Update Cache]
        F --> G[Broadcast via DO]
    end
    
    subgraph "Read Path"
        H[Client Request] --> I[API Worker]
        I --> J{In KV?}
        J -->|Yes| K[Return from KV]
        J -->|No| L[Query D1]
        L --> M[Store in KV]
        M --> N[Return Data]
    end
    
    subgraph "Real-time Path"
        O[Client Connects] --> P[Durable Object]
        P --> Q[WebSocket Connection]
        Q --> R[Subscribe to Updates]
        R --> S[Receive Broadcasts]
    end
```

## 4. Security Architecture

### 4.1 Security Layers

```mermaid
graph TD
    subgraph "Edge Security"
        A[Cloudflare WAF]
        B[DDoS Protection]
        C[Rate Limiting]
    end
    
    subgraph "Authentication"
        D[JWT Tokens]
        E[Session Management]
        F[MFA for Staff]
        G[Password Policies]
    end
    
    subgraph "Authorization"
        H[RBAC - Roles]
        I[Row Level Security]
        J[API Scopes]
    end
    
    subgraph "Data Security"
        K[Encryption at Rest]
        L[Encryption in Transit]
        M[Data Masking]
        N[Audit Logging]
    end
    
    A --> D
    B --> D
    C --> D
    
    D --> H
    E --> H
    F --> H
    
    H --> K
    I --> K
    J --> K
```

### 4.2 Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Client
    participant Worker
    participant D1
    participant KV
    
    User->>Client: Enter credentials
    Client->>Worker: POST /auth/login
    
    Worker->>D1: Verify credentials
    D1-->>Worker: User data
    
    Worker->>Worker: Generate JWT
    Worker->>KV: Store session
    Worker-->>Client: Return JWT + session
    
    Client->>Client: Store in httpOnly cookie
    
    Note over Client,Worker: Subsequent requests
    
    Client->>Worker: Request + JWT
    Worker->>KV: Verify session
    Worker-->>Client: Protected resource
```

## 5. Real-time Architecture

### 5.1 Durable Objects Design

```mermaid
graph TD
    subgraph "Queue Room DO"
        A[State: patients[]]
        B[State: doctors[]]
        C[State: connections[]]
        
        D[Method: addPatient]
        E[Method: callNext]
        F[Method: transfer]
        
        G[Broadcast to all]
    end
    
    subgraph "Connections"
        H[WebSocket 1 - Doctor]
        I[WebSocket 2 - Display]
        J[WebSocket 3 - Reception]
    end
    
    H <--> G
    I <--> G
    J <--> G
    
    D --> G
    E --> G
    F --> G
```

### 5.2 Real-time Update Flow

```sequence
participant Doctor
participant DO as Durable Object
participant Display
participant Patient

Doctor->>DO: callNext(patientId)
DO->>DO: Update state
DO->>Display: Broadcast "patient called"
DO->>Patient: WebSocket update
Display-->>Patient: Show on screen
Patient->>Patient: Receive notification
```

## 6. Offline Architecture

### 6.1 Offline-First Design

```mermaid
graph TD
    subgraph "Online Mode"
        A[Live API Calls]
        B[Real-time Updates]
        C[Sync with Server]
    end
    
    subgraph "Offline Mode"
        D[IndexedDB Storage]
        E[Queue Local Operations]
        F[Background Sync]
    end
    
    subgraph "Sync Layer"
        G[Conflict Resolution]
        H[Merge Strategy]
        I[Retry Queue]
    end
    
    C <--> G
    F <--> G
    
    D --> E
    E --> F
```

### 6.2 Offline Storage Schema

```typescript
// IndexedDB Schema
interface OfflineStore {
  patients: {
    keyPath: 'id',
    indexes: ['name', 'phone']
  },
  
  queueOperations: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: ['synced']
  },
  
  pendingCalls: {
    keyPath: 'id',
    indexes: ['timestamp']
  },
  
  doctorNotes: {
    keyPath: 'id',
    indexes: ['patientId', 'synced']
  }
}
```

## 7. Integration Architecture

### 7.1 IPTV Integration

```mermaid
graph TD
    subgraph "Admin"
        A[Channel Management]
        B[Playlist Upload]
        C[Schedule]
    end
    
    subgraph "Worker"
        D[Channel API]
        E[Stream Proxy]
        F[Health Check]
    end
    
    subgraph "TV Display"
        G[VLC Player]
        H[Split Screen]
        I[Queue Overlay]
    end
    
    A --> D
    B --> D
    C --> D
    
    D --> E
    E --> G
    
    G --> H
    H --> I
```

### 7.2 External API Integration

```yaml
# API Integration Points

HMS Integration:
  - endpoint: /api/hms/patients
  - method: POST
  - purpose: Sync patient data
  - frequency: Real-time
  - auth: API Key

SMS Gateway:
  - provider: Africa's Talking
  - purpose: Send notifications
  - fallback: Email
  
Email Service:
  - provider: Resend.com
  - purpose: Password reset
  - daily limit: 100 (free tier)
```

## 8. Deployment Architecture

### 8.1 Environment Structure

```mermaid
graph TD
    subgraph "Development"
        A[Local Dev]
        B[Feature Branch]
        C[PR Preview]
    end
    
    subgraph "Staging"
        D[Staging Env]
        E[Test Data]
        F[QA Testing]
    end
    
    subgraph "Production"
        G[Production Env]
        H[Live Data]
        I[Canary Deploy]
    end
    
    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    G --> I
```

### 8.2 CI/CD Pipeline

```yaml
# Deployment Pipeline
stages:
  - test:
      - unit tests
      - integration tests
      - linting
      - type check
  
  - build:
      - next build
      - worker build
      - asset optimization
  
  - deploy-staging:
      - wrangler deploy --env=staging
      - d1 migrations apply
      - smoke tests
  
  - deploy-production:
      - canary deploy (10%)
      - health check
      - full rollout
      - post-deploy tests
```

## 9. Scalability Architecture

### 9.1 Horizontal Scaling

```mermaid
graph TD
    subgraph "Edge"
        A[Cloudflare CDN]
        B[Load Balancer]
    end
    
    subgraph "Workers"
        C[Worker Instance 1]
        D[Worker Instance 2]
        E[Worker Instance N]
    end
    
    subgraph "Durable Objects"
        F[Queue DO 1]
        G[Queue DO 2]
        H[Queue DO N]
    end
    
    subgraph "Database"
        I[D1 Primary]
        J[D1 Replica 1]
        K[D1 Replica N]
    end
    
    A --> B
    B --> C
    B --> D
    B --> E
    
    C --> F
    D --> G
    E --> H
    
    F --> I
    G --> J
    H --> K
```

### 9.2 Caching Strategy

```mermaid
graph TD
    subgraph "Cache Layers"
        A[Browser Cache]
        B[Cloudflare CDN]
        C[KV Store]
        D[D1 Database]
    end
    
    subgraph "Cache Rules"
        E[Static Assets: 1 year]
        F[API Responses: 5 min]
        G[User Data: 1 hour]
        H[Queue Status: 30 sec]
    end
    
    A --> E
    B --> E
    B --> F
    C --> F
    C --> G
    D --> H
```

## 10. Monitoring Architecture

### 10.1 Metrics Collection

```mermaid
graph TD
    subgraph "Sources"
        A[Application Logs]
        B[Worker Metrics]
        C[D1 Metrics]
        D[User Analytics]
    end
    
    subgraph "Collection"
        E[Cloudflare Analytics]
        F[Custom Metrics]
        G[Error Tracking]
    end
    
    subgraph "Storage"
        H[D1 Metrics Store]
        I[R2 Log Archive]
    end
    
    subgraph "Visualization"
        J[Grafana Dashboard]
        K[Custom Dashboard]
        L[Alert Manager]
    end
    
    A --> E
    B --> E
    C --> E
    D --> F
    
    E --> H
    F --> H
    G --> I
    
    H --> J
    H --> K
    K --> L
```

### 10.2 Key Metrics

```typescript
interface SystemMetrics {
  // Performance
  responseTime: Histogram;
  cpuUsage: Gauge;
  memoryUsage: Gauge;
  requestCount: Counter;
  
  // Business
  activeQueues: Gauge;
  patientsWaiting: Gauge;
  averageWaitTime: Histogram;
  callsPerHour: Counter;
  
  // Health
  errorRate: Gauge;
  uptime: Gauge;
  dbConnections: Gauge;
  
  // User
  activeUsers: Gauge;
  pageViews: Counter;
  userSatisfaction: Gauge;
}
```

## 11. Disaster Recovery

### 11.1 Backup Strategy

```mermaid
graph TD
    subgraph "Backup Schedule"
        A[D1: Hourly]
        B[KV: Daily]
        C[R2: Continuous]
        D[Config: Per Change]
    end
    
    subgraph "Storage"
        E[R2 Backups]
        F[Offsite Replica]
        G[Export Files]
    end
    
    subgraph "Retention"
        H[Daily: 30 days]
        I[Weekly: 3 months]
        J[Monthly: 1 year]
    end
    
    A --> E
    B --> E
    C --> E
    D --> G
    
    E --> F
    G --> F
    
    E --> H
    E --> I
    E --> J
```

### 11.2 Recovery Procedures

```yaml
Recovery Scenarios:

Database Corruption:
  - Detect: Monitor alerts
  - Act: Stop writes
  - Restore: Latest backup
  - Verify: Data integrity
  - RTO: 15 minutes
  - RPO: 1 hour

Region Failure:
  - Detect: Cloudflare alert
  - Act: Failover to DR
  - Restore: From replica
  - Verify: Health checks
  - RTO: 5 minutes
  - RPO: < 1 minute

Data Breach:
  - Detect: Security alert
  - Act: Isolate system
  - Investigate: Root cause
  - Notify: Stakeholders
  - Recover: Clean restore
  - RTO: 4 hours
  - RPO: 24 hours
```

## 12. Performance Architecture

### 12.1 Performance Targets

| Component | Target | Measurement |
|-----------|--------|-------------|
| API Response (P95) | < 200ms | Worker timing |
| Page Load (FCP) | < 1.5s | Lighthouse |
| Database Query | < 50ms | Query timing |
| WebSocket Latency | < 500ms | Custom metric |
| Cache Hit Ratio | > 80% | KV metrics |
| Concurrent Users | 500+ | Load test |
| Daily Requests | 100k+ | Analytics |

### 12.2 Optimization Techniques

```typescript
// 1. Edge Caching
const cacheConfig = {
  static: {
    ttl: 31536000, // 1 year
    staleWhileRevalidate: 86400
  },
  api: {
    ttl: 300, // 5 minutes
    varyByUser: true
  },
  queue: {
    ttl: 30, // 30 seconds
    broadcastUpdates: true
  }
};

// 2. Database Optimization
const dbOptimizations = {
  indexes: [
    'visits(status, created_at)',
    'patients(email)',
    'visits(patient_id, status)'
  ],
  queries: {
    prepared: true,
    batchSize: 100,
    timeout: 5000
  }
};

// 3. Asset Optimization
const assetOptimizations = {
  images: {
    formats: ['webp', 'avif'],
    sizes: [640, 750, 828, 1080],
    quality: 85
  },
  fonts: {
    display: 'swap',
    preload: true
  },
  scripts: {
    defer: true,
    async: true
  }
};
```

## 13. Security Architecture Details

### 13.1 Encryption Standards

```typescript
// Encryption at Rest
const encryptionAtRest = {
  database: 'AES-256',
  backups: 'AES-256',
  logs: 'AES-256',
  keys: 'HSM via Cloudflare'
};

// Encryption in Transit
const encryptionInTransit = {
  tls: 'TLS 1.3',
  hsts: true,
  certificates: 'Cloudflare managed'
};

// Data Masking Rules
const dataMasking = {
  phone: '+(***) ***-****',
  email: 'u***@***.com',
  name: '****',
  id: 'partial: last 4 only'
};
```

### 13.2 Access Control Matrix

| Resource | Patient | Doctor | Reception | Admin |
|----------|---------|--------|-----------|-------|
| Own Profile | CRUD | CRUD | R | CRUD |
| Other Profiles | - | R | R | CRUD |
| Own Visits | R | R | R | CRUD |
| All Visits | - | R | R | CRUD |
| Queue Status | R | R | R | CRUD |
| Call Patient | - | C | - | C |
| Add to Queue | - | C | C | C |
| System Config | - | - | - | CRUD |
| IPTV Control | - | - | - | CRUD |
| Analytics | - | - | - | R |

## 14. Technology Decisions

### 14.1 Why Cloudflare?

```markdown
## Decision: Cloudflare Stack

### Reasons
1. **Free Tier Generous**: 100k requests/day, 5GB D1, unlimited sites
2. **Global Edge Network**: Low latency worldwide
3. **Integrated Stack**: Pages, Workers, D1, KV, R2 together
4. **No Server Management**: Serverless, auto-scaling
5. **Built-in Security**: DDoS, WAF, rate limiting
6. **Developer Experience**: Wrangler CLI, quick deploys

### Trade-offs
- ❌ SQLite limitations (D1)
- ❌ Worker CPU time limits (10-50ms)
- ❌ Cold starts possible
- ✅ Cost: $0
- ✅ Simplicity: No infrastructure
- ✅ Speed: Edge deployment
```

### 14.2 Why Next.js?

```markdown
## Decision: Next.js 14

### Reasons
1. **App Router**: Modern React patterns
2. **Server Components**: Reduced client JS
3. **API Routes**: Integrated backend
4. **Image Optimization**: Built-in
5. **Font Optimization**: Automatic
6. **TypeScript**: First-class support

### Trade-offs
- ❌ Build time for large sites
- ❌ Learning curve for App Router
- ✅ SEO benefits
- ✅ Performance
- ✅ Developer experience
```

### 14.3 Why tRPC?

```markdown
## Decision: tRPC

### Reasons
1. **Type Safety**: End-to-end types
2. **No Schema Duplication**: Single source of truth
3. **Autocomplete**: Great DX
4. **Lightweight**: No REST/GraphQL overhead
5. **Works with Next.js**: Perfect integration

### Trade-offs
- ❌ Learning curve
- ❌ Not as widely known as REST
- ✅ TypeScript integration
- ✅ Bundle size
- ✅ Developer speed
```

## 15. Architecture Decision Records

### ADR-001: Use D1 for Primary Database

```markdown
# ADR-001: Database Choice

## Context
Need a simple, serverless database that works with Cloudflare free tier.

## Decision
Use Cloudflare D1 (SQLite-based) for primary database.

## Rationale
- Free tier: 5GB storage, 5M reads/month
- SQL familiar to team
- Integrated with Workers
- Automatic backups

## Consequences
- SQLite limitations (no stored procedures)
- Need to manage migrations carefully
- Good for our scale (<10GB data)
```

### ADR-002: Real-time with Durable Objects

```markdown
# ADR-002: Real-time Updates

## Context
Need instant updates across all clients when queue changes.

## Decision
Use Cloudflare Durable Objects with WebSockets.

## Rationale
- WebSockets for bidirectional communication
- Durable Objects for state management
- Broadcast updates efficiently
- Free tier includes 1M requests/month

## Consequences
- More complex than polling
- Need to handle reconnection
- Better user experience
- Lower latency
```

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-03 | System | Initial version |

**Review Date:** 2026-06-03
```

**File created successfully: `.opencode/context/project/03-architecture.md`**

Please confirm if I should proceed with the next file: `.opencode/context/project/04-stack.md`
