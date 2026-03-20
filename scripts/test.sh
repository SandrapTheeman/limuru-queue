#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "=========================================="
echo "Hospital Queue System - Test Suite"
echo "=========================================="

MODE="${1:-all}"

run_tests() {
    local app="$1"
    local path="apps/$app"
    
    if [ -d "$path" ] && [ -f "$path/package.json" ]; then
        echo ""
        echo "Testing $app..."
        echo "----------------------------------------"
        pnpm --filter "@hospital-queue/$app" test
    fi
}

case "$MODE" in
    api)
        run_tests "api"
        ;;
    web)
        run_tests "web"
        ;;
    mobile)
        run_tests "mobile"
        ;;
    e2e)
        echo "Running E2E tests with Playwright..."
        pnpm test:e2e
        ;;
    all)
        run_tests "api"
        run_tests "web"
        run_tests "mobile"
        ;;
    *)
        echo "Usage: $0 [api|web|mobile|e2e|all]"
        echo "  all  - Run all unit tests (default)"
        echo "  api  - Run API tests only"
        echo "  web  - Run Web tests only"
        echo "  mobile - Run Mobile tests only"
        echo "  e2e - Run E2E tests with Playwright"
        exit 1
        ;;
esac

echo ""
echo "=========================================="
echo "Tests complete!"
echo "=========================================="