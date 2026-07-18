# Deployment

## Environments
- **Preview**: `https://id-preview--<project-id>.lovable.app` — latest build from Lovable editor.
- **Published**: `https://ympharma.lovable.app` — last explicit publish.
- **Custom domain**: `https://muslly.com`.

## Runtime
- Cloudflare Worker (nodejs_compat). Vite 7 + TanStack Start SSR.
- See `docs/engineering/reports/PHOENIX-BUILD-STABILITY.md` for known Worker constraints.

## Backend
- Managed Supabase (Lovable Cloud). No dashboard access — all changes via migrations.
- Cron: `pg_cron` + `pg_net`; secured with the anon key `apikey` header on `/api/public/*` targets.
- Storage buckets: `medical-vault` (private, RLS-scoped to patient), plus public asset buckets.

## Release checklist
1. `bunx tsgo --noEmit` clean.
2. `bun run build` clean.
3. `/admin-production-readiness` all green.
4. `/api/public/health.full-check` returns `ok: true`.
5. Publish via Lovable UI.

## Rollback
- Publish previous known-good preview from the Lovable UI (Publish history).
- Database rollbacks require a compensating migration — schema is forward-only.

## Secrets
Managed via Lovable secrets. Never commit `.env`. Rotation: `secrets--rotate` in the Lovable UI. `SUPABASE_SERVICE_ROLE_KEY` and the DB password are not accessible on Lovable Cloud.
