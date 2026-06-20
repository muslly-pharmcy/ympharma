#!/usr/bin/env bash
# Smoke-test the inventory reservation loop end to end.
# Reads from agent_actions to confirm RESERVE_STOCK / RELEASE_STOCK rows landed.
set -euo pipefail

echo "==> Functions present:"
psql -c "\df public.reserve_order_stock public.release_order_stock"

echo "==> Triggers on orders:"
psql -c "SELECT trigger_name FROM information_schema.triggers WHERE event_object_table='orders' ORDER BY trigger_name;"

echo "==> Recent RESERVE/RELEASE actions (last 24h):"
psql -c "SELECT action_type, execution_status, count(*) FROM agent_actions WHERE action_type IN ('RESERVE_STOCK','RELEASE_STOCK') AND created_at > now() - interval '24 hours' GROUP BY 1,2 ORDER BY 1,2;"

echo "==> Latest 5 reservation actions:"
psql -c "SELECT action_type, execution_status, payload->>'order_id' AS order_id, compiled_arabic_output, created_at FROM agent_actions WHERE action_type IN ('RESERVE_STOCK','RELEASE_STOCK') ORDER BY created_at DESC LIMIT 5;"

echo "==> Low stock (<=5, tracked):"
psql -c "SELECT id, COALESCE(name_ar, name_en) AS name, stock_qty, reorder_point FROM products WHERE track_stock AND stock_qty <= 5 ORDER BY stock_qty LIMIT 10;"

echo "==> Done. Open /admin-inventory-reservations to verify UI."
