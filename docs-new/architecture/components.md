# Component Architecture

## 1. System Component Overview

The Limuru Cottage Hospital Queue Management System is built using a modular architecture with clear separation of concerns.

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT APPLICATIONS                               │
├──────────────────┬──────────────────┬──────────────────┬──────────────────┤
│    Web App       │   Mobile PWA     │    TV Display    │    Kiosk Mode    │
│   (Next.js)      │   (React Native) │   (Static HTML)  │   (Self-Service) │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY                                    │
│                         (Cloudflare Workers)                                │
├──────────────────┬──────────────────┬──────────────────┬──────────────────┤
│  Authentication  │   Rate Limiting  │     CORS        │     Logging      │
│     Middleware   │    Middleware    │   Middleware    │    Middleware    │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                              ROUTE HANDLERS                                  │
├────────┬────────┬────────┬────────┬────────┬────────┬────────┬───────────┤
│ auth   │ queue  │ patients│ appts  │ doctors│ notes  │ messages│ admin    │
└────────┴────────┴────────┴────────┴────────┴────────┴────────┴───────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                            SERVICE LAYER                                    │
├────────────┬────────────┬────────────┬────────────┬────────────────────────┤
│QueueEngine │ AuthService│ PatientSvc │ AppointSvc │ NotificationService   │
└────────────┴────────────┴────────────┴────────────┴────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                           INFRASTRUCTURE                                    │
├──────────────────┬──────────────────┬──────────────────┬──────────────────────┤
│   D1 Database    │   KV Storage    │   R2 Storage    │   Durable Objects   │
│   (SQLite)       │   (Sessions)     │   (Assets)      │   (Real-time)        │
└──────────────────┴──────────────────┴──────────────────┴──────────────────────┘
```

---

## 2. API Server Components

### 2.1 Middleware Stack

```typescript
// Middleware execution order
[
  cors,           // Cross-Origin Resource Sharing
  logger,         // Request/response logging
  rateLimit,      // Rate limiting protection
  authenticate,   // JWT token validation
  authorize,      // Role-based access control
  validate,       // Request validation (Zod)
  routeHandler    // Actual route handler
]
```

### 2.2 Route Handlers

| Route Module | File | Description |
|--------------|------|-------------|
| Authentication | `routes/auth.ts` | Login, logout, password management |
| Queue Management | `routes/queue.ts` | Ticket creation, calling, transfer |
| Patients | `routes/patients.ts` | Patient CRUD operations |
| Appointments | `routes/appointments.ts` | Scheduling and management |
| Departments | `routes/departments.ts` | Department configuration |
| Doctors | `routes/doctors.ts` | Doctor availability and schedule |
| Clinical Notes | `routes/clinical.ts` | SOAP notes, diagnosis |
| Messages | `routes/messages.ts` | Internal staff messaging |
| Voice Calls | `routes/voice.ts` | WebRTC call management |
| Display | `routes/display.ts` | TV display data |
| Analytics | `routes/analytics.ts` | Reporting and metrics |
| Admin | `routes/admin.ts` | System administration |
| Notifications | `routes/notifications.ts` | SMS/WhatsApp alerts |
| WhatsApp | `routes/whatsapp.ts` | WhatsApp Bot integration |

### 2.3 Service Layer

```typescript
// Service classes
services/
├── queue-engine.ts       // Queue business logic
├── auth-service.ts       // Authentication logic
├── patient-service.ts     // Patient management
├── appointment-service.ts // Scheduling logic
├── notification-service.ts // Twilio integration
├── hms-adapter.ts         // HMS integration
└── analytics-service.ts   // Reporting
```

---

## 3. Client Applications

### 3.1 Web Application (Next.js)

```
apps/web/
├── app/
│   ├── login/           # Authentication pages
│   ├── register/        # Patient registration
│   ├── kiosk/           # Self-service kiosk
│   ├── display/         # TV display page
│   ├── dashboard/
│   │   ├── admin/       # Admin dashboard
│   │   ├── doctor/      # Doctor dashboard
│   │   ├── nurse/       # Nurse dashboard
│   │   └── receptionist/ # Receptionist dashboard
│   └── layout.tsx       # Root layout
├── lib/
│   ├── api/             # API client
│   ├── components/     # Reusable components
│   └── stores/         # Zustand stores
└── public/             # Static assets
```

### 3.2 Mobile PWA

```
apps/mobile/
├── app/
│   ├── (auth)/          # Login, register screens
│   ├── (patient)/       # Patient portal screens
│   └── (staff)/         # Staff dashboard screens
├── lib/
│   ├── api/             # API client
│   └── stores/          # State management
└── index.html           # PWA entry
```

### 3.3 TV Display

Standalone static HTML page displaying:
- Current queue status
- Called patient numbers
- Estimated wait times
- Department information

---

## 4. Database Schema (D1/SQLite)

### 4.1 Core Tables

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CORE TABLES                                     │
├─────────────┬─────────────┬─────────────┬─────────────┬────────────────────┤
│   users     │  patients   │ departments │    queue    │   appointments     │
└─────────────┴─────────────┴─────────────┴─────────────┴────────────────────┘
        │
        ├── clinical_notes
        ├── vitals
        ├── messages
        ├── audit_logs
        ├── rooms
        └── notifications
```

