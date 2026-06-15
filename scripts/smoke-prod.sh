#!/usr/bin/env bash
# Smoke test for a deployed Buyseekk API (+ optional web URL).
# Usage: ./scripts/smoke-prod.sh https://your-api.up.railway.app [https://your-app.vercel.app]

set -euo pipefail

API_BASE="${1:-${NEXT_PUBLIC_API_URL:-}}"
WEB_URL="${2:-${NEXT_PUBLIC_SITE_URL:-}}"

if [[ -z "$API_BASE" ]]; then
  echo "Usage: $0 <API_BASE_URL> [WEB_URL]"
  echo "Example: $0 https://buyseekk-production.up.railway.app https://buyseekk.vercel.app"
  exit 1
fi

API_BASE="${API_BASE%/}"

echo "→ Health check: $API_BASE/api/health"
HEALTH=$(curl -sf "$API_BASE/api/health")
echo "$HEALTH" | grep -q '"status":"ok"' || { echo "FAIL: health status"; exit 1; }
echo "$HEALTH" | grep -q '"db":"ok"' || { echo "FAIL: db status"; exit 1; }
echo "  OK"

echo "→ Root: $API_BASE/api/"
curl -sf "$API_BASE/api/" | grep -q 'Buyseekk' || curl -sf "$API_BASE/api/" | grep -q 'ok'
echo "  OK"

echo "→ Public marketplace: $API_BASE/api/public/requests?page=1"
curl -sf "$API_BASE/api/public/requests?page=1&pageSize=5" > /dev/null
echo "  OK"

if [[ -n "$WEB_URL" ]]; then
  WEB_URL="${WEB_URL%/}"
  echo "→ Web home: $WEB_URL"
  curl -sf "$WEB_URL" > /dev/null
  echo "  OK"

  echo "→ Web robots.txt: $WEB_URL/robots.txt"
  curl -sf "$WEB_URL/robots.txt" | grep -q 'User-agent'
  echo "  OK"
fi

echo ""
echo "All smoke checks passed."
