# Docker Deployment

This directory contains Docker configuration for deploying the Hospital Queue System with separate containers for the web app, API, and PostgreSQL database.

## Prerequisites

- Docker
- Docker Compose

## Quick Start

1. **Copy environment variables:**
   ```bash
   cp .env.example .env
   ```

2. **Build and start containers:**
   ```bash
   docker-compose up --build
   ```

3. **Access the application:**
   - Web App: http://localhost:3000
   - API: http://localhost:8787

## Services

### Web (Next.js)
- Port: 3000
- Connects to API on port 8787

### API (Express + PostgreSQL)
- Port: 8787
- Database: PostgreSQL 15

### Database (PostgreSQL)
- Port: 5432
- Database name: hospital_queue
- Username: hospital_queue
- Password: hospital_queue_secure_password

## Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild containers
docker-compose up --build

# View specific service logs
docker-compose logs -f web
docker-compose logs -f api
docker-compose logs -f db
```

## Default Login

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@limuruhospital.co.ke | password123 |
| Doctor | doctor@hospital.co.ke | password123 |
| Receptionist | reception@hospital.co.ke | password123 |
