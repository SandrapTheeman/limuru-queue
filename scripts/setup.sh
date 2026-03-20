#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "=========================================="
echo "Hospital Queue System - Initial Setup"
echo "=========================================="

echo "Checking Node.js version..."
NODE_VERSION=$(node -v)
REQUIRED_VERSION="v18.0.0"
if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "Error: Node.js $REQUIRED_VERSION or higher required. Found: $NODE_VERSION"
    exit 1
fi
echo "  Node.js: $NODE_VERSION ✓"

echo ""
echo "Checking pnpm..."
if ! command -v pnpm &> /dev/null; then
    echo "Error: pnpm not found. Install with: npm install -g pnpm"
    exit 1
fi
PNPM_VERSION=$(pnpm --version)
echo "  pnpm: $PNPM_VERSION ✓"

echo ""
echo "Installing dependencies..."
pnpm install

echo ""
echo "Setting up environment variables..."
if [ -f .env ]; then
    echo "  .env already exists"
else
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "  Created .env from .env.example"
        echo "  ⚠️  Please edit .env with your configuration"
    else
        echo "  Warning: No .env.example found"
    fi
fi

echo ""
echo "Verifying project structure..."
for dir in apps/api apps/web apps/mobile packages/shared; do
    if [ -d "$dir" ]; then
        echo "  $dir ✓"
    else
        echo "  $dir ✗ (missing)"
    fi
done

echo ""
echo "Running typecheck..."
pnpm typecheck || true

echo ""
echo "=========================================="
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "  ./scripts/dev.sh          - Start development servers"
echo "  docker-compose -f services/docker-compose.local.yml up -d"
echo "                           - Start Docker services (DB, etc.)"
echo "=========================================="