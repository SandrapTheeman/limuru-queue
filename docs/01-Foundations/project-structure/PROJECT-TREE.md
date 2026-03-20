# Project Structure

**Last Updated:** March 20, 2026  
**Version:** 1.0.0  
**Description:** Complete directory tree and file organization for the Limuru Queue System

---

## Table of Contents

1. [Overview](#overview)
2. [Top-Level Structure](#top-level-structure)
3. [Apps Directory](#apps-directory)
4. [Packages Directory](#packages-directory)
5. [Services Directory](#services-directory)
6. [Docs Directory](#docs-directory)
7. [GitHub Directory](#github-directory)
8. [Key Files Reference](#key-files-reference)

---

## Overview

The Limuru Queue System uses a monorepo structure with:
- **pnpm workspaces** for package management
- **Turborepo** for build orchestration
- **TypeScript** throughout (including shared types)
- **Cloudflare Workers** for API deployment
- **Next.js** for web application
- **Expo** for mobile application

---

## Top-Level Structure

```
limuru-queue/                          # Project root
├── apps/                              # Applications
│   ├── api/                           # Cloudflare Workers API
│   ├── web/                           # Next.js Web Application
│   └── mobile/                        # Expo React Native App
│
├── packages/                          # Shared packages
│   └── shared/                        # Shared types and utilities
│
├── services/                          # Infrastructure services
│   └── docker/                        # Docker Compose configuration
│
├── docs/                              # Documentation
│   ├── 00-Master/                     # Master index
│   ├── 01-Foundations/                # Getting started guides
│   ├── 02-Architecture/               # System architecture
│   ├── 03-Queue-Engine/               # Queue core system
│   ├── 04-API/                        # API reference
│   ├── 05-Database/                   # Database documentation
│   ├── 06-Frontend/                   # Frontend documentation
│   ├── 07-Security/                  # Security documentation
│   ├── 08-Testing/                   # Testing documentation
│   ├── 09-Deployment/                 # Deployment guides
│   ├── 10-Monitoring/                # Monitoring documentation
│   ├── 11-Performance/               # Performance optimization
│   ├── 12-Security-Audit/            # Security audit
│   ├── 13-Troubleshooting/           # Troubleshooting guides
│   └── 14-Reference/                  # Quick reference
│
├── .github/                           # GitHub configuration
│   └── workflows/                     # CI/CD pipelines
│
├── wrangler.toml                      # Root wrangler config
├── pnpm-workspace.yaml                # pnpm workspaces config
├── turbo.json                        # Turborepo config
├── tsconfig.base.json                 # Base TypeScript config
├── package.json                       # Root package.json
├── .gitignore
├── README.md
├── CONTRIBUTING.md
└── LICENSE
```

---

## Apps Directory

### API Application (`apps/api/`)

```
apps/api/
├── src/
│   ├── routes/                        # API route handlers
│   │   ├── _index.ts                 # Route index/exports
│   │   ├── auth.ts                   # Authentication routes
│   │   ├── queue.ts                  # Queue management routes
│   │   ├── tickets.ts                # Ticket routes
│   │   ├── patients.ts               # Patient routes
│   │   ├── departments.ts            # Department routes
│   │   ├── rooms.ts                  # Room routes
│   │   ├── display.ts                # TV display routes
│   │   ├── notifications.ts          # SMS/WhatsApp routes
│   │   ├── admin.ts                  # Admin routes
│   │   └── health.ts                 # Health check route
│   │
│   ├── middleware/                    # Middleware functions
│   │   ├── _index.ts
│   │   ├── auth.ts                   # JWT authentication
│   │   ├── rbac.ts                   # Role-based access control
│   │   ├── validate.ts               # Request validation
│   │   ├── rateLimit.ts              # Rate limiting
│   │   ├── cors.ts                   # CORS handling
│   │   ├── logger.ts                 # Request logging
│   │   └── errorHandler.ts           # Error handling
│   │
│   ├── services/                      # Business logic services
│   │   ├── _index.ts
│   │   ├── queue.ts                  # Queue operations
│   │   ├── ticket.ts                 # Ticket generation
│   │   ├── patient.ts                # Patient operations
│   │   ├── notification.ts           # SMS/WhatsApp
│   │   ├── display.ts                 # TV display service
│   │   ├── auth.ts                   # Authentication service
│   │   ├── user.ts                  # User management
│   │   └── analytics.ts             # Analytics service
│   │
│   ├── db/                           # Database layer
│   │   ├── client.ts                 # D1 client setup
│   │   ├── schema.ts                 # Type-safe queries
│   │   ├── types.ts                  # Database types
│   │   └── migrations/               # SQL migration files
│   │       ├── 001_initial.sql       # Initial schema
│   │       ├── 002_queue.sql         # Queue tables
│   │       ├── 003_audit.sql         # Audit tables
│   │       ├── 004_notifications.sql # Notification tables
│   │       └── 005_analytics.sql     # Analytics tables
│   │
│   ├── workers/                      # Durable Objects
│   │   ├── _index.ts
│   │   ├── websocket.ts              # WebSocket handler
│   │   ├── queue.ts                  # Queue state manager
│   │   └── session.ts                # Session manager
│   │
│   ├── utils/                        # Utility functions
│   │   ├── _index.ts
│   │   ├── jwt.ts                    # JWT utilities
│   │   ├── crypto.ts                 # Encryption utilities
│   │   ├── validation.ts             # Zod schemas
│   │   ├── response.ts              # Response helpers
│   │   ├── logger.ts                 # Logging utilities
│   │   └── constants.ts              # Constants
│   │
│   ├── types/                        # TypeScript types
│   │   ├── _index.ts
│   │   ├── context.ts                # Hono context types
│   │   ├── models.ts                 # Data model types
│   │   ├── api.ts                    # API types
│   │   └── errors.ts                # Error types
│   │
│   ├── config.ts                     # Configuration
│   ├── index.ts                      # Worker entry point
│   └── scheduled.ts                  # Scheduled tasks
│
├── migrations/                        # SQL migrations (source)
├── seed/                             # Seed data (source)
│   ├── 001_departments.sql
│   ├── 002_users.sql
│   ├── 003_rooms.sql
│   ├── 004_priorities.sql
│   └── 005_settings.sql
│
├── test/                             # API tests
│   ├── routes/
│   ├── services/
│   └── setup.ts
│
├── wrangler.toml                     # Cloudflare config
├── package.json
├── tsconfig.json
└── vitest.config.ts                 # Test configuration
```

### Web Application (`apps/web/`)

```
apps/web/
├── app/                              # Next.js App Router
│   ├── (auth)/                       # Authentication pages
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── logout/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── (dashboard)/                  # Protected dashboard pages
│   │   ├── admin/
│   │   │   ├── page.tsx
│   │   │   └── settings/
│   │   ├── doctor/
│   │   ├── nurse/
│   │   ├── receptionist/
│   │   ├── pharmacist/
│   │   ├── lab/
│   │   ├── facility/
│   │   ├── patient/
│   │   ├── it-support/
│   │   ├── layout.tsx
│   │   └── loading.tsx
│   │
│   ├── (display)/                    # TV Display pages
│   │   ├── [department]/
│   │   │   └── page.tsx             # Single department display
│   │   ├── multi/
│   │   │   └── page.tsx             # Multi-department split view
│   │   ├── fullscreen/
│   │   │   └── page.tsx             # Fullscreen mode
│   │   └── layout.tsx
│   │
│   ├── api/                          # API routes
│   │   ├── auth/
│   │   ├── queue/
│   │   └── webhooks/
│   │
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Landing page
│   ├── not-found.tsx
│   └── error.tsx
│
├── components/                       # React components
│   ├── ui/                           # Base UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── modal.tsx
│   │   ├── dropdown.tsx
│   │   ├── toast.tsx
│   │   ├── spinner.tsx
│   │   ├── table.tsx
│   │   └── ...
│   │
│   ├── dashboard/                    # Dashboard-specific components
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   ├── stats-card.tsx
│   │   ├── queue-summary.tsx
│   │   └── ...
│   │
│   ├── queue/                        # Queue components
│   │   ├── ticket-printer.tsx
│   │   ├── ticket-display.tsx
│   │   ├── queue-list.tsx
│   │   ├── queue-item.tsx
│   │   ├── call-panel.tsx
│   │   ├── patient-form.tsx
│   │   ├── priority-selector.tsx
│   │   └── ...
│   │
│   ├── display/                      # TV Display components
│   │   ├── queue-board.tsx
│   │   ├── called-patient.tsx
│   │   ├── up-next.tsx
│   │   ├── waiting-list.tsx
│   │   ├── announcements.tsx
│   │   ├── clock.tsx
│   │   ├── department-header.tsx
│   │   ├── video-overlay.tsx         # IPTV PiP
│   │   ├── audio-control.tsx
│   │   └── ...
│   │
│   ├── patient/                      # Patient components
│   │   ├── patient-card.tsx
│   │   ├── patient-search.tsx
│   │   └── ...
│   │
│   └── layout/                       # Layout components
│       ├── footer.tsx
│       ├── navigation.tsx
│       └── ...
│
├── lib/                             # Utilities
│   ├── api.ts                       # API client
│   ├── auth.ts                      # Auth utilities
│   ├── utils.ts                     # General utilities
│   ├── constants.ts                 # App constants
│   ├── cn.ts                        # Class name utility
│   └── validators.ts               # Client-side validation
│
├── hooks/                           # React hooks
│   ├── useAuth.ts                   # Authentication hook
│   ├── useQueue.ts                  # Queue operations hook
│   ├── useWebSocket.ts              # WebSocket hook
│   ├── useAudio.ts                  # TTS audio hook
│   ├── useDisplay.ts                # Display settings hook
│   └── useLocalStorage.ts           # Local storage hook
│
├── stores/                          # State management
│   ├── auth-store.ts                # Auth state (Zustand)
│   ├── queue-store.ts               # Queue state
│   └── display-store.ts             # Display state
│
├── styles/                          # Styles
│   └── globals.css                  # Global styles
│
├── public/                          # Static assets
│   ├── images/
│   ├── fonts/
│   └── audio/
│
├── test/                            # Tests
│   ├── components/
│   └── pages/
│
├── wrangler.toml                    # Cloudflare Pages config
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### Mobile Application (`apps/mobile/`)

```
apps/mobile/
├── app/                             # Expo Router pages
│   ├── (tabs)/                      # Tab navigation
│   │   ├── _layout.tsx
│   │   ├── index.tsx                # Home tab
│   │   ├── queue.tsx                # Queue tab
│   │   ├── messages.tsx             # Messages tab
│   │   └── profile.tsx              # Profile tab
│   │
│   ├── (auth)/                      # Auth screens
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   │
│   ├── patient/                     # Patient screens
│   │   ├── _layout.tsx
│   │   ├── home.tsx
│   │   ├── queue-status.tsx
│   │   ├── book-appointment.tsx
│   │   └── history.tsx
│   │
│   ├── staff/                       # Staff screens
│   │   ├── _layout.tsx
│   │   ├── dashboard.tsx
│   │   ├── call-patient.tsx
│   │   └── ...
│   │
│   ├── +layout.tsx                 # Root layout
│   ├── +page.tsx                   # Splash screen
│   └── not-found.tsx
│
├── components/                     # Mobile components
│   ├── ui/                          # Base UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   └── ...
│   │
│   ├── queue/                      # Queue components
│   │   ├── ticket-card.tsx
│   │   ├── queue-list.tsx
│   │   └── ...
│   │
│   └── patient/                    # Patient components
│       └── ...
│
├── services/                       # Services
│   ├── api.ts                       # API client
│   ├── notifications.ts             # Push notifications
│   ├── storage.ts                  # Async storage
│   ├── audio.ts                    # TTS service
│   └── websocket.ts                # WebSocket client
│
├── hooks/                          # Custom hooks
│   ├── useAuth.ts
│   ├── useQueue.ts
│   └── useNotifications.ts
│
├── constants/                      # Constants
│   ├── api.ts
│   ├── colors.ts
│   └── config.ts
│
├── types/                          # TypeScript types
│   └── index.ts
│
├── assets/                         # Assets
│   ├── images/
│   └── fonts/
│
├── app.json                        # Expo config
├── package.json
├── tsconfig.json
└── eas.json                        # EAS Build config
```

---

## Packages Directory

### Shared Package (`packages/shared/`)

```
packages/shared/
├── types/                           # TypeScript interfaces
│   ├── queue.ts                    # Queue types
│   │   ├── Ticket
│   │   ├── QueueEntry
│   │   ├── QueueStatus
│   │   └── Priority
│   │
│   ├── patient.ts                 # Patient types
│   │   ├── Patient
│   │   ├── PatientVisit
│   │   └── PatientStatus
│   │
│   ├── user.ts                    # User types
│   │   ├── User
│   │   ├── UserRole
│   │   └── UserPermissions
│   │
│   ├── api.ts                     # API types
│   │   ├── ApiResponse
│   │   ├── ApiError
│   │   └── Pagination
│   │
│   └── index.ts                   # Barrel export
│
├── schemas/                        # Zod validation schemas
│   ├── queue.ts                   # Queue schemas
│   │   ├── createTicketSchema
│   │   ├── callPatientSchema
│   │   └── updateQueueSchema
│   │
│   ├── patient.ts                 # Patient schemas
│   ├── user.ts                    # User schemas
│   ├── auth.ts                    # Auth schemas
│   └── index.ts
│
├── utils/                          # Shared utilities
│   ├── ticket.ts                  # Ticket formatting
│   │   ├── formatTicketNumber()
│   │   ├── parseTicketNumber()
│   │   └── generateTicketId()
│   │
│   ├── priority.ts               # Priority calculation
│   │   ├── calculateScore()
│   │   ├── getPriorityLevel()
│   │   └── estimateWaitTime()
│   │
│   ├── validation.ts             # Validation helpers
│   ├── phone.ts                   # Phone number formatting
│   ├── date.ts                    # Date utilities
│   └── index.ts
│
├── constants/                      # Shared constants
│   ├── departments.ts            # Department codes
│   ├── priorities.ts             # Priority levels
│   ├── statuses.ts               # Status values
│   └── index.ts
│
├── package.json
└── tsconfig.json
```

---

## Services Directory

### Docker Services (`services/docker/`)

```
services/docker/
├── docker-compose.yml              # Main compose file
├── docker-compose.override.yml    # Local overrides
├── docker-compose.prod.yml       # Production config
│
├── Dockerfile.api                 # API container
├── Dockerfile.web                 # Web container
├── Dockerfile.migrations          # Migration runner
│
├── nginx/
│   └── nginx.conf                 # Reverse proxy config
│
└── scripts/
    ├── wait-for-it.sh            # Wait for services
    └── seed.sh                    # Database seeding
```

---

## Docs Directory

```
docs/
├── 00-Master/
│   └── README.md                   # This master index
│
├── 01-Foundations/
│   ├── MASTER.md
│   ├── quick-start/
│   │   └── 5-MINUTE-START.md
│   ├── prerequisites/
│   │   └── SOFTWARE-REQUIREMENTS.md
│   ├── installation/
│   │   └── LOCAL-SETUP.md
│   └── project-structure/
│       └── PROJECT-TREE.md
│
├── 02-Architecture/
│   ├── MASTER.md
│   ├── system-design/
│   │   └── ARCHITECTURE.md
│   ├── data-flow/
│   │   └── REQUEST-LIFECYCLE.md
│   ├── component-models/
│   │   └── COMPONENTS.md
│   ├── security-architecture/
│   │   └── SECURITY.md
│   └── scalability/
│       └── CAPACITY.md
│
├── 03-Queue-Engine/
│   ├── MASTER.md
│   ├── ticket-system/
│   │   └── TICKET-GENERATION.md
│   ├── priority-queue/
│   │   └── PRIORITY-ALGORITHM.md
│   ├── call-system/
│   │   └── CALL-SYSTEM.md
│   ├── tv-display/
│   │   ├── TV-DISPLAY.md
│   │   └── IPTV.md
│   └── announcements/
│       └── AUDIO.md
│
├── 04-API/
│   ├── MASTER.md
│   └── openapi.yaml
│
├── 05-Database/
│   └── MASTER.md
│
├── 06-Frontend/
│   └── MASTER.md
│
├── 07-Security/
│   └── MASTER.md
│
├── 08-Testing/
│   └── MASTER.md
│
├── 09-Deployment/
│   └── MASTER.md
│
├── 10-Monitoring/
│   └── MASTER.md
│
├── 11-Performance/
│   └── MASTER.md
│
├── 12-Security-Audit/
│   └── MASTER.md
│
├── 13-Troubleshooting/
│   └── MASTER.md
│
└── 14-Reference/
    └── MASTER.md
```

---

## GitHub Directory

```
.github/
├── workflows/                       # GitHub Actions workflows
│   ├── ci.yml                       # Continuous integration
│   ├── deploy-api.yml               # API deployment
│   ├── deploy-web.yml               # Web deployment
│   ├── deploy-mobile.yml            # Mobile build
│   ├── lint.yml                     # Linting
│   └── test.yml                     # Test runner
│
├── ISSUE_TEMPLATE/                  # Issue templates
│   ├── bug_report.md
│   ├── feature_request.md
│   └── documentation.md
│
└── PULL_REQUEST_TEMPLATE.md         # PR template
```

---

## Key Files Reference

### Configuration Files

| File | Purpose |
|------|---------|
| `pnpm-workspace.yaml` | pnpm monorepo workspace config |
| `turbo.json` | Turborepo build orchestration |
| `tsconfig.base.json` | Base TypeScript configuration |
| `wrangler.toml` | Cloudflare Workers configuration |
| `docker-compose.yml` | Docker orchestration |
| `next.config.js` | Next.js configuration |
| `tailwind.config.ts` | Tailwind CSS configuration |

### Entry Points

| File | Purpose |
|------|---------|
| `apps/api/src/index.ts` | Cloudflare Worker entry point |
| `apps/web/app/layout.tsx` | Next.js root layout |
| `apps/mobile/app/+page.tsx` | Expo mobile splash |
| `packages/shared/index.ts` | Shared package entry |

### Database Files

| File | Purpose |
|------|---------|
| `apps/api/src/db/migrations/*.sql` | Database schema migrations |
| `apps/api/seed/*.sql` | Initial seed data |
| `apps/api/src/db/schema.ts` | Type-safe query builder |

---

## Related Documents

| Document | Path |
|----------|------|
| Quick Start | [../quick-start/5-MINUTE-START.md](../quick-start/5-MINUTE-START.md) |
| Local Setup | [../installation/LOCAL-SETUP.md](../installation/LOCAL-SETUP.md) |
| System Architecture | [../../02-Architecture/system-design/ARCHITECTURE.md](../../02-Architecture/system-design/ARCHITECTURE.md) |

---

*Last updated: March 20, 2026*
