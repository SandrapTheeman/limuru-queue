# Security Architecture

**Last Updated:** March 20, 2026  
**Version:** 1.0.0  
**Description:** Complete security architecture documentation

---

## Table of Contents

1. [Overview](#overview)
2. [Security Layers](#security-layers)
3. [Authentication](#authentication)
4. [Authorization](#authorization)
5. [Data Protection](#data-protection)

---

## Overview

Multi-layer security architecture for healthcare compliance.

---

## Security Layers

| Layer | Protection |
|-------|------------|
| Network | TLS 1.3, Cloudflare proxy |
| Application | JWT, RBAC, validation |
| Data | Field-level encryption for PHI |

---

## Authentication

JWT with KV session storage, refresh token rotation.

---

## Authorization

10 roles with granular permissions:
- super_admin, admin, doctor, nurse, receptionist, patient, pharmacist, lab_tech, facility_manager, it_support

---

## Data Protection

- Passwords: bcrypt (cost 10)
- PHI: AES-256-GCM encryption
- Audit logs: append-only

---

## Related Documents

| Document | Path |
|----------|------|
| Security Audit | [../12-Security-Audit/MASTER.md](../12-Security-Audit/MASTER.md) |
| API | [../04-API/MASTER.md](../04-API/MASTER.md) |

---

*Last updated: March 20, 2026*
