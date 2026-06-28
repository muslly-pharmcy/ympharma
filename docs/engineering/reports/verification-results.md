# DB-P1-005 — Post-Apply Verification Results

**Applied:** 2026-06-28 via Supabase migration tool
**Mode:** LIVE APPLY (artifact `20260628044324_fix_security_definer.sql`)
**Status:** ✅ PASS

## Summary

| Metric | Value |
| --- | --- |
| Total `SECURITY DEFINER` functions in `public` | **156** |
| `has_authenticated = true` | 156 / 156 ✅ |
| `has_anon = true` | 0 / 156 ✅ |
| `has_public = true` | 0 / 156 ✅ |
| Offenders (anon/public exposed OR authenticated revoked) | **0** |

All functions now satisfy the acceptance criteria:
`has_authenticated=true, has_anon=false, has_public=false`.

## Full result set

Exported CSV (157 lines incl. header) available at:
`/mnt/documents/db-p1-005-verification.csv`

First rows:

```
function_name,has_authenticated,has_anon,has_public
_agent_kpi_upsert,t,f,f
_agent_rec_upsert,t,f,f
_classif_can_manage,t,f,f
...
```

## Linter follow-up

Supabase linter emits WARN `0029_authenticated_security_definer_function_executable`
for every function still callable by `authenticated`. This is **expected by design**
of DB-P1-005 — `authenticated` access is the intended posture. Reclassifying any
specific function to `SECURITY INVOKER` or to a narrower role is deferred to
Phase 2 (`SEC-P1-003 — RPC GRANT tightening`).

## Verdict

**PASS — Phase 1 fully closed.** Ready to open Phase 2 / SEC-P1-003.
