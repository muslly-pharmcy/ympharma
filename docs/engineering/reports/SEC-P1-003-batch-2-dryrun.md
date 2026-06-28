# SEC-P1-003 — Batch 2 Dry-Run Report

**Generated:** 2026-06-28T05:42:26.290784Z
**Artifact:** `docs/engineering/artifacts/20260628053000_sec_p1_003_batch_2.sql`
**Mode:** DRY-RUN (file ends with `ROLLBACK;` — no DB changes applied)

## Bucket counts in this batch

| Bucket | CTO stated | Generated | Delta | Notes |
| --- | ---: | ---: | ---: | --- |
| KEEP_AUTHENTICATED  | 6 | 0 | -6 | no-op, omitted from SQL |
| RESTRICT_ADMIN_ONLY | 5 | 3 | -2 | only 3 unique names in source list |
| SERVICE_ROLE_ONLY   | 52 | 54 | 2 | derived = 57 residual - 3 admin |
| **Total affected**  | 57 | **57** | | |

## Discrepancies vs CTO message

1. **RESTRICT_ADMIN_ONLY count mismatch.** Message totals say 5 but only 3 unique function names are listed (`current_inventory_write_mode`, `exec_dashboard`, `inventory_report`). The 2 missing admin candidates are NOT in this artifact — please name them in the next message and I will issue Batch 2b.
2. **`GRANT ... TO admin` is not valid here.** No DB role named `admin` exists. Substituted: `REVOKE FROM authenticated; GRANT TO service_role;` plus an in-source `has_role(...,'admin')` check at the calling layer. See header of the SQL file.
3. **SERVICE_ROLE_ONLY = 54, not 52.** The CTO numbered list contained 54 names; the stated total of 52 appears to be an arithmetic note. All 54 are included.

## Affected SERVICE_ROLE_ONLY functions (signatures)

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
| `public.handle_order_cancel_release()` |
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
| `public.release_order_stock(_order_id text, _actor text, _reason text)` |
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

## Affected RESTRICT_ADMIN_ONLY functions (signatures)

| Function |
| --- |
| `public.current_inventory_write_mode()` |
| `public.exec_dashboard()` |
| `public.inventory_report()` |

## How to apply

1. Open the SQL file in `docs/engineering/artifacts/`.
2. Review and resolve the discrepancies above.
3. Change the final `ROLLBACK;` to `COMMIT;`.
4. Execute via the Supabase migration tool (NOT this artifact directly).

No PROJECT_STATE changes made (per CTO instruction).
