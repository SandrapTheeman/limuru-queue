# Local Setup Guide

**Last Updated:** March 20, 2026  
**Version:** 1.0.0  
**Description:** Complete guide to setting up the Limuru Queue System locally

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Clone Repository](#clone-repository)
3. [Install Dependencies](#install-dependencies)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [Start Services](#start-services)
7. [Verify Installation](#verify-installation)
8. [Initial Configuration](#initial-configuration)
9. [Common Issues](#common-issues)
10. [Next Steps](#next-steps)

---

## Prerequisites

Before starting, ensure you have installed:

| Software | Version | Verification Command |
|----------|---------|---------------------|
| Node.js | 20+ | `node --version` |
| pnpm | 8+ | `pnpm --version` |
| Docker | 24+ | `docker --version` |
| Docker Compose | 2.20+ | `docker compose version` |
| Wrangler | 3+ | `wrangler --version` |
| Git | 2.40+ | `git --version` |

See [../prerequisites/SOFTWARE-REQUIREMENTS.md](../prerequisites/SOFTWARE-REQUIREMENTS.md) for installation help.

---

## Clone Repository

```bash
# Clone the repository
git clone https://github.com/limuru-hospital/queue-system.git

# Navigate to project directory
cd queue-system

# Verify directory structure
ls -la
```

Expected output:
```
drwxr-xr-x  18 user  staff  4096 Mar 20 10:00 .
drwxr-xr-x 18 user  staff  4096  4096
drwxr-xr-x 18 user  staff  4096  Mar 20 10:00 ..
drwxr-xr-x 18 user  staff  4096  Mar 20 10:00 apps
drwxr-xr-x 18 user  staff  4096  Mar 20 10:00 packages
drwxr-xr-x 18 user  staff  4096  Mar 20 10:00 services
drwxr-xr-x 18 user  staff  4096  Mar 20 10:00 docs
drwxr-xr-x 18 user  staff  4096  Mar 20 10:00 .github
drwxr-xr-x 18 user  staff  4096  Mar 20 10:00 README.md
drwxr-xr-x 18 user  staff  4096  Mar 20 10:00 pnpm-workspace.yaml
```

---

## Install Dependencies

### Install All Workspace Dependencies

```bash
# Install all dependencies for all packages
pnpm install
```

This will:
1. Install root workspace dependencies
2. Install dependencies for `apps/api`
3. Install dependencies for `apps/web`
4. Install dependencies for `apps/mobile`
5. Install dependencies for `packages/shared`

**Expected output:**
```
Packages: +94 -3
1247 packages installed in 45s
```

### Verify Installation

```bash
# Check API dependencies
pnpm list --filter api

# Check web dependencies
pnpm list --filter web

# Check shared packages
pnpm list --filter shared
```

---

## Environment Configuration

### Create Environment Files

```bash
# Create API environment file
cp apps/api/.env.example apps/api/.env

# Create Web environment file
cp apps/web/.env.example apps/web/.env
```

### Configure API Environment

Edit `apps/api/.env`:

```env
# ===========================================
# DATABASE CONFIGURATION
# ===========================================

# Local D1 database (for development)
DATABASE_ID=limuru-queue-local
DATABASE_URL=http://localhost:8788

# ===========================================
# AUTHENTICATION
# ===========================================

# JWT Secret - CHANGE THIS IN PRODUCTION!
# Minimum 32 characters
JWT_SECRET=limuru-super-secret-key-change-in-production-minimum-32-chars

# Token expiry
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d

# ===========================================
# CLOUDFLARE
# ===========================================

CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token

# ===========================================
# EXTERNAL SERVICES (Optional for local dev)
# ===========================================

# SMS via Africa's Talking (optional)
AFRICASTALKING_API_KEY=
AFRICASTALKING_USERNAME=sandbox

# WhatsApp Cloud API (optional)
WHATSAPP_PHONE_NUMBER=
WHATSAPP_API_KEY=

# HMS Integration (optional)
HMS_API_URL=
HMS_API_KEY=
HMS_WEBHOOK_SECRET=

# ===========================================
# FEATURE FLAGS
# ===========================================

FEATURE_OFFLINE_MODE=true
FEATURE_WHATSAPP=false
FEATURE_IPTV=true
FEATURE_SMS=false

# ===========================================
# LOGGING
# ===========================================

LOG_LEVEL=debug
```

### Configure Web Environment

Edit `apps/web/.env`:

```env
# ===========================================
# API CONFIGURATION
# ===========================================

NEXT_PUBLIC_API_URL=http://localhost:8787
NEXT_PUBLIC_WS_URL=ws://localhost:8787

# ===========================================
# CLOUDFLARE
# ===========================================

NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID=your-account-id

# ===========================================
# FEATURES
# ===========================================

NEXT_PUBLIC_FEATURE_OFFLINE=true
NEXT_PUBLIC_FEATURE_WHATSAPP=false
NEXT_PUBLIC_HMS_ENABLED=false

# ===========================================
# HOSPITAL CONFIGURATION
# ===========================================

NEXT_PUBLIC_HOSPITAL_NAME=Limuru Cottage Hospital
NEXT_PUBLIC_HOSPITAL_LOCATION=Limuru, Kenya
NEXT_PUBLIC_DEFAULT_LANGUAGE=en
```

---

## Database Setup

### Using Docker (Recommended)

```bash
# Start D1 database container
docker compose up -d db

# Wait for database to be ready
sleep 10
```

### Create Local D1 Database

```bash
# Create local D1 database using Wrangler
wrangler d1 create limuru-queue-local --local

# Note the database_id from output, e.g.:
# { binding = "DB", database_name = "limuru-queue-local", database_id = "xxxx-xxxx-xxxx" }
```

### Run Database Migrations

```bash
# List migration files
ls apps/api/migrations/

# Run all migrations
wrangler d1 execute limuru-queue-local --local --file=apps/api/migrations/001_initial.sql
wrangler d1 execute limuru-queue-local --local --file=apps/api/migrations/002_queue.sql
wrangler d1 execute limuru-queue-local --local --file=apps/api/migrations/003_audit.sql
```

**Alternative: Run all migrations at once**
```bash
cat apps/api/migrations/*.sql | wrangler d1 execute limuru-queue-local --local --stdin
```

### Load Seed Data

```bash
# Seed departments
wrangler d1 execute limuru-queue-local --local --file=apps/api/seed/001_departments.sql

# Seed users and roles
wrangler d1 execute limuru-queue-local --local --file=apps/api/seed/002_users.sql

# Seed rooms
wrangler d1 execute limuru-queue-local --local --file=apps/api/seed/003_rooms.sql
```

### Verify Database Setup

```bash
# List all tables
wrangler d1 execute limuru-queue-local --local --command="SELECT name FROM sqlite_master WHERE type='table';"

# Check departments
wrangler d1 execute limuru-queue-local --local --command="SELECT * FROM departments LIMIT 5;"

# Check users
wrangler d1 execute limuru-queue-local --local --command="SELECT id, email, role, name FROM users LIMIT 5;"
```

Expected output for departments:
```
┌──────┬─────────┬────────────────┐
│ id   │ code    │ name           │
├──────┼─────────┼────────────────┤
│ 1    │ MED     │ Medical        │
│ 2    │ PED     │ Pediatric      │
│ 3    │ EMR     │ Emergency      │
│ 4    │ GYN     │ Gynecology     │
│ 5    │ ORT     │ Orthopedic     │
└──────┴─────────┴────────────────┘
```

---

## Start Services

### Option 1: Docker Compose (Recommended)

Start all services at once:

```bash
# Build images and start containers
docker compose up -d

# View logs
docker compose logs -f

# Check status
docker compose ps
```

**Services started:**
| Service | Port | Description |
|---------|------|-------------|
| api | 8787 | Cloudflare Workers API |
| web | 3000 | Next.js web application |
| db | 8788 | D1 database emulator |

### Option 2: Individual Services

For development with hot reload:

```bash
# Terminal 1: Start API
pnpm --filter api dev

# Terminal 2: Start Web
pnpm --filter web dev

# Terminal 3: Start database emulator
npx wrangler dev --d1=limuru-queue-local --local
```

### Option 3: Hybrid Setup

```bash
# Start database
docker compose up -d db

# Start API locally with hot reload
pnpm --filter api dev

# Start web locally with hot reload
pnpm --filter web dev
```

---

## Verify Installation

### Check API Health

```bash
curl http://localhost:8787/health
```

Expected response:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "database": "connected",
  "services": {
    "auth": "ready",
    "queue": "ready",
    "notifications": "disabled"
  },
  "timestamp": "2026-03-20T10:30:00.000Z"
}
```

### Test Authentication

```bash
# Login with default admin credentials
curl -X POST http://localhost:8787/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@limuru.cottage",
    "password": "admin123"
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "email": "admin@limuru.cottage",
      "role": "admin",
      "name": "System Admin"
    },
    "expiresAt": "2026-03-20T11:30:00.000Z"
  }
}
```

### Verify Web Dashboard

1. Open browser: [http://localhost:3000](http://localhost:3000)
2. Login with: `admin@limuru.cottage` / `admin123`
3. Verify dashboard loads without errors

### Verify TV Display

1. Open browser: [http://localhost:3000/display/medical](http://localhost:3000/display/medical)
2. Verify TV display renders correctly
3. Check console for WebSocket connection

### Test Queue Operations

```bash
# Get auth token
TOKEN=$(curl -s -X POST http://localhost:8787/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@limuru.cottage","password":"admin123"}' | jq -r '.data.token')

# Create a ticket
curl -X POST http://localhost:8787/api/v1/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "departmentCode": "MED",
    "patientName": "Jane Doe",
    "patientPhone": "+254700123456",
    "priority": "normal"
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "ticketId": "TKT-001-MED",
    "ticketNumber": "MED/R---/001",
    "position": 1,
    "estimatedWait": "15 minutes",
    "createdAt": "2026-03-20T10:35:00.000Z"
  }
}
```

---

## Initial Configuration

### Set Up Hospital Profile

1. Login to admin dashboard: [http://localhost:3000/dashboard/admin](http://localhost:3000/dashboard/admin)
2. Navigate to **Settings → Hospital Profile**
3. Configure:
   - Hospital name: "Limuru Cottage Hospital"
   - Location: "Limuru, Kiambu County, Kenya"
   - Contact information
   - Logo upload

### Configure Departments

1. Navigate to **Settings → Departments**
2. Enable/disable departments as needed
3. Assign rooms to departments
4. Set queue capacity limits

### Configure Audio

1. Navigate to **Settings → Audio**
2. Set TTS voice (English/Swahili)
3. Set volume levels
4. Test announcement playback

### Configure SMS (Optional)

1. Navigate to **Settings → Notifications**
2. Add Africa's Talking API credentials
3. Configure sender ID
4. Test SMS sending

---

## Common Issues

### Issue: Database Connection Failed

**Symptoms:**
```
Error: Cannot connect to database
```

**Solution:**
```bash
# Verify D1 emulator is running
docker compose ps db

# Check DATABASE_ID in .env matches
wrangler d1 list --local
```

### Issue: Migration Errors

**Symptoms:**
```
Error: table already exists
```

**Solution:**
```bash
# Reset database completely
wrangler d1 delete limuru-queue-local --local
wrangler d1 create limuru-queue-local --local

# Re-run migrations
pnpm db:migrate
pnpm db:seed
```

### Issue: Port Already in Use

**Symptoms:**
```
Error: listen tcp 0.0.0.0:3000: bind: address already in use
```

**Solution:**
```bash
# Find process using port
lsof -i :3000

# Kill process or change port in docker-compose.yml
```

### Issue: WebSocket Connection Failed

**Symptoms:**
```
WebSocket connection to ws://localhost:8787/ws failed
```

**Solution:**
```bash
# Check API is running
curl http://localhost:8787/health

# Enable WebSocket in wrangler.toml
# Ensure CORS headers are configured
```

### Issue: Seed Data Not Loaded

**Symptoms:**
```
Login fails with "User not found"
```

**Solution:**
```bash
# Manually seed users
wrangler d1 execute limuru-queue-local --local --file=apps/api/seed/002_users.sql

# Verify users exist
wrangler d1 execute limuru-queue-local --local --command="SELECT * FROM users;"
```

---

## Development Workflow

### Daily Development

```bash
# Pull latest changes
git pull

# Start services
docker compose up -d

# Make your changes
# ...

# Run tests
pnpm test

# Stop services
docker compose down
```

### Clean Reset

```bash
# Complete reset - removes all data
docker compose down -v
rm -rf apps/api/.wrangler
pnpm install
docker compose up -d
pnpm db:migrate
pnpm db:seed
```

---

## Next Steps

| Topic | Document |
|-------|----------|
| Quick Start | [../quick-start/5-MINUTE-START.md](../quick-start/5-MINUTE-START.md) |
| Project Structure | [../project-structure/PROJECT-TREE.md](../project-structure/PROJECT-TREE.md) |
| Architecture | [../../02-Architecture/system-design/ARCHITECTURE.md](../../02-Architecture/system-design/ARCHITECTURE.md) |
| Queue System | [../../03-Queue-Engine/MASTER.md](../../03-Queue-Engine/MASTER.md) |
| Deployment | [../../09-Deployment/MASTER.md](../../09-Deployment/MASTER.md) |

---

*Last updated: March 20, 2026*
