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





