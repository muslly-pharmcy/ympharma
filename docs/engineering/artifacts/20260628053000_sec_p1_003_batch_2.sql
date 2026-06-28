-- ============================================================
-- SEC-P1-003 Batch 2 — DRY-RUN SQL (NOT APPLIED)
-- Generated: 2026-06-28T05:42:26.290169Z
-- Source classification:
--   Batch 1.5 + manual CTO review (63 functions)
--   KEEP_AUTHENTICATED   : 6 (no-op, omitted here)
--   RESTRICT_ADMIN_ONLY  : 3 (CTO listed 5 in totals but only 3 unique names provided)
--   SERVICE_ROLE_ONLY    : 54 (CTO listed 52 in totals; 54 resolved from explicit list)
-- ============================================================
-- ROLE NOTE:
-- The original spec requested `GRANT EXECUTE ... TO admin;` but no DB role
-- named "admin" exists in this Supabase project. Admin authorisation is
-- enforced via public.has_role(auth.uid(),'admin'). This artifact therefore:
--   * REVOKEs EXECUTE from PUBLIC and `authenticated` for both buckets.
--   * GRANTs EXECUTE to `service_role` only.
--   * For RESTRICT_ADMIN_ONLY functions the admin UI must call them via a
--     server-side path (createServerFn + supabaseAdmin) that already
--     verifies has_role(...,'admin'). Direct PostgREST .rpc() from the
--     browser will be blocked after this migration.
-- ============================================================

BEGIN;

