# 🏥 Limuru Cottage Hospital Queue System - Setup Guide

This guide will help you set up and deploy the Hospital Queue Management System using Docker.

## Prerequisites

- **Docker** (v20.10+) - [Install Docker](https://docs.docker.com/get-docker/)
- **Docker Compose** (v2.0+) - Comes with Docker Desktop
- **Ports Required**: 3000 (Web), 8787 (API), 5432 (Database)

---

## Quick Start (5 minutes)

### 1. Clone and Navigate to Project

```bash
cd Cottage-Queuing-System
```

### 2. Create Environment File

Create a `.env` file in the root directory:

```bash
# Copy the example
cp .env.example .env

# Or create manually
cat > .env << EOF
NODE_ENV=production
JWT_SECRET=your-secure-jwt-secret-change-this
DEFAULT_PASSWORD=password123
NEXT_PUBLIC_API_URL=http://localhost:8787
NEXT_PUBLIC_WS_URL=ws://localhost:8787
EOF
```

### 3. Start Docker Services

```bash
cd services
docker-compose up -d
```

### 4. Verify Services

```bash
# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 5. Access the Application

| Service | URL | Description |
|---------|-----|-------------|
| **Web App** | http://localhost:3000 | Main queue interface |
| **API** | http://localhost:8787 | REST API |
| **API Health** | http://localhost:8787/health | Health check |
| **Database Browser** | http://localhost:8787/db | View database |

---

## Project Structure

```
Cottage-Queuing-System/
├── apps/
│   ├── web/                 # Next.js frontend
│   │   ├── app/            # App router pages
│   │   ├── lib/            # API client & stores
│   │   └── Dockerfile      # Web container config
│   └── api/                 # Express.js backend
│       ├── src/
│       │   └── server.js    # API entry point
│       └── Dockerfile       # API container config
├── services/
│   ├── docker-compose.yml   # Container orchestration
│   └── database/
│       └── init.sql        # Database schema
└── .env                    # Environment variables
```

---

## Default Accounts

After first run, the system creates default staff accounts:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@limuruhospital.co.ke | password123 |
| **Doctor** | doctor@limuruhospital.co.ke | password123 |
| **Nurse** | nurse@limuruhospital.co.ke | password123 |
| **Receptionist** | receptionist@limuruhospital.co.ke | password123 |

---

## Application URLs

### Dashboard Pages

| Dashboard | URL | Purpose |
|-----------|-----|---------|
| **Home** | http://localhost:3000 | Landing page |
| **Display** | http://localhost:3000/display | Queue display (TV) |
| **Kiosk** | http://localhost:3000/kiosk | Patient check-in |
| **Doctor** | http://localhost:3000/dashboard/doctor | Doctor dashboard |
| **Receptionist** | http://localhost:3000/dashboard/receptionist | Queue management |
| **Patient** | http://localhost:3000/dashboard/patient | Patient status |
| **Admin** | http://localhost:3000/dashboard/admin | System management |

### API Endpoints

```bash
# Health Check
curl http://localhost:8787/health

# Departments
curl http://localhost:8787/api/departments

# Queue by Department
curl http://localhost:8787/api/queue/MED

# Queue Summary (all depts)
curl http://localhost:8787/api/queue/all/summary
```

---

## Docker Commands

### Start Services
```bash
cd services
docker-compose up -d              # Start all services
docker-compose up -d --build      # Rebuild and start
```

### Stop Services
```bash
docker-compose down               # Stop containers
docker-compose down -v           # Stop and remove volumes (⚠️ deletes data)
```

### View Logs
```bash
docker-compose logs -f            # All services
docker-compose logs -f api        # API only
docker-compose logs -f web        # Web only
docker-compose logs -f database   # Database only
```

### Restart Services
```bash
docker-compose restart api        # Restart API
docker-compose restart web        # Restart Web
```

### Database Access
```bash
# Connect to PostgreSQL
docker exec -it hqs-database psql -U hospital_queue -d hospital_queue

# View tables
docker exec -it hqs-database psql -U hospital_queue -d hospital_queue -c "\dt"
```

---

## Troubleshooting

### Services Not Starting

1. **Check Docker is running**
   ```bash
   docker info
   ```

2. **Check ports are available**
   ```bash
   # Kill processes using required ports
   sudo lsof -i :3000
   sudo lsof -i :8787
   sudo lsof -i :5432
   ```

3. **View error logs**
   ```bash
   docker-compose logs
   ```

### Database Connection Issues

1. **Wait for database to be ready**
   - Database takes ~10s to initialize on first run
   - Health check ensures API waits for database

2. **Check DATABASE_URL**
   - Should be: `postgresql://hospital_queue:password@database:5432/hospital_queue`

### Web App Not Loading

1. **Check API is running**
   ```bash
   curl http://localhost:8787/health
   ```

2. **Check API_URL in web container**
   ```bash
   docker exec hqs-web env | grep API
   ```

### Reset Everything

```bash
cd services
docker-compose down -v           # Remove all containers and volumes
docker-compose up -d --build    # Fresh start
```

---

## Building for Production

### 1. Update Environment Variables

```bash
# Edit .env file
nano .env
```

Set production values:
```env
NODE_ENV=production
JWT_SECRET=<generate-secure-random-string>
DEFAULT_PASSWORD=<change-password>
NEXT_PUBLIC_API_URL=https://your-domain.com
```

### 2. Build Images

```bash
docker-compose build
```

### 3. Run Production Mode

```bash
docker-compose up -d
```

---

## Development Mode (Local without Docker)

If you want to run services locally for development:

### Database (PostgreSQL)
```bash
# Using Docker for database only
docker run -d \
  --name hqs-db-dev \
  -e POSTGRES_USER=hospital_queue \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=hospital_queue \
  -p 5432:5432 \
  postgres:15-alpine

# Run init.sql
docker exec -i hqs-db-dev psql -U hospital_queue -d hospital_queue < services/database/init.sql
```

### API
```bash
cd apps/api
npm install
DATABASE_URL=postgresql://hospital_queue:password@localhost:5432/hospital_queue npm run dev
```

### Web
```bash
cd apps/web
npm install
NEXT_PUBLIC_API_URL=http://localhost:8787 npm run dev
```

---

## Support

- **API Test Page**: http://localhost:8787/test
- **Database Browser**: http://localhost:8787/db
- **Health Check**: http://localhost:8787/health

---

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Web App   │────▶│    API      │────▶│  Database   │
│  (Next.js)  │     │ (Express)   │     │ (PostgreSQL)│
│   :3000     │     │   :8787     │     │   :5432     │
└─────────────┘     └─────────────┘     └─────────────┘
```

- **Web**: Next.js 14 with App Router, TailwindCSS, Glasmorphism UI
- **API**: Express.js REST API with JWT authentication  
- **Database**: PostgreSQL 15 with UUID primary keys
