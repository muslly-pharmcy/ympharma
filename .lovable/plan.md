## Reality check — three blockers before I append `DB-P1-005`

### 1. The referenced migration file does not exist

`supabase/migrations/20260101000000_fix_security_definer.sql` is **not in the repo**. Migrations on this project use timestamps like `20260627221139_*.sql` (latest is from 2026-06-27, not 2026-01-01). The plan you handed me points at a phantom file, so the contract's "execute ONLY the files explicitly listed" rule has nothing to execute against. I won't fabricate the SQL.

### 2. Lovable Cloud doesn't apply migrations from hand-written files in `supabase/migrations/`

On this stack, schema changes go through the **`supabase--migration` tool**, which prompts you to approve the SQL and then applies it live. Dropping a `.sql` file into `supabase/migrations/` does **nothing at runtime** — it isn't auto-applied on push. So "syntax-check the file without applying" is a no-op that doesn't move the database one inch and doesn't close any P1.

### 3. "fix_security_definer" needs a target list

The DB has many `SECURITY DEFINER` functions (a lot of them are correct — `has_role`, `verify_*`, etc., which legitimately need definer to bypass RLS safely). "REVOKE EXECUTE FROM PUBLIC/anon and GRANT TO authenticated" applied **blindly** to every definer function will break: cron jobs (`anon`/cron role callers), webhook handlers, RLS-policy-embedded helpers like `has_role(uuid, app_role)`, and any RPC currently called from the browser as anon. This needs the `SEC-P1-003 Batch 1` inventory **first** (which is already in the plan, untouched) — that's literally the inventory of grantees per function. Skipping it and shipping a blanket REVOKE is how production breaks at 03:00.

## What I propose (pick one)

**Option A — Do `SEC-P1-003` properly (already in the plan).**
1. Append nothing new. Flip `PROJECT_STATE.yaml` to `SEC-P1-003 / batch 1 / EXECUTE`.
2. Produce the function-by-function grantee inventory at `docs/engineering/reports/SEC-P1-003-batch-1-inventory.md` (no SQL changes).
3. Then Batch 2 = a real, targeted, idempotent migration applied via `supabase--migration` (with your approval) — not a phantom file.

**Option B — Add `DB-P1-005` as a real Feature, but only after you give me the actual SQL.**
You paste the exact `REVOKE … GRANT …` block you want shipped (which functions, which roles). I:
1. Append `DB-P1-005` to `plans/phase-1.yaml` with that SQL as the acceptance evidence.
2. Apply it via `supabase--migration` (Lovable Cloud's real path), which will ask for your approval before running.
3. Write the report and update CHANGELOG.

**Option C — Skip both. Close Phase 1 now without `DB-P1-005`.**
I update CHANGELOG to mark Phase 1 closed at AUTH-P1-003, with `SEC-P1-003` deferred to Phase 2. No DB changes this phase.

## What I will not do
- Create `supabase/migrations/20260101000000_fix_security_definer.sql` with invented contents.
- Pretend a file-system migration without `supabase--migration` constitutes "applied".
- Issue a blanket REVOKE on `SECURITY DEFINER` functions without the SEC-P1-003 inventory.

Tell me **A**, **B** (with the SQL), or **C** and I'll re-issue the plan with frozen scope.