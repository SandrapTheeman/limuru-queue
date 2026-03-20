#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "=========================================="
echo "Hospital Queue System - Development Mode"
echo "=========================================="

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    pnpm install
fi

echo ""
echo "Starting development servers..."
echo "  - API:    http://localhost:8787"
echo "  - Web:    http://localhost:3000"
echo "  - Mobile: Use Expo"
echo ""
echo "Press Ctrl+C to stop all servers"
echo "=========================================="

pnpm dev