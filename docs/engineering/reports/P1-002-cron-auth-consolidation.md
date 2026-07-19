# P1 #2 — Cron Auth Helper Consolidation

**Date:** 2026-07-19
**Status:** COMPLETE

## Analysis

Two symbols existed for cron authentication:

| Symbol | Location | Implementation |
|--------|----------|----------------|
| `verifyCronSecret` | `src/lib/cron-auth.server.ts` | Real implementation |
| `requireCronAuth`  | `src/middleware/cron-auth.ts` | `export { verifyCronSecret as requireCronAuth }` |

`requireCronAuth` was already a pure re-export — same function object, same
constant-time `timingSafeEqual` compare, same `CRON_SECRET` env source, same
401 / 503 failure responses. There was **no behavioral divergence**, only a
divergent import path convention (34 hook files used the lib path, 7 newer
routes used the middleware path).

## Consolidation

- **Canonical entry point:** `@/middleware/cron-auth` → `requireCronAuth`.
- **Sole implementation:** `src/lib/cron-auth.server.ts` (unchanged).
- Migrated 34 route files under `src/routes/api/public/**` from
  `import { verifyCronSecret } from "@/lib/cron-auth.server"` to
  `import { requireCronAuth as verifyCronSecret } from "@/middleware/cron-auth"`.
  The local alias preserves the existing `verifyCronSecret(request)` call
  sites verbatim — zero call-site changes, zero behavior changes.
- `src/lib/agent-workers.server.ts` retains the direct
  `@/lib/cron-auth.server` import: it is a `.server.ts` peer of the helper,
  not a public route, and importing the source module directly is correct.

## Files changed (35)

- `src/routes/api/public/hooks/*.ts` (33 files)
- `src/routes/api/public/incident-check.ts`
- `src/routes/api/public/health.quick-check.ts` *(no — see note)*
- `src/routes/api/public/health.full-check.ts` *(no — see note)*

Note: the two `health.*-check.ts` files and `incident-check.ts` were also
migrated by the bulk pass (total 34 route files). `security/sweep.ts` and the
seven `ai/*-tick.ts` / `engagement/dispatch.ts` routes were already on the
middleware path and unchanged.

## Security improvement

- Single documented public entry point for cron authentication going forward
  (`@/middleware/cron-auth`), eliminating the "which helper do I import?"
  ambiguity flagged by the P1 audit.
- The alias pattern (`requireCronAuth as verifyCronSecret`) leaves the door
  open to rename call sites later without another mass edit, but does not
  require it now.
- No new attack surface. The re-export module has no runtime logic to drift
  from the source.

## Validation

- `bunx tsgo --noEmit` → exit 0.
- Grep confirms 42 imports on canonical `@/middleware/cron-auth` path, only
  1 legacy import remains (`src/lib/agent-workers.server.ts`, intentional).
- `verifyCronSecret` implementation unchanged → identical 200 / 401 / 503
  responses for valid / invalid / missing secret. No cron endpoint behavior
  changed.

## Remaining risks

- `src/lib/agent-workers.server.ts` still imports the source directly. Fine
  today (server-only peer), but if the file ever moves into a public route
  it must switch to the middleware path.
- The `requireCronAuth as verifyCronSecret` alias is a stylistic bridge, not
  a permanent rename. A future cleanup can drop the alias and rename call
  sites in one pass; not required for security.

## Recommended next action

Approve moving to **P1 #3** — public POST endpoint abuse protection
(rate limiting on `analytics/ingest`, `contact`, etc.).
