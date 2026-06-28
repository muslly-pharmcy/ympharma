# SEC-P1-003 — Batch 2 Final Report

**Generated:** 2026-06-28T05:46:01.892779+00:00
**Artifact:** `docs/engineering/artifacts/20260628053000_sec_p1_003_batch_2.sql` (ends with `COMMIT;` — commit-ready, NOT yet applied)
**Rule applied:** `REVOKE EXECUTE ON FUNCTION <fn> FROM authenticated;`

## Final counts

| Bucket | Count |
| --- | ---: |
| RESTRICT_ADMIN_ONLY | 5 |
| SERVICE_ROLE_ONLY   | 52 |
| **TOTAL affected**  | **57** |

## RESTRICT_ADMIN_ONLY (5) — signatures

| Function |
| --- |
| `public.current_inventory_write_mode()` |
| `public.exec_dashboard()` |
| `public.handle_order_cancel_release()` |
| `public.inventory_report()` |
| `public.release_order_stock(_order_id text, _actor text, _reason text)` |

## SERVICE_ROLE_ONLY (52) — signatures

| Function |
| --- |
| `public.ack_staff_alert(_id uuid)` |
| `public.alert_on_failed_agent_action()` |
| `public.auto_populate_bundle_items()` |
| `public.branch_reorder_suggestions(_branch_id uuid, _lookback_days integer, _coverage_days integer, _limit integer, _offset integer)` |
| `public.check_tracking_rate_limit(_ip text, _max integer, _window_seconds integer)` |
| `public.claim_agent_events(_limit integer, _worker text)` |
| `public.claim_customer_rx_notifications(_limit integer)` |
| `public.consume_rate_limit(_key text, _max integer, _window_seconds integer)` |
| `public.detect_stale_transfers(_stale_minutes integer)` |
| `public.emit_event_on_order_insert()` |
| `public.emit_event_on_prescription_insert()` |
| `public.emit_order_event(_order_id text, _event_name text, _correlation_id uuid, _meta jsonb)` |
| `public.emit_order_status_event()` |
| `public.emit_prescription_review_requested()` |
| `public.enqueue_chronic_refill_action(_customer_phone text, _tier text, _discount_code text, _message_arabic text)` |
| `public.enqueue_customer_order_notification()` |
| `public.enqueue_customer_rx_notification()` |
| `public.fail_agent_event(_event_id uuid, _processed_by text, _error text, _max_retries integer)` |
| `public.generate_agent_actions()` |
| `public.generate_invoice_number()` |
| `public.generate_marketing_campaigns()` |
| `public.intercept_new_order()` |
| `public.intercept_new_prescription()` |
| `public.log_inventory_shadow(_order_id text, _legacy_id integer, _requested_qty integer)` |
| `public.log_product_stock_change()` |
| `public.log_table_activity()` |
| `public.mark_event_processed(_event_id uuid, _processed_by text, _error text)` |
| `public.notify_inventory_audit_issues()` |
| `public.on_order_inserted_alert()` |
| `public.on_rx_inserted_alert()` |
| `public.open_escalation_on_review()` |
| `public.publish_transfer_event()` |
| `public.rebuild_customer_intel()` |
| `public.recompute_loyalty_tier(_phone text)` |
| `public.record_order_status_change()` |
| `public.release_transfer_reservation(_transfer_id uuid, _reason text)` |
| `public.reserve_order_stock(_order_id text, _actor text, _reason text)` |
| `public.run_bi_worker()` |
| `public.run_ceo_worker()` |
| `public.run_cto_worker()` |
| `public.run_cx_worker()` |
| `public.run_inventory_worker()` |
| `public.run_marketing_worker()` |
| `public.run_operations_worker()` |
| `public.run_sales_worker()` |
| `public.seed_prescription_review()` |
| `public.tg_publish_wa_escalation_event()` |
| `public.tg_publish_wa_message_event()` |
| `public.transfer_status_guard()` |
| `public.trim_img_proxy_logs()` |
| `public.validate_prescription_review_transition()` |
| `public.verify_prescription_image_coverage()` |

## Verification (post-apply)

```sql
SELECT proname,
       has_function_privilege('authenticated', oid, 'EXECUTE') AS auth_can,
       has_function_privilege('service_role',  oid, 'EXECUTE') AS svc_can
FROM pg_proc
WHERE pronamespace='public'::regnamespace
  AND proname IN (
    'current_inventory_write_mode',
    'exec_dashboard',
    'handle_order_cancel_release',
    'inventory_report',
    'release_order_stock',
    'ack_staff_alert',
    'alert_on_failed_agent_action',
    'auto_populate_bundle_items',
    'branch_reorder_suggestions',
    'check_tracking_rate_limit',
    'claim_agent_events',
    'claim_customer_rx_notifications',
    'consume_rate_limit',
    'detect_stale_transfers',
    'emit_event_on_order_insert',
    'emit_event_on_prescription_insert',
    'emit_order_event',
    'emit_order_status_event',
    'emit_prescription_review_requested',
    'enqueue_chronic_refill_action',
    'enqueue_customer_order_notification',
    'enqueue_customer_rx_notification',
    'fail_agent_event',
    'generate_agent_actions',
    'generate_invoice_number',
    'generate_marketing_campaigns',
    'intercept_new_order',
    'intercept_new_prescription',
    'log_inventory_shadow',
    'log_product_stock_change',
    'log_table_activity',
    'mark_event_processed',
    'notify_inventory_audit_issues',
    'on_order_inserted_alert',
    'on_rx_inserted_alert',
    'open_escalation_on_review',
    'publish_transfer_event',
    'rebuild_customer_intel',
    'recompute_loyalty_tier',
    'record_order_status_change',
    'release_transfer_reservation',
    'reserve_order_stock',
    'run_bi_worker',
    'run_ceo_worker',
    'run_cto_worker',
    'run_cx_worker',
    'run_inventory_worker',
    'run_marketing_worker',
    'run_operations_worker',
    'run_sales_worker',
    'seed_prescription_review',
    'tg_publish_wa_escalation_event',
    'tg_publish_wa_message_event',
    'transfer_status_guard',
    'trim_img_proxy_logs',
    'validate_prescription_review_transition',
    'verify_prescription_image_coverage'
  );
-- Expected: auth_can=false for all 57; svc_can=true for all 57.
```

## Apply

Run the SQL via the Supabase migration tool. Not auto-applied.
