#!/bin/bash
# Hospital Queue System - Comprehensive Verification Script
# This script verifies the codebase without requiring npm install

echo "=========================================="
echo "Hospital Queue System - Code Verification"
echo "=========================================="
echo ""

cd /home/sandrap_theeman/Documents/projects_001/Cottage-Queuing-System

# Initialize counters
PASS=0
FAIL=0
WARN=0

pass() { echo "✅ PASS: $1"; ((PASS++)); }
fail() { echo "❌ FAIL: $1"; ((FAIL++)); }
warn() { echo "⚠️  WARN: $1"; ((WARN++)); }
info() { echo "ℹ️  INFO: $1"; }

echo ""
echo "=========================================="
echo "1. PROJECT STRUCTURE VERIFICATION"
echo "=========================================="
echo ""

# Check root files
info "Checking root configuration files..."
[ -f "package.json" ] && pass "Root package.json exists" || fail "Root package.json missing"
[ -f ".gitignore" ] && pass ".gitignore exists" || fail ".gitignore missing"
[ -f ".env.example" ] && pass ".env.example exists" || fail ".env.example missing"

echo ""
info "Checking monorepo structure..."
[ -d "apps" ] && pass "apps/ directory exists" || fail "apps/ directory missing"
[ -d "packages" ] && pass "packages/ directory exists" || fail "packages/ directory missing"
[ -d "services" ] && pass "services/ directory exists" || fail "services/ directory missing"
[ -d "docs" ] && pass "docs/ directory exists" || fail "docs/ directory missing"

echo ""
echo "=========================================="
echo "2. API BACKEND VERIFICATION"
echo "=========================================="
echo ""

info "Checking API routes..."
[ -f "apps/api/src/routes/index.ts" ] && pass "API routes index exists" || fail "API routes index missing"
[ -f "apps/api/src/routes/auth.ts" ] && pass "Auth routes exist" || fail "Auth routes missing"
[ -f "apps/api/src/routes/queue.ts" ] && pass "Queue routes exist" || fail "Queue routes missing"
[ -f "apps/api/src/routes/patients.ts" ] && pass "Patients routes exist" || fail "Patients routes missing"
[ -f "apps/api/src/routes/doctors.ts" ] && pass "Doctors routes exist" || fail "Doctors routes missing"
[ -f "apps/api/src/routes/admin.ts" ] && pass "Admin routes exist" || fail "Admin routes missing"

info "Checking API services..."
[ -f "apps/api/src/services/auth.ts" ] && pass "Auth service exists" || fail "Auth service missing"
[ -f "apps/api/src/services/queue.ts" ] && pass "Queue service exists" || fail "Queue service missing"
[ -f "apps/api/src/index.ts" ] && pass "API main entry exists" || fail "API main entry missing"

info "Checking API configuration..."
[ -f "apps/api/package.json" ] && pass "API package.json exists" || fail "API package.json missing"
[ -f "apps/api/wrangler.toml" ] && pass "wrangler.toml exists" || fail "wrangler.toml missing"

echo ""
echo "=========================================="
echo "3. WEB FRONTEND VERIFICATION"
echo "=========================================="
echo ""

info "Checking web pages..."
[ -f "apps/web/app/page.tsx" ] && pass "Home page exists" || fail "Home page missing"
[ -f "apps/web/app/login/page.tsx" ] || [ -f "apps/web/app/login.tsx" ] && pass "Login page exists" || fail "Login page missing"
[ -f "apps/web/app/kiosk/page.tsx" ] || [ -f "apps/web/app/kiosk.tsx" ] && pass "Kiosk page exists" || fail "Kiosk page missing"
[ -f "apps/web/app/display/page.tsx" ] || [ -f "apps/web/app/display.tsx" ] && pass "Display page exists" || fail "Display page missing"
[ -f "apps/web/app/dashboard/page.tsx" ] || [ -f "apps/web/app/dashboard.tsx" ] && pass "Dashboard page exists" || fail "Dashboard page missing"

info "Checking web components..."
[ -f "apps/web/lib/components/Button.tsx" ] && pass "Button component exists" || fail "Button component missing"
[ -f "apps/web/lib/components/Input.tsx" ] && pass "Input component exists" || fail "Input component missing"
[ -f "apps/web/lib/components/Card.tsx" ] && pass "Card component exists" || fail "Card component missing"
[ -f "apps/web/lib/components/index.ts" ] && pass "Components barrel export exists" || fail "Components barrel export missing"

