# TITANUS OMEGA X v17.0 — Full System Audit Report

**Project:** muslly / صيدلية المصلي (TanStack Start + Lovable Cloud)
**Audit date:** 2026-06-27
**Auditor:** Lovable Principal Engineer (autonomous)
**Auditor scope:** Forensic-grade audit across 6 dimensions, no areas excluded.
**P0 patches:** auto-applied in this same pass.

---

## SECTION A — EXECUTIVE SUMMARY

```text
╔══════════════════════════════════════════════════════════════╗
║              TITANUS SYSTEM AUDIT REPORT                    ║
╠══════════════════════════════════════════════════════════════╣
║ Project: muslly (pharmacy ops + AI + Titans UI)             ║
║ Audit Date: 2026-06-27                                      ║
║ Files Analyzed: 478 TS/TSX + 131 SQL migrations             ║
║ Lines Analyzed: 72,414 (TS/TSX)                             ║
║ Public DB tables: 108                                       ║
║ Cron jobs active: 42                                        ║
║ /api/public/* endpoints: 49                                 ║
╠══════════════════════════════════════════════════════════════╣
║ TOTAL ISSUES FOUND: 31                                      ║
║  ├── CRITICAL (P0): 3  → ALL FIXED IN THIS PASS             ║
║  ├── HIGH (P1):     8                                       ║
║  ├── MEDIUM (P2):  12                                       ║
║  └── LOW (P3):      8                                       ║
╠══════════════════════════════════════════════════════════════╣
║ Security Score:           78/100                            ║
║ Code Quality Score:       82/100                            ║
║ Architecture Score:       74/100                            ║
║ Operational Readiness:    88/100                            ║
╠══════════════════════════════════════════════════════════════╣
║ RECOMMENDATION: GO WITH CONDITIONS                          ║
║   → P0 cleared. P1 list must be triaged within 2 weeks.    ║
╚══════════════════════════════════════════════════════════════╝
```

**Scanner cross-check:** `security--get_scan_results` (all 5 scanners) returns `findings: []`. `code--dependency_scan` reports **0 high/critical** npm vulnerabilities. `tsgo --noEmit` passes after P0 patches. The findings below come from manual review and `supabase--linter` (115 WARN-level entries, all the same class).

---

## SECTION B — CRITICAL ISSUES (P0)  · all FIXED in this pass

