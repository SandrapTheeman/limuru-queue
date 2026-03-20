# Reference - Master Index

**Last Updated:** March 20, 2026  
**Version:** 1.0.0  
**Category:** Reference  
**Description:** Quick reference guides, CLI commands, and glossary

---

## Table of Contents

1. [Overview](#overview)
2. [CLI Commands](#cli-commands)
3. [Glossary](#glossary)
4. [Changelog](#changelog)

---

## Overview

Quick reference cheatsheets, CLI commands, and terminology glossary.

---

## CLI Commands

```bash
# Deploy API
wrangler deploy

# Reset database
wrangler d1 reset limuru-queue --local

# View logs
docker compose logs -f
```

---

## Glossary

| Term | Definition |
|------|------------|
| Ticket | Queue identifier for a patient |
| Priority | Medical urgency level (1-4) |
| Score | Combined priority + wait time value |
| Min-Heap | Data structure for priority queue |

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-03-20 | Initial release |

---

*Last updated: March 20, 2026*
