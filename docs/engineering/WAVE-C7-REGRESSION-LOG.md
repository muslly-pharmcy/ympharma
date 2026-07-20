# Wave C.7 — Regression Log

Chronological record of each remediation ticket landed in Wave C.7.
Format per entry: **Ticket → Root cause → Change scope → Verification → Result**.

---

## R0.1 — F-01 Supabase bootstrap crash on `/`

**Date:** 2026-07-20
**Standalone commit:** yes (docs-only per Rule 1)
**Constitutional rule invoked:** Rule 1 (Verify Before Patch) + §1 hypothesis triage.

### Hypothesis verification

| Hyp. | Predicate | Evidence | Verdict |
|---|---|---|---|
| **H1** — Preview build ran without env injection. | If true: `.env` contains correct keys **now** but the failing bundle predates the injection; no code change fixes it — only a rebuild with env bound. | `.env` present with `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (mtime `2026-07-20 22:31`). Failing bundle timestamp in console log: `2026-07-20 22:09` (bundle hash `index-DdUM4bbP.js`). Bundle predates env by ~22 minutes. | ✅ **Confirmed** |
| **H2** — Variable-name drift between code and Cloud contract. | If true: bundle expects `VITE_SUPABASE_ANON_KEY` while Cloud injects `VITE_SUPABASE_PUBLISHABLE_KEY` (or vice-versa). | `rg import.meta.env.VITE_SUPABASE`: only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are read. `.env` supplies exactly those names. | ❌ Falsified |
| **H3** — SSR path executes client module and hits `process.env.*` fallback. | If true: error stack originates from SSR entry (`src/server.ts` chain), and only server-side. | Error stack points to `qp` inside `/assets/index-DdUM4bbP.js` (client bundle chunk name), thrown from `client.ts:36` guard. No `.server.ts` / `.functions.ts` imports `@/integrations/supabase/client`. | ❌ Falsified |

### Change scope

- **Source code:** none. Rule 1 forbids a patch when only H1 holds.
- **Docs:** this log entry + confirmation in `RELEASE-GATE.md`.
- **Deployment action required (owner: DevOps / Chief):**
  1. Trigger a fresh preview build so Vite replaces `import.meta.env.VITE_SUPABASE_*` with the now-present `.env` values.
  2. Confirm the emitted bundle contains the literal Supabase URL (grep the new `assets/index-*.js` for the project ref).
  3. Reload `/` and verify no `Missing Supabase environment variable(s)` in console.

### Verification (post-rebuild — awaiting DevOps confirmation)

- [ ] New bundle hash differs from `index-DdUM4bbP.js`.
- [ ] Console has no `Missing Supabase environment variable(s)` error.
- [ ] `/` renders past `ErrorBoundary`.

### Result

Root cause isolated to **deployment configuration** (H1). No application code changed. Ticket stays **⛔ Open in RELEASE-GATE** until post-rebuild verification checkboxes above are ticked. Downstream tickets (F-03 smoke-test, F-02 SSR profile, CSP report validation) remain blocked on that rebuild.

### Notes / follow-up backlog (do not fix in R0.1)

- `client.ts:33-34` has a `process.env.*` fallback that is dead code in the browser bundle. Vite does not replace `process.env.SUPABASE_URL` for the client target, and there is no polyfill; the expression evaluates to `undefined`. Removing it would make the intent explicit but is **out of scope for R0.1** (would violate Rule 2 — one root cause per commit). File as a P3 cleanup ticket under Wave C.7 backlog.
