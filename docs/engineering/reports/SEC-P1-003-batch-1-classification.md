# SEC-P1-003 — Batch 1 Classification Report

**Date:** 2026-06-28  
**Mode:** AUDIT / CLASSIFICATION ONLY (no GRANT/REVOKE applied)  
**Source list:** `docs/engineering/reports/verification-results.md` (156 SECURITY DEFINER fns in `public`)  
**Method:** name-pattern heuristics + ripgrep callsite scan of `src/` for `.rpc("<fn>")`

## Bucket counts

| Bucket | Count | Batch 2 action |
| --- | ---: | --- |
| KEEP_AUTHENTICATED  | 66 | none — current GRANT is correct |
| RESTRICT_ADMIN_ONLY | 12 | guard body with `has_role(auth.uid(),'admin')` OR revoke from `authenticated` + GRANT to admin role |
| SERVICE_ROLE_ONLY   | 11 | REVOKE EXECUTE FROM authenticated (callable only by triggers / service_role) |
| REVIEW_REQUIRED     | 67 | human review of function body + cron/trigger registry before deciding |
| **TOTAL**           | **156** | |

## RESTRICT_ADMIN_ONLY (12)

| Function | Reason | Callers (src/) |
| --- | --- | --- |
| `admin_bundles_report` | admin namespace by name | lib/bundles.functions.ts |
| `admin_list_cron_jobs` | admin namespace by name | routes/admin-cron-jobs.tsx |
| `admin_list_cron_runs` | admin namespace by name | routes/admin-cron-jobs.tsx |
| `admin_revenue_series` | admin namespace by name | lib/campaigns.functions.ts |
| `admin_stats` | admin namespace by name | lib/security-scan.functions.ts, components/admin-stats.tsx |
| `agent_runs_list` | only called from admin routes (1 file(s)) | lib/pharmacy-intel-admin.functions.ts |
| `is_owner_or_admin` | admin namespace by name | _none_ |
| `list_classifications_admin` | admin namespace by name | lib/pharmacy-intel.functions.ts |
| `marketing_queue_approve` | only called from admin routes (1 file(s)) | lib/pharmacy-intel-admin.functions.ts |
| `marketing_queue_list` | only called from admin routes (1 file(s)) | lib/pharmacy-intel-admin.functions.ts |
| `marketing_queue_mark_sent` | only called from admin routes (1 file(s)) | lib/pharmacy-intel-admin.functions.ts |
| `marketing_queue_skip` | only called from admin routes (1 file(s)) | lib/pharmacy-intel-admin.functions.ts |

## SERVICE_ROLE_ONLY (11)

| Function | Reason | Callers (src/) |
| --- | --- | --- |
| `_agent_kpi_upsert` | internal/trigger/cron helper (name pattern or known trigger) | _none_ |
| `_agent_rec_upsert` | internal/trigger/cron helper (name pattern or known trigger) | _none_ |
| `_classif_can_manage` | internal/trigger/cron helper (name pattern or known trigger) | _none_ |
| `_inherit_correlation_from_order` | internal/trigger/cron helper (name pattern or known trigger) | _none_ |
| `_intel_can_manage` | internal/trigger/cron helper (name pattern or known trigger) | _none_ |
| `_staff_alerts_lock_content` | internal/trigger/cron helper (name pattern or known trigger) | _none_ |
| `apply_retention_policies` | internal/trigger/cron helper (name pattern or known trigger) | core/retention/RetentionPolicyEngine.ts, routes/api/public/hooks/retention-sweep.ts |
| `audit_prescription_file_change` | internal/trigger/cron helper (name pattern or known trigger) | _none_ |
| `bootstrap_owner` | internal/trigger/cron helper (name pattern or known trigger) | lib/staff.functions.ts, lib/security-scan.functions.ts |
| `cleanup_idempotency_keys` | internal/trigger/cron helper (name pattern or known trigger) | core/retention/RetentionPolicyEngine.ts, routes/api/public/hooks/retention-sweep.ts |
| `reconcile_inventory_mismatch` | internal/trigger/cron helper (name pattern or known trigger) | lib/inventory-migration.functions.ts |

## KEEP_AUTHENTICATED (66)

