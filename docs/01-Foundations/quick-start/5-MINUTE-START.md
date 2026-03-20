# Quick Start - 5-Minute Setup

**Last Updated:** March 20, 2026  
**Version:** 1.0.0  
**Description:** Get the Limuru Queue System running in 5 minutes

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation Steps](#installation-steps)
3. [Verify Installation](#verify-installation)
4. [Default Login Credentials](#default-login-credentials)
5. [Generate First Ticket](#generate-first-ticket)
6. [View TV Display](#view-tv-display)
7. [Common Issues](#common-issues)
8. [Next Steps](#next-steps)

---

## Prerequisites

- **Docker Desktop** installed and running
- **Git** installed
- Internet connection for first run

### Verify Docker is Running

```bash
docker --version
# Docker version 24.0.7 or higher

docker compose version
# Docker Compose version v2.20.0 or higher
```

If Docker is not installed:
- **macOS/Windows:** Download from [docker.com](https://docker.com)
- **Linux:** Run: `curl -fsSL https://get.docker.com | sh`

---

## Installation Steps

### Step 1: Clone the Repository

```bash
git clone https://github.com/limuru-hospital/queue-system.git
cd queue-system
```

### Step 2: Start All Services

```bash
docker compose up -d
```

This will:
- Build the API container (first run only)
- Build the Web container (first run only)
- Start D1 database emulation
- Start Redis emulation for sessions
- Set up networking

**Expected output:**
```
[+] Running 4/4
 ✔ Network limuru_default  Created
 ✔ Container limuru-api-1  Started
 ✔ Container limuru-web-1  Started
 ✔ Container limuru-db-1   Started
```

### Step 3: Wait for Services to Initialize

```bash
# Wait 30 seconds for database migrations
sleep 30

# Check container status
docker compose ps
```

**Expected output:**
```
NAME                STATUS          PORTS
limuru-api-1        Up 20 seconds    0.0.0.0:8787->8787/tcp
limuru-web-1        Up 15 seconds    0.0.0.0:3000->3000/tcp
limuru-db-1         Up 25 seconds    0.0.0.0:8788->8788/tcp
```

### Step 4: Verify Services are Running

```bash
# Check API health
curl http://localhost:8787/health
```

**Expected response:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "database": "connected",
  "timestamp": "2026-03-20T10:00:00.000Z"
}
```

---

## Verify Installation

### Test Web Dashboard

1. Open your browser
2. Navigate to: [http://localhost:3000](http://localhost:3000)
3. You should see the login page

### Test API Endpoint

```bash
# List departments
curl http://localhost:8787/api/v1/departments
```

**Expected response:**
```json
{
  "success": true,
  "data": [
    { "code": "MED", "name": "Medical" },
    { "code": "PED", "name": "Pediatric" },
    { "code": "EMR", "name": "Emergency" }
  ]
}
```

### Test WebSocket Connection

```javascript
// Open browser console and run:
const ws = new WebSocket('ws://localhost:8787/ws');
ws.onopen = () => console.log('Connected!');
ws.onmessage = (e) => console.log('Message:', e.data);
```

---

## Default Login Credentials

### Admin Account

| Field | Value |
|-------|-------|
| **Email** | admin@limuru.cottage |
| **Password** | admin123 |

### Staff Accounts (Pre-seeded)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@limuru.cottage | admin123 |
| Doctor | doctor@limuru.cottage | doctor123 |
| Nurse | nurse@limuru.cottage | nurse123 |
| Receptionist | receptionist@limuru.cottage | reception123 |
| Patient | patient@limuru.cottage | patient123 |

**Important:** Change these passwords in production!

---

## Generate First Ticket

### Via Web Dashboard

1. Login at [http://localhost:3000](http://localhost:3000)
2. Navigate to **Receptionist Dashboard**
3. Click **New Patient** or **Generate Ticket**
4. Select department (e.g., Medical)
5. Enter patient details or use quick-registration
6. Click **Generate Ticket**
7. Print or SMS ticket to patient

### Via API

```bash
# Generate a new ticket for Medical department
curl -X POST http://localhost:8787/api/v1/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "departmentCode": "MED",
    "patientName": "John Kamau",
    "patientPhone": "+254700123456",
    "priority": "normal"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "ticketNumber": "MED/R---/001",
    "position": 1,
    "estimatedWait": "15 minutes",
    "createdAt": "2026-03-20T10:05:00.000Z"
  }
}
```

**Note:** Room number (`R---`) is assigned when patient is called.

---

## View TV Display

### Single Department Display

1. Navigate to [http://localhost:3000/display/medical](http://localhost:3000/display/medical)
2. You should see the TV display board for Medical department
3. The display shows:
   - Currently called patient (large text)
   - Up next patient
   - Queue list
   - Date and time

### Multi-Department Display

1. Navigate to [http://localhost:3000/display/multi](http://localhost:3000/display/multi)
2. Split view showing multiple departments

### Display Features

| Feature | How to Access |
|---------|---------------|
| Toggle audio | Press **M** key or click speaker icon |
| Fullscreen | Press **F** key or click expand icon |
| Emergency override | Only admin can trigger |
| Change department | Use dropdown in top-right |

---

## Common Issues

### Issue: "Port already in use"

**Error:**
```
Error starting userland proxy: listen tcp4 0.0.0.0:3000: bind: address already in use
```

**Solution:**
```bash
# Find what's using the port
lsof -i :3000

# Kill the process or change port in docker-compose.yml
```

### Issue: "Database not initialized"

**Error:**
```
Database connection failed: database does not exist
```

**Solution:**
```bash
# Reset and recreate database
docker compose down -v
docker compose up -d
sleep 45
```

### Issue: "Container keeps restarting"

**Error:**
```
Container limuru-api-1 exited with code 1
```

**Solution:**
```bash
# Check logs
docker compose logs api

# Common fix: Rebuild without cache
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Issue: "Migration failed"

**Error:**
```
Error: table already exists
```

**Solution:**
```bash
# Clean start
docker compose down -v
docker compose up -d --build
```

### Issue: "Cannot login"

**Error:**
```
Invalid credentials
```

**Solution:**
```bash
# Check seed data was loaded
docker compose logs db | grep seed

# Manually create admin user
docker compose exec api wrangler d1 execute limuru-queue --local --command "
INSERT INTO users (email, password_hash, role, name, department_id) 
VALUES ('admin@limuru.cottage', '\$2b\$10\$hashedpassword', 'admin', 'System Admin', 1);
"
```

---

## Next Steps

### Explore the System

1. **Login as different roles** to see role-specific dashboards
2. **Generate more tickets** to see queue prioritization
3. **Call a patient** to see TV display update
4. **Try offline mode** by disconnecting from network

### Continue Learning

| Topic | Document |
|-------|----------|
| Complete setup | [../LOCAL-SETUP.md](./LOCAL-SETUP.md) |
| Architecture | [../../02-Architecture/system-design/ARCHITECTURE.md](../../02-Architecture/system-design/ARCHITECTURE.md) |
| Queue system | [../../03-Queue-Engine/MASTER.md](../../03-Queue-Engine/MASTER.md) |
| API reference | [../../04-API/MASTER.md](../../04-API/MASTER.md) |

### Production Deployment

| Topic | Document |
|-------|----------|
| Local Docker | [../../09-Deployment/MASTER.md](../../09-Deployment/MASTER.md) |
| Cloudflare | [../../09-Deployment/MASTER.md#cloudflare-production](../../09-Deployment/MASTER.md#cloudflare-production) |

---

## Quick Reference

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# Rebuild
docker compose down && docker compose up -d --build

# Reset completely
docker compose down -v
docker compose up -d
```

### URLs

| Service | URL |
|---------|-----|
| Web Dashboard | http://localhost:3000 |
| API | http://localhost:8787 |
| API Health | http://localhost:8787/health |
| Database Viewer | http://localhost:8788 (D1 Studio) |

---

*For detailed troubleshooting, see [../../13-Troubleshooting/MASTER.md](../../13-Troubleshooting/MASTER.md)*
