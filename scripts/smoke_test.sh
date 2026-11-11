#!/usr/bin/env bash
# Quick end-to-end check of a running stack: health, auth, and one real invoice.
set -euo pipefail

BASE="${BASE:-http://localhost:8000}"
EMAIL="ci-$(date +%s)@example.com"
PASSWORD="correct-horse-battery"

echo "Health checks"
curl -fsS "$BASE/health"; echo
curl -fsS "$BASE/health/ready"; echo

echo "Protected routes reject anonymous requests"
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/invoices")
[ "$code" = "401" ] || { echo "expected 401, got $code"; exit 1; }

echo "Register and log in"
curl -fsS -X POST "$BASE/auth/register" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"; echo
TOKEN=$(curl -fsS -X POST "$BASE/auth/login" \
  -d "username=$EMAIL&password=$PASSWORD" \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

echo "Create and list an invoice"
curl -fsS -X POST "$BASE/invoices" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"supplier_name":"Smoke Test GmbH","invoice_number":"SMOKE-1","issue_date":"2026-01-10","total_amount":"25.50","line_items":[{"description":"Widget","quantity":"2","unit_price":"10.00"},{"description":"Shipping","quantity":"1","unit_price":"5.50"}]}'; echo
curl -fsS "$BASE/invoices" -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys, json
data = json.load(sys.stdin)
assert data['total'] >= 1, data
print('invoices listed:', data['total'])"

echo "Smoke test passed"