| Function | Reason | Callers (src/) |
| --- | --- | --- |
| `add_loyalty_points` | used by signed-in user flows (AI lookups / role check / logging) | lib/loyalty.functions.ts |
| `agent_events_dlq_stats` | called only from non-admin routes (1 file(s)) | lib/event-bus.functions.ts |
| `agent_workforce_summary` | called only from non-admin routes (1 file(s)) | lib/agent-workforce.functions.ts |
| `ai_get_branch_availability` | used by signed-in user flows (AI lookups / role check / logging) | lib/whatsapp-ai-agent.server.ts |
| `ai_get_order_status` | used by signed-in user flows (AI lookups / role check / logging) | lib/whatsapp-ai-agent.server.ts |
| `ai_get_prescription_status` | used by signed-in user flows (AI lookups / role check / logging) | lib/whatsapp-ai-agent.server.ts |
| `ai_list_branches` | used by signed-in user flows (AI lookups / role check / logging) | lib/whatsapp-ai-agent.server.ts |
| `ai_search_products` | used by signed-in user flows (AI lookups / role check / logging) | lib/whatsapp-ai-agent.server.ts |
| `approve_classification` | called only from non-admin routes (1 file(s)) | lib/pharmacy-intel.functions.ts |
| `auto_bundle_candidates` | called only from non-admin routes (1 file(s)) | lib/pharmacy-copilot.functions.ts |
| `campaign_report` | called only from non-admin routes (1 file(s)) | lib/campaigns.functions.ts |
| `cancel_transfer` | called only from non-admin routes (1 file(s)) | lib/transfers.functions.ts |
| `check_img_rate_limit` | called only from non-admin routes (1 file(s)) | routes/api/public/img.ts |
| `chronic_overdue` | called only from non-admin routes (1 file(s)) | lib/pharmacy-copilot.functions.ts |
| `clean_old_telemetry` | called only from non-admin routes (1 file(s)) | lib/agent/telemetry.cleanup.server.ts |
| `commit_transfer_receipt` | called only from non-admin routes (1 file(s)) | lib/transfers.functions.ts |
| `conditions_catalog` | called only from non-admin routes (2 file(s)) | routes/conditions.tsx, components/conditions-strip.tsx |
| `create_backup` | called only from non-admin routes (2 file(s)) | lib/backup.ts, lib/security-scan.functions.ts |
| `cto_health` | called only from non-admin routes (1 file(s)) | lib/pharmacy-copilot.functions.ts |
| `customers_for_enrichment` | called only from non-admin routes (1 file(s)) | routes/api/public/hooks/weekly-ai-enrich.ts |
| `declining_products` | called only from non-admin routes (1 file(s)) | lib/pharmacy-copilot.functions.ts |
| `delete_email` | called only from non-admin routes (1 file(s)) | lib/security-scan.functions.ts |
| `emit_agent_event` | called only from non-admin routes (1 file(s)) | routes/api/public/hooks/chronic-refills.ts |
| `emit_prescription_event` | called only from non-admin routes (1 file(s)) | routes/api/public/hooks/rx-notify.ts |
| `enqueue_chronic_refills` | called only from non-admin routes (2 file(s)) | lib/pharmacy-copilot.functions.ts, routes/api/public/hooks/chronic-refills.ts |
| `enqueue_email` | called only from non-admin routes (3 file(s)) | lib/email-alerts.functions.ts, lib/security-scan.functions.ts, routes/api/public/hooks/agent-alerts.ts |
| `executive_alerts` | called only from non-admin routes (1 file(s)) | lib/pharmacy-copilot.functions.ts |
| `get_agent_alerts` | called only from non-admin routes (2 file(s)) | lib/agent-runs.functions.ts, routes/api/public/hooks/agent-alerts.ts |
| `get_event_consumer_schedule` | called only from non-admin routes (1 file(s)) | lib/event-bus.functions.ts |
| `get_order_history_public` | called only from non-admin routes (2 file(s)) | routes/track.tsx, lib/security-scan.functions.ts |
| `get_order_public` | called only from non-admin routes (2 file(s)) | routes/track.tsx, lib/security-scan.functions.ts |
| `has_permission` | called only from non-admin routes (4 file(s)) | lib/pharmacy-intel.functions.ts, lib/prescription-extraction-review.functions.ts, lib/pharmacy-copilot.functions.ts, +1 more |
| `has_role` | used by signed-in user flows (AI lookups / role check / logging) | lib/ai-clinical-copilot.functions.ts, lib/ai-assistant.functions.ts, lib/ai-approvals.functions.ts, +31 more |
| `inventory_intel` | called only from non-admin routes (1 file(s)) | lib/pharmacy-copilot.functions.ts |
| `inventory_pilot_report` | called only from non-admin routes (1 file(s)) | lib/inventory-migration.functions.ts |
| `inventory_readiness_report` | called only from non-admin routes (1 file(s)) | lib/inventory-migration.functions.ts |
| `latest_executive_report` | called only from non-admin routes (1 file(s)) | lib/pharmacy-copilot.functions.ts |
| `list_bundles_public` | called only from non-admin routes (1 file(s)) | lib/bundles.functions.ts |
| `log_activity` | used by signed-in user flows (AI lookups / role check / logging) | lib/inventory-migration.functions.ts, lib/inventory-duplicates.functions.ts, lib/pharmacy-intel.functions.ts, +4 more |
| `mark_customer_rx_notification_failed` | called only from non-admin routes (1 file(s)) | routes/api/public/hooks/customer-rx-notify.ts |
| `mark_customer_rx_notification_sent` | called only from non-admin routes (1 file(s)) | routes/api/public/hooks/customer-rx-notify.ts |
| `move_to_dlq` | called only from non-admin routes (1 file(s)) | lib/security-scan.functions.ts |
| `pharmacy_chronic_legacy_ids` | called only from non-admin routes (1 file(s)) | lib/pharmacy-public.functions.ts |
| `pharmacy_homepage_sections` | called only from non-admin routes (2 file(s)) | lib/homepage-bundle.functions.ts, lib/pharmacy-public.functions.ts |
| `pharmacy_related_products` | called only from non-admin routes (1 file(s)) | lib/pharmacy-public.functions.ts |
| `pharmacy_search` | called only from non-admin routes (1 file(s)) | lib/pharmacy-public.functions.ts |
| `pharmacy_taxonomy_stats` | called only from non-admin routes (1 file(s)) | lib/pharmacy-intel.functions.ts |
| `place_order` | called only from non-admin routes (1 file(s)) | lib/orders-pending.ts |
| `place_order` | called only from non-admin routes (1 file(s)) | lib/orders-pending.ts |
| `read_email_batch` | called only from non-admin routes (1 file(s)) | lib/security-scan.functions.ts |
| `reject_classification` | called only from non-admin routes (1 file(s)) | lib/pharmacy-intel.functions.ts |
| `reserve_transfer_stock` | called only from non-admin routes (1 file(s)) | lib/transfers.functions.ts |
| `revenue_by_condition` | called only from non-admin routes (1 file(s)) | lib/pharmacy-copilot.functions.ts |
| `rotate_cron_secret` | called only from non-admin routes (1 file(s)) | lib/pharmacy-copilot.functions.ts |
| `run_all_agents_now` | called only from non-admin routes (1 file(s)) | lib/agent-workforce.functions.ts |
| `run_retention_policy` | called only from non-admin routes (2 file(s)) | lib/retention.functions.ts, lib/security-scan.functions.ts |
| `sales_opportunities` | called only from non-admin routes (1 file(s)) | lib/pharmacy-copilot.functions.ts |
| `save_customer_ai_insight` | called only from non-admin routes (1 file(s)) | routes/api/public/hooks/weekly-ai-enrich.ts |
| `schedule_event_consumer` | called only from non-admin routes (1 file(s)) | lib/event-bus.functions.ts |
| `set_inventory_pilot` | called only from non-admin routes (1 file(s)) | lib/inventory-migration.functions.ts |
| `submit_prescription` | called only from non-admin routes (1 file(s)) | lib/rx-pending.ts |
| `top_selling_products` | called only from non-admin routes (2 file(s)) | lib/pharmacy-recommendations.functions.ts, lib/recommendations-dynamic.functions.ts |
| `track_banner_event` | called only from non-admin routes (1 file(s)) | lib/banners.functions.ts |
| `upsert_classification` | called only from non-admin routes (1 file(s)) | lib/pharmacy-intel.functions.ts |
| `validate_discount` | called only from non-admin routes (1 file(s)) | routes/cart.tsx |
| `weekly_exec_report_build` | called only from non-admin routes (2 file(s)) | lib/pharmacy-copilot.functions.ts, routes/api/public/hooks/weekly-exec-report.ts |

