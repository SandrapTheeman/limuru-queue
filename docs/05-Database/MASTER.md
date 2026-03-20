# Database - Master Index

**Last Updated:** March 20, 2026  
**Version:** 1.0.0  
**Category:** Database  
**Description:** Complete database documentation for the Limuru Queue System

---

## Table of Contents

1. [Overview](#overview)
2. [Schema](#schema)
3. [Migrations](#migrations)
4. [Seed Data](#seed-data)
5. [Query Patterns](#query-patterns)

---

## Overview

Cloudflare D1 (SQLite) database at the edge.

---

## Schema

### Core Tables

| Table | Description |
|-------|-------------|
| `users` | User accounts and roles |
| `patients` | Patient records |
| `tickets` | Queue tickets |
| `queue_entries` | Active queue state |
| `departments` | Department configuration |
| `rooms` | Room assignments |
| `audit_log` | Action audit trail |

---

## Related Documents

| Document | Path |
|----------|------|
| API | [../04-API/MASTER.md](../04-API/MASTER.md) |

---

*Last updated: March 20, 2026*