-- ---------- SERVICE_ROLE_ONLY ----------
REVOKE EXECUTE ON FUNCTION public.ack_staff_alert(_id uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ack_staff_alert(_id uuid) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.ack_staff_alert(_id uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.alert_on_failed_agent_action() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.alert_on_failed_agent_action() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.alert_on_failed_agent_action() TO service_role;
REVOKE EXECUTE ON FUNCTION public.auto_populate_bundle_items() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auto_populate_bundle_items() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.auto_populate_bundle_items() TO service_role;
REVOKE EXECUTE ON FUNCTION public.branch_reorder_suggestions(_branch_id uuid, _lookback_days integer, _coverage_days integer, _limit integer, _offset integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.branch_reorder_suggestions(_branch_id uuid, _lookback_days integer, _coverage_days integer, _limit integer, _offset integer) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.branch_reorder_suggestions(_branch_id uuid, _lookback_days integer, _coverage_days integer, _limit integer, _offset integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.check_tracking_rate_limit(_ip text, _max integer, _window_seconds integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_tracking_rate_limit(_ip text, _max integer, _window_seconds integer) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.check_tracking_rate_limit(_ip text, _max integer, _window_seconds integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.claim_agent_events(_limit integer, _worker text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_agent_events(_limit integer, _worker text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.claim_agent_events(_limit integer, _worker text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.claim_customer_rx_notifications(_limit integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_customer_rx_notifications(_limit integer) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.claim_customer_rx_notifications(_limit integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.consume_rate_limit(_key text, _max integer, _window_seconds integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.consume_rate_limit(_key text, _max integer, _window_seconds integer) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.consume_rate_limit(_key text, _max integer, _window_seconds integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.detect_stale_transfers(_stale_minutes integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.detect_stale_transfers(_stale_minutes integer) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.detect_stale_transfers(_stale_minutes integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.emit_event_on_order_insert() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.emit_event_on_order_insert() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.emit_event_on_order_insert() TO service_role;
REVOKE EXECUTE ON FUNCTION public.emit_event_on_prescription_insert() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.emit_event_on_prescription_insert() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.emit_event_on_prescription_insert() TO service_role;
REVOKE EXECUTE ON FUNCTION public.emit_order_event(_order_id text, _event_name text, _correlation_id uuid, _meta jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.emit_order_event(_order_id text, _event_name text, _correlation_id uuid, _meta jsonb) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.emit_order_event(_order_id text, _event_name text, _correlation_id uuid, _meta jsonb) TO service_role;
REVOKE EXECUTE ON FUNCTION public.emit_order_status_event() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.emit_order_status_event() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.emit_order_status_event() TO service_role;
REVOKE EXECUTE ON FUNCTION public.emit_prescription_review_requested() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.emit_prescription_review_requested() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.emit_prescription_review_requested() TO service_role;
REVOKE EXECUTE ON FUNCTION public.enqueue_chronic_refill_action(_customer_phone text, _tier text, _discount_code text, _message_arabic text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_chronic_refill_action(_customer_phone text, _tier text, _discount_code text, _message_arabic text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.enqueue_chronic_refill_action(_customer_phone text, _tier text, _discount_code text, _message_arabic text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.enqueue_customer_order_notification() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_customer_order_notification() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.enqueue_customer_order_notification() TO service_role;
REVOKE EXECUTE ON FUNCTION public.enqueue_customer_rx_notification() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_customer_rx_notification() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.enqueue_customer_rx_notification() TO service_role;
REVOKE EXECUTE ON FUNCTION public.fail_agent_event(_event_id uuid, _processed_by text, _error text, _max_retries integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fail_agent_event(_event_id uuid, _processed_by text, _error text, _max_retries integer) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.fail_agent_event(_event_id uuid, _processed_by text, _error text, _max_retries integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.generate_agent_actions() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_agent_actions() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.generate_agent_actions() TO service_role;
REVOKE EXECUTE ON FUNCTION public.generate_invoice_number() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_invoice_number() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.generate_invoice_number() TO service_role;
REVOKE EXECUTE ON FUNCTION public.generate_marketing_campaigns() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_marketing_campaigns() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.generate_marketing_campaigns() TO service_role;
REVOKE EXECUTE ON FUNCTION public.handle_order_cancel_release() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_order_cancel_release() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.handle_order_cancel_release() TO service_role;
REVOKE EXECUTE ON FUNCTION public.intercept_new_order() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.intercept_new_order() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.intercept_new_order() TO service_role;
REVOKE EXECUTE ON FUNCTION public.intercept_new_prescription() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.intercept_new_prescription() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.intercept_new_prescription() TO service_role;
REVOKE EXECUTE ON FUNCTION public.log_inventory_shadow(_order_id text, _legacy_id integer, _requested_qty integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_inventory_shadow(_order_id text, _legacy_id integer, _requested_qty integer) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.log_inventory_shadow(_order_id text, _legacy_id integer, _requested_qty integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.log_product_stock_change() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_product_stock_change() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.log_product_stock_change() TO service_role;
REVOKE EXECUTE ON FUNCTION public.log_table_activity() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_table_activity() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.log_table_activity() TO service_role;
REVOKE EXECUTE ON FUNCTION public.mark_event_processed(_event_id uuid, _processed_by text, _error text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_event_processed(_event_id uuid, _processed_by text, _error text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.mark_event_processed(_event_id uuid, _processed_by text, _error text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.notify_inventory_audit_issues() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_inventory_audit_issues() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.notify_inventory_audit_issues() TO service_role;
REVOKE EXECUTE ON FUNCTION public.on_order_inserted_alert() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.on_order_inserted_alert() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.on_order_inserted_alert() TO service_role;
REVOKE EXECUTE ON FUNCTION public.on_rx_inserted_alert() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.on_rx_inserted_alert() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.on_rx_inserted_alert() TO service_role;
REVOKE EXECUTE ON FUNCTION public.open_escalation_on_review() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.open_escalation_on_review() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.open_escalation_on_review() TO service_role;
REVOKE EXECUTE ON FUNCTION public.publish_transfer_event() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.publish_transfer_event() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.publish_transfer_event() TO service_role;
REVOKE EXECUTE ON FUNCTION public.rebuild_customer_intel() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rebuild_customer_intel() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.rebuild_customer_intel() TO service_role;
REVOKE EXECUTE ON FUNCTION public.recompute_loyalty_tier(_phone text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recompute_loyalty_tier(_phone text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.recompute_loyalty_tier(_phone text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.record_order_status_change() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_order_status_change() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.record_order_status_change() TO service_role;
REVOKE EXECUTE ON FUNCTION public.release_order_stock(_order_id text, _actor text, _reason text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.release_order_stock(_order_id text, _actor text, _reason text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.release_order_stock(_order_id text, _actor text, _reason text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.release_transfer_reservation(_transfer_id uuid, _reason text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.release_transfer_reservation(_transfer_id uuid, _reason text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.release_transfer_reservation(_transfer_id uuid, _reason text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.reserve_order_stock(_order_id text, _actor text, _reason text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reserve_order_stock(_order_id text, _actor text, _reason text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.reserve_order_stock(_order_id text, _actor text, _reason text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.run_bi_worker() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.run_bi_worker() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.run_bi_worker() TO service_role;
REVOKE EXECUTE ON FUNCTION public.run_ceo_worker() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.run_ceo_worker() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.run_ceo_worker() TO service_role;
REVOKE EXECUTE ON FUNCTION public.run_cto_worker() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.run_cto_worker() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.run_cto_worker() TO service_role;
REVOKE EXECUTE ON FUNCTION public.run_cx_worker() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.run_cx_worker() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.run_cx_worker() TO service_role;
REVOKE EXECUTE ON FUNCTION public.run_inventory_worker() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.run_inventory_worker() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.run_inventory_worker() TO service_role;
REVOKE EXECUTE ON FUNCTION public.run_marketing_worker() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.run_marketing_worker() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.run_marketing_worker() TO service_role;
REVOKE EXECUTE ON FUNCTION public.run_operations_worker() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.run_operations_worker() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.run_operations_worker() TO service_role;
REVOKE EXECUTE ON FUNCTION public.run_sales_worker() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.run_sales_worker() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.run_sales_worker() TO service_role;
REVOKE EXECUTE ON FUNCTION public.seed_prescription_review() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seed_prescription_review() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.seed_prescription_review() TO service_role;
REVOKE EXECUTE ON FUNCTION public.tg_publish_wa_escalation_event() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tg_publish_wa_escalation_event() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.tg_publish_wa_escalation_event() TO service_role;
REVOKE EXECUTE ON FUNCTION public.tg_publish_wa_message_event() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tg_publish_wa_message_event() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.tg_publish_wa_message_event() TO service_role;
REVOKE EXECUTE ON FUNCTION public.transfer_status_guard() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.transfer_status_guard() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.transfer_status_guard() TO service_role;
REVOKE EXECUTE ON FUNCTION public.trim_img_proxy_logs() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trim_img_proxy_logs() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.trim_img_proxy_logs() TO service_role;
REVOKE EXECUTE ON FUNCTION public.validate_prescription_review_transition() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_prescription_review_transition() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.validate_prescription_review_transition() TO service_role;
REVOKE EXECUTE ON FUNCTION public.verify_prescription_image_coverage() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.verify_prescription_image_coverage() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.verify_prescription_image_coverage() TO service_role;

-- ---------- RESTRICT_ADMIN_ONLY ----------
REVOKE EXECUTE ON FUNCTION public.current_inventory_write_mode() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_inventory_write_mode() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.current_inventory_write_mode() TO service_role;
-- NOTE: callers must check public.has_role(auth.uid(),'admin') before invoking current_inventory_write_mode
REVOKE EXECUTE ON FUNCTION public.exec_dashboard() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.exec_dashboard() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.exec_dashboard() TO service_role;
-- NOTE: callers must check public.has_role(auth.uid(),'admin') before invoking exec_dashboard
REVOKE EXECUTE ON FUNCTION public.inventory_report() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.inventory_report() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.inventory_report() TO service_role;
-- NOTE: callers must check public.has_role(auth.uid(),'admin') before invoking inventory_report

-- Verification (run after apply):
-- SELECT proname, has_function_privilege('authenticated', oid, 'EXECUTE') AS auth_can
-- FROM pg_proc WHERE pronamespace='public'::regnamespace
--   AND proname = ANY (ARRAY[
--     'ack_staff_alert', 'alert_on_failed_agent_action', 'auto_populate_bundle_items', 'branch_reorder_suggestions', 'check_tracking_rate_limit', 'claim_agent_events', 'claim_customer_rx_notifications', 'consume_rate_limit', 'current_inventory_write_mode', 'detect_stale_transfers', 'emit_event_on_order_insert', 'emit_event_on_prescription_insert', 'emit_order_event', 'emit_order_status_event', 'emit_prescription_review_requested', 'enqueue_chronic_refill_action', 'enqueue_customer_order_notification', 'enqueue_customer_rx_notification', 'exec_dashboard', 'fail_agent_event', 'generate_agent_actions', 'generate_invoice_number', 'generate_marketing_campaigns', 'handle_order_cancel_release', 'intercept_new_order', 'intercept_new_prescription', 'inventory_report', 'log_inventory_shadow', 'log_product_stock_change', 'log_table_activity', 'mark_event_processed', 'notify_inventory_audit_issues', 'on_order_inserted_alert', 'on_rx_inserted_alert', 'open_escalation_on_review', 'publish_transfer_event', 'rebuild_customer_intel', 'recompute_loyalty_tier', 'record_order_status_change', 'release_order_stock', 'release_transfer_reservation', 'reserve_order_stock', 'run_bi_worker', 'run_ceo_worker', 'run_cto_worker', 'run_cx_worker', 'run_inventory_worker', 'run_marketing_worker', 'run_operations_worker', 'run_sales_worker', 'seed_prescription_review', 'tg_publish_wa_escalation_event', 'tg_publish_wa_message_event', 'transfer_status_guard', 'trim_img_proxy_logs', 'validate_prescription_review_transition', 'verify_prescription_image_coverage'
--   ]);
-- Expected: auth_can = false for every row.

ROLLBACK;  -- DRY-RUN: keep as ROLLBACK; flip to COMMIT after manual review.
