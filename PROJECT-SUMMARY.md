# Hospital Queue Management System - Project Summary

<div align="center">

**Project Name:** Limuru Cottage Hospital Queue Management System  
**Version:** 2.0.0  
**Status:** Production Ready  
**Last Updated:** March 19, 2026

---

| Metric | Value |
|--------|-------|
| Total Files | 199+ |
| Source Files | 140 |
| Documentation | 220 |
| Docker Containers | 4 |
| API Endpoints | 58+ |

</div>

---

## 1. Directory Tree Structure

```
Cottage-Queuing-System/
├── apps/                           # Application packages
│   ├── api/                        # Express.js REST API
│   │   ├── src/
│   │   │   ├── db/                # Database connection & migrations
│   │   │   ├── durable-objects/   # Cloudflare Durable Objects
│   │   │   ├── middleware/        # Auth, validation, logging
│   │   │   ├── routes/            # API route handlers
│   │   │   ├── services/          # Business logic
│   │   │   ├── index.ts           # App entry
│   │   │   ├── server.ts          # Express server
│   │   │   ├── realtime.ts        # WebSocket handling
│   │   │   ├── utils.ts           # Utilities
│   │   │   └── utils.test.ts      # Unit tests
│   │   ├── tests/                 # Integration tests
│   │   ├── Dockerfile             # API container image
│   │   ├── wrangler.toml          # Cloudflare config
│   │   └── package.json
│   │
│   ├── web/                       # Next.js Web Application
│   │   ├── app/                  # Next.js App Router pages
│   │   │   ├── admin/            # Admin dashboard
│   │   │   ├── dashboard/        # Staff dashboards
│   │   │   ├── display/          # TV display page
│   │   │   ├── kiosk/            # Patient kiosk
│   │   │   ├── login/            # Authentication
│   │   │   └── register/         # Patient registration
│   │   ├── lib/                  # Shared libraries
│   │   │   ├── api/              # API client
│   │   │   ├── components/      # React components
│   │   │   └── stores/           # Zustand stores
│   │   ├── e2e/                  # Playwright E2E tests
│   │   ├── out/                  # Static build output
│   │   ├── public/               # Static assets
│   │   ├── Dockerfile            # Web container image
│   │   └── package.json
│   │
│   └── mobile/                   # React Native Expo PWA
│       ├── app/                  # Expo app screens
│       │   ├── (auth)/           # Auth screens
│       │   ├── (patient)/        # Patient screens
│       │   └── (staff)/          # Staff screens
│       ├── lib/                  # API & stores
│       ├── index.html            # PWA entry
│       ├── manifest.json         # PWA manifest
│       └── package.json
│
├── packages/
│   └── shared/                    # Shared types & utilities
│       ├── types/index.ts         # TypeScript interfaces
│       └── package.json
│
├── services/                      # Infrastructure
│   ├── database/
│   │   ├── init.sql              # PostgreSQL schema
│   │   └── README.md
│   ├── docker-compose.yml        # Main compose file
│   ├── docker-compose.local.yml  # Local development
│   ├── docker-compose.production.yml
│   ├── nginx.conf                # Web server config
│   ├── nginx-mobile.conf         # Mobile PWA config
│   ├── deploy.sh                 # Deployment script
│   └── build-push.sh             # Build & push script
│
├── context/                       # Project context & standards
│   ├── core/                     # Development standards
│   │   ├── standards/            # Code quality, security, etc.
│   │   └── workflows/           # Dev workflows
│   └── project/                  # Project documentation
│
├── docs/                         # Comprehensive documentation
│   ├── ARCHITECTURE.md           # System architecture
│   ├── API.md                    # API documentation
│   ├── SETUP.md                  # Setup guide (Wrangler-first)
│   ├── SYSTEM_GUIDE.md           # Complete system guide
│   ├── DEPLOYMENT/               # Deployment guides
│   ├── DEVELOPER/                # Developer docs
│   │   ├── LOCAL-DEVELOPMENT.md  # Unified local dev guide (NEW)
│   │   ├── CLOUD-DEVELOPMENT.md  # Wrangler v4 guide
│   │   └── DOCKER-DEVELOPMENT.md # Docker (PostgreSQL only)
│   ├── TRAINING/                 # Training materials
│   │   ├── QUICKCARD-WRANGLER.md # Wrangler commands
│   │   └── QUICKCARD-DOCKER.md   # Local dev commands
│   └── REFERENCE/               # Reference docs
│
├── docker/                       # Docker configurations
├── .github/workflows/            # CI/CD pipelines
├── package.json                  # Root package.json
├── tsconfig.json                 # TypeScript config
├── turbo.json                    # Turborepo config
├── docker-compose.yml            # Root compose
└── README.md                     # Main readme
```

