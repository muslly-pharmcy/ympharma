## SEC-P1-003 Batch 1 — audit & classification

### What this does
1. Create `docs/engineering/plans/phase-2.yaml` with the SEC-P1-003 scope.
2. Classify all 156 SECURITY DEFINER functions from `verification-results.md` into:
   - `KEEP_AUTHENTICATED` — safe for any signed-in user.
   - `RESTRICT_ADMIN_ONLY` — admin/owner only.
   - `SERVICE_ROLE_ONLY` — internal/trigger/cron; revoke from `authenticated`.
   - `REVIEW_REQUIRED` — ambiguous; needs human read of function body.
3. Method: name-pattern heuristics + ripgrep callsite scan of `src/` for `.rpc("<fn>")`.
4. Write `docs/engineering/reports/SEC-P1-003-batch-1-classification.md` with per-bucket counts, full per-function table (function, reason, top callers), and a recommended Batch 2 SQL skeleton (not applied).
5. Update `PROJECT_STATE.yaml`: clear blocker, set Batch 1 `action: PASS`, queue Batch 2 as `AWAITING_APPROVAL`.
6. Append entries to `CHANGELOG.md`.

### Preview of bucket counts (from a dry classifier run)
- KEEP_AUTHENTICATED: 66
- RESTRICT_ADMIN_ONLY: 12
- SERVICE_ROLE_ONLY: 11
- REVIEW_REQUIRED: 67

### Files touched
- `docs/engineering/plans/phase-2.yaml` (new)
- `docs/engineering/reports/SEC-P1-003-batch-1-classification.md` (new)
- `docs/engineering/PROJECT_STATE.yaml` (update)
- `docs/engineering/CHANGELOG.md` (append)

### Out of scope
- No `REVOKE` / `GRANT` SQL applied. No migration runs. No source-code changes. Those wait for CTO sign-off on the classification report (Batch 2).