info "Checking web stores..."
[ -d "apps/web/lib/stores" ] && pass "Stores directory exists" || fail "Stores directory missing"

echo ""
echo "=========================================="
echo "4. MOBILE APP VERIFICATION"
echo "=========================================="
echo ""

info "Checking mobile app..."
[ -f "apps/mobile/package.json" ] && pass "Mobile package.json exists" || fail "Mobile package.json missing"
[ -f "apps/mobile/app.json" ] && pass "Mobile app.json exists" || fail "Mobile app.json missing"
[ -f "apps/mobile/app/_layout.tsx" ] && pass "Mobile layout exists" || fail "Mobile layout missing"

echo ""
echo "=========================================="
echo "5. DATABASE VERIFICATION"
echo "=========================================="
echo ""

info "Checking database files..."
[ -d "services/database" ] && pass "Database directory exists" || fail "Database directory missing"
[ -f "services/database/init.sql" ] && pass "Database init.sql exists" || fail "Database init.sql missing"
[ -d "apps/api/src/db/migrations" ] && pass "D1 migrations directory exists" || fail "D1 migrations missing"

echo ""
echo "=========================================="
echo "6. DOCKER VERIFICATION"
echo "=========================================="
echo ""

info "Checking Docker configuration..."
[ -f "services/docker-compose.yml" ] && pass "docker-compose.yml exists" || fail "docker-compose.yml missing"
[ -f "services/docker-compose.production.yml" ] && pass "Production compose exists" || fail "Production compose missing"
docker-compose config > /dev/null 2>&1 && pass "Docker Compose config is valid" || fail "Docker Compose config invalid"

echo ""
echo "=========================================="
echo "7. CI/CD VERIFICATION"
echo "=========================================="
echo ""

info "Checking CI/CD workflows..."
[ -d ".github/workflows" ] && pass "Workflows directory exists" || fail "Workflows directory missing"
[ -f ".github/workflows/ci.yml" ] && pass "CI workflow exists" || fail "CI workflow missing"
[ -f ".github/workflows/deploy.yml" ] && pass "Deploy workflow exists" || fail "Deploy workflow missing"

echo ""
echo "=========================================="
echo "8. DOCUMENTATION VERIFICATION"
echo "=========================================="
echo ""

info "Checking documentation..."
[ -f "docs/README.md" ] && pass "Docs README exists" || fail "Docs README missing"
[ -f "docs/SYSTEM_GUIDE.md" ] && pass "System guide exists" || fail "System guide missing"
DOC_COUNT=$(find docs -name "*.md" 2>/dev/null | wc -l)
if [ "$DOC_COUNT" -ge 100 ]; then
    pass "Documentation count: $DOC_COUNT files"
else
    warn "Documentation count: $DOC_COUNT files (expected 100+)"
fi

echo ""
echo "=========================================="
echo "9. CODE STATISTICS"
echo "=========================================="
echo ""

API_FILES=$(find apps/api/src -name "*.ts" 2>/dev/null | wc -l)
WEB_FILES=$(find apps/web/app apps/web/lib -name "*.tsx" 2>/dev/null | wc -l)
TEST_FILES=$(find apps -name "*.test.ts" -o -name "*.spec.ts" 2>/dev/null | wc -l)

info "API TypeScript files: $API_FILES"
info "Web TypeScript/TSX files: $WEB_FILES"
info "Test files: $TEST_FILES"

echo ""
echo "=========================================="
echo "10. FILE COUNT SUMMARY"
echo "=========================================="
echo ""

info "Total files in project: $(find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.json" -o -name "*.yml" -o -name "*.yaml" -o -name "*.sql" -o -name "*.md" \) | wc -l)"

echo ""
echo "=========================================="
echo "VERIFICATION COMPLETE"
echo "=========================================="
echo ""
echo "Results: ✅ $PASS passed | ❌ $FAIL failed | ⚠️ $WARN warnings"
echo ""

if [ "$FAIL" -eq 0 ]; then
    echo "🎉 All critical checks passed!"
    exit 0
else
    echo "⚠️  Some checks failed. Review above for details."
    exit 1
fi
