#!/bin/sh
set -e

echo "🌱 Running database seed (if first run)..."
node dist/src/scripts/seed.js 2>/dev/null || true

echo "🚀 Starting server..."
exec node dist/src/server.js
