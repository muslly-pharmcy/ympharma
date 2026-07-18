# Security Overview

## Identity & roles
- Auth: Supabase Auth (email + Google OAuth).
- Roles: stored in `public.user_roles` (enum `app_role`). NEVER on `profiles`.
- Check: `public.has_role(_user_id, _role)` — `SECURITY DEFINER`, `search_path = public, pg_temp`.

## RLS
- Every `public.*` table enables RLS and has explicit `GRANT`s (see `public-schema-grants` policy).
- Admin-only tables scope every policy through `has_role(auth.uid(), 'admin')`.

## Server boundary
- App-internal logic: `createServerFn` + `requireSupabaseAuth` middleware.
- External callers (webhooks/cron): `src/routes/api/public/*`.
  - All webhooks verify HMAC signatures (Meta/Twilio).
  - Cron endpoints require the anon `apikey` header via `src/middleware/cron-auth.ts`.
- `supabaseAdmin` (service role): imported ONLY inside `.handler()` bodies of privileged server fns, after a role check on `context.supabase`.

## AI safety
- `src/core/ai-safety/` — prompt-injection detection + PII redaction on all model inputs.
- `agent_approval_requests` gates any AI write above the risk threshold.

## Secrets
- Never logged, screenshotted, or returned to the client.
- `SUPABASE_SERVICE_ROLE_KEY` and DB password: not accessible on Lovable Cloud.

## Import boundary
- `*.server.ts` and `@/integrations/supabase/client.server` are blocked from the client bundle by `scripts/check-imports.ts` (CI-enforced via `.github/workflows/import-guard.yml`).

## Audit
- `admin_audit_log` records every admin action (actor, action, resource, metadata, IP hash).
- `ai_security_audit` records AI-side privileged actions.

## Reporting
File findings via `docs/engineering/risk-register.md` or the SEO/Security scanner in Lovable.
