// Canonical cron-auth entry point for /api/public/hooks/* routes.
//
// This is a thin re-export of `verifyCronSecret` from `@/lib/cron-auth.server`
// so every hook imports from a single, stable path going forward. The
// underlying contract is unchanged: returns `null` when the request is
// authorized, or a `Response` (401/503) to short-circuit the handler.
//
// CRON-P1-004 / Batch 1. Do not inline new logic here — extend the source
// helper in `@/lib/cron-auth.server` instead so server-only imports stay
// out of client-reachable bundles.

export { verifyCronSecret as requireCronAuth } from "@/lib/cron-auth.server";
