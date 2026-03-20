# Hospital Queue System - Microservices Architecture

## Services

```
services/
├── web/           # Next.js Web Application
├── api/           # Express REST API
└── database/      # PostgreSQL Database
```

## Quick Start

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## Services

### Web (Next.js)
- **Port**: 3000
- **Framework**: Next.js 14
- **Dependencies**: React, Zustand, TailwindCSS

### API (Express)
- **Port**: 8787
- **Framework**: Express.js
- **Database**: PostgreSQL 15

### Database (PostgreSQL)
- **Port**: 5432
- **Database**: hospital_queue

## Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

## Development

```bash
# Run only web
docker-compose up web

# Run only api
docker-compose up api

# Run with logs
docker-compose up --build -d
```

## Production

For production, use environment variables:

```bash
docker-compose -f docker-compose.yml up -d \
  -e JWT_SECRET=your-secret \
  -e DATABASE_URL=postgresql://...
```