---

## 2. File Counts by Category

| Category | Count | Description |
|----------|-------|-------------|
| **Source Code** | 134 | TypeScript/JavaScript files |
| | 61 | `.ts` files (API, utilities) |
| | 43 | `.tsx` files (React components) |
| | 30 | `.js` files (configs, scripts) |
| **Documentation** | 220 | Markdown files |
| | 80+ | Reference docs |
| | 50+ | Training materials |
| | 40+ | Developer guides |
| | 30+ | Deployment docs |
| **Configuration** | 15 | JSON configs |
| | 5 | Dockerfiles |
| | 3 | Docker Compose files |
| **Styles** | 2 | Tailwind configs |
| **Tests** | 10+ | Test files |
| **Total** | 165+ | Project files (excluding node_modules) |

---

## 3. Technology Stack Summary

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.2.0 | React web framework |
| React | 18.2.0 | UI library |
| Tailwind CSS | 3.4.0 | Styling |
| Zustand | 4.5.0 | State management |
| tRPC | 10.45.0 | Type-safe API client |
| Radix UI | 1.0.x | Accessible components |
| React Hook Form | 7.50.0 | Form handling |

### Mobile (PWA)
| Technology | Version | Purpose |
|------------|---------|---------|
| Expo | 50.0.0 | React Native framework |
| React Native | 0.73.4 | Mobile UI |
| React Native Paper | 5.4.0 | Material Design |
| Expo Notifications | 0.27.6 | Push notifications |
| AsyncStorage | 1.21.0 | Local storage |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Express.js | 4.22.1 | Web server |
| PostgreSQL | 15 | Database |
| JWT | 9.0.3 | Authentication |
| bcryptjs | 2.4.3 | Password hashing |
| Zod | 3.22.0 | Validation |
| uuid | 13.0.0 | ID generation |

### DevOps
| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| Nginx | Reverse proxy |
| GitHub Actions | CI/CD |
| Turborepo | Monorepo management |
| pnpm | Package manager |

---

## 4. All Implemented Features

### Core Queue Management
- [x] Digital ticket generation with unique queue numbers
- [x] Real-time queue status tracking (waiting, called, in_progress, completed)
- [x] Priority queue system (emergency, pregnant, elderly, disability)
- [x] Department-based queue segregation
- [x] Patient check-in and check-out workflow
- [x] Queue position tracking and estimated wait times

### Patient Features
- [x] Patient registration with unique patient numbers
- [x] Patient self-service portal (queue status, appointments)
- [x] Appointment scheduling system
- [x] Patient history tracking
- [x] Feedback and rating system
- [x] Privacy protection (patient numbers vs names)

### Staff Features
- [x] Role-based dashboards (Admin, Doctor, Nurse, Receptionist)
- [x] Queue management for doctors
- [x] Triage and vitals recording (Nurse)
- [x] Patient registration and ticket issuance (Receptionist)
- [x] Clinical notes (SOAP format)
- [x] Internal messaging system

### System Features
- [x] Real-time updates via WebSocket
- [x] TV display for waiting room
- [x] Kiosk mode for self-service
- [x] Analytics and reporting
- [x] Audit logging
- [x] System settings management
- [x] Multi-department support

