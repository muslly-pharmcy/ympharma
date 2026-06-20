#!/usr/bin/env bash
# Smoke test for Batch 4 — idempotency + audit + retry recovery.
# Usage: bash scripts/test-inventory-idempotency.sh <ORDER_ID>
set -euo pipefail
ORDER_ID="${1:-}"
if [[ -z "$ORDER_ID" ]]; then echo "usage: $0 <ORDER_ID>"; exit 1; fi

echo "→ Initial reserve (manual)"
psql -c "SELECT public.reserve_order_stock('$ORDER_ID', NULL, 'smoke_test_initial');"

echo "→ Duplicate reserve (should be SKIPPED_DUPLICATE)"
psql -c "SELECT public.reserve_order_stock('$ORDER_ID', NULL, 'smoke_test_duplicate');"

echo "→ Release"
psql -c "SELECT public.release_order_stock('$ORDER_ID', NULL, 'smoke_test_release');"

echo "→ Duplicate release (should be SKIPPED_DUPLICATE)"
psql -c "SELECT public.release_order_stock('$ORDER_ID', NULL, 'smoke_test_release_dup');"

echo "→ Audit log for this order:"
psql -c "SELECT action, status, reason, created_at FROM public.inventory_audit_log WHERE order_id='$ORDER_ID' ORDER BY created_at DESC LIMIT 10;"

echo "→ Current state:"
psql -c "SELECT * FROM public.inventory_reservation_state WHERE order_id='$ORDER_ID';"
