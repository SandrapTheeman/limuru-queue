# Hospital Queue System - Database Service

## Overview

This directory contains the PostgreSQL database initialization for the Hospital Queue System.

## Files

- `init.sql` - Database schema and initial data

## Schema

### Tables

- `users` - Staff and admin users
- `patients` - Patient records
- `departments` - Hospital departments
- `queue` - Queue entries
- `queue_history` - Historical queue data
- `appointments` - Scheduled appointments
- `clinical_notes` - Doctor's clinical notes
- `settings` - System settings
- `audit_logs` - Audit trail
- `iptv_channels` - TV channel configuration

## Quick Start

The database is automatically initialized when the Docker container starts.

## Connection Details

| Parameter | Value |
|-----------|-------|
| Host | localhost |
| Port | 5432 |
| Database | hospital_queue |
| Username | hospital_queue |
| Password | hospital_queue_secure_password |

## Environment Variables

```bash
POSTGRES_USER=hospital_queue
POSTGRES_PASSWORD=hospital_queue_secure_password
POSTGRES_DB=hospital_queue
```

## Volume

Data is persisted in Docker volume: `hospital-queue-database_data`

## Backup

To backup the database:
```bash
docker exec hqs-database pg_dump -U hospital_queue hospital_queue > backup.sql
```

To restore:
```bash
docker exec -i hqs-database psql -U hospital_queue hospital_queue < backup.sql
```
