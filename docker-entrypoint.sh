#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set. Cannot start application."
  exit 1
fi

echo "Running database migrations..."
pnpm prisma db push --accept-data-loss

echo "Seeding database..."
pnpm run db:seed || echo "Seeding skipped or failed (may already be populated)"

echo "Starting application..."
exec node dist/src/main.js
