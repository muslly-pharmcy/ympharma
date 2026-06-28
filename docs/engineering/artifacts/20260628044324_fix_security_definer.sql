-- ============================================================
-- DB-P1-005 — Lock down SECURITY DEFINER functions in schema public
-- ============================================================
-- Status: DRY-RUN ARTIFACT (NOT YET APPLIED)
-- Intended timestamp if/when applied via Supabase SQL Editor:
--   20260628044324_fix_security_definer.sql
--
-- NOTE: The migrations folder is managed by the platform's migration
-- tool, so this file lives under docs/ as a reviewable artifact.
-- A human applies it manually via Supabase SQL Editor after review.
--
-- Purpose:
--   Revoke EXECUTE from PUBLIC and anon for every SECURITY DEFINER
--   function in the public schema, then GRANT EXECUTE to the
--   `authenticated` role only.
--
-- Safety notes:
--   * Uses dynamic SQL so it adapts to whatever SECURITY DEFINER
--     functions currently exist in `public` — no hard-coded names.
--   * Idempotent: REVOKE + GRANT can be re-run with no side effects.
--   * Does NOT touch SECURITY INVOKER functions.
--   * Does NOT touch functions in auth/storage/realtime/supabase_functions/vault.
--   * If any RPC must remain callable by anonymous visitors (e.g. a
--     public read helper), GRANT EXECUTE ... TO anon for that
--     specific function in a follow-up migration.
-- ============================================================

DO $$
DECLARE
  fn record;
  revoke_count integer := 0;
  grant_count  integer := 0;
BEGIN
  FOR fn IN
    SELECT
      n.nspname        AS schema_name,
      p.proname        AS fn_name,
      pg_get_function_identity_arguments(p.oid) AS fn_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true            -- SECURITY DEFINER only
      AND p.prokind  = 'f'              -- regular functions only
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC',
      fn.schema_name, fn.fn_name, fn.fn_args
    );
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon',
      fn.schema_name, fn.fn_name, fn.fn_args
    );
    revoke_count := revoke_count + 1;

    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated',
      fn.schema_name, fn.fn_name, fn.fn_args
    );
    grant_count := grant_count + 1;
  END LOOP;

  RAISE NOTICE 'DB-P1-005: revoked EXECUTE from PUBLIC+anon on % function(s)', revoke_count;
  RAISE NOTICE 'DB-P1-005: granted EXECUTE to authenticated on % function(s)', grant_count;
END;
$$;

-- ============================================================
-- VERIFICATION QUERY (read-only; run after the DO block)
-- ============================================================
-- Expected for every row:
--   has_authenticated = true
--   has_anon          = false
--   has_public        = false

SELECT
  n.nspname AS schema,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS args,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS has_authenticated,
  has_function_privilege('anon',          p.oid, 'EXECUTE') AS has_anon,
  has_function_privilege('public',        p.oid, 'EXECUTE') AS has_public
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = true
  AND p.prokind = 'f'
ORDER BY p.proname;
