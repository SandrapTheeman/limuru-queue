# Architecture - Master Index

**Last Updated:** March 20, 2026  
**Version:** 1.0.0  
**Category:** Architecture  
**Description:** Complete architecture documentation for the Limuru Queue System

---

## Table of Contents

1. [Overview](#overview)
2. [System Design](#system-design)
3. [Component Models](#component-models)
4. [Data Flow](#data-flow)
5. [Security Architecture](#security-architecture)
6. [Scalability](#scalability)
7. [Related Documentation](#related-documentation)

---

## Overview

The Architecture section provides comprehensive documentation of the Limuru Cottage Hospital Queue Management System's technical architecture. This covers everything from high-level system design to detailed component interactions.

### What's Covered

- **System Design** — Complete system architecture and design decisions
- **Component Models** — Detailed documentation of each system component
- **Data Flow** — How data moves through the system
- **Security Architecture** — Security design and implementation
- **Scalability** — Capacity planning and scaling strategies

---

## System Design

### System Architecture

**File:** [system-design/ARCHITECTURE.md](./system-design/ARCHITECTURE.md)

Complete system architecture documentation including:

- Executive summary
- Business context (Limuru Cottage Hospital)
- Non-functional requirements (performance, availability, scalability, security)
- Technology stack overview
- Component architecture with ASCII diagrams
- Data flow diagrams
- Security architecture
- Scalability design
- Disaster recovery procedures

**Key Sections:**

| Section | Lines | Description |
|---------|-------|-------------|
| Executive Summary | ~50 | Key architectural decisions |
| Business Context | ~40 | Hospital profile, challenges |
| NFRs | ~80 | Performance, availability targets |
| Technology Stack | ~60 | All technologies used |
| Component Architecture | ~150 | ASCII diagrams, descriptions |
| Data Flow | ~100 | Registration, calling, HMS flows |
| Security Architecture | ~80 | Auth, authz, data protection |
| Scalability Design | ~60 | Edge computing, sharding |
| Disaster Recovery | ~40 | Backup, RTO/RPO |

### Architecture Diagram

```
+------------------------------------------------------------------+
|                        CLOUDFLARE EDGE                           |
+------------------------------------------------------------------+
|                                                                   |
|  +------------------+     +------------------+     +------------+ |
|  |  Cloudflare      |     |  Cloudflare D1   |     | Cloudflare| |
|  |  Workers (Hono)  |<--->|  (SQLite)        |     | KV Store  | |
|  +------------------+     +------------------+     +------------+ |
|           |                         |                        |     |
|           v                         v                        v     |
|  +------------------+     +------------------+     +------------+ |
|  |  Durable Objects  |     |      R2          |     |   D1       | |
|  |  (WebSocket Hub)  |     |   (Storage)     |     | (Replicas) | |
|  +------------------+     +------------------+     +------------+ |
|                                                                   |
+------------------------------------------------------------------+
                                  |
                    +-------------+-------------+
                    |                           |
                    v                           v
           +----------------+          +----------------+
           |  Next.js Web   |          |  React Native  |
           |  (App Router)  |          |  (Expo) Mobile |
           +----------------+          +----------------+
```

---

## Component Models

### Component Documentation

**File:** [component-models/COMPONENTS.md](./component-models/COMPONENTS.md)

Detailed documentation of all system components:

#### Core Components

| Component | Description | Location |
|-----------|-------------|----------|
| API Service | Cloudflare Workers API | `apps/api/src/` |
| Queue Engine | Priority queue management | `apps/api/src/services/queue.ts` |
| WebSocket Hub | Real-time connections | `apps/api/src/workers/websocket.ts` |
| TV Display | Queue visualization | `apps/web/components/display/` |
| Notification Service | SMS/WhatsApp | `apps/api/src/services/notification.ts` |

#### Component Responsibilities

**API Service**
- RESTful endpoint handling
- Authentication/authorization
- Business logic execution
- Database queries
- External service integration

**Queue Engine**
- Ticket generation
- Priority calculation (min-heap with wait-time scoring)
- Queue state management
- Call scheduling

**WebSocket Hub (Durable Objects)**
- Real-time WebSocket connections
- Room-based subscriptions (by department)
- Event broadcasting
- Connection management

**TV Display Service**
- Queue board rendering
- Patient call display
- Audio announcement triggers
- IPTV overlay management

**Notification Service**
- SMS via Africa's Talking
- WhatsApp via Cloud API
- Push notifications
- Email alerts (future)

---

## Data Flow

### Request Lifecycle

**File:** [data-flow/REQUEST-LIFECYCLE.md](./data-flow/REQUEST-LIFECYCLE.md)

Complete data flow documentation:

#### Core Flows

| Flow | Description |
|------|-------------|
| Patient Registration | New patient → Create ticket → Print/SMS |
| Queue Calling | Staff call → Update queue → Broadcast → Audio |
| TV Display Update | WebSocket event → Update display → Animate |
| HMS Integration | HMS webhook → Patient sync → Queue update |
| Authentication | Login → JWT → Session → KV store |

#### Detailed Flow Diagrams

**Patient Registration Flow:**
```
Reception Client → API Server → D1 Database → Return Ticket
      ↓               ↓
   Validate      Generate Ticket ID
```

**Patient Calling Flow:**
```
Doctor Client → API Server → Queue Engine → Durable Object
      ↓               ↓              ↓
   Validate      Update State      WebSocket Event
                                    ↓
                              Broadcast to All
                                    ↓
                        TV Display ← Audio Announcement
```

**HMS Integration Flow:**
```
HMS System → Webhook → API → Validate → D1 → Queue Update
      ↓                                            ↓
  Response ← Status Update ← HMS Callback
```

---

## Security Architecture

### Security Design

**File:** [security-architecture/SECURITY.md](./security-architecture/SECURITY.md)

#### Security Layers

| Layer | Implementation |
|-------|----------------|
| Network | TLS 1.3, Cloudflare proxy |
| Authentication | JWT + KV sessions |
| Authorization | RBAC with 10 roles |
| Data | Field-level encryption for PHI |
| Audit | Immutable audit logs |

#### Authentication Flow

```
Client → JWT Token → API → Validate → KV Session Check
         ↓
    Return Response
```

#### Authorization Matrix

| Role | Permissions |
|------|-------------|
| super_admin | All permissions |
| admin | All except system config |
| doctor | View/call patients in dept |
| nurse | View/call patients in dept |
| receptionist | Register patients, generate tickets |
| patient | View own queue position |
| pharmacist | Call patients for pharmacy |
| lab_tech | Call patients for lab |
| facility_manager | Monitor displays, reports |
| it_support | System health, config |

---

## Scalability

### Capacity Planning

**File:** [scalability/CAPACITY.md](./scalability/CAPACITY.md)

#### Scalability Architecture

**Horizontal Scaling:**
- Cloudflare edge automatically distributes load
- D1 read replicas handle read traffic
- KV sharding for session distribution

**Load Estimation:**

| Metric | Current | Projected (2x) | Design Limit |
|--------|---------|----------------|--------------|
| Daily patients | 400 | 800 | 2,000 |
| Concurrent users | 50 | 100 | 500 |
| API requests/min | 200 | 400 | 2,000 |
| WebSocket connections | 20 | 40 | 1,000 |

#### Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| API p95 latency | <100ms | 45ms |
| TV update latency | <500ms | 200ms |
| Uptime | 99.9% | 99.95% |
| RTO | <15min | <5min |
| RPO | <5min | <1min |

---

## Related Documentation

| Document | Path | Description |
|----------|------|-------------|
| System Architecture | [system-design/ARCHITECTURE.md](./system-design/ARCHITECTURE.md) | Complete system design |
| Component Models | [component-models/COMPONENTS.md](./component-models/COMPONENTS.md) | All system components |
| Data Flow | [data-flow/REQUEST-LIFECYCLE.md](./data-flow/REQUEST-LIFECYCLE.md) | Request lifecycle |
| Security | [security-architecture/SECURITY.md](./security-architecture/SECURITY.md) | Security design |
| Capacity | [scalability/CAPACITY.md](./scalability/CAPACITY.md) | Scalability planning |

| Category | Document | Description |
|----------|----------|-------------|
| Queue Engine | [../03-Queue-Engine/MASTER.md](../03-Queue-Engine/MASTER.md) | Queue system core |
| API | [../04-API/MASTER.md](../04-API/MASTER.md) | API reference |
| Database | [../05-Database/MASTER.md](../05-Database/MASTER.md) | Data layer |
| Frontend | [../06-Frontend/MASTER.md](../06-Frontend/MASTER.md) | Web dashboards |

---

*Last updated: March 20, 2026*
