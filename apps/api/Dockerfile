# Hospital Queue System - Cloudflare Worker API Dockerfile
# Multi-stage build for production deployment

# ============================================
# Base Stage - Install dependencies
# ============================================
FROM node:20-alpine AS base

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# Copy package files
COPY apps/api/package.json apps/api/pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --no-frozen-lockfile --filter=api

# ============================================
# Builder Stage - Build the application
# ============================================
FROM base AS builder

WORKDIR /app

# Copy source code
COPY apps/api/src ./src
COPY apps/api/wrangler.toml ./
COPY apps/api/tsconfig.json ./

# ============================================
# Production Stage - Minimal runtime
# ============================================
FROM node:20-alpine AS production

WORKDIR /app

# Install production dependencies only
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# Copy package files
COPY apps/api/package.json apps/api/pnpm-lock.yaml* ./

# Install production dependencies
RUN pnpm install --no-frozen-lockfile --prod --filter=api

# Copy source code
COPY apps/api/src ./src
COPY apps/api/wrangler.toml ./
COPY apps/api/tsconfig.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port (for reference, Cloudflare Workers don't need this)
EXPOSE 8787

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8787/health || exit 1

# Start command (Cloudflare Workers use 'wrangler dev' locally)
CMD ["npx", "wrangler", "dev", "--local", "--port", "8787"]
