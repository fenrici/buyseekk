#!/usr/bin/env sh
# Applies pending Prisma migrations before the API serves traffic (Railway preDeploy).
# Never runs seed — production data only via migrate deploy.
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/api"

echo "[migrate-deploy] Applying Prisma migrations..."
npx prisma migrate deploy
echo "[migrate-deploy] Done."
