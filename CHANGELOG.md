# Changelog

All notable changes to the Limuru Cottage Hospital Queue Management System.

## [2.0.0] - March 2026

### 🎉 Major Changes

#### Architecture Upgrade
- **Cloudflare Workers** - API now runs on Cloudflare Workers edge network
- **Hono.js** - Lightweight web framework replacing Express.js
- **D1 SQLite** - Built-in local database (no Docker required for development)
- **Wrangler v4** - Modern local development experience

#### New Features
- **Voice Calls** - Real-time voice communication between staff using WebRTC
  - Call initiation with priority levels (normal, urgent, emergency)
  - Accept/reject/hangup functionality
  - Call hold and resume
  - Call transfer (attended and blind)
  - Call history with filtering
  - Staff directory with search
  - Incoming call modal with accept/reject
  - Active call UI with duration timer

#### Documentation
- **200+ documentation files** created/updated
- **LOCAL-DEVELOPMENT.md** - Unified local development guide
- **D1-DATABASE.md** - Complete D1 SQLite database guide
- **QUICKCARD-WRANGLER.md** - Wrangler commands quick reference
- **QUICKCARD-D1.md** - D1 database commands quick reference
- **Voice Calls Documentation** - 5 files covering WebRTC setup, API, UI integration

### 📦 New Files

#### Voice Call Implementation
| File | Description |
|------|-------------|
| `apps/api/src/routes/voice.ts` | Voice call API routes |
| `apps/api/src/services/voice.ts` | Voice call business logic |
| `apps/web/lib/api/voice.ts` | Web API client |
| `apps/web/lib/stores/voice.ts` | Web state management |
| `apps/web/lib/components/VoiceCall*.tsx` | Web UI components |
| `apps/mobile/lib/api/voice.ts` | Mobile API client |
| `apps/mobile/lib/stores/voice.ts` | Mobile state management |
| `apps/mobile/app/(staff)/calls/*.tsx` | Mobile call screens |
| `packages/shared/types/voice.ts` | Shared TypeScript types |

#### Documentation
| File | Description |
|------|-------------|
| `docs/DEVELOPER/LOCAL-DEVELOPMENT.md` | Local dev guide (279 lines) |
| `docs/DEVELOPER/D1-DATABASE.md` | D1 guide (350+ lines) |
| `docs/TRAINING/QUICKCARD-D1.md` | D1 commands |
| `docs/REFERENCE/ADVANCED/11-voice-calls/*` | Voice calls docs |

#### Database
| File | Description |
|------|-------------|
| `apps/api/src/db/migrations/0006_add_messages.sql` | Messages table |
| `apps/api/src/db/migrations/0007_seed_data.sql` | Seed data |

### 🛠️ Technology Updates

| Component | Before | After |
|-----------|--------|-------|
| API Runtime | Express.js | Cloudflare Workers + Hono.js |
| Local Database | PostgreSQL (Docker) | D1 SQLite (built-in) |
| Database (Production) | PostgreSQL | PostgreSQL (optional) / D1 |
| Frontend | Static HTML | Next.js 14 |
| React | 18.2.0 | 18.3.1 |
| Mobile | Expo SDK 50 | Expo SDK 52 |
| React Native | 0.73.4 | 0.76 |
| Local Dev Tool | Docker Compose | Wrangler v4 |
| Compatibility Date | 2024-01-01 | 2024-10-22 |

### 📊 Statistics

| Metric | v1.0 | v2.0 |
|--------|------|------|
| Source Files | 140 | 176 |
| Documentation Files | 165+ | 202 |
| API Routes | 50+ | 58+ |
| Web Components | 14 | 17 |
| Voice Call Files | 0 | 7 |
| Database Tables | 10 | 11 |
| D1 Migrations | 0 | 8 |

### 🔧 Migration from v1.0

#### Prerequisites
- Node.js 18+
- Wrangler CLI v4
- Docker (optional, for PostgreSQL testing)

#### Steps
```bash
# 1. Install Wrangler
npm install -g wrangler

# 2. Navigate to project
cd Cottage-Queuing-System

# 3. Create D1 database
cd apps/api
wrangler d1 create hospital-queue

# 4. Update wrangler.toml with database_id

# 5. Apply migrations
wrangler d1 migrations apply hospital-queue

# 6. Start development
wrangler dev --persist
```

### ⚠️ Breaking Changes

1. **API Base URL** - Still `http://localhost:8787` but now runs on Wrangler
2. **Database** - Changed from PostgreSQL to D1 SQLite
3. **Dependencies** - Updated package.json for Cloudflare Workers

### 🐛 Bug Fixes

- Fixed deprecated `--local` flag in Wrangler commands
- Fixed wrong file paths in documentation
- Cleaned template artifacts from documentation files
- Fixed broken links across documentation

---

## [1.0.0] - Previous Versions

### Initial Release
- Docker-based deployment
- Express.js REST API
- PostgreSQL database
- Static HTML frontend
- Basic queue management
- Staff dashboards
- Patient self-service
- SMS notifications
- Admin panel

---

## Resources

- [Migration Guide](./docs/DEVELOPER/LOCAL-DEVELOPMENT.md)
- [D1 Setup](./docs/DEVELOPER/D1-DATABASE.md)
- [Wrangler Commands](./docs/TRAINING/QUICKCARD-WRANGLER.md)
