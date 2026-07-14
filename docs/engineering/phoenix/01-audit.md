# TITANUS OMEGA X — Phoenix Rebuild · Deliverable 1
## Architecture Audit Report
**Phase:** PHOENIX-P0 · **Date:** 2026-07-14 · **Scope:** read-only forensic audit. Zero code / schema changes.

---

## 1. Current architecture snapshot

| Dimension | Value | Source |
|---|---:|---|
| Framework | TanStack Start v1 + React 19 + Vite 7 | `.lovable/project.json`, `package.json` |
| Runtime | Cloudflare Workers (nodejs_compat) | `vite.config.ts` |
| Data | Supabase Postgres + Auth + Storage | `src/integrations/supabase/` |
| Route files | 92 top-level + 16 authenticated | `src/routes/` |
| Top-level `admin-*` routes | 54 | `ls src/routes` |
| Public webhooks (`/api/public/hooks/*`) | 32 | `src/routes/api/public/hooks` |
| Migrations | 133 | `supabase/migrations` |
| Tables (public) | 108 | `<supabase-tables>` context |
| SECURITY DEFINER functions | 156 (100% GRANT-hardened post DB-P1-005) | `docs/engineering/reports/DB-P1-005-batch-1-verification.md` |
| pg_cron jobs | 32 (backup verify jobid=42, health scan, retention, agents…) | prior verifications |
| AI agents | 8 (bi, ceo, cto, cx, inventory, marketing, operations, sales, whatsapp) via `agent_events` + DLQ | `docs/cto-final-verdict-2026-06-20.md` |

---

## 2. Layer map

