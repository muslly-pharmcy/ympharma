# AI Workforce Activation — Implementation Plan

Goal: take the 8 existing personas (CEO, CTO, Sales, Inventory, Operations, Marketing, CX, BI) and ship them as autonomous workers that run on a cron, write real recommendations to dedicated tables, score KPIs, log every execution to `agent_runs`, and surface in a workforce dashboard.

No new persona definitions. No LLM rewrite. Reuse existing tables and the existing cron auth (`x-cron-secret`) so we don't double the secret surface.

---

## 1. Database (single migration)

### New tables (all RLS-enabled, admin/owner read, service_role write)

- `public.agent_recommendations`
  - `agent_name`, `category` (`sales`/`inventory`/`cx`/`marketing`/`bi`), `title`, `rationale`, `payload jsonb`, `impact_estimate numeric`, `confidence int`, `status` (`open|acted|dismissed`), `created_at`
- `public.agent_kpis`
  - `agent_name`, `metric` (`revenue_growth_score` etc.), `score numeric` 0–100, `details jsonb`, `as_of date`, unique(`agent_name`,`metric`,`as_of`)
- `public.system_incidents`
  - `source` (`cron`/`api`/`runtime`), `severity`, `title`, `summary`, `evidence jsonb`, `opened_at`, `resolved_at`, `status`
- `public.operations_alerts`
  - `kind` (`sla_breach`/`pending_rx`/`order_delay`), `ref_id`, `summary`, `severity`, `created_at`, `resolved_at`

Extend `agent_runs` (already exists, 11 cols) — add missing columns if absent: `findings_count int`, `recommendations_count int`, `execution_time_ms int`. ALTER ADD COLUMN IF NOT EXISTS.

### Analysis RPCs (SECURITY DEFINER, owner/admin only via has_role check at top)

One RPC per worker — pure SQL, no LLM. Each returns `jsonb` `{findings, recommendations, kpis}` AND writes rows into `agent_recommendations` / `agent_kpis` / output table. The worker route just calls the RPC and logs the summary to `agent_runs`.

- `run_ceo_worker()` → reads `orders`, `products`, `customer_scores`; computes WoW revenue, gross margin proxy, top-growth categories; inserts row in `executive_reports`; scores `revenue_growth_score` + `profitability_score`.
- `run_cto_worker()` → reads `error_logs` (last 24h grouped), `uptime_incidents` (open), `cron.job_run_details` (failed last 24h); opens `system_incidents` for new clusters (dedupe by hash); scores `uptime_score` (from uptime_checks) + `system_health_score` (inverse of error rate).
- `run_sales_worker()` → uses existing `auto_bundle_candidates` for cross-sell lift; recent order line co-occurrence for upsell; inserts top-N into `agent_recommendations` (category `sales`); scores `cross_sell_score` + `upsell_score`.
- `run_inventory_worker()` → reads `products.stock`, 14-day consumption velocity from `orders`/items; predicts days-to-stockout; flags items <7 days; inserts reorder recommendations; scores `stock_health_score` + `stockout_risk_score`.
- `run_operations_worker()` → reads `orders` where `status IN ('pending','processing')` older than SLA thresholds (configurable: 2h pending, 24h processing); writes to `operations_alerts` (dedupe by order_id+kind); scores `sla_score` + `fulfillment_score`.
- `run_marketing_worker()` → dormant customers (no order >60d), chronic segments from `customer_scores`; calls existing `enqueue_chronic_refills` for chronic; inserts campaign blueprints into `agent_recommendations` (category `marketing`); scores `engagement_score` + `campaign_readiness_score`.
- `run_cx_worker()` → reads `customer_scores` (churn signals), enrichment data; recommends retention actions (WhatsApp template + discount code); scores `retention_score` + `churn_risk_score`.
- `run_bi_worker()` → reads `revenue_by_condition`, weekly trend, declining_products; writes consolidated `business_insights` row into `agent_recommendations` (category `bi`); naive 7-day linear forecast; scores `forecast_accuracy_score` (vs prior forecast) + `growth_opportunity_score`.

All RPCs are idempotent for a given day (UPSERT by `(agent_name, as_of)` for KPIs; dedupe recommendations by title-hash + day).

---

## 2. Worker hook routes

Under `src/routes/api/public/hooks/agents/`:

