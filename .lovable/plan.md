
# Muslly Pharmacy OS — 9-Phase Build Plan

You picked **all 9 phases**, **SQL nightly + Lovable AI weekly**, and **queue + staff approval** for WhatsApp. That is too large for one turn — I will ship it in **4 sequential batches**, each one a single approval. Every batch is functional on its own; later batches enrich earlier ones.

---

## Batch 1 — Foundation (this turn after approval)

**Schema** (one migration, all RLS + GRANTs):
- `customer_profiles` (phone PK, name, first_seen, last_order_at, orders_count, total_spent, avg_order_value, dominant_category, chronic_flags jsonb, ai_insight text, ai_insight_at)
- `customer_scores` (phone PK, health_score 0-100, value_score 0-100, risk_score 0-100, segment text — `new|active|chronic|dormant|declining|vip`, computed_at)
- `agent_runs` (id, agent text, kind text, status, started_at, finished_at, summary, details jsonb, impact_estimate numeric, confidence int)
- `marketing_queue` (id, campaign_kind, customer_phone, customer_name, payload jsonb, status `pending|approved|sent|skipped|failed`, approved_by, approved_at, sent_at, wamid, error)
- `executive_reports` (id, day date unique, payload jsonb)

**Nightly SQL job** (`pg_cron` → `/api/public/hooks/nightly-intel`):
- Rebuilds `customer_profiles` + `customer_scores` from `orders` + approved `product_classifications` (chronic detection already exists via `pharmacy_chronic_legacy_ids`).
- Generates `marketing_queue` entries: dormant (>45d, was active), refill-due (chronic, ~25d since last refill), abandoned-cart (cart present, no order 24h — uses existing client data, skipped if not tracked).
- Inserts a row in `agent_runs` per agent.

**RPCs**:
- `exec_dashboard()` — revenue today/month, repeat %, chronic count, top diseases/classes/bundles/campaigns, low-stock, recovered revenue (from marketing_queue→orders join), lost revenue (cancelled + dormant value).
- `marketing_queue_list(status)`, `marketing_queue_approve(id)`, `marketing_queue_skip(id)`.

**Routes**:
- `/admin-command` — CEO Command Center (real-time KPIs, segments donut, top diseases/classes, agent runs feed).
- `/admin-marketing` — Campaign queue with Approve/Skip/Send (Send calls existing `sendWhatsAppOrderStatus` flow adapted).
- `/admin-agents` — agent_runs feed with impact/confidence ranking.

**Worker route**: `/api/public/hooks/nightly-intel` (calls `rebuild_customer_intel()` RPC; secured by `apikey` header).

---

## Batch 2 — AI Copilot + Weekly Enrichment

- `/api/public/hooks/weekly-ai-enrich` — picks top 200 customers by value, asks Gemini for: dominant disease label, 1-line Arabic insight, suggested next action. Writes to `customer_profiles.ai_insight`.
- **Pharmacy Copilot** server fn (`pharmacy-copilot.functions.ts`): analyzes orders/stock/customers, returns ranked recommendations `{ kind, title, impact_yer, confidence, action }`. Surfaced in `/admin-command` as "Copilot Recommendations" panel.
- Adds `agent_runs` entries for `copilot.daily`.

## Batch 3 — Agent Board + Self-Audit

- 10 agent functions (CEO/CTO/Marketing/Sales/Inventory/Operations/CX/BI/Security/IT) — each is a SQL-backed analyzer that writes to `agent_runs`. Most run nightly, security weekly.
- `/api/public/hooks/daily-audit` produces `executive_reports` row: security (uses existing scan), performance (uses uptime_checks), inventory (uses inventory_report), revenue (admin_revenue_series), customer (new from Batch 1).
- `/admin-reports` — calendar of daily executive reports, download JSON.

## Batch 4 — AI Bundles + Marketing Polish

- `bundle_suggestions` table + nightly generator: groups co-purchased products per disease/season → ranked bundle proposals with predicted conversion & margin.
- Admin UI to promote a suggested bundle into the real `bundles` table.
- WhatsApp template wiring for each campaign_kind (refill/dormant/loyalty/chronic_care/rx_followup) — staff still approves before send.
- Per-campaign tracking: sent/delivered/opened/clicked (via WA webhook already at `api/public/whatsapp-webhook.ts`)/converted (matched order within 7d).

---

## Technical notes

- All cron uses `pg_cron` + `pg_net` with the `apikey` header pattern (no new shared secret).
- All admin RPCs gated by `has_role('owner'|'admin')` or `has_permission('orders')`.
- AI weekly job uses existing `createLovableAiGatewayProvider` + Gemini-3-flash, batched to stay under credit budget.
- WhatsApp sends reuse existing `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_TEMPLATE_NAME` — no new secrets in Batch 1.
- Performance: nightly job indexes (`orders(customer_phone, created_at)`, `customer_scores(segment)`).

---

## What I will NOT do (per the "no vanity features" rule)

- No new auth flows, no redesigns, no marketing pages, no mobile-only UI.
- No realtime websockets in Batch 1 — dashboard polls every 60s.
- No SMS fallback — WhatsApp only (Yemen reality).

---

Reply **"go"** to ship Batch 1 now. Batches 2-4 follow as separate turns so each is reviewable. If you want a different first batch (e.g. start with AI Copilot), say so.
