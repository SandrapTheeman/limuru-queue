#!/bin/bash
# Hospital Queue System - Setup Script
# This script automates the initial setup for local development

set -e

echo "=============================================="
echo "Hospital Queue System v2.0 - Setup"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

success() { echo -e "${GREEN}✓${NC} $1"; }
info() { echo -e "${YELLOW}→${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; }

# Check prerequisites
info "Checking prerequisites..."

# Check Node.js
if command -v node &> /dev/null; then
    success "Node.js: $(node --version)"
else
    error "Node.js not found. Please install Node.js 18+"
    exit 1
fi

# Check Wrangler
if command -v wrangler &> /dev/null; then
    success "Wrangler: $(wrangler --version)"
else
    info "Installing Wrangler..."
    npm install -g wrangler
    success "Wrangler installed"
fi

echo ""
info "Starting setup..."

# Navigate to API directory
cd apps/api

# Check if database_id is set
if grep -q "REPLACE_WITH_YOUR_DATABASE_ID" wrangler.toml; then
    echo ""
    info "D1 Database not configured yet."
    info "Please run: wrangler d1 create hospital-queue"
    info "Then update wrangler.toml with the database_id"
    echo ""
fi

# Install dependencies
info "Installing dependencies..."
npm install 2>&1 | tail -5

success "Dependencies installed"

# Apply migrations
info "Applying D1 migrations..."
read -p "Enter database name (default: hospital-queue): " db_name
db_name=${db_name:-hospital-queue}

echo ""
info "To apply migrations, run:"
echo "  cd apps/api"
echo "  wrangler d1 create $db_name"
echo "  # Update wrangler.toml with the database_id"
echo "  wrangler d1 migrations apply $db_name"
echo ""

# Start development
read -p "Start Wrangler dev server now? (y/n): " start_now
if [ "$start_now" = "y" ]; then
    echo ""
    info "Starting Wrangler dev server..."
    echo "  API will be available at: http://localhost:8787"
    echo "  Press Ctrl+C to stop"
    echo ""
    wrangler dev --persist
fi

echo ""
success "Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Create D1 database: wrangler d1 create hospital-queue"
echo "  2. Update wrangler.toml with database_id"
echo "  3. Apply migrations: wrangler d1 migrations apply hospital-queue"
echo "  4. Start dev: wrangler dev --persist"
echo "  5. Test API: curl http://localhost:8787/health"
