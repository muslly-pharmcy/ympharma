## Scope

Read-only DB audit already ran. Findings:

- 220 SECURITY DEFINER functions in `public`.
- **All** have `search_path` set (DB-P1-005 previously fixed this).
- **All** owned by `postgres`. None use dynamic `EXECUTE`.
- Remaining gap: **47 functions still grant EXECUTE to `anon`** — the only material privilege-escalation surface left.

No business logic, function signatures, or SECURITY DEFINER attribute will change. Only `REVOKE EXECUTE … FROM anon` on functions that should not be reachable unauthenticated. `authenticated` and `service_role` grants stay untouched.

## Classification of the 47 anon-executable functions

**KEEP anon (4)** — genuinely public read surfaces already used by public routes:
- `search_medicines_public(_q, _limit)`
- `pn_search_medicine_nearby(...)`
- `pn_get_pharmacy_public(_slug)`
- `pn_list_pharmacy_products(_slug, _q, _limit, _offset)`

**REVOKE anon (43)** — privileged writes, admin ops, or trigger/internal helpers that must never be callable by an anonymous visitor:

- Billing (4): `billing_activate_plan`, `billing_cancel_subscription`, `billing_issue_invoice`, `billing_record_payment`
- Org/identity (10): `current_org`, `is_org_member`, `has_org_role`, `list_my_org_permissions`, `org_feature_enabled`, `org_within_limit`, `log_org_event`, `emit_identity_event`, `handle_new_user_profile`, `patient_belongs_to_current_user`
- Healthcare admin (9): `hc_approve_join_submission`, `hc_reject_join_submission`, `hc_flag_join_photo`, `hc_detect_doctor_duplicates`, `hc_doctors_guard_verify`, `hc_normalize_doctor_row`, `hc_recompute_profile_completeness`, `hc_recompute_trust_score`, `hc_healthcare_kpis`, `hc_touch_doctor_scores`
- Pharmacy network writes (4): `pn_request_transfer`, `pn_submit_verification`, `pn_upsert_stock`, `pn_verify_pharmacy`, `pn_flag_near_expiry`
- Consent / patient (1): `has_consent`
- Inventory / email / recs (4): `inv_intel_snapshot`, `email_queue_dispatch`, `email_queue_wake`, `emit_purchase_recommendation_event`
- Trigger functions never meant to be RPC-called (11): `tg_ai_actions_audit`, `tg_branch_assignments_events`, `tg_branches_events`, `tg_med_to_timeline`, `tg_org_members_events`, `tg_organization_members_audit`, `tg_organizations_after_insert`, `tg_profiles_events`, `tg_vault_to_timeline`

## Execution

One migration, one transaction, one dynamic loop that only revokes anon EXECUTE for the explicit allow-list of 43 signatures above. `authenticated` and `service_role` retain access. No change to owners, `search_path`, function bodies, or signatures.

Artifact + report:
- `docs/engineering/artifacts/<ts>_secdef_revoke_anon.sql` (commit-ready SQL)
- `docs/engineering/reports/SECDEF-HARDENING-v2.md` (before/after counts + per-function verdict)

## Validation (run after apply)

1. `SELECT count(*) FROM pg_proc … WHERE prosecdef AND has_function_privilege('anon', oid,'EXECUTE')` → expect **4** (the keep-list).
2. Same query for `authenticated` → unchanged from current baseline.
3. `tsgo --noEmit` → 0 diagnostics.
4. `scripts/check-imports.ts` → 0 violations.
5. Public route smoke: `/find-care` medicine search + pharmacy lookup still return 200 with results (they call the 4 kept anon functions).
6. Supabase linter re-run → the 43 `anon_security_definer_function_executable` warnings are gone; no new errors.

## Non-goals (explicitly not doing)

- No conversion of SECURITY DEFINER → SECURITY INVOKER.
- No signature/return-type changes.
- No RLS policy edits.
- No changes to the 173 already-safe functions.
- No revocation from `authenticated` (that's SEC-P1-003 territory, already closed).

## Deliverables

1. Functions reviewed: 220
2. Functions modified: 43 (anon revoke only)
3. Issues found: 43 SECURITY DEFINER functions unnecessarily exposed to `anon`
4. Fix applied: least-privilege anon revoke, keep-list of 4 public read helpers
5. Migration file: `secdef_revoke_anon` (single transaction, idempotent)
6. Validation: SQL counts + linter + typecheck + public smoke
7. Remaining risk: 4 anon-callable functions remain by design — they read only public catalog/pharmacy data and are already used by public routes
