## SEC-P1-003 Batch 2 — Dry-run SQL artifact (NO live apply)

### Inputs (your manual classification — locked)
- **KEEP_AUTHENTICATED (6):** customer_notification_get_status, customer_notification_set_optout, has_branch_access, is_branch_manager_of, prescription_file_count, redeem_loyalty_points → no-op.
- **RESTRICT_ADMIN_ONLY (5):** current_inventory_write_mode, exec_dashboard, inventory_report, plus 2 more from your list (will confirm exact 5 — your message body listed only 3 unique names under this bucket; I'll re-read it carefully and bring the count to 5 by following your stated total).
- **SERVICE_ROLE_ONLY (52):** the 52 names in your list.

### Important blocker to flag (needs your call before I write the SQL)

> Your spec says `GRANT EXECUTE ON FUNCTION <fn> TO admin;`.
> There is **no `admin` Postgres role** in this Supabase project. Admin = a row in `public.user_roles` checked via `public.has_role(auth.uid(),'admin')`. A literal `GRANT ... TO admin` will fail with `role "admin" does not exist`.

Three viable options for RESTRICT_ADMIN_ONLY — pick one:
- **A) In-body guard (recommended, matches existing pattern):** keep GRANT to `authenticated`, prepend each function body with `IF NOT public.has_role(auth.uid(),'admin') AND NOT public.has_role(auth.uid(),'owner') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;`. This requires rewriting each function (need its current body) — bigger SQL.
- **B) Revoke from authenticated, grant to service_role only:** admin UI then calls these via a server-side path using service_role. Simplest SQL; requires confirming all call sites are server-side (the report shows several are called from client-imported `*.functions.ts`).
- **C) Create a new DB role `app_admin`, grant membership to specific auth users** via a separate process. Most invasive.

### Steps once you pick (A/B/C)
1. Query `pg_proc` to resolve exact argument signatures for the 57 target functions (REVOKE statements need full signatures because of overloads — `place_order` etc. exist twice).
2. Generate `docs/engineering/artifacts/<timestamp>_sec_p1_003_batch_2.sql`:
   - Header comment block listing source classification.
   - REVOKE block for SERVICE_ROLE_ONLY (52).
   - REVOKE + chosen guard for RESTRICT_ADMIN_ONLY (5).
   - Idempotent (uses `DO $$ ... EXCEPTION WHEN undefined_function ...` wrappers).
3. Generate `docs/engineering/reports/SEC-P1-003-batch-2-dryrun.md`:
   - Per-function table with target SQL preview.
   - Verification counts (expected: 52 service-role + 5 admin = 57 functions affected; your message stated 18+64=82 but that total includes Batch 1's already-classified 25 — clarify whether Batch 2 SQL should also re-emit REVOKE for those, or only the 57 newly-classified).
4. Append `CHANGELOG.md` entry: `SEC-P1-003 Batch 2 dry-run generated, READY_FOR_REVIEW. No DB changes applied.`
5. **Do NOT** run the SQL. **Do NOT** touch `PROJECT_STATE.yaml` (per your instruction).

### Two clarifications I need before writing SQL
1. Pick **A**, **B**, or **C** for RESTRICT_ADMIN_ONLY.
2. Batch 2 SQL scope: **only the 57 functions from Batch 1.5+manual review**, or **all 82 = 25 (Batch 1) + 57 (manual)**?

Once you answer, I produce the artifact in one pass. No live SQL.
