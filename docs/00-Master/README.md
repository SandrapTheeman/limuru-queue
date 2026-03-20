# Limuru Cottage Hospital Queue Management System - Documentation Master Index

**Last Updated:** March 20, 2026  
**Version:** 1.0.0  
**Maintainer:** Limuru Cottage Hospital IT Team

---

## Table of Contents

1. [Quick Navigation](#quick-navigation)
2. [System Overview](#system-overview)
3. [Architecture Summary](#architecture-summary)
4. [User Dashboards](#user-dashboards)
5. [Queue System](#queue-system)
6. [Deployment](#deployment)
7. [Contributing & Style Guide](#contributing--style-guide)

---

## Quick Navigation

### Getting Started
- [5-Minute Quick Start](./01-Foundations/quick-start/5-MINUTE-START.md) — Be up and running in 5 minutes
- [Prerequisites](./01-Foundations/prerequisites/SOFTWARE-REQUIREMENTS.md) — Required software and tools
- [Local Setup Guide](./01-Foundations/installation/LOCAL-SETUP.md) — Complete installation instructions
- [Project Structure](./01-Foundations/project-structure/PROJECT-TREE.md) — Directory layout reference

### Architecture
- [System Architecture](./02-Architecture/system-design/ARCHITECTURE.md) — Complete system design
- [Component Models](./02-Architecture/component-models/COMPONENTS.md) — All system components
- [Data Flow](./02-Architecture/data-flow/REQUEST-LIFECYCLE.md) — Request lifecycle diagrams
- [Security Architecture](./02-Architecture/security-architecture/SECURITY.md) — Security design

### API Reference
- [API Master Index](./04-API/MASTER.md) — Complete API documentation
- [Authentication Guide](./04-API/MASTER.md#authentication) — JWT and session management
- [Endpoint Reference](./04-API/MASTER.md#endpoints) — All REST endpoints
- [OpenAPI Specification](./04-API/openapi.yaml) — Machine-readable API spec

### User Dashboards
- [Frontend Master Index](./06-Frontend/MASTER.md) — Dashboard documentation
- [Dashboard Components](./06-Frontend/MASTER.md#dashboards) — All role dashboards
- [TV Display System](./03-Queue-Engine/tv-display/TV-DISPLAY.md) — TV queue display

### Queue System
- [Queue Engine Master](./03-Queue-Engine/MASTER.md) — Core queue engine documentation
- [Ticket Generation](./03-Queue-Engine/ticket-system/TICKET-GENERATION.md) — Ticket format and lifecycle
- [Priority Algorithm](./03-Queue-Engine/priority-queue/PRIORITY-ALGORITHM.md) — Queue prioritization
- [Call System](./03-Queue-Engine/call-system/CALL-SYSTEM.md) — Patient calling mechanism
- [TV Display](./03-Queue-Engine/tv-display/TV-DISPLAY.md) — Display system
- [IPTV Integration](./03-Queue-Engine/tv-display/IPTV.md) — Television integration
- [Audio Announcements](./03-Queue-Engine/announcements/AUDIO.md) — TTS announcements

### Database
- [Database Master Index](./05-Database/MASTER.md) — Complete database documentation
- [Schema Reference](./05-Database/MASTER.md#schema) — All tables and relationships
- [Migrations](./05-Database/MASTER.md#migrations) — Migration system
- [Seed Data](./05-Database/MASTER.md#seed-data) — Initial data setup

### Security
- [Security Master Index](./07-Security/MASTER.md) — Complete security documentation
- [Authentication](./07-Security/MASTER.md#authentication) — Auth system
- [Authorization/RBAC](./07-Security/MASTER.md#authorization) — Role-based access
- [HIPAA Compliance](./07-Security/MASTER.md#hipaa) — Compliance documentation

### Testing
- [Testing Master Index](./08-Testing/MASTER.md) — Complete testing documentation
- [Unit Tests](./08-Testing/MASTER.md#unit-tests) — Unit testing guide
- [Integration Tests](./08-Testing/MASTER.md#integration-tests) — Integration testing
- [E2E Tests](./08-Testing/MASTER.md#e2e-tests) — End-to-end testing

### Deployment
- [Deployment Master Index](./09-Deployment/MASTER.md) — Complete deployment guide
- [Local Docker](./09-Deployment/MASTER.md#local-docker) — Local development
- [Cloudflare Production](./09-Deployment/MASTER.md#cloudflare) — Production deployment
- [CI/CD Pipeline](./09-Deployment/MASTER.md#cicd) — GitHub Actions setup

### Monitoring & Performance
- [Monitoring Master](./10-Monitoring/MASTER.md) — Observability setup
- [Performance Master](./11-Performance/MASTER.md) — Optimization guide

### Troubleshooting
- [Troubleshooting Master](./13-Troubleshooting/MASTER.md) — Error reference
- [Runbooks](./13-Troubleshooting/MASTER.md#runbooks) — Operational runbooks
- [Debugging Guide](./13-Troubleshooting/MASTER.md#debugging) — Debug procedures

### Reference
- [Reference Master](./14-Reference/MASTER.md) — Quick reference guides
- [CLI Commands](./14-Reference/MASTER.md#cli) — Command reference
- [Glossary](./14-Reference/MASTER.md#glossary) — Terms and definitions
- [Changelog](./14-Reference/MASTER.md#changelog) — Version history

---

## System Overview

### What is the Limuru Queue Management System?

The Limuru Cottage Hospital Queue Management System is a comprehensive, real-time queue management solution designed specifically for healthcare facilities in Kenya. The system provides:

- **Real-time Queue Management** — Digital ticket generation, priority-based queuing, and instant patient calling
- **TV Display Integration** — Large-format displays showing queue status, called patients, and announcements
- **Audio Announcements** — Text-to-speech announcements in English and Swahili
- **Multi-channel Notifications** — SMS and WhatsApp notifications for queue updates
- **Offline Capability** — Full functionality during network outages
- **HMS Integration** — Seamless integration with Hospital Management Systems

### Architecture Diagram

```
+------------------------------------------------------------------+
|                        CLOUDFLARE EDGE                           |
+------------------------------------------------------------------+
|                                                                   |
|  +------------------+     +------------------+     +------------+ |
|  |  Cloudflare      |     |  Cloudflare D1   |     | Cloudflare| |
|  |  Workers (Hono)  |<--->|  (SQLite)        |     | KV Store  | |
|  |  API             |     |  - Queue Data    |     | - Sessions| |
|  |                  |     |  - User Data     |     | - Cache    | |
|  +------------------+     +------------------+     +------------+ |
|           |                         |                        |     |
|           |                         v                        v     |
|           |                +------------------+     +------------+ |
|           |                |  Durable Objects |     | R2 Storage | |
|           |                |  - WebSocket Hub  |     | - Assets   | |
|           |                |  - Real-time Comm |     | - Exports  | |
|           |                +------------------+     +------------+ |
|           |                                                          |
+----------------------------------------------------------------------+
                                  |
                    +-------------+-------------+
                    |                           |
                    v                           v
           +----------------+          +----------------+
           |  Next.js Web   |          |  React Native  |
           |  (App Router)  |          |  (Expo) Mobile |
           |  - Dashboards  |          |  - Patient App |
           |  - TV Display  |          |  - Staff App   |
           |  - Kiosk Mode  |          |                |
           +----------------+          +----------------+
                    |                           |
                    +-------------+-------------+
                                  |
                                  v
                    +---------------------------+
                    |      External Services     |
                    +---------------------------+
                    |  - WhatsApp Cloud API     |
                    |  - Africa's Talking SMS   |
                    |  - HMS Integration        |
                    |  - IPTV Systems           |
                    +---------------------------+

```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **API** | Cloudflare Workers (Hono.js) | Serverless API endpoints |
| **Database** | Cloudflare D1 (SQLite) | Primary data storage |
| **Cache/Sessions** | Cloudflare KV | Session management, caching |
| **Storage** | Cloudflare R2 | File storage, exports |
| **Real-time** | Durable Objects | WebSocket connections |
| **Web Frontend** | Next.js 14 (App Router) | Web dashboards, TV display |
| **Mobile** | React Native (Expo) | iOS/Android applications |
| **Notifications** | WhatsApp Cloud API | Messaging |
| **SMS** | Africa's Talking | SMS notifications |
| **TTS** | Web Speech API | Audio announcements |

### User Roles Summary

| Role | Code | Dashboard | Key Capabilities |
|------|------|-----------|------------------|
| Super Admin | `super_admin` | Full system control | All features, user management, system config |
| Admin | `admin` | Hospital administration | Staff management, reports, settings |
| Doctor | `doctor` | Clinical dashboard | View queue, call patients, update status |
| Nurse | `nurse` | Nursing station | View queue, assist with calling |
| Receptionist | `receptionist` | Registration desk | Register patients, generate tickets |
| Patient | `patient` | Patient portal | View queue position, receive updates |
| Pharmacist | `pharmacist` | Pharmacy counter | Call patients for dispensing |
| Lab Tech | `lab_tech` | Laboratory | Call patients for tests |
| Facility Manager | `facility_manager` | Operations | Monitor displays, manage resources |
| IT Support | `it_support` | Technical dashboard | System health, troubleshooting |

### Feature Highlights

#### TV Display System
- Single-department or multi-department split view
- IPTV overlay (Picture-in-Picture) or split-screen mode
- High-contrast design (WCAG AAA compliant)
- Real-time WebSocket updates
- Offline mode with cached queue snapshot
- Emergency broadcast override

#### WhatsApp Integration
- Patient self-service via WhatsApp chatbot
- Queue status queries
- Appointment reminders
- Wait time estimates
- Callback requests

#### Offline Capability
- Service Worker caching
- Local queue state preservation
- Automatic sync on reconnection
- Conflict resolution strategy

#### HMS Integration
- Bidirectional patient data sync
- Visit creation and completion
- Billing integration
- Lab result notification

---

## Architecture Summary

### Component Architecture

```
limuru-queue/
├── apps/
│   ├── api/                    # Cloudflare Workers API
│   │   ├── src/
│   │   │   ├── routes/        # API route handlers
│   │   │   ├── middleware/    # Auth, validation, logging
│   │   │   ├── services/      # Business logic
│   │   │   ├── db/            # D1 client, migrations
│   │   │   └── workers/       # Durable Object workers
│   │   ├── wrangler.toml      # Cloudflare configuration
│   │   └── package.json
│   │
│   ├── web/                    # Next.js Web Application
│   │   ├── app/               # App Router pages
│   │   ├── components/        # React components
│   │   ├── lib/               # Utilities, API clients
│   │   └── public/            # Static assets
│   │
│   └── mobile/                # React Native Expo App
│       ├── app/               # Expo Router pages
│       ├── components/        # Mobile components
│       └── services/          # Native integrations
│
├── packages/
│   └── shared/                # Shared types and schemas
│       ├── types/             # TypeScript interfaces
│       ├── schemas/           # Zod validation schemas
│       └── utils/             # Shared utilities
│
├── services/
│   └── docker/                # Docker Compose for local dev
│
└── docs/                      # This documentation
```

### Data Flow

```
1. PATIENT REGISTRATION FLOW
   Patient -> Registration Form -> API -> D1 -> Queue Created -> Ticket Printed

2. QUEUE CALLING FLOW
   Staff -> Call Patient -> API -> Queue Updated -> WebSocket Broadcast
                                   |                      |
                                   v                      v
                            D1 Updated              TV Display Updates
                                   |                      |
                                   v                      v
                            SMS/WhatsApp              Audio Announcement

3. HMS INTEGRATION FLOW
   HMS -> Webhook -> API -> Patient Sync -> Queue Status -> HMS Callback
```

### Security Model

1. **Authentication Layer**
   - JWT tokens with 1-hour expiry
   - Session tokens stored in KV
   - Refresh token rotation

2. **Authorization Layer**
   - Role-based access control (RBAC)
   - Department-scoped permissions
   - Action-level permissions

3. **Data Protection**
   - Field-level encryption for PHI
   - TLS 1.3 for all connections
   - D1 data at rest encryption

4. **Audit Trail**
   - All actions logged with timestamp
   - User ID, IP, action captured
   - Immutable audit log

### Scalability

- **Horizontal Scaling**: Automatic via Cloudflare edge
- **D1 Read Replicas**: Automatic read scaling
- **KV Sharding**: Session distribution
- **WebSocket Hub**: Durable Object per ward/department
- **Edge Caching**: Static assets, API responses

---

## User Dashboards

### 01. Super Admin Dashboard
**Path:** `/dashboard/super-admin`  
**Access:** super_admin role only

Full system overview including:
- All hospitals/facilities (multi-tenant)
- System-wide analytics
- User management
- Role configuration
- System settings
- Audit logs

### 02. Admin Dashboard
**Path:** `/dashboard/admin`  
**Access:** admin role

Hospital-level administration:
- Staff management
- Department configuration
- Service point setup
- Report generation
- System health monitoring

### 03. Doctor Dashboard
**Path:** `/dashboard/doctor`  
**Access:** doctor role

Clinical workflow management:
- Patient queue view
- Call/recall/transfer patients
- Visit completion
- Patient history
- Notes and prescriptions

### 04. Nurse Dashboard
**Path:** `/dashboard/nurse`  
**Access:** nurse role

Nursing station workflow:
- Ward queue view
- Patient vitals entry
- Call assistance
- Task list

### 05. Receptionist Dashboard
**Path:** `/dashboard/receptionist`  
**Access:** receptionist role

Patient registration:
- New patient registration
- Patient search
- Ticket generation
- Payment processing
- Queue assignment

### 06. Patient Portal
**Path:** `/dashboard/patient`  
**Access:** patient role

Patient self-service:
- Queue position view
- Wait time estimation
- Appointment booking
- Notification preferences
- Visit history

### 07. Pharmacist Dashboard
**Path:** `/dashboard/pharmacist`  
**Access:** pharmacist role

Pharmacy workflow:
- Prescription queue
- Dispensing workflow
- Drug availability
- Stock alerts

### 08. Lab Tech Dashboard
**Path:** `/dashboard/lab`  
**Access:** lab_tech role

Laboratory workflow:
- Test queue
- Sample management
- Result entry
- Report generation

### 09. Facility Manager Dashboard
**Path:** `/dashboard/facility`  
**Access:** facility_manager role

Operations management:
- TV display control
- Queue statistics
- Staff scheduling
- Resource allocation

### 10. IT Support Dashboard
**Path:** `/dashboard/it-support`  
**Access:** it_support role

Technical operations:
- System health
- Error logs
- Performance metrics
- Backup status
- Configuration management

---

## Queue System

### Ticket Format

```
{DEPT}/{ROOM}/{SEQ}
```

**Example:** `MED/R201/001`

| Component | Description | Values |
|-----------|-------------|--------|
| DEPT | Department code | MED, PED, EMR, GYN, ORT, DEN, CAR, PHY, SUR, URG, LAB, RAD, PHM, etc. |
| ROOM | Room number (assigned on call) | R101-R999, varies by department |
| SEQ | Daily sequence number | 001-999, resets at midnight |

### Department Codes

| Code | Department | Full Name |
|------|------------|-----------|
| MED | Medical | General Medicine |
| PED | Pediatric | Pediatrics |
| EMR | Emergency | Emergency Room |
| GYN | Gynecology | Obstetrics & Gynecology |
| ORT | Orthopedic | Orthopedics |
| DEN | Dental | Dental |
| CAR | Cardiology | Cardiology |
| PHY | Physiotherapy | Physiotherapy |
| SUR | Surgical | General Surgery |
| URG | Urgent | Urgent Care |
| LAB | Laboratory | Laboratory Services |
| RAD | Radiology | Radiology/Imaging |
| PHM | Pharmacy | Pharmacy |
| OPH | Ophthalmology | Ophthalmology |
| PSY | Psychiatry | Psychiatry |
| ENT | ENT | Ear, Nose, Throat |

### Priority Algorithm

```
score = priority_weight * base_priority + wait_time_boost

where:
- base_priority = 1 (Emergency), 2 (Urgent), 3 (Normal), 4 (Low)
- priority_weight = 100
- wait_time_boost = floor(waiting_minutes / 10)
```

**Example:**
- Emergency patient waiting 5 minutes: `100 * 1 + 0 = 100`
- Normal patient waiting 45 minutes: `100 * 3 + 4 = 304`
- (Normal patient gains priority after 30+ minutes)

### TV Display Modes

1. **Single Department** — One department's queue on full screen
2. **Multi-Department Split** — 2-4 departments in split view
3. **Auto-Switch** — Rotates departments every 30 seconds
4. **IPTV PiP** — Queue overlay on television content
5. **IPTV Split** — Queue alongside TV content (70/30, 60/40)

### Audio Announcements

**Format:** "{Title} {FirstName} {LastInitial}, please proceed to room {RoomNumber}"

**Example:** "Patient John M, please proceed to room 201"

**Languages:** English (default), Swahili

---

## Deployment

### Local Development (Docker)

```bash
# Clone the repository
git clone https://github.com/limuru-hospital/queue-system.git
cd queue-system

# Start all services
docker compose up -d

# Access the application
open http://localhost:3000
```

### Cloudflare Production

```bash
# Deploy API
wrangler deploy

# Deploy Web
wrangler pages deploy

# Set environment variables
wrangler secret put DATABASE_URL
wrangler secret put JWT_SECRET
```

### CI/CD Pipeline

- **GitHub Actions** for automated testing
- **Cloudflare Pages** for preview deployments
- **Wrangler** for production deployments

---

## Contributing & Style Guide

### How to Contribute Documentation

1. **Fork the repository**
2. **Create a feature branch**: `docs/improve-queue-section`
3. **Make your changes** following the style guide below
4. **Submit a pull request** with clear description

### Markdown Conventions

- Use ATX-style headers (`#`, `##`, `###`)
- Use fenced code blocks with language identifier
- Use tables for structured data
- Use bullet lists for sequential steps
- Use bold for emphasis

### Code Snippet Standards

```javascript
// Good: Includes language, filename, and explanation
// file: src/services/queue.ts
const queue = await QueueService.callNext(patientId);
```

### Diagram Standards

- Use ASCII diagrams only (no images)
- Use monospace font for alignment
- Keep diagrams under 80 characters wide
- Include key in separate section

### Document Template

```markdown
# Document Title

**Last Updated:** YYYY-MM-DD  
**Author:** Name  
**Version:** X.Y.Z

## Table of Contents

1. [Section](#section)

## Section

Content here.

## Related Documents

- [Link to Related](./path/to/doc.md)
```

---

## Related Documentation

| Category | Document | Path |
|----------|----------|------|
| Foundations | Quick Start | [01-Foundations/quick-start/5-MINUTE-START.md](./01-Foundations/quick-start/5-MINUTE-START.md) |
| Foundations | Prerequisites | [01-Foundations/prerequisites/SOFTWARE-REQUIREMENTS.md](./01-Foundations/prerequisites/SOFTWARE-REQUIREMENTS.md) |
| Foundations | Local Setup | [01-Foundations/installation/LOCAL-SETUP.md](./01-Foundations/installation/LOCAL-SETUP.md) |
| Architecture | System Architecture | [02-Architecture/system-design/ARCHITECTURE.md](./02-Architecture/system-design/ARCHITECTURE.md) |
| Architecture | Components | [02-Architecture/component-models/COMPONENTS.md](./02-Architecture/component-models/COMPONENTS.md) |
| Queue Engine | Ticket System | [03-Queue-Engine/ticket-system/TICKET-GENERATION.md](./03-Queue-Engine/ticket-system/TICKET-GENERATION.md) |
| Queue Engine | Priority Algorithm | [03-Queue-Engine/priority-queue/PRIORITY-ALGORITHM.md](./03-Queue-Engine/priority-queue/PRIORITY-ALGORITHM.md) |
| Queue Engine | TV Display | [03-Queue-Engine/tv-display/TV-DISPLAY.md](./03-Queue-Engine/tv-display/TV-DISPLAY.md) |
| API | API Reference | [04-API/MASTER.md](./04-API/MASTER.md) |
| Database | Schema | [05-Database/MASTER.md](./05-Database/MASTER.md) |
| Frontend | Dashboards | [06-Frontend/MASTER.md](./06-Frontend/MASTER.md) |
| Security | Security | [07-Security/MASTER.md](./07-Security/MASTER.md) |
| Testing | Testing | [08-Testing/MASTER.md](./08-Testing/MASTER.md) |
| Deployment | Deployment | [09-Deployment/MASTER.md](./09-Deployment/MASTER.md) |
| Monitoring | Monitoring | [10-Monitoring/MASTER.md](./10-Monitoring/MASTER.md) |
| Performance | Performance | [11-Performance/MASTER.md](./11-Performance/MASTER.md) |
| Troubleshooting | Troubleshooting | [13-Troubleshooting/MASTER.md](./13-Troubleshooting/MASTER.md) |
| Reference | Reference | [14-Reference/MASTER.md](./14-Reference/MASTER.md) |

---

*This document is part of the Limuru Cottage Hospital Queue Management System documentation.*
*For questions or updates, contact the IT Team.*
