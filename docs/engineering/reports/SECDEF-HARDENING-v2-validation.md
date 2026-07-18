# SECDEF-HARDENING v2 — Post-Apply Validation

**Date:** 2026-07-18
**Companion to:** `SECDEF-HARDENING-v2.md`
**Type:** Read-only validation. No code or DB changes.

## Methodology

1. Extracted all 109 unique RPC names invoked from `src/` (`rg -n ".rpc(['\"]"`).
2. Intersected with the 43 revoked function names → 5 hits.
3. For each hit, verified the call-site client (browser / `context.supabase` under `requireSupabaseAuth` / `supabaseAdmin`) and confirmed live DB `has_function_privilege(...)` for the role the client actually presents.
4. Verified all 9 revoked `tg_*` functions remain wired via `pg_trigger`.

## Passed checks ✅

| # | Area | Evidence |
|---|------|----------|
| 1 | Authenticated user RPC | 38 of 43 revoked fns have zero callers in `src/`. The 5 with callers all still hold the EXECUTE grant their caller needs. |
| 2 | Service role operations | `log_org_event`, `inv_intel_snapshot` → both `svc_exec = true`; both invoked via `supabaseAdmin`. |
| 3 | Backend server functions | `isOrgFeatureEnabled`, `checkOrgLimit` in `src/platform/subscriptions/subscriptions.functions.ts` use `context.supabase` behind `requireSupabaseAuth`; `org_feature_enabled` / `org_within_limit` both `auth_exec = true`. |
| 4 | AI agents DB access | No AI-agent RPC name (`agent_events_dlq_stats`, `get_agent_alerts`, `has_role`, `claim_agent_events`, `mark_event_processed`, …) is on the revoked list. |
| 5 | Background jobs | `pg_cron` runs as `postgres` (function owner); REVOKE FROM `anon` has no effect on those paths. |
| 6 | Cron workflows | Confirmed for `email_queue_dispatch`, `email_queue_wake`, `hc_touch_doctor_scores`, `pn_flag_near_expiry`, `inv_intel_snapshot`. |
| 7 | Admin operations | `hc_detect_doctor_duplicates` (in `src/modules/doctors/api/join-admin.functions.ts`) runs under `requireSupabaseAuth`; `auth_exec = true`. |
| 8 | Trigger dispatch | All 9 revoked `tg_*` functions still bound to their triggers (19 rows in `pg_trigger`). SECURITY DEFINER executes as `postgres`, so anon revocation is inert here. |

## Permission matrix for the 5 in-code revoked functions

```
           proname           | auth_exec | svc_exec | anon_exec | client used         | verdict
-----------------------------+-----------+----------+-----------+---------------------+---------
 hc_detect_doctor_duplicates |    t      |    t     |    f      | context.supabase    |  ✅
 inv_intel_snapshot          |    t      |    t     |    f      | supabaseAdmin       |  ✅
 log_org_event               |    f      |    t     |    f      | supabaseAdmin       |  ✅
 org_feature_enabled         |    t      |    t     |    f      | context.supabase    |  ✅
 org_within_limit            |    t      |    t     |    f      | context.supabase    |  ✅
```

## Failed checks ❌

**None.**

## Permission errors observed

**None.** No `src/` code path invokes any of the 43 revoked functions from the anon role. The 38 revoked functions with zero direct callers are one of:

- Internal helpers (`current_org`, `is_org_member`, `has_org_role`, `has_consent`, `patient_belongs_to_current_user`, `emit_identity_event`) reached only from other SECURITY DEFINER functions / RLS policies (execute as `postgres`).
- Trigger functions dispatched by `pg_trigger`.
- Admin/workflow RPCs not yet wired from the frontend.
- Job hooks reached only via cron / `service_role`.

## Residual risks

- `log_org_event` currently has `auth_exec = false` (inherited from SEC-P1-003, not caused by v2). Present callers use `supabaseAdmin`, so it is fine today. If a future user-scoped server fn needs to emit an org event, grant `authenticated` explicitly at that point.
- The 4 kept anon-callable functions (`search_medicines_public`, `pn_search_medicine_nearby`, `pn_get_pharmacy_public`, `pn_list_pharmacy_products`) still return only public catalog / pharmacy data; posture unchanged.

## Verdict

**PASS.** SECDEF-HARDENING v2 introduced zero regressions across authenticated RPC, service-role operations, backend server functions, AI-agent DB access, background jobs, cron, admin operations, and trigger dispatch.
