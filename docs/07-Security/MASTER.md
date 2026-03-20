# Security - Master Index

**Last Updated:** March 20, 2026  
**Version:** 1.0.0  
**Category:** Security  
**Description:** Complete security documentation for the Limuru Queue System

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Authorization](#authorization)
4. [Data Protection](#data-protection)
5. [HIPAA Compliance](#hipaa-compliance)

---

## Overview

Multi-layer security with JWT auth, RBAC, field-level encryption for PHI.

---

## Authentication

- JWT tokens with 1-hour expiry
- Session storage in Cloudflare KV
- Refresh token rotation

---

## Authorization

10 roles with granular permissions.

---

## Related Documents

| Document | Path |
|----------|------|
| API | [../04-API/MASTER.md](../04-API/MASTER.md) |
| Security Audit | [../12-Security-Audit/MASTER.md](../12-Security-Audit/MASTER.md) |

---

*Last updated: March 20, 2026*
