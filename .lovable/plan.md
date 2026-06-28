## Apply SEC-P1-003 Batch 2 & Close Phase 2

**Goal:** Apply the prepared `REVOKE EXECUTE` migration for 57 SECURITY DEFINER functions, verify success, and mark Phase 2 closed.

### Steps

1. **Apply migration via Supabase tool**
   - Read `docs/engineering/artifacts/20260628053000_sec_p1_003_batch_2.sql`
   - Submit its contents through `supabase--migration` for user approval & execution

2. **Verify**
   - Run the verification query from `SEC-P1-003-batch-2-dryrun.md` against `pg_proc` / `information_schema.role_routine_grants` via `psql`
   - Confirm 0 of the 57 functions retain EXECUTE for `authenticated`
   - Save results to `docs/engineering/reports/SEC-P1-003-batch-2-verification.md`

3. **Close Phase 2 governance**
   - `docs/engineering/PROJECT_STATE.yaml` → `phase: Phase2`, `phase_status: CLOSED`, current feature cleared
   - `docs/engineering/CHANGELOG.md` → append closure entry with date/feature IDs
   - `docs/engineering/REGISTRY.yaml` → mark SEC-P1-003 status `CLOSED`
   - Update `docs/engineering/features/SEC-P1-003.md` dossier with apply + verification outcome

### Out of scope
No source code edits, no new features, no schema changes beyond the prepared REVOKEs.
