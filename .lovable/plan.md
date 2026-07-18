## Validation performed (read-only, already executed this turn)

Cross-referenced every `.rpc(...)` call site in `src/` against the 43 revoked functions, then confirmed live DB permissions for the intersection.

### Methodology

1. Extracted all 109 unique RPC names actually called from the codebase (`rg` over `src/`).
2. Intersected with the 43 revoked function names.
3. For each hit, verified the call site's client (browser / `context.supabase` / `supabaseAdmin`) and confirmed live DB `has_function_privilege(...)` still permits it.
4. Verified trigger functions are wired via `pg_trigger` (RPC path is irrelevant for them).

### Passed checks ✅

| # | Area | Evidence |
|---|------|----------|
| 1 | Authenticated user RPC calls | 38 revoked fns are **not called** from any code path. The 5 revoked fns that are called all still have `authenticated`/`service_role` EXECUTE where the code needs it. |
| 2 | Service role operations | `log_org_event` (called via `supabaseAdmin`) → `svc_exec=true`. `inv_intel_snapshot` (via `supabaseAdmin`) → `svc_exec=true`. |
| 3 | Backend server functions | `isOrgFeatureEnabled` / `checkOrgLimit` in `src/platform/subscriptions/subscriptions.functions.ts` use `context.supabase` behind `requireSupabaseAuth` → `auth_exec=true` for `org_feature_enabled` and `org_within_limit`. |
| 4 | AI agents DB access | All AI agent RPCs (`agent_events_dlq_stats`, `get_agent_alerts`, `has_role`, etc.) are not on the revoked list; unaffected. |
| 5 | Background jobs / cron | `pg_cron` executes as `postgres` (function owner) — REVOKE FROM anon has no effect. Verified: `email_queue_dispatch`, `email_queue_wake`, `hc_touch_doctor_scores`, `pn_flag_near_expiry`, `inv_intel_snapshot` all still callable by the cron role. |
| 6 | Cron workflows | Same as (5). No cron entry references anon. |
| 7 | Admin operations | Doctor-admin flow (`hc_detect_doctor_duplicates` in `src/modules/doctors/api/join-admin.functions.ts`) uses `context.supabase` behind `requireSupabaseAuth` → `auth_exec=true`. |
| 8 | Trigger dispatch | All 9 revoked `tg_*` functions still bound to their triggers in `pg_trigger` (19 trigger rows confirmed). SECURITY DEFINER means they execute as `postgres` regardless of client role, so REVOKE from anon has zero runtime effect. |

### Live permission matrix for the 5 in-code revoked functions

```
           proname           | auth_exec | svc_exec | anon_exec | needed_role
-----------------------------+-----------+----------+-----------+-------------
 hc_detect_doctor_duplicates |    t      |    t     |    f      | authenticated  ✅
 inv_intel_snapshot          |    t      |    t     |    f      | service_role   ✅
 log_org_event               |    f      |    t     |    f      | service_role   ✅
 org_feature_enabled         |    t      |    t     |    f      | authenticated  ✅
 org_within_limit            |    t      |    t     |    f      | authenticated  ✅
```

### Failed checks ❌

**None.**

### Permission errors

**None observed.** No code path invokes any of the 43 revoked functions from the anon role. The 38 revoked functions with zero callers in `src/` are either:
- Internal helpers (`current_org`, `is_org_member`, `has_org_role`, `has_consent`, `patient_belongs_to_current_user`, `emit_identity_event`) called only from other SECURITY DEFINER functions / policies — invoked as `postgres`, unaffected;
- Trigger functions — invoked by trigger dispatch, unaffected;
- Admin/workflow RPCs not yet wired from the frontend — no regression to a live path;
- Job hooks (`email_queue_*`, `emit_purchase_recommendation_event`, `inv_intel_snapshot`, healthcare recomputes, `pn_flag_near_expiry`) — reached via cron/service_role, unaffected.

### Residual risks

- `log_org_event` has `auth_exec=false` (pre-existing from SEC-P1-003). Current callers use `supabaseAdmin`, which is correct. If a future feature tries to log an org event from a user-scoped server fn, it will fail — grant `authenticated` explicitly at that point.
- The 4 kept anon-callable functions (`search_medicines_public`, `pn_search_medicine_nearby`, `pn_get_pharmacy_public`, `pn_list_pharmacy_products`) remain reviewed and return only public data.

## Deliverable proposed

If approved, save this report as `docs/engineering/reports/SECDEF-HARDENING-v2-validation.md` and cross-link it from `SECDEF-HARDENING-v2.md`. No code or DB changes.
