# Deployment Guide

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Cloudflare Setup](#2-cloudflare-setup)
3. [Environment Configuration](#3-environment-configuration)
4. [Database Setup](#4-database-setup)
5. [Deployment](#5-deployment)
6. [GitHub Actions CI/CD](#6-github-actions-cicd)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Prerequisites

### 1.1 Required Accounts

| Service | Required | Sign Up |
|---------|----------|---------|
| Cloudflare Account | Yes | [cloudflare.com](https://cloudflare.com) |
| Cloudflare Workers Paid Plan | Recommended (for production) | Upgrade in Dashboard |

### 1.2 Required Tools

```bash
# Install Node.js 18+
node --version  # Should be >= 18.0.0

# Install pnpm
npm install -g pnpm
pnpm --version  # Should be >= 9.0.0

# Install Wrangler CLI
npm install -g wrangler
wrangler --version  # Should be >= 4.0.0
```

### 1.3 Local Setup

```bash
# Clone repository
git clone <repository-url>
cd "Hospital Queueing System"

# Install dependencies
pnpm install

# Verify installation
pnpm build
```

---

## 2. Cloudflare Setup

### 2.1 Create D1 Database

```bash
# Navigate to API directory
cd apps/api

# Create D1 database
wrangler d1 create limuru-queue-db

# Note the output - you'll need the database_id
# Output format:
# { binding = "DB", database_name = "limuru-queue-db", database_id = "xxxxxx-xxxx-xxxx" }
```

### 2.2 Create KV Namespaces

```bash
# Session storage
wrangler kv:namespace create limuru-queue-sessions --env production
# Save the ID

# Cache storage
wrangler kv:namespace create limuru-queue-cache --env production

# Rate limiting
wrangler kv:namespace create limuru-queue-ratelimit --env production
```

### 2.3 Create R2 Buckets

```bash
# Assets bucket
wrangler r2 bucket create limuru-queue-assets

# Backup bucket
wrangler r2 bucket create limuru-queue-backups
```

---

## 3. Environment Configuration

### 3.1 Update wrangler.toml

Edit `apps/api/wrangler.toml`:

```toml
# Basic settings
name = "limuru-queue-api"
main = "src/index.ts"
compatibility_date = "2024-10-22"
nodejs_compat = true

# ===========================================
# D1 Database
# ===========================================
[[d1_databases]]
binding = "DB"
database_name = "limuru-queue-db"
database_id = "YOUR_DATABASE_ID_HERE"  # Replace with actual ID
migrations_dir = "src/db/migrations"

# ===========================================
# KV Namespaces (Production)
# ===========================================
[env.production.kv_namespaces]
binding = "SESSION_KV"
id = "YOUR_SESSION_KV_ID"

binding = "CACHE_KV"
id = "YOUR_CACHE_KV_ID"

binding = "RATE_LIMIT_KV"
id = "YOUR_RATE_LIMIT_KV_ID"

# ===========================================
# R2 Buckets
# ===========================================
[[env.production.r2_buckets]]
binding = "ASSETS_BUCKET"
bucket_name = "limuru-queue-assets"

[[env.production.r2_buckets]]
binding = "BACKUP_BUCKET"
bucket_name = "limuru-queue-backups"
```

### 3.2 Set Environment Variables

Create `.env.production`:

```bash
# Application
NODE_ENV=production
API_URL=https://api.limuruhospital.co.ke
WEB_URL=https://limuruhospital.co.ke

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=your_account_id

# Authentication
JWT_SECRET=generate_with_openssl_rand_base64_32
DEFAULT_PASSWORD=ChangeMeAfterFirstLogin!

# HMS (Optional)
HMS_ADAPTER_TYPE=mock
```

### 3.3 Set Secrets

```bash
# JWT Secret (REQUIRED)
wrangler secret put JWT_SECRET --env production
# Enter a secure random string when prompted

# Default Password (REQUIRED)
wrangler secret put DEFAULT_PASSWORD --env production
# Enter the default password

# Optional secrets
wrangler secret put TWILIO_ACCOUNT_SID --env production
wrangler secret put TWILIO_AUTH_TOKEN --env production
wrangler secret put TWILIO_PHONE_NUMBER --env production
wrangler secret put WHATSAPP_API_TOKEN --env production
```

---

## 4. Database Setup

### 4.1 Run Migrations

```bash
cd apps/api

# Apply migrations to production
wrangler d1 migrations apply limuru-queue-db --env production

# Verify migrations
wrangler d1 migrations list limuru-queue-db --env production
```

### 4.2 Seed Initial Data

```bash
# The seed data is included in migrations
# Check that default departments are created:
wrangler d1 execute limuru-queue-db --env production --command "SELECT * FROM departments"
```

Expected departments:
- General Medicine (MED)
- Pediatrics (PED)
- Gynecology (GYN)
- Orthopedics (ORTHO)
- Dental (DEN)
- Ophthalmology (OPH)
- Cardiology (CARD)
- Emergency (EMER)

### 4.3 Create Admin User

Migrations create a default admin user:

```bash
# Verify admin user exists
wrangler d1 execute limuru-queue-db --env production --command "SELECT email, role FROM users WHERE role='admin' LIMIT 1"
```

Default credentials:
- Email: `admin@limuruhospital.co.ke`
- Password: Set via `DEFAULT_PASSWORD` secret

---

## 5. Deployment

### 5.1 Deploy API

```bash
cd apps/api

# Deploy to production
wrangler deploy --env production

# Monitor deployment
wrangler tail --env production
```

### 5.2 Verify Deployment

```bash
# Test API health
curl https://api.limuruhospital.co.ke/api/health

# Expected response:
# {"success":true,"data":{"status":"healthy","version":"2.0.0"}}

# Test authentication
curl -X POST https://api.limuruhospital.co.ke/api/auth/staff/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@limuruhospital.co.ke","password":"your_password"}'
```

### 5.3 Configure Custom Domain

1. Go to Cloudflare Dashboard
2. Navigate to Workers & Pages
3. Select your worker
4. Go to Settings → Custom Domains
5. Add `api.limuruhospital.co.ke`
6. Create DNS record:
   - Type: CNAME
   - Name: api
   - Target: limuru-queue-api.<username>.workers.dev
   - Proxy: Yes

---

## 6. GitHub Actions CI/CD

### 6.1 Required Secrets

Add these to your GitHub repository settings (Settings → Secrets):

| Secret Name | Description |
|-------------|-------------|
| CLOUDFLARE_ACCOUNT_ID | Cloudflare Account ID |
| CLOUDFLARE_API_TOKEN | Cloudflare API Token |
| JWT_SECRET | JWT signing secret |
| DEFAULT_PASSWORD | Default user password |
| TWILIO_ACCOUNT_SID | Twilio Account SID (optional) |
| TWILIO_AUTH_TOKEN | Twilio Auth Token (optional) |

### 6.2 Create API Token

1. Go to Cloudflare Dashboard
2. Profile → API Tokens
3. Create Custom Token
4. Add permissions:
   - Account: Workers Scripts (Edit)
   - Account: D1 (Edit)
   - Account: KV Namespaces (Edit)
   - Account: R2 (Edit)
5. Create and copy token

### 6.3 Workflow File

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'
  CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
  CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install

      - name: Typecheck
        run: pnpm typecheck

      - name: Lint
        run: pnpm lint

      - name: Test
        run: pnpm test

  deploy-staging:
    needs: lint-and-test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install

      - name: Deploy to Staging
        run: |
          cd apps/api
          wrangler deploy --env staging
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

  deploy-production:
    needs: deploy-staging
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install

      - name: Deploy to Production
        run: |
          cd apps/api
          wrangler deploy --env production
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
          DEFAULT_PASSWORD: ${{ secrets.DEFAULT_PASSWORD }}
```

---

## 7. Troubleshooting

### 7.1 Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Deployment fails | Missing secrets | Set all required secrets |
| D1 errors | Wrong database_id | Update wrangler.toml |
| 401 on API | Invalid JWT secret | Regenerate JWT_SECRET |
| KV errors | Wrong namespace ID | Update kv_namespaces in wrangler.toml |
| CORS errors | Wrong origin | Update CORS configuration |

### 7.2 Debug Commands

```bash
# Check worker status
wrangler whoami

# Validate wrangler.toml
wrangler deploy --dry-run --env production

# Test database connection
wrangler d1 execute limuru-queue-db --env production --command "SELECT 1"

# View real-time logs
wrangler tail --env production --status error
```

### 7.3 Rollback

```bash
# List deployments
wrangler deployments list --env production

# Rollback to previous
wrangler deployments rollback <deployment-id> --env production
```

---

## 8. Post-Deployment Checklist

- [ ] API is responding at expected URL
- [ ] Authentication works for admin user
- [ ] Database migrations applied successfully
- [ ] KV namespaces connected
- [ ] R2 buckets accessible
- [ ] Custom domain configured
- [ ] SSL certificate issued
- [ ] Monitoring alerts set up
- [ ] Backup schedule configured
- [ ] Team members have access