### ISSUE #P0-01 — `/auth` route does not exist; every auth redirect 404s
```text
┌─────────────────────────────────────────────────────────────┐
│ Category: Functional + Security                             │
│ Severity: CRITICAL                                          │
│ Files:    src/components/admin/AdminGate.tsx:43             │
│           src/routes/_authenticated/route.tsx:29            │
│ Description: Both guards `<Navigate to="/auth" />` and      │
│   `throw redirect({ to: "/auth" })` target a route file     │
│   that does not exist (`ls src/routes/auth*` empty;         │
│   routeTree.gen.ts contains no `/auth`).                    │
│ Root cause: The integration-managed _authenticated layout   │
│   was scaffolded but the matching public sign-in page was   │
│   never created. Sign-in logic lives buried inside `/admin` │
│   as a `LoginCard` fallback, unreachable for any other      │
│   protected route.                                          │
│ Impact: Anonymous user hitting any `/admin-*` or            │
│   `/_authenticated/*` route is redirected to a 404. Users   │
│   are effectively locked out of the entire app. tsgo also   │
│   reports 2 hard TS2322 errors because `/auth` isn't in     │
│   the typed route registry.                                 │
│ Fix applied: Created `src/routes/auth.tsx` — public page    │
│   with email/password sign-in + sign-up, `validateSearch`   │
│   that honours `?redirect=/some-path`, auto-redirects when  │
│   already signed in.                                        │
│ Verification: `bunx tsgo --noEmit` now passes.              │
│ Effort: 1 h (done).                                         │
└─────────────────────────────────────────────────────────────┘
```

### ISSUE #P0-02 — `Link to="/admin-rx-review"` missing required `search` prop (TS2741)
```text
┌─────────────────────────────────────────────────────────────┐
│ Category: Code — TypeScript build error                     │
│ Severity: CRITICAL                                          │
│ File: src/routes/admin-whatsapp-delivery.tsx:244            │
│ Description: `/admin-rx-review` declares `validateSearch`,  │
│   making `search` a required prop on every `<Link>` to it.  │
│   Call site omitted it; tsgo fails the whole project.       │
│ Root cause: Defaults are filled inside parseSearch() but    │
│   the inferred input type still requires the param.         │
│ Impact: tsgo --noEmit fails → `build:dev` and CI gate fail. │
│ Fix applied: `search={{}}` added; parseSearch fills the     │
│   defaults at runtime.                                      │
│ Verification: tsgo clean.                                   │
│ Effort: 5 min (done).                                       │
└─────────────────────────────────────────────────────────────┘
```

### ISSUE #P0-03 — `.env.example` empty
```text
┌─────────────────────────────────────────────────────────────┐
│ Category: Configuration / Onboarding                        │
│ Severity: CRITICAL                                          │
│ File: .env.example                                          │
│ Description: File exists but has zero content. New          │
│   contributors / auditors can't enumerate which env vars    │
│   the app expects without grepping the source. v17 spec    │
│   explicitly flags missing env templates as P0.             │
│ Impact: Onboarding friction; risk of silently missing       │
│   CRON_SECRET / SLACK_WEBHOOK_URL / LOVABLE_API_KEY in a    │
│   self-hosted clone.                                        │
│ Fix applied: `.env.example` now lists all VITE_*, server-   │
│   only, cron, AI, and integration variables grouped by      │
│   surface, with comments distinguishing browser-bundled     │
│   vs server-only.                                           │
│ Effort: 15 min (done).                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## SECTION C — HIGH ISSUES (P1)  · plan only; awaiting approval

### ISSUE #P1-01 — Top-level `client.server` imports in `*.functions.ts` (potential client-bundle leak)
```text
Category: Architecture / Security
Severity: HIGH
Files (42 functions modules):
  src/lib/admin-dashboard.functions.ts
  src/lib/agent-workforce.functions.ts
  src/lib/ai-approvals.functions.ts
  src/lib/backup-verification.functions.ts
  src/lib/branches.functions.ts
  src/lib/diagnostics.functions.ts
  src/lib/event-bus.functions.ts
  src/lib/inventory-migration.functions.ts
  src/lib/inventory-reservations.functions.ts
  src/lib/inventory-sync.functions.ts
  src/lib/invoicing.functions.ts
  src/lib/loyalty.functions.ts
  src/lib/loyalty-admin.functions.ts
  src/lib/marketing-automation.functions.ts
  src/lib/notifications.server.ts (consumed by .functions modules)
  src/lib/pharmacy-copilot.functions.ts
  src/lib/pharmacy-intel-admin.functions.ts
  src/lib/prescription-extractor.server.ts
  src/lib/prescription-intelligence.functions.ts
  src/lib/prescription-intelligence.server.ts
  src/lib/prescription-storage.functions.ts
  src/lib/recommendations.functions.ts
  src/lib/recommendations-dynamic.functions.ts
  src/lib/rx-backup.functions.ts
  src/lib/social.functions.ts
  src/lib/social-publisher.server.ts
  src/lib/staff.functions.ts
  src/lib/upload-validation.functions.ts
  src/lib/whatsapp-ai-agent.server.ts
  src/lib/marketing-cron.server.ts
  src/lib/health-check.server.ts
  src/lib/admin-bootstrap.functions.ts
  src/lib/agent/* (multiple .server modules transitively imported)
Description: Top-level `import { supabaseAdmin } from "@/integrations/
  supabase/client.server"` in client-reachable `.functions.ts` files.
  Per `tanstack-supabase-import-graph`, only the `.handler()` body is
  stripped from the client bundle — top-level statements ship.
Root cause: Convenience pattern used early in the project, before the
  import-graph rule was enforced.
Impact: The service-role-bearing module's IMPORT chain could leak into
  client chunks if any of these files becomes reachable from a route.
  Today the splitter still strips because the module flag `.server.ts`
  is detected, but this is a latent landmine — any rename or refactor
  could surface the admin client in the browser bundle.
Proposed fix: Convert each to `await import("@/integrations/supabase/
  client.server")` inside the handler body, OR move privileged helpers
  to a `*.server.ts` sibling and import only that from the handler.
  Sequence: do `prescription-*` and `whatsapp-*` first (largest blast
  radius), then sweep remaining modules.
Estimated effort: 6–8 h (mechanical, well-tested by build).
```

### ISSUE #P1-02 — `_authenticated` layout uses `getUser()` then `redirect` but `/auth` was missing
```text
Category: Functional (now mitigated by P0-01)
Severity: HIGH
File: src/routes/_authenticated/route.tsx:29
Description: Even after P0-01 fix, the layout still throws redirect
  without preserving the original destination. Users land on `/auth`
  and have to re-navigate to where they came from.
Proposed fix: Pass `{ to: "/auth", search: { redirect: location.pathname } }`.
  The newly-created /auth page already reads `?redirect=` and returns
  there on successful sign-in.
Estimated effort: 20 min.
```

### ISSUE #P1-03 — 115 SECURITY DEFINER functions executable by anon/authenticated
```text
Category: Security (DB)
Severity: HIGH
Source: supabase--linter — 115 WARN entries (lint codes 0028 + 0029).
Description: Many helper functions (likely the `has_role`, agent-runner,
  and analytics RPCs) are SECURITY DEFINER and have EXECUTE granted to
  `anon` and/or `authenticated`. Each is a small privilege boundary that
  a forensic auditor will challenge.
Risk profile: Mostly intentional (the platform pattern for cross-RLS
  reads), but the absence of explicit `REVOKE ... FROM PUBLIC` and
  narrow re-grant means new functions inherit overly broad access by
  default.
Proposed fix: Migration that
  - REVOKEs EXECUTE on `public.*` SECURITY DEFINER functions FROM
    PUBLIC, anon, authenticated.
  - Re-GRANTs EXECUTE only on the ones genuinely safe for the listed
    role (`has_role`, public catalog read functions, etc).
  - Tags new functions in a convention test (CI) so the WARN count
    stays at zero going forward.
Estimated effort: 4–6 h (requires per-function decision).
```

### ISSUE #P1-04 — Multiple cron jobs invoke `/api/public/hooks/*` with anon key only
```text
Category: Security
Severity: HIGH
Source: cross-referencing 42 cron jobs vs hook handlers and the prior
  `security--manage_security_finding` sweep that hardened only 5 hooks
  to require `CRON_SECRET`.
Affected jobs (sample):
  - hourly-health-scan / hourly-error-triage / hourly-self-heal /
    hourly-validation-audit
  - run-restock-alerts / collect-social-stats-hourly /
    retry-failed-social-posts
  - prescription-extract-worker / rx-notify-dispatch /
    customer-rx-notify-dispatch
  - daily-social-posts / weekly-ai-enrich / weekly-exec-report
  - retention-and-idempotency-daily / backup-verify-daily
Description: Endpoints under `/api/public/*` bypass Lovable's auth and
  rely on the handler to authenticate the caller. Only 5 hooks were
  hardened in the previous security sweep. The remaining ~30 cron
  endpoints are reachable by anyone on the internet.
Impact: Anyone can trigger expensive jobs (AI extractions, email
  blasts, DLQ retries) → DoS, billing, side-effects on production data.
Proposed fix:
  1. Add a shared `requireCronSecret(request)` helper.
  2. Update every cron-only hook to call it first.
  3. Update each pg_cron job's `headers` to include
     `"x-cron-secret": "..."`.
Estimated effort: 3 h (mechanical) + cron-table SQL update.
```

### ISSUE #P1-05 — Sign-in logic duplicated inside `/admin` page
```text
Category: Architecture
Severity: HIGH
File: src/routes/admin.tsx:90–140 (LoginCard)
Description: The admin page renders its own sign-in form when there's
  no session, parallel to the new public /auth page. Two sign-in
  surfaces drift over time (password rules, OAuth providers, MFA).
Proposed fix: After P0-01, replace LoginCard with a redirect to
  `/auth?redirect=/admin`. Delete the inline LoginCard/SignupCard.
Estimated effort: 30 min.
```

### ISSUE #P1-06 — God-files (>500 LOC) concentrate domain risk
```text
Category: Architecture / Maintainability
Severity: HIGH
Top offenders (excluding generated):
  3388 src/lib/products-extra.ts          (data fixtures)
  1162 src/components/admin/PrescriptionsTab.tsx
   744 src/components/ui/sidebar.tsx       (shadcn baseline — OK)
   670 src/lib/prescription-review.functions.ts
   605 src/lib/ai-assistant.functions.ts
   590 src/routes/admin-transfers.tsx
   577 src/components/admin/CopilotPanels.tsx
   566 src/routes/admin-rx-review.tsx
   549 src/routes/admin-social-posts.tsx
   548 src/routes/admin.tsx
Description: 9 non-generated files >500 LOC. Two are unavoidable
  (shadcn sidebar, products fixtures). The remaining 7 mix
  data-fetching, mutations, presentation, and modal state in one file.
Impact: Hard to test, hard to type, regression-prone.
Proposed fix: Extract per-tab components and per-mutation hooks; keep
  route files <250 LOC.
Estimated effort: 1–2 d per file; can be done incrementally.
```

### ISSUE #P1-07 — `dangerouslySetInnerHTML` with theme-init script (not template-injected, but worth review)
```text
Category: Security
Severity: HIGH
Files:
  src/routes/__root.tsx:154  — THEME_INIT_SCRIPT (string constant)
  src/components/ui/chart.tsx:73 — chart CSS-var blob (shadcn baseline)
Description: Both inject static strings — no user input. Risk is
  hypothetical but a future maintainer might add interpolation.
Proposed fix: Add a TS comment + ESLint override pinning these as the
  only allowed sites; future call sites must justify in PR review.
Estimated effort: 15 min.
```

### ISSUE #P1-08 — No CI workflow exercises the new full build + e2e on every push
```text
Category: Operational
Severity: HIGH
File: .github/workflows/ci.yml
Description: Existing workflow runs lint/typecheck but skips Playwright
  e2e (which exist under src/__tests__/e2e/). Regressions in the auth
  flow, prescription upload, and product browse paths aren't caught.
Proposed fix: Add a job that runs `bunx playwright test --reporter=line`
  against the production build. Gate merges on it.
Estimated effort: 2 h.
```

---

## SECTION D — MEDIUM ISSUES (P2)

| # | Category | File / area | Issue | Fix | Effort |
|---|----------|-------------|-------|-----|--------|
| P2-01 | Code | 10 TODO/FIXME markers across `src/` | Untracked debt | Triage list → GitHub issues | 1 h |
| P2-02 | Code | 12 `console.log` calls in production paths | Noise in logs | Replace with `Logger` from `src/core/observability/` | 1 h |
| P2-03 | Architecture | Compatibility shims `src/lib/ai-safety.ts`, `src/lib/idempotency.server.ts` re-export from `src/core/` | OK as transition, but they hide the canonical path | Add deprecation comments → remove in 30 d | 30 min |
| P2-04 | Functional | `inventory-rls.test.ts`, `prescription-extractions-rls.test.ts` read `process.env` at module scope | Tests only run when env present (safe) but ESLint can't tell | Move into `beforeAll` | 15 min |
| P2-05 | Operational | Hourly self-care suite hard-coded to expire 2028-01-01 | Will silently stop in 18 months without warning | Add a cron that pings team 60 d before `HOURLY_CRON_END_AT` | 1 h |
| P2-06 | Security | Lovable email auth routes (`src/routes/lovable/email/auth/*`) are integration-managed; verify they don't expose admin send capability | Audit ownership boundary | 1 h |
| P2-07 | Functional | Multiple admin routes under top-level `src/routes/admin-*.tsx` instead of under `_authenticated/admin/` | Bypasses the integration auth gate; each relies on `<AdminGate>` wrapper | Move to `_authenticated/admin/*` in a single sweep | 1 d |
| P2-08 | Performance | `src/lib/products-extra.ts` (3.3 KLOC) ships in client bundles that import any product helper | Bundle size on first paint | Split into JSON + tree-shakable categorical exports | 4 h |
| P2-09 | Architecture | `src/components/admin/PrescriptionsTab.tsx` (1.1 KLOC) owns fetch/mutate/dialog/print/zoom logic | God-component | Split into hooks + sub-components | 1 d |
| P2-10 | Security | Storage policies for `prescriptions` bucket scoped via `storage.foldername` — verified, but `list` returns empty for anon (good) and signed URLs are short-TTL (good). Add automated test in CI. | Regression risk | Convert `src/lib/inventory-rls.test.ts` skip-when-no-env into a CI job with env injected | 2 h |
| P2-11 | Operational | 42 cron jobs not declared in code (only in DB) | Hard to diff schedule changes | Mirror schedule as a SQL fixture under `supabase/migrations/` | 2 h |
| P2-12 | Code | `as never` casts on `supabase.rpc("has_role" as never, ...)` in AdminGate | Types lost | Regenerate `src/integrations/supabase/types.ts` so `has_role` is typed | 30 min |

---

## SECTION E — LOW ISSUES (P3)

| # | Item | Effort |
|---|------|--------|
| P3-01 | 12 `console.log` → structured logger | bundled with P2-02 |
| P3-02 | `bunfig.toml` set but no lockfile-pinned bun version recommendation | 10 min |
| P3-03 | `playwright.config.ts` baseURL hard-coded to `localhost:8080` — derive from env | 15 min |
| P3-04 | Docs duplication: 5 different "production readiness" / "go-live" markdowns under `docs/` | 1 h to consolidate |
| P3-05 | `.prettierignore` not enforcing on `src/integrations/supabase/types.ts` (generated) | 5 min |
| P3-06 | `src/routes/yemen-debug.tsx` (420 LOC) is a dev-only tool exposed on the public router | gate it behind `_authenticated/` and `has_role('owner')` | 30 min |
| P3-07 | No `robots.txt` rule for `/admin-*` (currently relies on per-route `noindex`) | add Disallow entries | 10 min |
| P3-08 | `package.json` overrides for `entities` exist — track upstream resolution | 0 (note only) |

---

## SECTION F — ARCHITECTURE SCORECARD

| Metric | Score | Status |
|---|---|---|
| Separation of Concerns | 70 | God-components in admin tabs drag the score |
| Dependency Direction (routes → lib → core → integrations) | 80 | Mostly clean; P1-01 leakage risk noted |
| Coupling | 75 | Admin pages tightly coupled to specific server fns |
| Cohesion | 78 | Core modules under `src/core/` are well-scoped |
| Domain Boundaries | 72 | `src/lib/` mixes pure helpers, server fns, server-only — naming `*.functions.ts` vs `*.server.ts` helps but isn't universal |
| Code Duplication | 70 | Two sign-in surfaces (P1-05); compat shims (P2-03) |
| **Overall** | **74** | |

## SECTION G — SECURITY SCORECARD

| Metric | Score | Status |
|---|---|---|
| Authentication | 80 | After P0-01 fix; sign-up is open (not necessarily wrong) |
| Authorization (RBAC/RLS) | 82 | `has_role`, `user_roles` separate table; P1-03 SECURITY DEFINER sprawl drags score |
| Input Validation | 78 | Zod on most server fns; some hooks accept `body` without schema (P2) |
| Output Sanitization | 88 | No `dangerouslySetInnerHTML` with user data |
| Secrets Management | 75 | `.env` only contains publishable keys; secrets via Lovable Cloud secrets — P0-03 fix raises this |
| Rate Limiting | 60 | `img-rate-limit` table exists; most public hooks unlimited (P1-04) |
| Audit Trail | 90 | `activity_logs`, `error_logs`, `inventory_audit_log`, `transfer_audit_log`, `supplier_link_audit` all present |
| **Overall** | **78** | |

## SECTION H — PERFORMANCE SCORECARD

| Metric | Score | Status |
|---|---|---|
| Query Optimization | 80 | RPC fan-out in `getHomepageBundle` good; need slow-query review |
| Caching Strategy | 85 | TanStack Query + `image-cache.ts` LRU + `force-cache` fetches |
| Memory Usage | 82 | Cleanup on listeners; LRU caps; `URL.revokeObjectURL` paired |
| Response Times | 78 | Bundle size dominated by `products-extra.ts` (P2-08) |
| **Overall** | **81** | |

## SECTION I — FUNCTIONAL COMPLETENESS

| Feature | Status | Note |
|---|---|---|
| Public storefront / product catalog | ✅ | |
| Cart + tracking | ✅ | |
| Prescription upload + AI extraction | ✅ | Hardened in prior sweep |
| Pharmacist review queue | ✅ | |
| Admin command center + 30+ admin pages | ✅ | Auth gate fix (P0-01) restores access |
| Loyalty + reactivation campaigns | ✅ | |
| Marketing banners + social posts | ✅ | |
| WhatsApp ops (conversations, retries) | ✅ | |
| Inventory sync + duplicates + reservations | ✅ | |
| Backup verification + DLQ replay | ✅ | |
| Notifications (in-app + email + WhatsApp) | ✅ | |
| Health monitoring + uptime | ✅ | |
| AI clinical copilot | ✅ | |
| Alert dispatch (Slack/Twilio/WhatsApp) | ⚠️ | Slack pending correct webhook URL from prior session |
| Self-care hourly suite | ✅ | Expires 2028-01-01 (P2-05) |
| OAuth (Google/Apple) | ❌ | Not wired — `/auth` currently email-only |

---

## SECTION J — RECOMMENDED NEXT STEPS

```text
IMMEDIATE (this week)
  1. Approve P1-04 — harden every cron hook with x-cron-secret (3h + SQL).
  2. Approve P1-01 — move 42 top-level client.server imports into
     handler-scope `await import(...)` (6–8h).
  3. Approve P1-05 — delete inline LoginCard in /admin; redirect to
     /auth?redirect=/admin (30m).
  4. Approve P1-02 — preserve original destination on auth redirect (20m).

SHORT-TERM (2 weeks)
  5. Approve P1-03 — REVOKE/re-GRANT sweep on SECURITY DEFINER fns.
  6. Approve P1-08 — add Playwright e2e job to CI gate.
  7. Approve P2-07 — relocate admin pages under _authenticated/admin/.
  8. Approve P2-12 — regenerate Supabase types; drop `as never` casts.

LONG-TERM (1 month)
  9. P2-09 + P1-06 — decompose god-components (PrescriptionsTab,
     admin.tsx, admin-rx-review, admin-transfers).
 10. P2-08 — split products-extra.ts; ship category-on-demand chunks.
 11. P2-05 — add a 60-day "self-care expires soon" warning cron.
 12. Wire Google OAuth via `lovable.auth.signInWithOAuth("google", ...)`
     on /auth and call `supabase--configure_social_auth`.
```

---

## P0 — FIXED IN THIS PASS (summary)

| # | File | Before | After |
|---|------|--------|-------|
| P0-01 | `src/routes/auth.tsx` | did not exist | new public sign-in/sign-up page with `?redirect=` honoring |
| P0-02 | `src/routes/admin-whatsapp-delivery.tsx:244` | `<Link to="/admin-rx-review">` (TS2741) | `<Link to="/admin-rx-review" search={{}}>` |
| P0-03 | `.env.example` | empty | grouped client/server/cron/integration variables with comments |

**Verification:** `bunx tsgo --noEmit` exits 0. Security scanners and dependency scan remain clean. Database linter unchanged (P1-03 covers the WARN backlog).

---

## Note on the "exposed git token" warning in the prompt template
The v17 prompt template ships with a sample warning about a token leaked in `.git/config`. The Lovable sandbox's `.git` directory is not part of the published bundle, and the project's `.env` contains only publishable (anon) keys plus URLs. **No real token rotation is required from this audit.** If you ever export the sandbox over an untrusted channel, scrub `.git/config` and rotate the Lovable API key via the `rotate_lovable_api_key` tool.

— end of report —
