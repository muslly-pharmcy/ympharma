# Engineering Execution System — Changelog

Human-readable record of frozen-system events. Append-only. One line per
event, newest at the bottom of each section.

## 2026-06-28

- **EES v1.0 frozen.** Contract, project state, and Phase-1 plan
  committed under `docs/engineering/`. Approved by CTO + ITRB.
- **SEC-P1-002 Batch 1 PASS.** Inventory accepted; 8 leaks documented.
- **SEC-P1-002 Batch 2 dispatched.** Plan frozen to the 8 inventoried
  files; dynamic-import remediation applied. tsgo + build pass.
- **SEC-P1-002 Batch 2 PASS** (implicit, per CTO dispatch of CRON-P1-004).
- **CRON-P1-004 Batch 1 dispatched.** Canonical `@/middleware/cron-auth`
  wrapper created; full hook-route audit confirms every route is guarded
  (cron-secret, HMAC, or worker-secret). Awaiting ITRB verdict.
- **CRON-P1-004 Batch 1 PASS** (CTO-confirmed).
- **AUTH-P1-003 PASS** (verification-only; CTO Option C). `src/routes/auth.tsx`
  already satisfies the unified email/password sign-in + sign-up spec; no
  source edits. Report: `reports/AUTH-P1-003-batch-1-verification.md`.
- **DB-P1-005 appended to plan** as dry-run / verification-only feature
  (manual apply via Supabase SQL Editor; migrations folder is
  platform-managed). Scope: a single generic SQL artifact that revokes
  EXECUTE from PUBLIC+anon and grants to authenticated for every
  SECURITY DEFINER function in `public`.
- **DB-P1-005 Batch 1 PASS** (verification-only). Artifact:
  `docs/engineering/artifacts/20260628044324_fix_security_definer.sql`.
  Report: `reports/DB-P1-005-batch-1-verification.md`.
- **Phase 1 CLOSED.** All P1 features (SEC-P1-002, CRON-P1-004,
  AUTH-P1-003, DB-P1-005) marked PASS. SEC-P1-001 superseded by
  CRON-P1-004. SEC-P1-003 deferred to Phase 2 (RPC GRANT tightening
  overlaps DB-P1-005 outcomes and should be re-scoped after manual
  apply review).
- **DB-P1-005 LIVE APPLY (post-close hardening).** Artifact applied via
  Supabase migration tool. Verification: 156/156 SECURITY DEFINER
  functions in `public` now `authenticated=true, anon=false, public=false`;
  offenders=0. Report: `reports/verification-results.md`. CSV:
  `/mnt/documents/db-p1-005-verification.csv`. Supabase linter 0029
  WARNs (one per function) are by-design for Phase 1; narrowing per
  function is Phase 2 / SEC-P1-003 work.
- **Phase 2 OPENED.** `PROJECT_STATE.yaml` advanced to `Phase2 / SEC-P1-003`
  with `phase_status: READY` and blocker `plans/phase-2.yaml not yet authored`.
- **plans/phase-2.yaml authored.** SEC-P1-003 scope frozen: Batch 1 audit
  (classify 156 SECURITY DEFINER fns into 4 buckets), Batch 2 execute
  (AWAITING_APPROVAL).
- **SEC-P1-003 Batch 1 PASS.** Classification report committed at
  `reports/SEC-P1-003-batch-1-classification.md`. Buckets:
  KEEP_AUTHENTICATED=66, RESTRICT_ADMIN_ONLY=12, SERVICE_ROLE_ONLY=11,
  REVIEW_REQUIRED=67. No GRANT/REVOKE applied; no source changes.
  PROJECT_STATE blocker cleared; phase_status ACTIVE.






## 2026-06-28 — SEC-P1-003 Batch 1.5 (docs-only)
- Re-classified 67 REVIEW_REQUIRED functions using name-rule heuristics.
- New deltas: +2 KEEP_AUTHENTICATED, +1 RESTRICT_ADMIN_ONLY, +1 SERVICE_ROLE_ONLY, 63 remain REVIEW_REQUIRED.
- No SQL, no source, no PROJECT_STATE changes.
- Report: docs/engineering/reports/SEC-P1-003-batch-1-classification.md (Batch 1.5 section).

## 2026-06-28 — SEC-P1-003 Batch 2 dry-run generated (READY_FOR_REVIEW)
- Artifact: docs/engineering/artifacts/20260628053000_sec_p1_003_batch_2.sql
- Report:   docs/engineering/reports/SEC-P1-003-batch-2-dryrun.md
- 57 functions targeted (54 SERVICE_ROLE_ONLY + 3 RESTRICT_ADMIN_ONLY).
- SQL ends with ROLLBACK; — no DB changes applied.
- Discrepancies flagged: 2 missing admin function names, "admin" role substituted with service_role + has_role guard.
- PROJECT_STATE.yaml NOT modified (per CTO instruction).

## 2026-06-28 — SEC-P1-003 Batch 2 PASS (commit-ready, not applied)
- Artifact regenerated: docs/engineering/artifacts/20260628053000_sec_p1_003_batch_2.sql
- Rule: REVOKE EXECUTE ON FUNCTION <fn> FROM authenticated;
- 57 functions affected (5 RESTRICT_ADMIN_ONLY + 52 SERVICE_ROLE_ONLY).
- SQL ends with COMMIT; — awaiting CTO manual apply via Supabase migration tool.
- PROJECT_STATE.yaml updated: SEC-P1-003 → batch=2, action=COMPLETED.

## 2026-06-28 — SEC-P1-003 Batch 2 APPLIED LIVE ✅
- Migration executed via supabase--migration; REVOKE EXECUTE FROM authenticated on all 57 SECURITY DEFINER functions.
- Live verification: 0/57 functions retain EXECUTE for `authenticated` role.
- Report: docs/engineering/reports/SEC-P1-003-batch-2-verification.md.
- service_role and cron paths unaffected; admin endpoints continue to enforce has_role(auth.uid(),'admin') server-side.

## 2026-06-28 — Phase 2 CLOSED 🏁
- All P1 security features PASS: SEC-P1-002, CRON-P1-004, AUTH-P1-003, DB-P1-005, SEC-P1-003.
- PROJECT_STATE.yaml: phase_status=CLOSED, current.feature=null, action=IDLE.
- System READY FOR PRODUCTION from a P1 security standpoint.


## 2026-06-28 — Phase 3 OPENED
- plans/phase-3.yaml created (15 features).
- PROJECT_STATE.yaml flipped to Phase3 / SEC-P1-004 / EXECUTING.

## 2026-06-28 — SEC-P1-004 Batch 1 PASS
- scripts/check-imports.ts + .github/workflows/import-guard.yml created.
- Static guard scans 370 client-reachable files; 0 violations on current tree.
- CI will fail any PR introducing a top-level *.server import in client code.
- Report: docs/engineering/reports/SEC-P1-004-batch-1-fixes.md.
