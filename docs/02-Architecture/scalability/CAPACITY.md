# Scalability - Capacity Planning

**Last Updated:** March 20, 2026  
**Version:** 1.0.0  
**Description:** Scalability and capacity planning documentation

---

## Table of Contents

1. [Overview](#overview)
2. [Scaling Strategy](#scaling-strategy)
3. [Capacity Limits](#capacity-limits)
4. [Load Estimation](#load-estimation)

---

## Overview

Cloudflare edge computing provides automatic horizontal scaling.

---

## Scaling Strategy

- **Horizontal**: Cloudflare edge automatically distributes
- **D1 Replicas**: Automatic read scaling
- **KV Sharding**: Session distribution
- **WebSocket Hub**: Per-department Durable Objects

---

## Capacity Limits

| Resource | Current | Design Limit |
|----------|---------|--------------|
| Daily patients | 400 | 2,000 |
| Concurrent users | 50 | 500 |
| WebSocket connections | 20 | 1,000 |

---

## Related Documents

| Document | Path |
|----------|------|
| Architecture | [../system-design/ARCHITECTURE.md](../system-design/ARCHITECTURE.md) |
| Performance | [../../11-Performance/MASTER.md](../../11-Performance/MASTER.md) |

---

*Last updated: March 20, 2026*