```
ceo.ts  cto.ts  sales.ts  inventory.ts  operations.ts  marketing.ts  cx.ts  bi.ts
```

Each file follows the same shape:

```ts
verifyCronSecret(request)               // existing helper
const started = Date.now()
const runId = insert agent_runs {agent_name, kind:'scheduled', status:'running', started_at}
try {
  const { data } = await supabaseAdmin.rpc(`run_${name}_worker`)
  update agent_runs {status:'ok', finished_at, summary, details:data,
                     findings_count, recommendations_count,
                     execution_time_ms}
} catch (e) {
  update agent_runs {status:'error', finished_at, summary: e.message}
}
```

GET returns `{ok:true, hint:"POST with x-cron-secret"}` for manual probing.

---

## 3. Cron schedule

Extend `public.rotate_cron_secret` to register/unschedule 8 new jobs alongside the existing ones:

| Job | Cron (UTC) | Endpoint |
|---|---|---|
| muslly-agent-ceo | `0 4 * * *` (07:00 Sana'a) | /api/public/hooks/agents/ceo |
| muslly-agent-cto | `*/15 * * * *` | /api/public/hooks/agents/cto |
| muslly-agent-sales | `30 4 * * *` | /api/public/hooks/agents/sales |
| muslly-agent-inventory | `0 5 * * *` | /api/public/hooks/agents/inventory |
| muslly-agent-operations | `*/10 * * * *` | /api/public/hooks/agents/operations |
| muslly-agent-marketing | `0 6 * * *` | /api/public/hooks/agents/marketing |
| muslly-agent-cx | `30 6 * * *` | /api/public/hooks/agents/cx |
| muslly-agent-bi | `0 7 * * *` | /api/public/hooks/agents/bi |

User runs **"تدوير سر الجدولة"** once to register.

For the 24-hour success criterion, expose a `run_all_agents_now()` server fn callable from the dashboard ("تشغيل كل الوكلاء الآن") so the user can produce the first day's `agent_runs` rows immediately without waiting for cron.

---

## 4. Workforce Dashboard

New route `src/routes/admin-workforce.tsx` (admin-gated, RTL, matches existing admin styling).

Per-agent card grid (8 cards) showing:

- Agent name + icon + role
- Last run: timestamp + status badge (ok/error/running)
- Findings count, recommendations count, exec time
- Latest 2 KPI scores with mini bar
- "تشغيل الآن" button → `runAgentNow({ data:{ agent } })` server fn (admin only)
- "عرض التوصيات" → opens drawer with `agent_recommendations` for that agent

Footer: aggregate readiness score = avg of all agent latest KPI scores.

Link added to `/admin-command`.

---

## 5. Server fns (admin)

In `src/lib/pharmacy-copilot.functions.ts`:

- `runAgentNow({agent})` — admin-only, executes the agent's RPC inline and logs to agent_runs (same code path as the hook).
- `listAgentWorkforce()` — returns `{ agents: [{name, last_run, kpis, counts}], readiness_score }`.
- `listAgentRecommendations({agent, limit})`.

---

## 6. Out of scope (explicit)

- No new LLM personas; the existing `askExecutiveCopilot` Q&A stays.
- No edits to the Copilot prompt set.
- No changes to existing chronic-refills / weekly-exec-report / nightly-intel jobs — the BI/CEO/Marketing workers complement them, not replace them.
- No new secrets (reuse `CRON_SECRET`).
- No mock data — every RPC reads live tables; if a table is empty, the worker writes 0 findings and a KPI score of `null` so it's visibly empty rather than fake.

---

## 7. Verification (after build)

1. Apply migration → check linter clean.
2. Click "تدوير سر الجدولة" → confirm 8 new cron jobs present in `cron.job`.
3. Click "تشغيل كل الوكلاء الآن" → confirm 8 fresh `agent_runs` rows (status `ok` or `error` with real message — no silent success).
4. Open `/admin-workforce` → 8 cards populated, readiness score displayed.
5. Re-run audit query: `SELECT agent_name, COUNT(*), MAX(started_at) FROM agent_runs GROUP BY 1` should show 8 distinct agents within 24h window.

Estimated readiness after this wave: ~85/100 (the missing 15 is true ML forecasting, supplier-API integration, and per-agent A/B feedback loops — flagged but not built).