### API Features
- [x] RESTful API endpoints
- [x] JWT authentication
- [x] Role-based authorization
- [x] Rate limiting
- [x] Input validation (Zod)
- [x] Error handling with standardized responses

### Mobile/PWA Features
- [x] Progressive Web App support
- [x] Responsive design
- [x] Offline capability
- [x] Push notifications support

### Voice Communication Features (v2.0)
- [x] Real-time voice calls between staff (WebRTC)
- [x] Call initiation, acceptance, rejection
- [x] Call hold and resume
- [x] Call transfer (attended and blind)
- [x] Call history with filtering
- [x] Priority levels (normal, urgent, emergency)
- [x] Incoming call modal with accept/reject
- [x] Active call UI with duration timer
- [x] ICE candidate handling for NAT traversal
- [x] WebRTC offer/answer exchange

---

## 5. API Endpoints List

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/staff/login` | Staff login |
| POST | `/auth/patient/login` | Patient login |
| POST | `/auth/pin/login` | Quick PIN login |
| POST | `/auth/logout` | Logout |
| POST | `/auth/change-password` | Change password |
| POST | `/auth/reset-password/request` | Request password reset |
| POST | `/auth/reset-password/confirm` | Confirm password reset |

### Patients (`/api/patients`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/patients` | List patients (paginated) |
| GET | `/patients/:id` | Get patient details |
| POST | `/patients` | Create new patient |
| PUT | `/patients/:id` | Update patient |
| DELETE | `/patients/:id` | Deactivate patient |
| GET | `/patients/:id/history` | Get patient history |
| GET | `/patients/search` | Search patients |

### Queue (`/api/queue`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/queue` | Get all queues |
| GET | `/queue/:department` | Get department queue |
| POST | `/queue` | Create queue entry |
| POST | `/queue/fast` | Fast-track entry |
| POST | `/queue/:id/call` | Call patient |
| POST | `/queue/:id/start` | Start consultation |
| POST | `/queue/:id/complete` | Complete consultation |
| POST | `/queue/:id/transfer` | Transfer to department |
| POST | `/queue/:id/cancel` | Cancel queue entry |

### Appointments (`/api/appointments`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/appointments` | List appointments |
| GET | `/appointments/:id` | Get appointment |
| POST | `/appointments` | Create appointment |
| PUT | `/appointments/:id` | Update appointment |
| DELETE | `/appointments/:id` | Cancel appointment |
| POST | `/appointments/:id/checkin` | Check-in patient |

### Departments (`/api/departments`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/departments` | List departments |
| GET | `/departments/:id` | Get department |
| POST | `/departments` | Create department |
| PUT | `/departments/:id` | Update department |

### Doctors (`/api/doctors`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/doctors` | List doctors |
| GET | `/doctors/:id` | Get doctor |
| GET | `/doctors/:id/schedule` | Get schedule |
| PUT | `/doctors/:id/availability` | Toggle availability |

### Clinical Notes (`/api/notes`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notes/:queueId` | Get notes for queue |
| POST | `/notes` | Create note |
| PUT | `/notes/:id` | Update note |

### Messages (`/api/messages`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/messages` | List messages |
| GET | `/messages/staff` | Staff messages |
| GET | `/messages/unread/count` | Unread count |
| POST | `/messages` | Send message |
| PUT | `/messages/:id/read` | Mark as read |

### Analytics (`/api/analytics`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analytics/overview` | System overview |
| GET | `/analytics/wait-times` | Average wait times |
| GET | `/analytics/doctors` | Doctor metrics |
| GET | `/analytics/department/:id` | Department stats |

### Admin (`/api/admin`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/users` | List users |
| POST | `/admin/users` | Create user |
| PUT | `/admin/users/:id` | Update user |
| GET | `/admin/departments` | Manage departments |
| POST | `/admin/departments` | Create department |
| GET | `/admin/settings` | System settings |
| PUT | `/admin/settings` | Update settings |

