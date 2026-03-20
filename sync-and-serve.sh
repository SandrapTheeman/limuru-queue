#!/bin/bash
# Quick sync script for development

echo "Syncing files..."
cd "$(dirname "$0")/apps/web"
cp public/*.html out/
cp -r public/css out/
cp -r public/js out/
cp -r public/icons out/
cp public/manifest.json out/
cp public/sw.js out/
echo "✅ Files synced!"
echo ""
echo "Refresh your browser: http://localhost:3000/"
echo "(Use Ctrl+Shift+R for hard refresh)"