## REVIEW_REQUIRED (67)

| Function | Reason | Callers (src/) |
| --- | --- | --- |
| `ack_staff_alert` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `alert_on_failed_agent_action` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `auto_populate_bundle_items` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `branch_reorder_suggestions` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `check_tracking_rate_limit` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `claim_agent_events` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `claim_customer_rx_notifications` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `consume_rate_limit` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `create_scheduled_backup` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `current_inventory_write_mode` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `customer_notification_get_status` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `customer_notification_set_optout` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `detect_stale_transfers` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `emit_event_on_order_insert` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `emit_event_on_prescription_insert` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `emit_order_event` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `emit_order_status_event` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `emit_prescription_review_requested` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `enqueue_chronic_refill_action` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `enqueue_customer_order_notification` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `enqueue_customer_rx_notification` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `exec_dashboard` | mixed callsites: 2 file(s) | lib/pharmacy-copilot.functions.ts, lib/pharmacy-intel-admin.functions.ts |
| `fail_agent_event` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `generate_agent_actions` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `generate_invoice_number` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `generate_marketing_campaigns` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `get_backup_schedule` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `handle_order_cancel_release` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `has_branch_access` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `intercept_new_order` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `intercept_new_prescription` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `inventory_report` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `is_branch_manager_of` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `list_approved_classifications_public` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `log_inventory_shadow` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `log_product_stock_change` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `log_table_activity` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `mark_event_processed` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `monitor_cron_failures` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `notify_inventory_audit_issues` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `on_order_inserted_alert` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `on_rx_inserted_alert` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `open_escalation_on_review` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `prescription_file_count` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `publish_transfer_event` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `rebuild_customer_intel` | mixed callsites: 2 file(s) | lib/pharmacy-intel-admin.functions.ts, routes/api/public/hooks/nightly-intel.ts |
| `recompute_loyalty_tier` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `record_order_status_change` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `redeem_loyalty_points` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `release_order_stock` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `release_transfer_reservation` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `reserve_order_stock` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `run_bi_worker` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `run_ceo_worker` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `run_cto_worker` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `run_cx_worker` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `run_inventory_worker` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `run_marketing_worker` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `run_operations_worker` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `run_sales_worker` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `seed_prescription_review` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `tg_publish_wa_escalation_event` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `tg_publish_wa_message_event` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `transfer_status_guard` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `trim_img_proxy_logs` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `validate_prescription_review_transition` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |
| `verify_prescription_image_coverage` | no .rpc() callsite found in src/ — likely trigger, cron-only, or unused | _none_ |