### Rooms (`/api/rooms`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/rooms` | List rooms |
| POST | `/rooms` | Create room |
| PUT | `/rooms/:id` | Update room |

### Voice Calls (`/api/voice`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/voice/call` | Initiate a call |
| POST | `/voice/call/:callId/accept` | Accept incoming call |
| POST | `/voice/call/:callId/reject` | Reject incoming call |
| POST | `/voice/call/:callId/end` | End active call |
| POST | `/voice/call/:callId/hold` | Put call on hold |
| POST | `/voice/call/:callId/resume` | Resume held call |
| POST | `/voice/call/:callId/transfer` | Transfer call |
| GET | `/voice/calls` | Get call history |
| GET | `/voice/calls/active` | Get active calls |

---

## 6. Database Schema Overview

### D1 Migrations

Cloudflare D1 uses SQLite-compatible migrations in `apps/api/src/db/migrations/`:

| Migration | Description |
|-----------|-------------|
| `0000_init.sql` | Core tables (patients, users, departments, doctors, queue, appointments, medical_records) |
| `0001_add_audit.sql` | Audit logging with triggers |
| `0002_add_appointments.sql` | Appointment enhancements |
| `0003_add_audit_logs.sql` | Additional audit tables |
| `0004_add_rooms.sql` | Room management |
| `0005_add_rooms_tables.sql` | Room scheduling and assignments |
| `0006_add_messages.sql` | Internal messaging system |
| `0007_seed_data.sql` | Default departments and seed data |

### Tables

#### `users` (Staff)
```sql
- id: UUID (PK)
- email: VARCHAR(255) UNIQUE
- password_hash: VARCHAR(255)
- name: VARCHAR(255)
- role: ENUM('patient','doctor','nurse','receptionist','admin')
- department: VARCHAR(50)
- room: VARCHAR(20)
- phone: VARCHAR(20)
- is_active: BOOLEAN
- created_at, updated_at: TIMESTAMP
```

#### `patients`
```sql
- id: UUID (PK)
- patient_number: VARCHAR(50) UNIQUE
- name, email, phone, address: VARCHAR/TEXT
- date_of_birth: DATE
- gender: VARCHAR(20)
- emergency_contact_name, emergency_contact_phone: VARCHAR
- national_id, insurance_provider, insurance_number: VARCHAR
- blood_type: VARCHAR(5)
- allergies, medical_conditions: TEXT
- language: VARCHAR(20)
- is_active: BOOLEAN
- created_at, updated_at: TIMESTAMP
```

#### `departments`
```sql
- id: UUID (PK)
- code: VARCHAR(20) UNIQUE
- name: VARCHAR(100)
- description: TEXT
- color, icon: VARCHAR(20)
- is_active: BOOLEAN
- created_at: TIMESTAMP
```

#### `queue`
```sql
- id: UUID (PK)
- ticket_number: VARCHAR(20) UNIQUE
- patient_id: UUID (FK)
- department_id: UUID (FK)
- status: ENUM('waiting','called','in_progress','completed','cancelled','no_show')
- priority: BOOLEAN
- priority_level: ENUM('normal','urgent','emergency','pregnant','elderly','disability')
- priority_reason: TEXT
- appointment_id: UUID (FK)
- position: INTEGER
- wait_time, consultation_duration: INTEGER
- room_assigned: VARCHAR(20)
- doctor_id: UUID (FK)
- called_at, started_at, completed_at: TIMESTAMP
- notes: TEXT
- created_at, updated_at: TIMESTAMP
```

#### `appointments`
```sql
- id: UUID (PK)
- patient_id: UUID (FK)
- department_id: UUID (FK)
- doctor_id: UUID (FK)
- appointment_date: DATE
- appointment_time: TIME
- status: ENUM('scheduled','confirmed','completed','cancelled','no_show')
- notes: TEXT
- created_at, updated_at: TIMESTAMP
```

