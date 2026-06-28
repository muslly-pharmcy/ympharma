# SEC-P1-004 Batch 1 — CI Import-Graph Guard

**Status:** PASS
**Date:** 2026-06-28

## Files created

- `scripts/check-imports.ts` — static analyzer; flags top-level `import ... from '*.server'` (and `@/integrations/supabase/client.server`) in any client-reachable source file. Dynamic `await import(...)` inside function bodies is allowed (SEC-P1-002 remediation pattern).
- `.github/workflows/import-guard.yml` — runs `bun run scripts/check-imports.ts` on every PR and push to `main`.

## Scope

Scans `src/**/*.{ts,tsx}` excluding:
- `*.server.ts(x)` (server-only by extension)
- `src/routes/api/**` (server routes — handler files are server-only)
- `src/middleware/**` (server-fn middleware)
- `__tests__`, `*.test.ts`, `*.spec.ts`

## Result

```
✅ SEC-P1-004: scanned 370 client-reachable files — 0 violations.
```

Validation:
- `bunx tsgo --noEmit` — PASS
- `bun run scripts/check-imports.ts` — PASS (0 violations)

## Effect

Any future PR that adds `import x from '@/lib/foo.server'` (or any other `*.server` static import) inside a client-reachable module will fail CI with a precise `file:line  imports  spec` report and a remediation hint pointing to the dynamic-import pattern.