## Recommended Batch 2 SQL skeleton (NOT APPLIED)

```sql
-- For each SERVICE_ROLE_ONLY function:
-- REVOKE EXECUTE ON FUNCTION public.<fn>(<args>) FROM authenticated;

-- For each RESTRICT_ADMIN_ONLY function, add a guard at the top of the body:
-- IF NOT public.has_role(auth.uid(),'admin') AND NOT public.has_role(auth.uid(),'owner') THEN
--   RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
-- END IF;
```

## Verdict

**Batch 1 PASS.** Classification complete. Batch 2 (GRANT/body changes) is **gated on CTO review** of `REVIEW_REQUIRED` entries.

---
## Batch 1.5 — Name-based reclassification of REVIEW_REQUIRED (2026-06-28)
**Mode:** AUDIT / CLASSIFICATION ONLY. No GRANT/REVOKE applied. No code or PROJECT_STATE changes.
**Rules (in order):**
1. Name contains `_service_|_cron_|_internal_|_sync_|_trigger_|_maintenance_` → SERVICE_ROLE_ONLY
2. Name starts with `get_|search_|list_|select_|load_|fetch_|find_` → KEEP_AUTHENTICATED
3. Name starts with `set_|update_|delete_|remove_|create_|insert_|admin_|configure_|manage_` → RESTRICT_ADMIN_ONLY
4. Otherwise → REVIEW_REQUIRED (residual)

### New bucket counts (Batch 1 + Batch 1.5)

