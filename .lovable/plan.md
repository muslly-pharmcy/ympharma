## Reality check — must resolve before I execute

Per `ENGINEERING_CONTRACT.md` (v3.1, LOCKED): precedence is **PROJECT_STATE → PLAN → CONTRACT**, and I execute *only* the Feature defined in the plan. Two blockers:

### Blocker 1 — `AUTH-P1-003` is not in `plans/phase-1.yaml`

The plan currently defines: `SEC-P1-001` (superseded), `CRON-P1-004` (just PASSed), `SEC-P1-002` (Batch 2 done, awaiting verdict for further work), `SEC-P1-003`. No `AUTH-P1-003`. If I flip `PROJECT_STATE.yaml` to `AUTH-P1-003 / EXECUTE` without adding the feature to the plan first, I have no scope file list to obey — the contract's "ONLY the files explicitly listed under that Feature" rule becomes impossible to honor and the run is `BLOCKED` on the first step.

### Blocker 2 — "توحيد صفحة المصادقة" appears to already be done

Current state of the auth surface:

- `src/routes/auth.tsx` — single public route, handles both sign-in and sign-up via a mode toggle, accepts `?redirect=` search param, redirects already-signed-in users.
- `src/components/admin/AdminGate.tsx` → `<Navigate to="/auth" />` on no-session.
- `src/routes/_authenticated/route.tsx` (integration-managed) → `redirect({ to: "/auth" })` on no-session.
- No `/login`, `/signin`, `/sign-up`, `/register` duplicates exist.

So I don't know what "unify" means here that isn't already true. Possible real intents:
- (a) Add Google OAuth button via the Lovable broker.
- (b) Add forgot-password flow + `/reset-password` route.
- (c) Replace the raw `<input>` markup with shadcn `Input`/`Button`/`Form` for consistency with the rest of the app.
- (d) Move `/auth` under a different path (e.g. `/sign-in`) and add redirects.
- (e) Something else entirely.

## What I will NOT do

- I will not overwrite `PROJECT_STATE.yaml` to point at a Feature that does not exist in the plan.
- I will not invent a file list for `AUTH-P1-003` and call that "the scope".
- I will not modify `src/routes/auth.tsx` until the scope is frozen in `plans/phase-1.yaml`.

## What I propose instead (pick one and I'll re-issue this plan)

**Option A — Define `AUTH-P1-003` first, then execute.** You tell me the real intent (a–e above or other). I:
1. Append `AUTH-P1-003` to `plans/phase-1.yaml` with an explicit file list and acceptance criteria.
2. Update `PROJECT_STATE.yaml` to `AUTH-P1-003 / batch 1 / EXECUTE`.
3. Implement only those files, run `bunx tsgo --noEmit` + `bun run build`, write the report to `docs/engineering/reports/AUTH-P1-003-batch-1-fixes.md`.

**Option B — Skip AUTH-P1-003, advance to the next real backlog item.** Most natural next step from the audit is `SEC-P1-003 / Batch 1` (RPC GRANT inventory — no SQL changes, pure read). I update `PROJECT_STATE.yaml` to that and produce the inventory report.

**Option C — You're certain AUTH-P1-003 means "no-op verify that /auth is the only auth route".** I add a tiny Feature to the plan whose entire scope is producing a verification report (no source edits), mark it PASS, and move on.

Tell me A (with the intent), B, or C — and I'll re-issue the plan with the frozen scope.