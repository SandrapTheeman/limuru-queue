# API Reference - Master Index

**Last Updated:** March 20, 2026  
**Version:** 1.0.0  
**Category:** API  
**Description:** Complete API reference documentation for the Limuru Queue System

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Endpoints](#endpoints)
4. [Error Handling](#error-handling)
5. [Rate Limiting](#rate-limiting)
6. [OpenAPI Spec](#openapi-spec)

---

## Overview

RESTful API built on Cloudflare Workers with Hono.js framework.

**Base URL:** `https://api.limuru.cottage/v1`

---

## Authentication

JWT Bearer token authentication with KV session storage.

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | User login |
| POST | `/auth/logout` | User logout |
| POST | `/auth/refresh` | Refresh token |
| GET | `/auth/me` | Get current user |

### Tickets
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/tickets` | Create ticket |
| GET | `/tickets/:id` | Get ticket |
| POST | `/tickets/:id/void` | Void ticket |

### Queue
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/queue/:dept` | Get queue |
| POST | `/queue/:dept/call` | Call patient |
| POST | `/queue/:dept/recall` | Recall patient |
| POST | `/queue/complete` | Complete service |

### Patients
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/patients` | Create patient |
| GET | `/patients/:id` | Get patient |
| PUT | `/patients/:id` | Update patient |

---

## Related Documents

| Document | Path |
|----------|------|
| Database | [../05-Database/MASTER.md](../05-Database/MASTER.md) |
| Security | [../07-Security/MASTER.md](../07-Security/MASTER.md) |

---

*Last updated: March 20, 2026*
