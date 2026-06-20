#!/usr/bin/env bash
# Smoke-test the Event Bus end to end.
# Usage: PGHOST/PGUSER/... set, run from project root:
#   bash scripts/test-event-bus.sh
set -euo pipefail

echo "==> Before:"
psql -tAc "SELECT event_name, count(*) FROM public.agent_events WHERE occurred_at > now() - interval '5 min' GROUP BY 1 ORDER BY 1;" || true

echo "==> Emit synthetic test event:"
psql -tAc "SELECT public.emit_agent_event('TestEvent','smoke', gen_random_uuid()::text, jsonb_build_object('via','script','at', now()), 'script:test-event-bus');"

echo "==> Unprocessed (top 10):"
psql -c "SELECT event_name, source, entity_type, occurred_at, retry_count FROM public.unprocessed_agent_events ORDER BY occurred_at DESC LIMIT 10;"

echo "==> Counts in last 15 min:"
psql -c "SELECT event_name, count(*) FILTER (WHERE processed_at IS NULL) AS pending, count(*) FILTER (WHERE processed_at IS NOT NULL) AS processed, count(*) AS total FROM public.agent_events WHERE occurred_at > now() - interval '15 min' GROUP BY 1 ORDER BY 1;"

echo "==> Mark the synthetic event processed:"
psql -tAc "UPDATE public.agent_events SET processed_at = now(), processed_by = 'script:test-event-bus' WHERE event_name = 'TestEvent' AND processed_at IS NULL RETURNING id;" | head -5

echo "==> Done. Open /admin-event-bus to verify UI counts."