```text
┌──────────────── Client (TanStack Start v1) ────────────────┐
│ Public routes (~38)  │  _authenticated/* (16, managed gate)│
│ /admin-*  (54) — flat, ad-hoc wrappers, AdminGate mix       │
└──────┬────────────────────────────┬─────────────────────────┘
       │ supabase-js (anon)         │ createServerFn + bearer
       ▼                            ▼
┌──── Data API (PostgREST) ────┐ ┌── TanStack server fns ───┐
│  RLS everywhere              │ │ requireSupabaseAuth       │
│  GRANTs explicit (DB-P1-005) │ │ attachSupabaseAuth        │
└──────────────┬───────────────┘ └────────┬──────────────────┘
               ▼                          ▼
┌─────────────── Postgres (Supabase) ────────────────────────┐
│ 108 tables · 156 SECURITY DEFINER RPCs · 32 pg_cron jobs   │
│ Event bus: agent_events + agent_events_dlq + idempotency   │
└──────┬──────────────────────────────────────┬──────────────┘
       ▲                                      ▲
       │ webhooks/cron (x-cron-secret)        │ n8n / WhatsApp
┌──── /api/public/* (TSS server routes) ──────────────────────┐
│ 32 hooks: agents, backup-verify, hourly-health-scan, social │
│ callbacks, chronic-refills, uptime, log-error, img, …       │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Technical debt register (ranked)

| # | Debt | Impact | Evidence |
|---|---|---|---|
| D1 | **Route sprawl** — 54 flat `admin-*.tsx` routes at top level, no domain grouping | Onboarding cost, SEO leakage, no per-domain code-split | `src/routes/admin-*.tsx` |
| D2 | **No multi-tenant abstraction** — no `organization_id` column, no `current_org()` RLS helper | Blocks pharmacy-network, insurance, doctor tenants | schema audit |
| D3 | **Duplicated dashboards** — `admin-hub`, `admin-command`, `admin-dashboard`, `admin-ai-executive`, `admin-ai-executive-dashboard`, `admin-ai-orchestrator`, `admin-agents`, `admin-automation-hub` | Confusing UX, duplicated queries | route list |
| D4 | **AI surface fragmentation** — 14 `admin-ai-*` routes + 5 `ai-*` public routes, no single `ai-engine` module | No shared prompt/policy/guardrail layer | route list |
| D5 | **`src/lib/` monolith** + `src/hooks/` monolith with no domain ownership | Hidden cross-module coupling | tree scan |
| D6 | **Mixed UI systems** — shadcn/ui + Titans motion + hand-rolled admin shells | Inconsistent look, larger bundles | `src/components/titans/**`, `src/components/admin/**` |
| D7 | **Inconsistent error/notification taxonomy** across routes | Poor MTTR, duplicated toast/alert code | grep of `toast(`, `sendSlack` |
| D8 | **No feature-flag layer** — every change ships to 100% of users immediately | Blocks strangler-fig migration | absent |
| D9 | **No formal inventory-reservation table** | Multi-branch race conditions (Gap G1 in CTO verdict) | `docs/cto-final-verdict-2026-06-20.md` |
| D10 | **90+ tables with domain concerns collapsed** into `public` | No module boundary, hard to reason about ownership | `<supabase-tables>` |

---

## 4. Dependency analysis

- `xlsx` — pinned via SheetJS CDN tarball, F-01 CLOSED (`docs/security-operations.md`).
- `package.json` `overrides` used to resolve `entities`/`htmlparser2` — accepted, needs periodic review.
- Edge-incompatible risks (see `server-runtime` knowledge): no `sharp`, `canvas`, `puppeteer`, `child_process` present — clean.
- SSR/import protection guarded by `scripts/check-imports.ts` (SEC-P1-004 CLOSED) — 0 client-reachable `*.server` static imports.

---

## 5. Security audit — carry-forward

| Control | Status | Reference |
|---|---|---|
| Server-only module leaks | CLOSED | SEC-P1-002 Batch 2 |
| Cron/webhook auth (`x-cron-secret`) | CLOSED | CRON-P1-004 |
| Auth route + gate | CLOSED | AUTH-P1-003 |
| SECURITY DEFINER GRANTs (156/156) | CLOSED | DB-P1-005 |
| RPC EXECUTE tightening (57 fns) | CLOSED | SEC-P1-003 Batch 2 |
| CI import-graph guard | CLOSED | SEC-P1-004 |
| Cron monitoring & Slack alerts | IN PROGRESS | OPS-P2-002 |
| **Multi-tenant RLS scoping** | **GAP** | no `organization_id` on domain tables |
| **Signed-webhook coverage** | PARTIAL | 3 external integrations still HMAC-optional |
| **Bot detection / WAF layer** | GAP | none |
| **Per-org rate limiting** | GAP | global buckets only |

---

## 6. Performance audit (observations)

| Area | Finding | Priority |
|---|---|---|
| Route-level code split | Automatic, but 54 flat admin routes each pull shared admin lib → large chunks | P2 |
| LCP `/` | Hero uses `<img>` without preload hint on some viewports | P2 |
| Skeletons | Missing on ≥40 admin routes (spinner-only or blank) | P2 |
| Admin dashboards | Several fetch 5–8 queries per mount without `ensureQueryData` in loader | P1 |
| Workers cold start | Bundle size healthy; verify after module split | P3 |
| Images | Product images lack size variants / `imagetools` pipeline | P2 |

---

## 7. Database audit — domain classification

108 tables grouped by target module (Phase 2 restructure):

- **identity/users/roles**: `user_roles`, `staff_permissions`, `branch_user_assignments`, `user_devices` (4)
- **organizations/branches**: `branches`, `branch_inventory` (2) — *lacks `organizations` root*
- **customers/family**: `customer_profiles`, `customer_channels`, `customer_notification_preferences`, `customer_scores`, `loyalty_accounts`, `loyalty_transactions`, `stock_subscriptions` (7)
- **prescriptions + AI**: `prescriptions`, `prescription_files`, `prescription_orders`, `prescription_reviews`, `prescription_extractions`, `prescription_escalations`, `prescription_image_blobs` (7)
- **inventory/warehouse/transfers**: `inventory_alerts`, `inventory_audit_log`, `inventory_manual_adjustments`, `inventory_reservation_state`, `inventory_shadow_log`, `inventory_sync_logs`, `inventory_transfers`, `transfer_items`, `transfer_audit_log`, `supplier_link_audit`, `stock_subscriptions` (11)
- **catalog/media**: `products`, `product_classifications`, `product_gallery_images`, `product_image_overrides`, `bundles`, `bundle_items` (6)
- **orders/payments/invoices**: `orders`, `order_status_history`, `payment_transactions`, `invoices`, `tracking_lookups` (5)
- **insurance/laboratories**: `insurance_claims` (+labs table: missing) (1)
- **marketing/CMS/campaigns**: `marketing_banners`, `marketing_campaigns`, `marketing_queue`, `campaigns`, `discount_codes`, `discount_redemptions`, `offers`, `trust_pages` (8)
- **notifications/messaging**: `notifications`, `email_delivery_logs`, `email_send_log`, `email_send_state`, `email_unsubscribe_tokens`, `suppressed_emails`, `whatsapp_conversations`, `whatsapp_delivery_logs`, `whatsapp_escalations`, `whatsapp_messages`, `whatsapp_notification_dispatch`, `whatsapp_notification_templates`, `contact_messages` (13)
- **social/marketplace**: `social_posts`, `social_post_attempts`, `social_post_stats` (3)
- **AI-engine + agents**: `agent_actions`, `agent_approval_requests`, `agent_decisions`, `agent_events`, `agent_events_dlq`, `agent_feedback_events`, `agent_kpis`, `agent_performance_insights`, `agent_recommendations`, `agent_runs`, `agent_weights`, `ai_safety_logs`, `ai_tool_events`, `confidence_calibration_log`, `executive_reports` (15)
- **monitoring/audit/security/DR**: `activity_logs`, `alert_dedupe`, `alert_settings`, `alert_subscribers`, `app_settings`, `backup_verification_runs`, `backups`, `error_logs`, `error_logs_archive`, `event_consumer_schedule_log`, `health_checks`, `idempotency_keys`, `img_proxy_logs`, `img_proxy_settings`, `img_rate_limit`, `operations_alerts`, `operations_alerts_v14`, `rate_limit_buckets`, `retention_config`, `retention_policies`, `staff_alerts`, `system_incidents`, `trigger_metrics`, `uptime_checks`, `uptime_incidents`, `uptime_incidents_archive`, `reviews` (27)

**Missing (must add in later phases):** `organizations`, `organization_members`, `doctors`, `appointments`, `laboratories`, `lab_orders`, `medicine_catalog_master` (national), `medicine_aliases`, `pharmacy_network_links`.

---

## 8. Observability & DR

- Correlation-ID propagation: `src/core/observability/RequestContext.ts` + `Logger.ts` + `OtlpHttpExporter.ts` — LIVE.
- Backup verification: daily cron jobid=42 at 03:45 UTC → `backup_verification_runs`.
- Retention: `retention_config` + `RetentionScheduler` — LIVE.
- **Gaps:** no SLO dashboard (`/admin-slo`), no quarterly restore drill logged, Sentry DSN not set.

---

## 9. Verdict feeding Phoenix

- Foundation is solid enough that Phoenix is a **restructure + tenancy retrofit**, not a rewrite.
- Data layer is preserved; the rebuild is in code organization, UX consolidation, and tenancy.
- All existing security wins from Phase 1/2 are carried forward untouched.
