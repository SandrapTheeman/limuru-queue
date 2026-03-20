#!/bin/bash
# Hospital Queue System - Cleanup & Optimization Script
# Removes unused files and optimizes the codebase

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🏥 Hospital Queue System - Cleanup & Optimization"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 1. Clean up old design iterations
echo "📁 Checking for design iterations..."
if [ -d "apps/web/public/design_iterations" ]; then
    log_info "Removing old design iterations..."
    rm -rf apps/web/public/design_iterations
    log_info "Removed design_iterations/"
fi

# 2. Clean up stale out directory
echo "📁 Checking for stale build output..."
if [ -d "apps/web/public/out" ]; then
    log_info "Removing stale out/ directory..."
    rm -rf apps/web/public/out
    log_info "Removed apps/web/public/out/"
fi

# 3. Clean up duplicate SQL files
echo "📁 Checking for duplicate SQL files..."
if [ -d "services/database" ]; then
    if [ -d "services/database/migrations" ]; then
        log_info "Removing duplicate migrations..."
        rm -rf services/database/migrations
        log_info "Removed services/database/migrations/"
    fi
    for f in services/database/*.sql; do
        if [ -f "$f" ]; then
            log_info "Removing duplicate SQL: $f"
            rm -f "$f"
        fi
    done
fi

# 4. Clean up redundant API files
echo "📁 Checking for redundant files..."
if [ -f "apps/api/src/db/schema.sql" ]; then
    log_info "Removing redundant schema.sql..."
    rm -f apps/api/src/db/schema.sql
fi

if [ -f "apps/api/src/db/seed.sql" ]; then
    log_info "Removing redundant seed.sql..."
    rm -f apps/api/src/db/seed.sql
fi

# 5. Clean up backup files
echo "📁 Finding backup files..."
find . -name "*.backup" -o -name "*.old" -o -name "*.tmp" 2>/dev/null | while read f; do
    log_warn "Found backup file: $f"
done

# 6. Check for unused node_modules
echo "📁 Checking for empty directories..."
find apps -type d -empty 2>/dev/null | head -5 | while read d; do
    log_warn "Empty directory: $d"
done

# 7. Update .gitignore if needed
echo "📁 Checking .gitignore..."
if [ -f ".gitignore" ]; then
    if ! grep -q "out/" .gitignore 2>/dev/null; then
        log_info "Adding out/ to .gitignore..."
        echo "" >> .gitignore
        echo "# Build output" >> .gitignore
        echo "apps/web/public/out/" >> .gitignore
    fi
fi

# 8. Optimize Docker cleanup
echo "📦 Docker cleanup..."
docker system prune -f 2>/dev/null || true

echo ""
echo "=================================================="
echo "✅ Cleanup complete!"
echo ""
echo "📊 Summary:"
echo "   - Removed old design iterations"
echo "   - Removed stale build output"
echo "   - Removed duplicate SQL files"
echo "   - Removed redundant schema files"
echo ""
echo "🚀 Next steps:"
echo "   1. Rebuild containers: docker-compose down && docker-compose up -d"
echo "   2. Run migrations: docker-compose exec api npm run db:migrate"
echo "   3. Check logs: docker-compose logs -f"
