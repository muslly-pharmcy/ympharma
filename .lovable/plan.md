
# Wave R1.3.2 — RLS Policy Migration for Bucket B (CRM Cluster First)

## Context

Wave R1.3.1 classified 91 admin-bypass server functions. Result:

```
Legitimate System Operations    2  (A — keep)
Replace with RLS               35  (B — this wave targets these)
Service Layer Required         54  (C — deferred to R1.3.4)
Needs Redesign                  0
```

Approved roadmap: **R1.3.2 → R1.3.5 → R1.4 → R1.5 → R1.6**, executed cluster-by-cluster with a migration + regression tests + verification report per step. Behaviour must not change; RLS becomes a defence-in-depth layer *underneath* the existing `requirePermission` / `actor.organizationId` guards.

## Scope of this wave

**Only Bucket B, CRM cluster.** Concretely, the 9 handlers below plus the RLS policies for the tables they touch:

- `campaigns.functions.ts` → `listCampaigns`, `getCampaign`, `listSegments`, `getSegment` (tables: `crm_campaigns`, `crm_campaign_events`, `crm_segments`)
- `customers.functions.ts` → `listCustomers`, `getCustomer` (tables: `crm_customers`, `crm_customer_contacts`)
- `customers.mutations.functions.ts` → `updateCustomer`, `addCustomerAddress`, `addCustomerContact`, `addCustomerTag`, `removeCustomerTag` (tables: `crm_customers`, `crm_customer_addresses`, `crm_customer_contacts`, `crm_customer_tags`)
- `loyalty.functions.ts` reads on `crm_loyalty_accounts`, `crm_loyalty_transactions`, `crm_reward_catalog`, `crm_reward_redemptions`, `crm_loyalty_rules`, `crm_loyalty_tiers` — RLS SELECT policies land in this wave; the handler cutover ships in R1.3.3 alongside customers/campaigns.

**Out of scope** (queued): medical / supply / platform clusters, all Bucket C service-layer extractions, R1.4+ audits, WhatsApp / Meta integrations (still gated on secrets).

## Plan

### Step 1 — Verify current tenant column and existing policies

Before writing SQL, query `pg_policies` and `information_schema.columns` for each target table to confirm:

- The tenant column name is `organization_id` (not `org_id` / `tenant_id`).
- Whether a `current_org()` helper already exists (used elsewhere in the schema).
- Which policies exist today so the migration doesn't collide with them.

No file edits in this step; findings feed the migration.

### Step 2 — Migration: RLS policies for CRM Bucket B tables

One migration that, per table:

1. Ensures RLS is enabled.
2. Creates a `SELECT`, `INSERT`, `UPDATE`, `DELETE` policy scoped to `organization_id = <current-org-of-auth.uid()>` and gated by the same role the current handler checks via `requirePermission` (using `public.has_role(auth.uid(), …)` where applicable, or a `SECURITY DEFINER` helper that reads the caller's `actor` org).
3. Confirms `GRANT SELECT, INSERT, UPDATE, DELETE ON <table> TO authenticated` is present (add if missing).

Tables covered: `crm_campaigns`, `crm_campaign_events`, `crm_segments`, `crm_customers`, `crm_customer_contacts`, `crm_customer_addresses`, `crm_customer_tags`, `crm_loyalty_accounts`, `crm_loyalty_transactions`, `crm_loyalty_rules`, `crm_loyalty_tiers`, `crm_reward_catalog`, `crm_reward_redemptions`.

No handler changes in this migration — policies land first so we can verify they match current behaviour before flipping any code.

### Step 3 — Verification queries

After the migration, run read-only checks:

- `SELECT tablename, policyname, cmd, qual FROM pg_policies WHERE tablename LIKE 'crm\_%'` — confirm every target table has the expected 4 policies.
- Simulated `SET LOCAL role authenticated; SET LOCAL request.jwt.claims …` probes against one row from a real org — confirm same-org rows return, other-org rows do not.

### Step 4 — Verification report

Append to `docs/engineering/WAVE-C7-REGRESSION-LOG.md` (existing regression log):

- Migration ID + tables touched.
- Policy diff (before/after).
- Probe results.
- Explicit statement: "No handler code changed in R1.3.2; cutover to `context.supabase` deferred to R1.3.3."

### Step 5 — Follow-up ticket (not executed here)

Open R1.3.3 tracking item covering the actual handler migration to `context.supabase` + `requireSupabaseAuth` for the 9 CRM Bucket B functions, plus a regression suite that hits each function under two orgs to prove RLS blocks cross-tenant reads/writes.

## Technical notes

- Role check inside RLS uses `public.has_role(auth.uid(), 'pharmacist'::app_role)` etc. — the existing helper. Do not invent a new one.
- Organization scoping: today handlers read `actor.organizationId` from `getActor()`. RLS needs an equivalent. Preferred path: a `SECURITY DEFINER STABLE` helper `public.current_actor_org()` that reads `organization_members` for `auth.uid()` and returns the active org. If it already exists in the schema, reuse it; otherwise create it inside the same migration (with `search_path = public` and `REVOKE EXECUTE FROM PUBLIC; GRANT EXECUTE TO authenticated`).
- Migration uses `DROP POLICY IF EXISTS` before `CREATE POLICY` so it is idempotent.
- `SECURITY DEFINER` helpers created here fall under the R1.3-established hardening: explicit `search_path`, no `EXECUTE` to `anon`.

## Non-goals

- No handler rewrites (that is R1.3.3).
- No changes to Bucket C mutation functions or `session.server.ts` / `idempotency.server.ts`.
- No medical/supply/platform tables.
- No new tests written in this wave beyond the SQL probes — behaviour is unchanged.

## Acceptance

- Migration applied cleanly, idempotent on re-run.
- `pg_policies` shows the expected 4 policies per CRM Bucket B table.
- Same-org / cross-org probes behave as documented.
- Regression log entry added.
- R1.3.3 backlog item recorded.