### 4.2 Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   patients   │──────▶│    queue     │◀──────│ departments  │
└──────────────┘       └──────────────┘       └──────────────┘
       │                      │                       │
       │                      │                       │
       ▼                      ▼                       ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│ appointments │       │clinical_notes│       │    rooms     │
└──────────────┘       └──────────────┘       └──────────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │    vitals     │
                       └──────────────┘

┌──────────────┐       ┌──────────────┐
│    users     │──────▶│   messages   │
└──────────────┘       └──────────────┘
       │
       ▼
┌──────────────┐       ┌──────────────┐
│  audit_logs  │       │notifications │
└──────────────┘       └──────────────┘
```

---

## 5. Infrastructure Components

### 5.1 D1 Database

| Binding | Purpose | Configuration |
|---------|---------|---------------|
| `DB` | Primary data store | D1 SQLite database |

### 5.2 KV Namespaces

| Binding | Purpose | TTL |
|---------|---------|-----|
| `SESSION_KV` | User sessions | 24 hours |
| `CACHE_KV` | Application cache | Variable |
| `RATE_LIMIT_KV` | Rate limiting counters | 1 minute |

### 5.3 R2 Storage

| Binding | Purpose |
|---------|---------|
| `ASSETS_BUCKET` | Static assets, documents |
| `BACKUP_BUCKET` | Database backups |

### 5.4 Durable Objects

| Object | Purpose |
|--------|---------|
| `QueueRoomDO` | Real-time queue synchronization |
| `PatientSyncDO` | Patient data synchronization |

---

## 6. Component Dependencies

### 6.1 API Dependencies

```yaml
dependencies:
  hono: "^4.0.0"           # Web framework
  @cloudflare/workers-types: "^4.20240117.0"  # TypeScript types
  zod: "^3.22.0"           # Schema validation
  jose: "^5.2.0"           # JWT handling
  bcryptjs: "^2.4.3"       # Password hashing
  uuid: "^9.0.0"           # ID generation
  twilio: "^4.20.0"        # SMS/WhatsApp

devDependencies:
  wrangler: "^4.0.0"       # Cloudflare CLI
  typescript: "^5.3.0"     # TypeScript compiler
```

### 6.2 Frontend Dependencies

```yaml
dependencies:
  next: "^14.2.0"          # React framework
  react: "^18.2.0"          # UI library
  zustand: "^4.5.0"        # State management
  tailwindcss: "^3.4.0"    # Styling
  @tanstack/react-query: "^5.0.0"  # Data fetching
  radix-ui: "^1.0.0"       # Accessible components
```

---

## 7. Configuration Management

### 7.1 Environment Variables

```bash
# Application
NODE_ENV=production
API_URL=https://api.limuruhospital.co.ke
WEB_URL=https://limuruhospital.co.ke

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=<account-id>
CLOUDFLARE_API_TOKEN=<api-token>

# Database
DATABASE_NAME=limuru-queue-db

# Authentication
JWT_SECRET=<secret>
DEFAULT_PASSWORD=<default-password>

# Notifications (Optional)
TWILIO_ACCOUNT_SID=<sid>
TWILIO_AUTH_TOKEN=<token>
WHATSAPP_API_TOKEN=<token>
```

### 7.1 Wrangler Configuration

```toml
# wrangler.toml
name = "limuru-queue-api"
main = "src/index.ts"
compatibility_date = "2024-10-22"

[[d1_databases]]
binding = "DB"
database_name = "limuru-queue-db"

[[kv_namespaces]]
binding = "SESSION_KV"

[[kv_namespaces]]
binding = "CACHE_KV"

[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
```

---

## 8. Component Communication

### 8.1 Internal API Calls

```
Client → API Gateway → Route Handler → Service → Database
                                    ↓
                              Middleware Stack
                              (auth, rateLimit, validate)
```

### 8.2 Real-time Updates

```
Server Events (SSE) / WebSocket:
API → Durable Objects → Connected Clients
```

### 8.3 External Integrations

```
API → Twilio API → SMS/WhatsApp Notifications
API → HMS Adapter → External Hospital System
```

---

## 9. Error Handling

### 9.1 Error Response Format

```typescript
interface ErrorResponse {
  success: false;
  error: string;        // Error message
  code?: string;        // Error code
  details?: any;       // Additional details
}
```

### 9.2 HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation) |
| 401 | Unauthorized |
| 403 | Forbidden (role) |
| 404 | Not Found |
| 429 | Rate Limited |
| 500 | Server Error |

---

## 10. Logging Architecture

### 10.1 Log Levels

| Level | Usage |
|-------|-------|
| DEBUG | Development debugging |
| INFO | Normal operations |
| WARN | Recoverable issues |
| ERROR | Failures requiring attention |

### 10.2 Audit Logging

All PHI-related operations are logged:
- Patient data access
- Authentication events
- Data modifications
- Queue status changes