#### `clinical_notes`
```sql
- id: UUID (PK)
- queue_id: UUID (FK)
- doctor_id: UUID (FK)
- diagnosis, symptoms, prescription, notes: TEXT
- follow_up_required: BOOLEAN
- follow_up_date: DATE
- created_at: TIMESTAMP
```

#### `rooms`
```sql
- id: UUID (PK)
- room_number: VARCHAR(20)
- department_id: UUID (FK)
- floor: VARCHAR(20)
- capacity: INTEGER
- room_type: ENUM('consultation','examination','treatment','emergency','waiting')
- is_active: BOOLEAN
- created_at: TIMESTAMP
```

#### `audit_logs`
```sql
- id: UUID (PK)
- user_id: UUID (FK)
- action: VARCHAR(100)
- entity_type: VARCHAR(50)
- entity_id: UUID
- details: JSONB
- ip_address: VARCHAR(50)
- user_agent: TEXT
- created_at: TIMESTAMP
```

#### `messages` (Internal Staff Communication)
```sql
- id: UUID (PK)
- sender_id: UUID (FK to users)
- sender_type: ENUM('user','system','patient')
- sender_name: VARCHAR(255)
- recipient_id: UUID (FK to users)
- recipient_type: ENUM('user','department','all','patient')
- message_type: ENUM('internal','broadcast','alert','reminder')
- subject: VARCHAR(500)
- content: TEXT
- priority: ENUM('low','normal','high','urgent')
- is_read: BOOLEAN
- read_at: TIMESTAMP
- expires_at: TIMESTAMP
- metadata: JSONB
- created_at: TIMESTAMP
```

### Default Departments
- General Medicine (MED)
- Pediatrics (PED)
- Gynecology (GYN)
- Orthopedics (ORTHO)
- Dental (DEN)
- Ophthalmology (OPH)
- Cardiology (CARD)
- Emergency (EMER)

### Indexes (Performance)
- `idx_queue_status` on queue(status)
- `idx_queue_department` on queue(department_id)
- `idx_queue_created_at` on queue(created_at)
- `idx_patients_number` on patients(patient_number)
- `idx_users_email` on users(email)
- `idx_audit_logs_created_at` on audit_logs(created_at)
- `idx_messages_recipient` on messages(recipient_id, recipient_type)
- `idx_messages_sender` on messages(sender_id, sender_type)
- `idx_messages_is_read` on messages(is_read)

---

## 7. Quick Start Guide

### Prerequisites
- Node.js 18+
- Wrangler CLI v4 (`npm install -g wrangler`)
- Docker (optional - for PostgreSQL full-stack testing)
- Cloudflare account (free)

### Option 1: Wrangler + D1 (Recommended - No Docker Required)

```bash
# Install Wrangler
npm install -g wrangler

# Navigate to API
cd apps/api

# Install dependencies
npm install

# Start local development (D1 SQLite)
wrangler dev --persist

# API available at http://localhost:8787
```

### Option 2: Wrangler + Docker PostgreSQL (Full-Stack Testing)

```bash
# Terminal 1: Start PostgreSQL
cd services
docker-compose up -d database

# Terminal 2: Start Wrangler API
cd apps/api
wrangler dev --persist

# Terminal 3: Start Web (optional)
cd apps/web
npm run dev
```

### Access Points
| Service | URL |
|---------|-----|
| Web App | http://localhost:3000 |
| API | http://localhost:8787 |
| Mobile PWA | http://localhost:3001 |
| Database | localhost:5432 |

**Demo Credentials:**
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@limuruhospital.co.ke | password123 |
| Doctor | doctor@hospital.co.ke | password123 |
| Nurse | nurse@hospital.co.ke | password123 |
| Receptionist | reception@hospital.co.ke | password123 |

### Database Setup

```bash
# Create local D1 database
wrangler d1 create hospital-queue

# Apply migrations
wrangler d1 migrations apply hospital-queue

# For PostgreSQL (optional)
docker-compose -f services/docker-compose.yml up -d database
```

