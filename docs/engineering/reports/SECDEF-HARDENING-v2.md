# SECDEF-HARDENING v2 — Report

**Date:** 2026-07-18
**Scope:** SECURITY DEFINER functions in schema `public`
**Post-apply validation:** [`SECDEF-HARDENING-v2-validation.md`](./SECDEF-HARDENING-v2-validation.md) — PASS, no regressions.
**Change type:** Least-privilege revoke of anonymous EXECUTE. No signature, body, ownership, or `search_path` change.

## 1. Discovery snapshot (pre-change)

| Metric | Value |
| --- | ---: |
| Total SECURITY DEFINER functions in `public` | 220 |
| Owned by `postgres` | 220 / 220 |
| With `SET search_path` configured | 220 / 220 |
| Using dynamic `EXECUTE` (SQL injection surface) | 0 |
| Executable by `anon` | 47 |

Prior phases (DB-P1-005, SEC-P1-003 Batch 1 & 2) already normalized ownership, `search_path`, and revoked `authenticated` from the internal 57. The remaining hardening gap was `anon`.

## 2. Analysis (10 risk dimensions)

| # | Risk | Finding |
|---|------|---------|
| 1 | Privilege escalation | 43 privileged fns callable pre-auth (billing writes, org admin, healthcare admin, pharmacy writes, triggers). |
| 2 | Unsafe ownership | None — all owned by `postgres`. |
| 3 | Missing `search_path` | None — 220/220 pinned. |
| 4 | Unsafe dynamic SQL | None — 0 functions use `EXECUTE`. |
| 5 | Missing input validation | Not modified in this patch (functions retain their own validation). |
| 6 | Incorrect permission assumptions | 43 relied on RLS/app checks despite being anon-reachable. |
| 7 | RLS bypass | Same 43: SECURITY DEFINER + anon EXECUTE = RLS bypass surface. |
| 8 | Excessive execution privileges | Fixed: revoked anon on 43. |
| 9 | Missing authorization | Preserved (application-side `has_role` gates remain). |
| 10 | Sensitive data exposure | 4 remaining anon-callable functions return only public catalog/pharmacy data. |

## 3. Fix applied

Single migration, single transaction, per-function `REVOKE EXECUTE … FROM anon, PUBLIC`. Idempotent (each REVOKE is a no-op if already applied). `authenticated` and `service_role` grants untouched.

**Revoked from anon (43):**

- Billing: `billing_activate_plan`, `billing_cancel_subscription`, `billing_issue_invoice`, `billing_record_payment`
- Org / identity: `current_org`, `is_org_member`, `has_org_role`, `list_my_org_permissions`, `org_feature_enabled`, `org_within_limit`, `log_org_event`, `emit_identity_event`, `handle_new_user_profile`, `patient_belongs_to_current_user`
- Healthcare admin: `hc_approve_join_submission`, `hc_reject_join_submission`, `hc_flag_join_photo`, `hc_detect_doctor_duplicates`, `hc_doctors_guard_verify`, `hc_normalize_doctor_row`, `hc_recompute_profile_completeness`, `hc_recompute_trust_score`, `hc_healthcare_kpis`, `hc_touch_doctor_scores`
- Pharmacy network writes: `pn_request_transfer`, `pn_submit_verification`, `pn_upsert_stock`, `pn_verify_pharmacy`, `pn_flag_near_expiry`
- Consent: `has_consent`
- Inventory / email / recs: `inv_intel_snapshot`, `email_queue_dispatch`, `email_queue_wake`, `emit_purchase_recommendation_event`
- Trigger-only helpers: `tg_ai_actions_audit`, `tg_branch_assignments_events`, `tg_branches_events`, `tg_med_to_timeline`, `tg_org_members_events`, `tg_organization_members_audit`, `tg_organizations_after_insert`, `tg_profiles_events`, `tg_vault_to_timeline`

**Kept anon-callable by design (4):**

- `search_medicines_public(_q, _limit)` — public medicine search
- `pn_search_medicine_nearby(...)` — geo pharmacy lookup
- `pn_get_pharmacy_public(_slug)` — public pharmacy profile
- `pn_list_pharmacy_products(_slug, _q, _limit, _offset)` — public pharmacy catalog

## 4. Validation (post-apply, live DB)

```sql
SELECT p.proname
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public' AND p.prosecdef AND p.prokind='f'
  AND has_function_privilege('anon', p.oid, 'EXECUTE')
ORDER BY 1;
```

Result:

```
 pn_get_pharmacy_public
 pn_list_pharmacy_products
 pn_search_medicine_nearby
 search_medicines_public
(4 rows)
```

✅ Exactly the intended keep-list. All 43 revocations confirmed.

Additional checks:
- Function bodies, signatures, ownership, and `search_path`: unchanged.
- `authenticated` and `service_role` grants: unchanged.
- Supabase linter: the 43 `0028_anon_security_definer_function_executable` warnings for revoked functions are cleared; 4 remain by design for the public read helpers.

## 5. Deliverables

| # | Item | Status |
|---|------|--------|
| 1 | Functions reviewed | 220 |
| 2 | Functions modified | 43 |
| 3 | Security issues found | 43 SECURITY DEFINER fns unnecessarily exposed to `anon` |
| 4 | Improvements applied | Least-privilege anon revoke |
| 5 | Migration | Applied via Supabase migration tool (2026-07-18) |
| 6 | Validation | ✅ live query confirms 4 remaining, matches keep-list |
| 7 | Remaining risks | 4 anon-callable functions by design (public catalog/pharmacy reads); no other privilege-escalation surface remains among SECURITY DEFINER functions |

## 6. Non-goals honored

- No conversion of SECURITY DEFINER → SECURITY INVOKER.
- No RLS policy edits.
- No signature / return-type changes.
- No changes to the 173 already-safe functions.
- No revocation from `authenticated` (previously closed in SEC-P1-003).

## 7. Accepted anon-exposed SECURITY DEFINER functions (keep-list)

Post-audit re-verification (2026-07-18) confirms exactly 4 functions remain
executable by `anon`, all intentional. Linter warnings
`SUPA_anon_security_definer_function_executable` for these are **accepted risk**
and should be filtered from future audits, not revoked.

| Function | Justification |
|---|---|
| `search_medicines_public(_q, _limit)` | Anonymous medicine search box on the public catalog; read-only, returns published catalog columns. |
| `pn_search_medicine_nearby(...)` | Anonymous geo lookup for `/find-care`; read-only, returns public pharmacy + distance. |
| `pn_get_pharmacy_public(_slug)` | Anonymous public pharmacy profile page; read-only, public-profile columns only. |
| `pn_list_pharmacy_products(_slug, _q, _limit, _offset)` | Anonymous public pharmacy catalog listing; read-only. |

All four are `SECURITY DEFINER` solely to bypass the caller's RLS for the
public columns they project; none write, none accept privileged parameters,
and all have `search_path = public, pg_temp` pinned and are owned by `postgres`.

Any new `SECURITY DEFINER` function added to `public` that becomes anon-callable
must either be added to this keep-list with a written justification or have
anon `EXECUTE` revoked in the same migration.
