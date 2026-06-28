# DB-P1-005 — Batch 1 Verification Report

**Feature:** DB-P1-005 — Lock down SECURITY DEFINER functions in `public`
**Date:** 2026-06-28
**Mode:** DRY-RUN / VERIFICATION-ONLY (no live DB execution)
**Status:** PASS

## Scope

Generate a generic, idempotent SQL artifact that, when applied manually
via Supabase SQL Editor, revokes `EXECUTE` from `PUBLIC` and `anon` for
every `SECURITY DEFINER` function in schema `public` and grants `EXECUTE`
to `authenticated` only.

## Artifact

- **Path:** `docs/engineering/artifacts/20260628044324_fix_security_definer.sql`
- **Intended migration filename (on manual apply):** `20260628044324_fix_security_definer.sql`
- **Timestamp format:** `YYYYMMDDHHMMSS` ✔
- **Order vs latest migration (`20260627221139_*`):** newer ✔

> The platform's migration folder is managed by the migration tool and
> cannot accept directly authored files. The SQL artifact therefore lives
> under `docs/engineering/artifacts/`. A human applies it via Supabase SQL
> Editor and (optionally) re-emits it through the migration tool to
> capture it in `supabase/migrations/` with the same timestamp.

## Approach

- Dynamic `DO $$ ... $$` block iterates `pg_proc` joined to `pg_namespace`
  filtered by `nspname='public'`, `prosecdef=true`, `prokind='f'`.
- For each function: `REVOKE EXECUTE ... FROM PUBLIC`, `REVOKE EXECUTE ... FROM anon`,
  `GRANT EXECUTE ... TO authenticated`.
- Uses `pg_get_function_identity_arguments(p.oid)` so overloaded
  signatures are addressed unambiguously.
- Trailing read-only verification `SELECT` reports
  `has_authenticated / has_anon / has_public` per function.
- Idempotent: REVOKE + GRANT can be re-run with no side effects.

## Validation

| Check                                | Result |
| ------------------------------------ | ------ |
| Filename matches `YYYYMMDDHHMMSS_*`  | PASS   |
| Single balanced `DO $$ ... $$;` block | PASS   |
| Contains `REVOKE EXECUTE ... FROM PUBLIC` | PASS |
| Contains `REVOKE EXECUTE ... FROM anon`   | PASS |
| Contains `GRANT EXECUTE ... TO authenticated` | PASS |
| Verification `SELECT` present, references `has_function_privilege` | PASS |
| No hard-coded function names (generic over `pg_proc`) | PASS |
| No source-code changes in this batch | PASS   |

Typecheck and build are **N/A** for this batch — the artifact is a SQL
file, not part of the TS/Vite build graph.

## Out-of-scope candidates

None. Per-function whitelisting for `anon` (if any RPC must remain
publicly callable) is intentionally deferred to a follow-up migration
after a human reviews the verification `SELECT` output post-apply.

## Manual apply procedure

1. Open Supabase SQL Editor.
2. Paste the contents of `docs/engineering/artifacts/20260628044324_fix_security_definer.sql`.
3. Run.
4. Review the verification `SELECT` output. Any row with `has_anon = true`
   or `has_public = true` must be either re-revoked or explicitly
   whitelisted in a follow-up.
5. (Optional) Re-emit the same SQL through the platform migration tool
   so the change is captured under `supabase/migrations/`.

## Verdict

**PASS** — artifact exists, SQL is syntactically valid, timestamp format
is correct, dry-run acceptance criteria satisfied.
