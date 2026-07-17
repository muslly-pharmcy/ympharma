# PHASE 6 — Business Intelligence Galaxy + PHASE 7 — Titan Security Guardian

Both phases adapted to the actual codebase (`BaseAgent`, `EventBus`, `sun-tick`, existing tables) and Lovable Cloud rules. No fictional imports (`@/lib/supabase` → real `supabase` client / server publishable client where needed).

---

## Phase 6 — Business Intelligence Galaxy

### Migration (single call)
```sql
CREATE TABLE public.ai_business_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type text NOT NULL,     -- FINANCIAL | SALES | MARKET | EXECUTIVE
  summary text NOT NULL,
  recommendation jsonb NOT NULL DEFAULT '{}'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric NOT NULL DEFAULT 0,
  agent_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ai_business_insights TO authenticated;
GRANT ALL ON public.ai_business_insights TO service_role;
ALTER TABLE public.ai_business_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read" ON public.ai_business_insights FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "service writes" ON public.ai_business_insights FOR INSERT
  TO service_role WITH CHECK (true);
CREATE INDEX ai_business_insights_type_idx ON public.ai_business_insights(insight_type, created_at DESC);
```

### New files
```
src/ai/intelligence/
├── core/
│   ├── metric-engine.ts        # queries real tables: orders, catalog_products, inv_stock_batches
│   ├── intelligence-engine.ts  # rule-based insights over metrics
│   └── insight-writer.ts       # inserts into ai_business_insights (server-only)
├── finance/cfo-agent.ts        # extends BaseAgent, uses MetricEngine
├── sales/
│   ├── sales-agent.ts
│   └── demand-predictor.ts     # weighted moving average over demand_forecasts/orders
├── market/market-agent.ts
└── executive/ceo-agent.ts      # aggregates other agents' latest insights
```

### Events (append to `src/ai/events/event-types.ts`)
`DAILY_REPORT`, `SALES_DROP`, `PROFIT_CHANGE`, `GROWTH_OPPORTUNITY`, `FORECAST_READY`.

### Registration & scheduling
- Register the 4 BI agents in `src/ai/agents/register.ts`.
- Add tool permissions rows for each (read-only against real tables).
- Add `pg_cron` job `ai-daily-business-report` running every 6 hours → calls `POST /api/public/ai/business-tick` (new TSS server route, authenticates via anon `apikey`) which emits `DAILY_REPORT` through the EventBus.

### Dashboard
`src/routes/_authenticated/admin-business-intel.tsx` — Arabic RTL, teal palette:
- Latest CEO summary card
- Financial / Sales / Market insight columns (from `ai_business_insights`)
- Demand forecast table (top 10 SKUs)
Read via new server fn `businessInsights()` (admin-gated, uses `supabaseAdmin` only inside the handler).

---

## Phase 7 — Titan Security Guardian

### Migration
```sql
CREATE TABLE public.ai_security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,   -- LOGIN_FAILED, RLS_VIOLATION, ...
  severity text NOT NULL DEFAULT 'medium',  -- low|medium|high|critical
  source text,
  actor_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  risk_score integer NOT NULL DEFAULT 0,
  action_taken text,          -- ALLOW | REVIEW | BLOCK
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.ai_security_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor text,
  actor_id uuid,
  action text NOT NULL,
  resource text,
  result text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- grants + RLS: SELECT admin only, INSERT service_role only
CREATE INDEX ai_security_events_type_idx ON public.ai_security_events(event_type, created_at DESC);
CREATE INDEX ai_security_events_open_idx ON public.ai_security_events(resolved, severity);
CREATE INDEX ai_security_audit_actor_idx ON public.ai_security_audit(actor_id, created_at DESC);
```
(Reuse existing `identity_audit_events` for auth events instead of duplicating.)

### New files
```
src/security/ai/
├── core/
│   ├── security-engine.ts      # calculateRisk() + analyze()
│   ├── threat-detector.ts      # pattern rules (brute force, spikes)
│   └── policy-engine.ts        # ALLOW/REVIEW/BLOCK matrix
├── audit/audit-agent.ts        # server-only insert into ai_security_audit
├── database/rls-monitor.ts     # scans query strings/JSON for dangerous keywords
├── secrets/secret-guardian.ts  # regex scan for sk-*, service_role, apikey leaks
└── events/security-events.ts   # SECURITY_EVENTS constants
```

### Wiring
- `sun-tick` worker calls `SecurityEngine.analyze(event)` **before** dispatch; BLOCK short-circuits + inserts `ai_security_events` with `action_taken='BLOCK'`.
- Register `GuardianAgent` (already exists) as consumer of `SECURITY_EVENTS.*` → routes high/critical to `operations_alerts_v14` for Slack.
- `AuditAgent` records agent actions from `ai_actions` triggers (add trigger on INSERT).
- Optional: nightly `pg_cron` `security-daily-sweep` → hits `/api/public/security/sweep` which scans last-24h `ai_actions`, `error_logs`, `identity_audit_events` for anomalies.

### Dashboard
`src/routes/_authenticated/admin-security-guardian.tsx` — 4 sections:
1. Open security events (severity color-coded)
2. Last 50 audit rows
3. Risk heatmap (event_type × severity counts, 7d)
4. Secret-scan results & RLS monitor summary

Server fn `securityOverview()` (admin-only) with parallel `Promise.all` reads.

---

## Technical Notes

- All BaseAgents follow the existing pattern in `src/ai/agents/medical/pharmacist-agent.ts` (`success()` helper, `execute(event)` signature).
- Real Supabase client imports:
  - Agents run inside `sun-tick` handler → use dynamically-imported `supabaseAdmin` scoped to handler body.
  - Dashboards → server fn with `requireSupabaseAuth` + `has_role` check, then `supabaseAdmin` for aggregation reads.
- No new secrets required — all cron uses existing anon `apikey` pattern.
- No changes to `pg_cron` auth model, no fictional `@/lib/supabase` path.
- Type safety: return plain DTOs from all server fns; no `unknown` fields in returned objects (matches earlier serializer constraint).

## Deliverables

1. One migration for Phase 6 tables.
2. One migration for Phase 7 tables + `ai_actions` audit trigger.
3. ~15 new source files across `src/ai/intelligence/` and `src/security/ai/`.
4. Two new admin dashboards + two new server fn modules.
5. Two new `/api/public/*` cron endpoints + two `pg_cron` schedules.
6. Updated `src/ai/agents/register.ts` and `src/ai/bootstrap.ts`.

Estimated scope: ~800 LOC + 2 migrations. Executed as single pass; Phase 8 (Evolution Engine) follows on approval.
