#!/bin/bash
# Hospital Queue System - Quick Test Script
# Tests the local development setup

set -e

echo "=================================="
echo "Hospital Queue System - Quick Test"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
success() { echo -e "${GREEN}✓${NC} $1"; }
info() { echo -e "${YELLOW}→${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; }

# Check if running from project root
if [ ! -d "apps/api" ]; then
    error "Please run from project root directory"
    exit 1
fi

echo ""
info "Checking prerequisites..."
echo ""

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    success "Node.js: $NODE_VERSION"
else
    error "Node.js not found"
    exit 1
fi

# Check pnpm
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm --version)
    success "pnpm: $PNPM_VERSION"
else
    info "pnpm not found, trying npm..."
fi

# Check Wrangler
if command -v wrangler &> /dev/null; then
    WRANGLER_VERSION=$(wrangler --version)
    success "Wrangler: $WRANGLER_VERSION"
else
    error "Wrangler not found"
    info "Install with: npm install -g wrangler"
    exit 1
fi

# Check Docker (optional)
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
    success "Docker: $DOCKER_VERSION"
else
    info "Docker not found (optional for PostgreSQL)"
fi

echo ""
info "Checking project structure..."
echo ""

# Check key directories
DIRS=(
    "apps/api/src/routes"
    "apps/api/src/services"
    "apps/web/lib"
    "apps/mobile/app"
    "packages/shared"
    "docs/DEVELOPER"
    "docs/TRAINING"
)

for dir in "${DIRS[@]}"; do
    if [ -d "$dir" ]; then
        success "$dir exists"
    else
        error "$dir missing"
    fi
done

echo ""
info "Checking voice call files..."
echo ""

# Check voice call implementation
VOICE_FILES=(
    "apps/api/src/routes/voice.ts"
    "apps/api/src/services/voice.ts"
    "apps/web/lib/api/voice.ts"
    "apps/web/lib/stores/voice.ts"
    "apps/mobile/lib/api/voice.ts"
    "apps/mobile/lib/stores/voice.ts"
    "packages/shared/types/voice.ts"
)

for file in "${VOICE_FILES[@]}"; do
    if [ -f "$file" ]; then
        success "$file exists"
    else
        error "$file missing"
    fi
done

echo ""
info "Checking documentation..."
echo ""

DOCS=(
    "docs/DEVELOPER/LOCAL-DEVELOPMENT.md"
    "docs/DEVELOPER/CLOUD-DEVELOPMENT.md"
    "docs/SETUP.md"
    "docs/TRAINING/QUICKCARD-WRANGLER.md"
)

for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        success "$doc exists"
    else
        error "$doc missing"
    fi
done

echo ""
info "Checking package.json files..."
echo ""

PACKAGES=(
    "package.json"
    "apps/api/package.json"
    "apps/web/package.json"
    "apps/mobile/package.json"
    "packages/shared/package.json"
)

for pkg in "${PACKAGES[@]}"; do
    if [ -f "$pkg" ]; then
        success "$pkg exists"
    else
        error "$pkg missing"
    fi
done

echo ""
info "Checking wrangler.toml..."
echo ""

if [ -f "apps/api/wrangler.toml" ]; then
    success "apps/api/wrangler.toml exists"
    echo ""
    info "D1 Database bindings:"
    grep -A2 "d1_databases" apps/api/wrangler.toml || true
    echo ""
    info "KV Namespace bindings:"
    grep -A2 "kv_namespaces" apps/api/wrangler.toml || true
else
    error "apps/api/wrangler.toml missing"
fi

echo ""
echo "=================================="
echo "Quick Test Complete!"
echo "=================================="
echo ""
info "Next steps:"
echo "  1. Install dependencies: pnpm install"
echo "  2. Start API: pnpm dev:wrangler"
echo "  3. Or: cd apps/api && wrangler dev --persist"
echo ""