| Bucket | Batch 1 | + Batch 1.5 | New total |
| --- | ---: | ---: | ---: |
| KEEP_AUTHENTICATED | 66 | 2 | 68 |
| RESTRICT_ADMIN_ONLY | 12 | 1 | 13 |
| SERVICE_ROLE_ONLY | 11 | 1 | 12 |
| REVIEW_REQUIRED | 0 | 63 | 63 |
| **TOTAL** | **89** | **67** | **156** |

### SERVICE_ROLE_ONLY (1)

| Function | Rule matched | Callers (src/) |
| --- | --- | --- |
| `monitor_cron_failures` | name contains service/cron/internal/sync/trigger/maintenance token | _none_ |

### KEEP_AUTHENTICATED (2)

| Function | Rule matched | Callers (src/) |
| --- | --- | --- |
| `get_backup_schedule` | read-prefix (get/search/list/...) | _none_ |
| `list_approved_classifications_public` | read-prefix (get/search/list/...) | _none_ |

### RESTRICT_ADMIN_ONLY (1)

| Function | Rule matched | Callers (src/) |
| --- | --- | --- |
| `create_scheduled_backup` | write/admin-prefix (set/update/delete/admin/...) | _none_ |

### REVIEW_REQUIRED (63)

| Function | Rule matched | Callers (src/) |
| --- | --- | --- |
| `ack_staff_alert` | no rule matched — needs manual review | _none_ |
| `alert_on_failed_agent_action` | no rule matched — needs manual review | _none_ |
| `auto_populate_bundle_items` | no rule matched — needs manual review | _none_ |
| `branch_reorder_suggestions` | no rule matched — needs manual review | _none_ |
| `check_tracking_rate_limit` | no rule matched — needs manual review | _none_ |
| `claim_agent_events` | no rule matched — needs manual review | _none_ |
| `claim_customer_rx_notifications` | no rule matched — needs manual review | _none_ |
| `consume_rate_limit` | no rule matched — needs manual review | _none_ |
| `current_inventory_write_mode` | no rule matched — needs manual review | _none_ |
| `customer_notification_get_status` | no rule matched — needs manual review | _none_ |
| `customer_notification_set_optout` | no rule matched — needs manual review | _none_ |
| `detect_stale_transfers` | no rule matched — needs manual review | _none_ |
| `emit_event_on_order_insert` | no rule matched — needs manual review | _none_ |
| `emit_event_on_prescription_insert` | no rule matched — needs manual review | _none_ |
| `emit_order_event` | no rule matched — needs manual review | _none_ |
| `emit_order_status_event` | no rule matched — needs manual review | _none_ |
| `emit_prescription_review_requested` | no rule matched — needs manual review | _none_ |
| `enqueue_chronic_refill_action` | no rule matched — needs manual review | _none_ |
| `enqueue_customer_order_notification` | no rule matched — needs manual review | _none_ |
| `enqueue_customer_rx_notification` | no rule matched — needs manual review | _none_ |
| `exec_dashboard` | no rule matched — needs manual review | lib/pharmacy-copilot.functions.ts, lib/pharmacy-intel-admin.functions.ts |
| `fail_agent_event` | no rule matched — needs manual review | _none_ |
| `generate_agent_actions` | no rule matched — needs manual review | _none_ |
| `generate_invoice_number` | no rule matched — needs manual review | _none_ |
| `generate_marketing_campaigns` | no rule matched — needs manual review | _none_ |
| `handle_order_cancel_release` | no rule matched — needs manual review | _none_ |
| `has_branch_access` | no rule matched — needs manual review | _none_ |
| `intercept_new_order` | no rule matched — needs manual review | _none_ |
| `intercept_new_prescription` | no rule matched — needs manual review | _none_ |
| `inventory_report` | no rule matched — needs manual review | _none_ |
| `is_branch_manager_of` | no rule matched — needs manual review | _none_ |
| `log_inventory_shadow` | no rule matched — needs manual review | _none_ |
| `log_product_stock_change` | no rule matched — needs manual review | _none_ |
| `log_table_activity` | no rule matched — needs manual review | _none_ |
| `mark_event_processed` | no rule matched — needs manual review | _none_ |
| `notify_inventory_audit_issues` | no rule matched — needs manual review | _none_ |
| `on_order_inserted_alert` | no rule matched — needs manual review | _none_ |
| `on_rx_inserted_alert` | no rule matched — needs manual review | _none_ |
| `open_escalation_on_review` | no rule matched — needs manual review | _none_ |
| `prescription_file_count` | no rule matched — needs manual review | _none_ |
| `publish_transfer_event` | no rule matched — needs manual review | _none_ |
| `rebuild_customer_intel` | no rule matched — needs manual review | lib/pharmacy-intel-admin.functions.ts, routes/api/public/hooks/nightly-intel.ts |
| `recompute_loyalty_tier` | no rule matched — needs manual review | _none_ |
| `record_order_status_change` | no rule matched — needs manual review | _none_ |
| `redeem_loyalty_points` | no rule matched — needs manual review | _none_ |
| `release_order_stock` | no rule matched — needs manual review | _none_ |
| `release_transfer_reservation` | no rule matched — needs manual review | _none_ |
| `reserve_order_stock` | no rule matched — needs manual review | _none_ |
| `run_bi_worker` | no rule matched — needs manual review | _none_ |
| `run_ceo_worker` | no rule matched — needs manual review | _none_ |
| `run_cto_worker` | no rule matched — needs manual review | _none_ |
| `run_cx_worker` | no rule matched — needs manual review | _none_ |
| `run_inventory_worker` | no rule matched — needs manual review | _none_ |
| `run_marketing_worker` | no rule matched — needs manual review | _none_ |
| `run_operations_worker` | no rule matched — needs manual review | _none_ |
| `run_sales_worker` | no rule matched — needs manual review | _none_ |
| `seed_prescription_review` | no rule matched — needs manual review | _none_ |
| `tg_publish_wa_escalation_event` | no rule matched — needs manual review | _none_ |
| `tg_publish_wa_message_event` | no rule matched — needs manual review | _none_ |
| `transfer_status_guard` | no rule matched — needs manual review | _none_ |
| `trim_img_proxy_logs` | no rule matched — needs manual review | _none_ |
| `validate_prescription_review_transition` | no rule matched — needs manual review | _none_ |
| `verify_prescription_image_coverage` | no rule matched — needs manual review | _none_ |

