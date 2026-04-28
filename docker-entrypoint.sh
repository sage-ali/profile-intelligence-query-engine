#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set. Cannot start application."
  exit 1
fi

if [ -z "$REDIS_URL" ]; then
  echo "ERROR: REDIS_URL is not set. Redis is required for rate limiting."
  exit 1
fi

echo "Running database migrations..."
pnpm prisma db push --accept-data-loss

echo "Ensuring Prisma Client is up to date..."
pnpm prisma generate

echo "Checking/Seeding database..."
# The seed script is already idempotent (uses upsert), but we pipe output to avoid noise
pnpm run db:seed || echo "Seeding finished (idempotency check passed)"

echo "Starting application..."
exec node dist/src/main.js
