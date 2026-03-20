# 🏥 Limuru Cottage Hospital - Queue Management System

<div align="center">

[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square)](https://www.docker.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=flat-square)](https://www.postgresql.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square)](https://nodejs.org/)
[![Status](https://img.shields.io/badge/Status-v2.0%20Production%20Ready-brightgreen?style=flat-square)](https://limuruhospital.co.ke)

**A complete hospital queue management system with patient privacy, real-time updates, voice calls, and multi-channel notifications**

**Version:** 2.0.0 | **Status:** ✅ Production Ready | **Last Updated:** March 2026

</div>

---

## 🚀 Quick Start (5 Minutes)

### Option 1: Docker (Recommended)

```bash
# 1. Navigate to services
cd Cottage-Queuing-System/services

# 2. Start all services
docker-compose up -d

# 3. Wait for services to be ready (10-30 seconds)

# 4. Access the application
# Web: http://localhost:3000
# API: http://localhost:8787
# Mobile PWA: http://localhost:3001
```

### Option 2: Docker + Hot Reload (Development)

```bash
# Terminal 1: Start database
cd services
docker-compose up -d database

# Terminal 2: Run API locally
cd apps/api
npm install
npm run dev

# Terminal 3: Run web locally
cd apps/web
npm install
npm run dev
```

**Demo Login:** `admin@limuruhospital.co.ke` / `password123`

---

## 📚 Documentation

### ⭐ Start Here
| Document | Description |
|----------|-------------|
| **[LOCAL-DEVELOPMENT.md](./docs/DEVELOPER/LOCAL-DEVELOPMENT.md)** | Docker local dev guide |
| **[SETUP.md](./SETUP.md)** | Setup guide |
| **[QUICKCARD-DOCKER.md](./docs/TRAINING/QUICKCARD-DOCKER.md)** | Docker commands |

### Technical Docs
| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System architecture |
| [API.md](./docs/API.md) | API documentation |
| [SECURITY.md](./docs/SECURITY.md) | Security & authentication |

### Deployment
| Document | Description |
|----------|-------------|
| [DEPLOYMENT/DOCKER.md](./docs/DEPLOYMENT/DOCKER.md) | Docker deployment |
| [DEPLOYMENT/CHECKLIST.md](./docs/DEPLOYMENT/CHECKLIST.md) | Deployment checklist |

---

## ✨ What's New in v2.0

### New Features
- 🎙️ **Voice Calls** - Real-time voice communication between staff (WebRTC)
- ⚡ **Modern Stack** - Node.js 20, PostgreSQL 15, Express.js 4
- 🚀 **Docker Optimized** - Best practices containerization

### Architecture
| Component | Technology |
|-----------|------------|
| API | Express.js (Node.js 20) |
| Database | PostgreSQL 15 |
| Web | Static HTML + nginx |
| Mobile | PWA (Progressive Web App) |
| Container | Docker + Docker Compose |

---

## 📱 Pages

| URL | Page | Description |
|-----|------|-------------|
| `/` | Home | Landing page |
| `/login/` | Login | Unified login |
| `/kiosk/` | Kiosk | Ticket issuance |
| `/display/` | TV Display | Waiting room TV |
| `/dashboard/doctor/` | Doctor | Queue management + Voice calls |
| `/dashboard/nurse/` | Nurse | Triage, vitals + Voice calls |
| `/dashboard/receptionist/` | Receptionist | Patient registration |
| `/dashboard/admin/` | Admin | System management |

---

## 🔌 API Endpoints

**Base URL:** `http://localhost:8787/api`

| Category | Endpoints |
|----------|-----------|
| Auth | `/auth/staff/login`, `/auth/patient/login` |
| Queue | `/queue`, `/queue/:dept/*` |
| Patients | `/patients`, `/patients/:id/*` |
| Appointments | `/appointments`, `/appointments/:id/*` |
| **Voice Calls** | `/voice/call`, `/voice/call/:id/*`, `/voice/calls/*` |
| Messages | `/messages`, `/messages/staff`, `/messages/unread/count` |
| Analytics | `/analytics/overview`, `/analytics/wait-times` |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose Stack                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Node.js   │  │ PostgreSQL  │  │       nginx        │  │
│  │  (API)     │  │  (Data)     │  │  (Static Files)    │  │
│  │  Express   │  │    v15      │  │                    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
              ┌─────────────┼─────────────┐
              │             │             │
        ┌─────┴─────┐ ┌────┴────┐ ┌──────┴──────┐
        │   Web     │ │  Mobile  │ │  TV Display │
        │ (nginx)   │ │   (PWA)  │ │   (nginx)   │
        └───────────┘ └──────────┘ └─────────────┘
```

---

## ✅ Features

### Core Features
- ✅ **Digital Queue Management** - Automated ticket generation and patient calling
- ✅ **Priority Queue** - Emergency, pregnant, elderly, and disability priority handling
- ✅ **Appointment Scheduling** - Book appointments ahead of walk-ins
- ✅ **Patient Privacy** - Uses patient numbers instead of names
- ✅ **Real-time Updates** - Live synchronization across all dashboards
- ✅ **Internal Messaging** - Staff-to-staff communication
- ✅ **Voice Calls** - Real-time voice communication between staff (WebRTC)
- ✅ **Multi-channel Notifications** - SMS and WhatsApp via Twilio

### Staff Dashboards (5)
| Dashboard | Purpose | Key Features |
|-----------|---------|--------------|
| **Admin** | System management | Analytics, user/department management |
| **Doctor** | Patient consultations | Queue, SOAP notes, appointments, voice calls |
| **Nurse** | Patient care | Triage, vitals, lab results, voice calls |
| **Receptionist** | Patient services | Registration, tickets, messaging |
| **Patient** | Self-service | Queue status, feedback, appointments |

---

## 📦 Tech Stack

| Layer | Technology |
|-------|------------|
| API Runtime | Express.js (Node.js 20) |
| Database | PostgreSQL 15 |
| Web Server | nginx (Alpine) |
| Container | Docker + Docker Compose |
| Frontend | Static HTML + CSS/JS |
| Mobile | PWA (Progressive Web App) |
| Real-time | WebSocket + WebRTC |

---

## 🔐 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@limuruhospital.co.ke | password123 |
| Doctor | doctor@hospital.co.ke | password123 |
| Nurse | nurse@hospital.co.ke | password123 |
| Receptionist | reception@hospital.co.ke | password123 |

---

## 📁 Project Structure

```
Cottage-Queuing-System/
├── apps/
│   ├── api/                    # Express.js REST API
│   │   ├── src/
│   │   │   ├── routes/        # 18 API routes
│   │   │   ├── services/      # Business logic
│   │   │   └── db/           # Migrations
│   │   └── server.js         # Express entry point
│   ├── web/                   # Static HTML frontend
│   │   └── public/           # HTML, CSS, JS
│   └── mobile/               # Mobile PWA
├── services/
│   ├── docker-compose.yml    # Docker configuration
│   ├── database/
│   │   ├── init.sql         # PostgreSQL schema
│   │   └── migrations/       # SQL migrations
│   └── nginx.conf           # Web server config
├── docs/                    # 200+ documentation files
└── scripts/                 # Utility scripts
```

---

## 🚀 Deployment

### Docker (Recommended)

```bash
# 1. Clone repository
git clone <repo-url>
cd Cottage-Queuing-System

# 2. Start services
cd services
docker-compose up -d

# 3. Run migrations
docker-compose exec api npm run db:migrate

# 4. Build web (production)
cd apps/web
npm install
npm run build

# 5. Access
# http://your-server:3000
```

### Production VPS

```bash
# 1. Install Docker
curl -fsSL https://get.docker.com | sh

# 2. Clone and configure
git clone <repo-url>
cd Cottage-Queuing-System/services

# 3. Configure environment
cp .env.example .env
# Edit .env with production values

# 4. Start with restart policy
docker-compose -f docker-compose.prod.yml up -d

# 5. Setup reverse proxy (nginx/Caddy)
```

---

## 🌐 Website

**https://www.limuruhospital.co.ke/**

---

## 📄 License

MIT License

---

**Maintained by:** Limuru Cottage Hospital IT Team  
**Version:** 2.0.0 | **Date:** March 2026