### Residual REVIEW_REQUIRED — needs human eyes

- `ack_staff_alert`
- `alert_on_failed_agent_action`
- `auto_populate_bundle_items`
- `branch_reorder_suggestions`
- `check_tracking_rate_limit`
- `claim_agent_events`
- `claim_customer_rx_notifications`
- `consume_rate_limit`
- `current_inventory_write_mode`
- `customer_notification_get_status`
- `customer_notification_set_optout`
- `detect_stale_transfers`
- `emit_event_on_order_insert`
- `emit_event_on_prescription_insert`
- `emit_order_event`
- `emit_order_status_event`
- `emit_prescription_review_requested`
- `enqueue_chronic_refill_action`
- `enqueue_customer_order_notification`
- `enqueue_customer_rx_notification`
- `exec_dashboard`
- `fail_agent_event`
- `generate_agent_actions`
- `generate_invoice_number`
- `generate_marketing_campaigns`
- `handle_order_cancel_release`
- `has_branch_access`
- `intercept_new_order`
- `intercept_new_prescription`
- `inventory_report`
- `is_branch_manager_of`
- `log_inventory_shadow`
- `log_product_stock_change`
- `log_table_activity`
- `mark_event_processed`
- `notify_inventory_audit_issues`
- `on_order_inserted_alert`
- `on_rx_inserted_alert`
- `open_escalation_on_review`
- `prescription_file_count`
- `publish_transfer_event`
- `rebuild_customer_intel`
- `recompute_loyalty_tier`
- `record_order_status_change`
- `redeem_loyalty_points`
- `release_order_stock`
- `release_transfer_reservation`
- `reserve_order_stock`
- `run_bi_worker`
- `run_ceo_worker`
- `run_cto_worker`
- `run_cx_worker`
- `run_inventory_worker`
- `run_marketing_worker`
- `run_operations_worker`
- `run_sales_worker`
- `seed_prescription_review`
- `tg_publish_wa_escalation_event`
- `tg_publish_wa_message_event`
- `transfer_status_guard`
- `trim_img_proxy_logs`
- `validate_prescription_review_transition`
- `verify_prescription_image_coverage`

