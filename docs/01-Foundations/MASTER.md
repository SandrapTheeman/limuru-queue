# Foundations - Getting Started

**Last Updated:** March 20, 2026  
**Version:** 1.0.0  
**Category:** Foundations  
**Description:** Project foundations including quick start, prerequisites, installation, and project structure

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start Guide](#quick-start-guide)
3. [Prerequisites](#prerequisites)
4. [Local Setup](#local-setup)
5. [Project Structure](#project-structure)
6. [Environment Variables](#environment-variables)
7. [Next Steps](#next-steps)

---

## Overview

The Foundations section provides everything you need to get started with the Limuru Cottage Hospital Queue Management System. Whether you're a developer setting up a local environment, an administrator configuring the system, or an IT professional preparing for deployment, this section will guide you through the initial setup process.

### What You'll Learn

- How to get the system running in 5 minutes
- Required software and tools
- Complete local installation process
- Understanding the project structure
- Configuring environment variables

---

## Quick Start Guide

### 5-Minute Start

Get the Limuru Queue System running in under 5 minutes using Docker.

**File:** [quick-start/5-MINUTE-START.md](./quick-start/5-MINUTE-START.md)

**Prerequisites:** Docker Desktop installed

**Steps:**

```bash
# 1. Clone the repository
git clone https://github.com/limuru-hospital/queue-system.git
cd queue-system

# 2. Start all services with Docker Compose
docker compose up -d

# 3. Wait for services to initialize (30 seconds)

# 4. Open the application
open http://localhost:3000

# 5. Login with default credentials
# Username: admin@limuru.cottage
# Password: admin123
```

**What you'll see:**
- Web dashboard at `http://localhost:3000`
- API at `http://localhost:8787`
- D1 database initialized with seed data

---

## Prerequisites

### Software Requirements

**File:** [prerequisites/SOFTWARE-REQUIREMENTS.md](./prerequisites/SOFTWARE-REQUIREMENTS.md)

### Required Software

| Software | Version | Purpose | Install |
|----------|---------|--------|---------|
| Node.js | 20+ LTS | JavaScript runtime | [nodejs.org](https://nodejs.org) |
| pnpm | 8+ | Package manager (faster than npm) | `npm install -g pnpm` |
| Docker | 24+ | Container runtime | [docker.com](https://docker.com) |
| Docker Compose | 2.20+ | Multi-container orchestration | Included with Docker |
| Wrangler | 3+ | Cloudflare CLI | `pnpm add -g wrangler` |
| Git | 2.40+ | Version control | [git-scm.com](https://git-scm.com) |
| Expo CLI | Latest | React Native CLI | `npm install -g expo-cli` |

### Optional Software

| Software | Purpose | Install |
|----------|---------|---------|
| VS Code | Recommended IDE | [code.visualstudio.com](https://code.visualstudio.com) |
| TablePlus | D1 database viewer | [tableplus.com](https://tableplus.com) |
| Postman | API testing | [postman.com](https://postman.com) |

### System Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| RAM | 4 GB | 8 GB |
| Disk Space | 10 GB | 20 GB |
| CPU | 2 cores | 4 cores |

### Platform-Specific Notes

#### macOS
- Use Homebrew for package installation
- Docker Desktop required (no native Docker)
- Rosetta 2 recommended for Apple Silicon

#### Linux (Ubuntu/Debian)
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install pnpm
npm install -g pnpm
```

#### Windows
- Use WSL2 for best experience
- Docker Desktop with WSL2 backend
- PowerShell or Windows Terminal recommended

---

## Local Setup

### Complete Installation Guide

**File:** [installation/LOCAL-SETUP.md](./installation/LOCAL-SETUP.md)

### Step-by-Step Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/limuru-hospital/queue-system.git
cd queue-system
```

#### 2. Install Dependencies

```bash
# Install all workspace dependencies
pnpm install

# Install Cloudflare Wrangler globally
pnpm add -g wrangler
```

#### 3. Set Up Environment Variables

```bash
# Copy environment template
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Edit with your values
nano apps/api/.env
```

See [Environment Variables Reference](#environment-variables) below.

#### 4. Initialize Local Database (D1)

```bash
# Create local D1 database
wrangler d1 create limuru-queue --local

# Note the database_id from output

# Run migrations
wrangler d1 execute limuru-queue --local --file=./migrations/001_initial.sql

# Seed initial data
wrangler d1 execute limuru-queue --local --file=./seed/001_seed.sql
```

#### 5. Start Development Servers

```bash
# Start all services with Docker
docker compose up -d

# Or start individual services:
# API: pnpm --filter api dev
# Web: pnpm --filter web dev
# Mobile: pnpm --filter mobile start
```

#### 6. Verify Installation

```bash
# Check API health
curl http://localhost:8787/health

# Expected response:
# {"status":"ok","version":"1.0.0","timestamp":"..."}

# Open web dashboard
open http://localhost:3000

# Login with default credentials
# Username: admin@limuru.cottage
# Password: admin123
```

### Troubleshooting Installation

| Issue | Solution |
|-------|----------|
| Docker not running | Start Docker Desktop |
| Port already in use | Check `docker compose.yml` for port mappings |
| Database connection failed | Verify `DATABASE_ID` in `.env` |
| Migration failed | Run `wrangler d1 reset limuru-queue --local` and retry |

---

## Project Structure

**File:** [project-structure/PROJECT-TREE.md](./project-structure/PROJECT-TREE.md)

### Directory Tree

```
limuru-queue/
├── apps/
│   ├── api/                     # Cloudflare Workers API
│   │   ├── src/
│   │   │   ├── routes/         # API route handlers
│   │   │   │   ├── auth.ts     # Authentication routes
│   │   │   │   ├── queue.ts    # Queue management routes
│   │   │   │   ├── patients.ts # Patient routes
│   │   │   │   ├── display.ts  # TV display routes
│   │   │   │   └── admin.ts    # Admin routes
│   │   │   ├── middleware/     # Middleware functions
│   │   │   │   ├── auth.ts     # JWT validation
│   │   │   │   ├── rbac.ts     # Role-based access
│   │   │   │   ├── validate.ts # Request validation
│   │   │   │   └── rateLimit.ts # Rate limiting
│   │   │   ├── services/       # Business logic
│   │   │   │   ├── queue.ts    # Queue operations
│   │   │   │   ├── ticket.ts   # Ticket generation
│   │   │   │   ├── notification.ts # SMS/WhatsApp
│   │   │   │   └── display.ts  # TV display service
│   │   │   ├── db/
│   │   │   │   ├── client.ts   # D1 client
│   │   │   │   ├── schema.ts   # Type-safe queries
│   │   │   │   └── migrations/ # SQL migrations
│   │   │   ├── workers/
│   │   │   │   ├── websocket.ts # WebSocket handler
│   │   │   │   └── queue.ts    # Queue Durable Object
│   │   │   ├── utils/
│   │   │   │   ├── jwt.ts      # JWT utilities
│   │   │   │   ├── crypto.ts   # Encryption utilities
│   │   │   │   └── validation.ts # Zod schemas
│   │   │   └── index.ts        # Worker entry point
│   │   ├── migrations/         # SQL migration files
│   │   │   ├── 001_initial.sql
│   │   │   ├── 002_queue.sql
│   │   │   └── 003_audit.sql
│   │   ├── seed/              # Seed data files
│   │   │   ├── 001_departments.sql
│   │   │   └── 002_users.sql
│   │   ├── wrangler.toml      # Cloudflare configuration
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── web/                    # Next.js Web Application
│   │   ├── app/               # App Router pages
│   │   │   ├── (auth)/        # Authentication pages
│   │   │   │   ├── login/
│   │   │   │   └── logout/
│   │   │   ├── (dashboard)/   # Dashboard pages
│   │   │   │   ├── admin/
│   │   │   │   ├── doctor/
│   │   │   │   ├── nurse/
│   │   │   │   ├── receptionist/
│   │   │   │   ├── pharmacist/
│   │   │   │   ├── lab/
│   │   │   │   ├── facility/
│   │   │   │   └── patient/
│   │   │   ├── (display)/     # TV Display pages
│   │   │   │   ├── [department]/
│   │   │   │   └── multi/
│   │   │   ├── api/           # API routes
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx       # Landing page
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── ui/            # Base UI components
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   └── ...
│   │   │   ├── dashboard/     # Dashboard components
│   │   │   │   ├── sidebar.tsx
│   │   │   │   ├── header.tsx
│   │   │   │   └── stats.tsx
│   │   │   ├── queue/         # Queue components
│   │   │   │   ├── ticket-printer.tsx
│   │   │   │   ├── queue-list.tsx
│   │   │   │   └── call-panel.tsx
│   │   │   └── display/       # TV Display components
│   │   │       ├── queue-board.tsx
│   │   │       ├── called-patient.tsx
│   │   │       └── announcements.tsx
│   │   ├── lib/
│   │   │   ├── api.ts         # API client
│   │   │   ├── auth.ts        # Auth utilities
│   │   │   ├── utils.ts       # General utilities
│   │   │   └── constants.ts   # App constants
│   │   ├── hooks/             # React hooks
│   │   │   ├── useQueue.ts
│   │   │   ├── useWebSocket.ts
│   │   │   └── useAuth.ts
│   │   ├── wrangler.toml      # Pages configuration
│   │   ├── next.config.js
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── mobile/                # React Native Expo App
│       ├── app/               # Expo Router pages
│       │   ├── (tabs)/        # Tab navigation
│       │   │   ├── index.tsx  # Home
│       │   │   ├── queue.tsx  # Queue
│       │   │   ├── messages.tsx
│       │   │   └── profile.tsx
│       │   ├── login/
│       │   ├── register/
│       │   ├── patient/
│       │   └── +layout.tsx
│       ├── components/
│       │   ├── queue/
│       │   ├── patient/
│       │   └── ui/
│       ├── services/
│       │   ├── api.ts
│       │   ├── notifications.ts
│       │   └── storage.ts
│       ├── app.json
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── shared/                # Shared types and utilities
│       ├── types/
│       │   ├── queue.ts       # Queue type definitions
│       │   ├── patient.ts     # Patient types
│       │   ├── user.ts        # User types
│       │   └── api.ts         # API types
│       ├── schemas/
│       │   ├── queue.ts       # Zod schemas for queue
│       │   ├── patient.ts     # Zod schemas for patient
│       │   └── user.ts        # Zod schemas for user
│       ├── utils/
│       │   ├── ticket.ts      # Ticket formatting
│       │   ├── priority.ts    # Priority calculation
│       │   └── validation.ts  # Shared validation
│       └── package.json
│
├── services/
│   └── docker/
│       ├── docker-compose.yml # Docker Compose configuration
│       ├── Dockerfile.api
│       ├── Dockerfile.web
│       └── nginx.conf         # Reverse proxy config
│
├── docs/                      # Documentation
│   ├── 00-Master/
│   ├── 01-Foundations/
│   ├── 02-Architecture/
│   ├── 03-Queue-Engine/
│   ├── 04-API/
│   ├── 05-Database/
│   ├── 06-Frontend/
│   ├── 07-Security/
│   ├── 08-Testing/
│   ├── 09-Deployment/
│   ├── 10-Monitoring/
│   ├── 11-Performance/
│   ├── 12-Security-Audit/
│   ├── 13-Troubleshooting/
│   └── 14-Reference/
│
├── .github/
│   └── workflows/
│       ├── ci.yml             # CI pipeline
│       ├── deploy-api.yml     # API deployment
│       └── deploy-web.yml     # Web deployment
│
├── wrangler.toml             # Root wrangler config
├── pnpm-workspace.yaml        # Monorepo config
├── turbo.json                # Turborepo config
├── tsconfig.base.json        # Base TypeScript config
├── .gitignore
├── README.md
└── CONTRIBUTING.md
```

### Key Files by Component

#### API (`apps/api/`)

| File | Purpose |
|------|---------|
| `src/index.ts` | Worker entry point |
| `src/routes/*.ts` | API route handlers |
| `src/services/*.ts` | Business logic |
| `src/middleware/*.ts` | Request middleware |
| `src/workers/*.ts` | Durable Objects |
| `wrangler.toml` | Cloudflare configuration |
| `migrations/*.sql` | Database migrations |

#### Web (`apps/web/`)

| File | Purpose |
|------|---------|
| `app/page.tsx` | Landing page |
| `app/(dashboard)/*/page.tsx` | Dashboard pages |
| `app/(display)/*/page.tsx` | TV display pages |
| `components/**/*.tsx` | React components |
| `lib/*.ts` | Utilities and API client |
| `hooks/*.ts` | Custom React hooks |

#### Mobile (`apps/mobile/`)

| File | Purpose |
|------|---------|
| `app/**/*.tsx` | Expo Router pages |
| `components/**/*.tsx` | Mobile components |
| `services/*.ts` | API and native services |
| `app.json` | Expo configuration |

#### Shared (`packages/shared/`)

| File | Purpose |
|------|---------|
| `types/*.ts` | TypeScript interfaces |
| `schemas/*.ts` | Zod validation schemas |
| `utils/*.ts` | Shared utilities |

---

## Environment Variables

### API Environment Variables

**File:** `apps/api/.env`

```env
# Database
DATABASE_ID=your-d1-database-id
DATABASE_URL=http://localhost:8787/db/limuru-queue

# Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token

# External Services
AFRICASTALKING_API_KEY=your-at-api-key
AFRICASTALKING_USERNAME=your-username
WHATSAPP_PHONE_NUMBER=your-whatsapp-number
WHATSAPP_API_KEY=your-whatsapp-api-key

# HMS Integration
HMS_API_URL=https://hms.example.com/api
HMS_API_KEY=your-hms-api-key
HMS_WEBHOOK_SECRET=your-webhook-secret

# SMS Settings
SMS_ENABLED=true
SMS_SENDER_ID=LIMURUHC

# Feature Flags
FEATURE_OFFLINE_MODE=true
FEATURE_WHATSAPP=true
FEATURE_IPTV=true

# Logging
LOG_LEVEL=info
LOG_DRAIN_URL=
```

### Web Environment Variables

**File:** `apps/web/.env`

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8787
NEXT_PUBLIC_WS_URL=ws://localhost:8787

# Cloudflare
NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID=your-account-id

# Feature Flags
NEXT_PUBLIC_FEATURE_OFFLINE=true
NEXT_PUBLIC_FEATURE_WHATSAPP=true
NEXT_PUBLIC_HMS_ENABLED=false

# Display Settings
NEXT_PUBLIC_HOSPITAL_NAME=Limuru Cottage Hospital
NEXT_PUBLIC_DEFAULT_LANGUAGE=en
```

### Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_ID` | Yes | - | D1 database ID |
| `JWT_SECRET` | Yes | - | JWT signing secret (min 32 chars) |
| `JWT_EXPIRES_IN` | No | `1h` | JWT token lifetime |
| `AFRICASTALKING_API_KEY` | No | - | Africa's Talking API key for SMS |
| `WHATSAPP_API_KEY` | No | - | WhatsApp Cloud API key |
| `HMS_API_URL` | No | - | HMS integration endpoint |
| `NEXT_PUBLIC_API_URL` | Yes | - | Public API URL |
| `NEXT_PUBLIC_WS_URL` | Yes | - | WebSocket URL |

### Managing Secrets

```bash
# In production, use Cloudflare Secrets
wrangler secret put JWT_SECRET
wrangler secret put DATABASE_ID

# List secrets
wrangler secret list
```

---

## Next Steps

Now that you have the foundations in place, explore these guides:

### Next: Architecture

- [System Architecture](../02-Architecture/system-design/ARCHITECTURE.md) — Understand the complete system design
- [Component Models](../02-Architecture/component-models/COMPONENTS.md) — Learn about each component
- [Data Flow](../02-Architecture/data-flow/REQUEST-LIFECYCLE.md) — Understand how data moves through the system

### Next: Queue Engine

- [Queue Engine Overview](../03-Queue-Engine/MASTER.md) — The heart of the system
- [Ticket Generation](../03-Queue-Engine/ticket-system/TICKET-GENERATION.md) — How tickets work
- [Priority Algorithm](../03-Queue-Engine/priority-queue/PRIORITY-ALGORITHM.md) — Queue prioritization

### Next: Deployment

- [Deployment Guide](../09-Deployment/MASTER.md) — Deploy to production
- [Local Docker Setup](./installation/LOCAL-SETUP.md) — Run locally

---

## Related Documents

| Document | Path |
|----------|------|
| Quick Start | [quick-start/5-MINUTE-START.md](./quick-start/5-MINUTE-START.md) |
| Software Requirements | [prerequisites/SOFTWARE-REQUIREMENTS.md](./prerequisites/SOFTWARE-REQUIREMENTS.md) |
| Local Setup | [installation/LOCAL-SETUP.md](./installation/LOCAL-SETUP.md) |
| Project Tree | [project-structure/PROJECT-TREE.md](./project-structure/PROJECT-TREE.md) |
| System Architecture | [../02-Architecture/system-design/ARCHITECTURE.md](../02-Architecture/system-design/ARCHITECTURE.md) |
| API Reference | [../04-API/MASTER.md](../04-API/MASTER.md) |

---

*Last updated: March 20, 2026*
