# Deployment - Master Index

**Last Updated:** March 20, 2026  
**Version:** 1.0.0  
**Category:** Deployment  
**Description:** Complete deployment documentation for the Limuru Queue System

---

## Table of Contents

1. [Overview](#overview)
2. [Local Docker](#local-docker)
3. [Cloudflare Production](#cloudflare-production)
4. [CI/CD Pipeline](#cicd-pipeline)

---

## Overview

Docker for local development, Cloudflare Workers/Pages for production.

---

## Local Docker

```bash
docker compose up -d
```

---

## Cloudflare Production

```bash
wrangler deploy
```

---

## Related Documents

| Document | Path |
|----------|------|
| Monitoring | [../10-Monitoring/MASTER.md](../10-Monitoring/MASTER.md) |
| Troubleshooting | [../13-Troubleshooting/MASTER.md](../13-Troubleshooting/MASTER.md) |

---

*Last updated: March 20, 2026*
