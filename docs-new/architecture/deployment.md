# Cloudflare Deployment Guide

## 1. Overview

This guide covers the deployment of the Limuru Cottage Hospital Queue Management System to Cloudflare's edge network using Workers, D1, KV, and R2.

---

## 2. Prerequisites

### 2.1 Required Accounts

| Service | Requirement | Signup |
|---------|-------------|--------|
| Cloudflare | Account required | [cloudflare.com](https://cloudflare.com) |
| Wrangler CLI | v4.x installed | `npm install -g wrangler` |

### 2.2 Required Tools

```bash
# Install Wrangler globally
npm install -g wrangler

# Verify installation
wrangler --version
# Should output: wrangler 4.x.x

# Install Node.js dependencies
pnpm install
```

---

## 3. Cloudflare Resources Setup

### 3.1 Create D1 Database

```bash
# Navigate to API directory
cd apps/api

# Create D1 database
wrangler d1 create limuru-queue-db

# Note the database_id from output
# Output format:
# { binding = "DB", database_name = "limuru-queue-db", database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }
```

### 3.2 Create KV Namespaces

```bash
# Create KV for sessions
wrangler kv:namespace create limuru-queue-kv --env production
# Save the id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Create KV for cache
wrangler kv:namespace create limuru-queue-cache --env production

# Create KV for rate limiting
wrangler kv:namespace create limuru-queue-ratelimit --env production
```

### 3.3 Create R2 Buckets

```bash
# Create R2 bucket for assets
wrangler r2 bucket create limuru-queue-assets

# Create R2 bucket for backups
wrangler r2 bucket create limuru-queue-backups
```

---

## 4. Configure Wrangler

### 4.1 Update wrangler.toml

```toml
# apps/api/wrangler.toml
name = "limuru-queue-api"
main = "src/index.ts"
compatibility_date = "2024-10-22"
nodejs_compat = true
usage_model = "bundled"

# ===========================================
# D1 Database
# ===========================================
[[d1_databases]]
binding = "DB"
database_name = "limuru-queue-db"
database_id = "YOUR_DATABASE_ID_HERE"
migrations_dir = "src/db/migrations"

# ===========================================
# KV Namespaces
# ===========================================
[[kv_namespaces]]
binding = "SESSION_KV"
id = "YOUR_SESSION_KV_ID"

[[kv_namespaces]]
binding = "CACHE_KV"
id = "YOUR_CACHE_KV_ID"

[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "YOUR_RATE_LIMIT_KV_ID"

# ===========================================
# R2 Storage
# ===========================================
[[r2_buckets]]
binding = "ASSETS_BUCKET"
bucket_name = "limuru-queue-assets"

[[r2_buckets]]
binding = "BACKUP_BUCKET"
bucket_name = "limuru-queue-backups"

# ===========================================
# Durable Objects
# ===========================================
[[durable_objects.bindings]]
name = "QUEUE_ROOM"
class_name = "QueueRoomDO"

[[durable_objects.bindings]]
name = "PATIENT_SYNC"
class_name = "PatientSyncDO"

# ===========================================
# Environments
# ===========================================
[env.staging]
name = "limuru-queue-api-staging"

[env.production]
name = "limuru-queue-api"
```

### 4.2 Environment Variables

Create a `.env` file:

```bash
# .env
NODE_ENV=production
API_URL=https://api.limuruhospital.co.ke
WEB_URL=https://limuruhospital.co.ke

# Authentication
JWT_SECRET=your-super-secret-jwt-key-generate-with-openssl-rand-base64-32
DEFAULT_PASSWORD=ChangeMeAfterFirstLogin!

# HMS Adapter (optional)
HMS_ADAPTER_TYPE=mock
```

---

## 5. Set Secrets

### 5.1 Required Secrets

```bash
# JWT Secret (generate secure random string)
wrangler secret put JWT_SECRET
# Enter a secure random string (minimum 32 characters)

# Default Password
wrangler secret put DEFAULT_PASSWORD
# Enter the default password for new users
```

### 5.2 Optional Secrets

```bash
# Twilio (for SMS/WhatsApp)
wrangler secret put TWILIO_ACCOUNT_SID
wrangler secret put TWILIO_AUTH_TOKEN
wrangler secret put TWILIO_PHONE_NUMBER

# WhatsApp
wrangler secret put WHATSAPP_API_TOKEN
wrangler secret put WHATSAPP_PHONE_NUMBER

# OpenRouter (for AI features)
wrangler secret put OPENROUTER_API_KEY
```

---

## 6. Database Migrations

### 6.1 Run Migrations

```bash
cd apps/api

# Apply migrations to production
wrangler d1 migrations apply limuru-queue-db --env production

# Or for local development
wrangler d1 migrations apply limuru-queue-db
```

### 6.2 Verify Migration

```bash
# List tables
wrangler d1 execute limuru-queue-db --command "SELECT name FROM sqlite_master WHERE type='table';" --env production

# Check migration status
wrangler d1 migrations list limuru-queue-db --env production
```

---

## 7. Deploy Application

### 7.1 Deploy to Staging

```bash
cd apps/api

# Deploy to staging environment
wrangler deploy --env staging

# Monitor deployment
wrangler tail --env staging
```

### 7.2 Deploy to Production

```bash
cd apps/api

# Deploy to production
wrangler deploy --env production

# Monitor deployment
wrangler tail --env production
```

### 7.3 Verify Deployment

```bash
# Test API endpoint
curl https://api.limuruhospital.co.ke/api/health

# Expected response:
# {"success":true,"data":{"status":"healthy","version":"2.0.0"}}
```

---

## 8. Configure Custom Domain

### 8.1 Add Domain

```bash
# Add custom domain to worker
wrangler routes update --env production --route "api.limuruhospital.co.ke/*"
```

### 8.2 DNS Configuration

Add a CNAME record in Cloudflare DNS:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | api | limuru-queue-api.pages.dev | Proxied |

---

## 9. CI/CD with GitHub Actions

### 9.1 Create Workflow File

```yaml
# .github/workflows/deploy.yml
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
  deploy:
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

      - name: Run tests
        run: pnpm test

      - name: Deploy to Staging
        if: github.ref == 'refs/heads/main'
        run: |
          cd apps/api
          wrangler deploy --env staging
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

  deploy-production:
    needs: deploy
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Production
        run: |
          cd apps/api
          wrangler deploy --env production
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### 9.2 Required Secrets

Add these to GitHub repository settings:

| Secret | Description |
|--------|-------------|
| CLOUDFLARE_ACCOUNT_ID | Cloudflare Account ID |
| CLOUDFLARE_API_TOKEN | Cloudflare API Token |
| JWT_SECRET | JWT signing secret |
| DEFAULT_PASSWORD | Default user password |

---

## 10. Monitoring and Logs

### 10.1 View Real-time Logs

```bash
# Tail production logs
wrangler tail --env production

# Tail with filter
wrangler tail --env production --status error

# Tail specific function
wrangler tail --env production --function queue-handler
```

### 10.2 Analytics Dashboard

Access the Cloudflare Dashboard:
1. Go to Workers & Pages
2. Select your worker
3. View Analytics and Logs

### 10.3 Set Up Sentry (Optional)

```bash
# Create Sentry project
npx sentry-cli projects create --org your-org --platform node

# Add DSN to secrets
wrangler secret put SENTRY_DSN
```

---

## 11. Performance Optimization

### 11.1 Enable Caching

Configure cache headers in your API responses:

```typescript
// In route handlers
c.res.headers.set('Cache-Control', 'public, max-age=300');
```

### 11.2 Configure Rate Limits

Update `wrangler.toml`:

```toml
[limits]
cpu_ms = 50      # CPU time limit per request
memory_mb = 128  # Memory limit
```

### 11.3 Use Durable Objects Wisely

- Use for real-time features only
- Implement proper state cleanup
- Consider stateless design where possible

---

## 12. Backup and Recovery

### 12.1 Database Backup

```bash
# Export database
wrangler d1 export limuru-queue-db --output backup.sql

# Schedule automatic backups (use Cloudflare Cron)
```

### 12.2 Restore Database

```bash
# Restore from backup
wrangler d1 execute limuru-queue-db --file=backup.sql --env production
```

### 12.3 R2 Backup

Configure lifecycle rules in R2 dashboard:
- Move old files to R2 Deep Archive after 90 days
- Enable versioned backups

---

## 13. Security Checklist

- [ ] JWT_SECRET is set and secure
- [ ] DEFAULT_PASSWORD is changed after first deployment
- [ ] Rate limiting is enabled
- [ ] CORS is properly configured
- [ ] API endpoints have proper authorization
- [ ] Secrets are set via `wrangler secret`
- [ ] Custom domain has HTTPS enabled
- [ ] Audit logging is active

---

## 14. Troubleshooting

### 14.1 Common Issues

| Issue | Solution |
|-------|----------|
| 404 on API | Check route configuration in wrangler.toml |
| D1 errors | Verify database_id and run migrations |
| KV errors | Check namespace IDs are correct |
| Deployment failed | Check wrangler version compatibility |
| Secrets not found | Use `wrangler secret put` for each required secret |

### 14.2 Debug Commands

```bash
# Check worker status
wrangler whoami

# Validate configuration
wrangler deploy --dry-run

# Check secrets
wrangler secret list

# Test locally
wrangler dev --port 8787
```

---

## 15. Support

| Channel | Contact |
|---------|---------|
| Documentation | [developers.cloudflare.com](https://developers.cloudflare.com) |
| Discord | Cloudflare Developers Discord |
| Support | Cloudflare Support (via Dashboard) |