### Building for Production

```bash
# Build web app
cd apps/web
pnpm build

# Start production services
cd services
docker-compose -f docker-compose.production.yml up -d
```

---

## 8. Project Statistics

### Codebase
| Metric | Value |
|--------|-------|
| Total Source Files | 140 |
| TypeScript Files | 110 |
| JavaScript Files | 30 |
| Test Files | 10+ |
| Documentation Files | 220 |

### Project Structure
| Category | Count |
|----------|-------|
| Monorepo Packages | 4 (api, web, mobile, shared) |
| Docker Containers | 4 |
| Database Tables | 11 |
| API Endpoints | 58+ |
| Pages | 23 |
| Components | 14 |
| Dashboard Types | 5 |

### Technology Stack
- **Language:** 100% TypeScript (source)
- **API Runtime:** Cloudflare Workers + Hono.js
- **Database:** D1 SQLite (primary) / PostgreSQL (optional)
- **Frontend:** Next.js 14 + React 18
- **Mobile:** React Native/Expo
- **Local Dev:** Wrangler v4 (primary) / Docker PostgreSQL (optional)
- **Cache:** Cloudflare KV (SESSION_KV, CACHE_KV, RATE_LIMIT_KV)
- **Storage:** Cloudflare R2 (ASSETS_BUCKET, BACKUP_BUCKET)

### Dependencies
| Package | Count |
|---------|-------|
| Root Dependencies | 3 |
| API Dependencies | 9 |
| Web Dependencies | 28 |
| Mobile Dependencies | 16 |
| **Total Dependencies** | 56 |

---

## 9. Additional Resources

### Local Development
- [LOCAL-DEVELOPMENT.md](./docs/DEVELOPER/LOCAL-DEVELOPMENT.md) - Unified dev guide
- [CLOUD-DEVELOPMENT.md](./docs/DEVELOPER/CLOUD-DEVELOPMENT.md) - Wrangler v4 guide
- [D1-DATABASE.md](./docs/DEVELOPER/D1-DATABASE.md) - D1 SQLite database guide
- [DOCKER-DEVELOPMENT.md](./docs/DEVELOPER/DOCKER-DEVELOPMENT.md) - Docker (PostgreSQL)

### Documentation
- [README.md](./README.md) - Main overview
- [SETUP.md](./SETUP.md) - Setup guide
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System architecture
- [API.md](./docs/API.md) - API documentation
- [SYSTEM_GUIDE.md](./docs/SYSTEM_GUIDE.md) - Complete guide

### Deployment
- [Docker Deployment](./docs/DEPLOYMENT/DOCKER.md)
- [Cloudflare Deployment](./docs/DEPLOYMENT/CLOUDFLARE.md)
- [Cloudflare Development](./docs/DEVELOPER/CLOUD-DEVELOPMENT.md)

### Training
- [Staff Training](./docs/TRAINING/)
- [Developer Guide](./docs/DEVELOPER/)
- [Wrangler Quick Card](./docs/TRAINING/QUICKCARD-WRANGLER.md) - Local dev commands
- [Local Dev Quick Card](./docs/TRAINING/QUICKCARD-DOCKER.md) - Docker + Wrangler
- [Voice Calls Guide](./docs/REFERENCE/ADVANCED/11-voice-calls/)

### Advanced Features
- [Voice Calls System](./docs/REFERENCE/ADVANCED/11-voice-calls/) - WebRTC voice communication
- [Real-time Features](./docs/REFERENCE/REAL-TIME/) - WebSocket & Durable Objects
- [Monitoring & Logging](./docs/08-monitoring/) - Sentry & logging
- [Notifications](./docs/08-notifications/) - Twilio SMS/WhatsApp

---

<div align="center">

**Status: Production Ready**  
**Maintained by:** Limuru Cottage Hospital IT Team  
**License:** MIT

</div>