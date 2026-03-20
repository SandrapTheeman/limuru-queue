#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "=========================================="
echo "Hospital Queue System - Build"
echo "=========================================="

echo "Cleaning previous builds..."
pnpm clean

echo ""
echo "Building all packages and apps..."
pnpm build

echo ""
echo "Build complete!"
echo "=========================================="