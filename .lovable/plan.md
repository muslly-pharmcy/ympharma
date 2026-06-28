
# Enterprise Engineering Review — Phase 1: Project Foundation

**Scope:** `package.json`, TypeScript config, build config, environment config, dependency health, scripts, dev tooling. **No code changes in this phase.** Implementation will be planned in Phase 2 after you approve the findings below.

---

## Executive Summary

The foundation is functional and the project builds, but it carries meaningful supply-chain and configuration risk. Eight findings, no Critical, **2 High** (vulnerable `xlsx` dependency; unpinned beta `nitro` + missing Node engine), **4 Medium** (duplicate animation library, ESLint/TS env mismatches, CI doesn't run `build`, Vitest config drift from Vite), **2 Low** (stale ESLint ignore globs; dead-code rules disabled). Foundation readiness is **good for development, not yet hardened for production releases**.

**Notable strengths:** strict TS on; bunfig 24h supply-chain guard enabled; `.env.example` correctly separates `VITE_*` vs server-only; Prettier + ESLint + Vitest + Playwright all wired; `htmlparser2` already pinned via `overrides`/`resolutions`.

---

## Issues Found

### HIGH

#### F-01 — `xlsx@^0.18.5` has known unpatched CVEs and is not on the public npm registry
- **Severity:** High
- **Category:** Security / Supply chain
- **Affected files:** `package.json` (line 92), any importer of `xlsx` (admin Excel import flows)
- **Root cause:** SheetJS published `0.20.x` only via `https://cdn.sheetjs.com`, not npm. The npm tag tops out at `0.18.5`, which is affected by Prototype Pollution (CVE-2023-30533) and ReDoS (CVE-2024-22363). `bun audit` / `npm audit` flag both as High.
- **Technical impact:** Untrusted spreadsheet input can mutate `Object.prototype` or stall the event loop. Exploitable from any UI that parses a user-supplied `.xlsx`.
- **User impact:** Admin uploading a crafted file could corrupt runtime state or DoS the worker.
- **Recommended solution:** Either (a) move `xlsx` to the official SheetJS CDN tarball pinned by version, or (b) replace with `exceljs` / `read-excel-file` for the admin import path. Document the choice in `docs/security-operations.md`.
- **Effort:** S (½ day) for swap, M (1 day) for CDN install + lockfile + build verification.
- **Risk:** Low (admin-only feature, easily regression-tested).

#### F-02 — `nitro` pinned to a dated beta + no Node/Bun engines declared
- **Severity:** High
- **Category:** Build reproducibility
- **Affected files:** `package.json` (devDep `nitro: 3.0.260603-beta`, no `engines`, no `packageManager`)
- **Root cause:** `nitro` is held at an exact beta build; combined with the absence of `engines.node` / `packageManager`, CI and local installs can drift across machines and may break when the beta is unpublished or superseded.
- **Technical impact:** "Works on my machine" SSR build failures; future `bun install` may pull incompatible transitive versions.
- **User impact:** None directly; degraded release reliability.
- **Recommended solution:** (1) Add `"engines": { "node": ">=20.18 <23", "bun": ">=1.1" }` and `"packageManager": "bun@<lockfile-version>"`. (2) Replace the dated nitro pin with a caret range matching the current Lovable template, or remove if `@lovable.dev/vite-tanstack-config` already provides it transitively (confirm before removal).
- **Effort:** S (½ day incl. CI re-run).
- **Risk:** Medium (touches the SSR build; needs full `bun run build` + smoke).

---

### MEDIUM

#### F-03 — Duplicate animation libraries (`framer-motion` **and** `motion`)
- **Severity:** Medium
- **Category:** Bundle health
- **Affected files:** `package.json` (deps `framer-motion ^12.40.0`, `motion ^12.41.0`)
- **Root cause:** `motion` is the v12 rename of `framer-motion`; both are listed. Repo-wide grep shows **only `framer-motion` is imported** — `motion` is unused.
- **Technical impact:** ~70 KB duplicated in node graph; SSR pre-bundling cost; risk that an autofix later imports from `motion` and produces two animation runtimes in one bundle.
- **User impact:** Marginal bundle bloat on first paint.
- **Recommended solution:** Remove `motion` from `dependencies`; standardize on `framer-motion` (or decide the inverse and migrate, but not both).
- **Effort:** XS (15 min).
- **Risk:** Low.

#### F-04 — ESLint env mismatch + dead-code rules disabled
- **Severity:** Medium
- **Category:** Dev tooling / Maintainability
- **Affected files:** `eslint.config.js`, `tsconfig.json`
- **Root cause:** ESLint declares only `globals.browser` and `ecmaVersion: 2020`, but server functions, server routes, and `*.server.ts` files run on Node/Workers with ES2022+ syntax. Separately, `@typescript-eslint/no-unused-vars: off` and `noUnusedLocals/noUnusedParameters: false` mean dead code accrues silently.
- **Technical impact:** False negatives on server-only globals (`process`, `Buffer`); legitimately unused imports/exports never flagged.
- **User impact:** Indirect — larger bundles, harder reviews.
- **Recommended solution:** Add a second ESLint config block for `src/**/*.server.ts`, `src/routes/api/**`, `src/**/*.functions.ts` with `globals.node` and `ecmaVersion: 2022`. Re-enable `@typescript-eslint/no-unused-vars` as a `warn` with the `_` ignore pattern. Leave tsconfig flags as-is until cleanup batch.
- **Effort:** S (½ day + cleanup of resulting warnings).
- **Risk:** Low.

#### F-05 — CI does not run a production build
- **Severity:** Medium
- **Category:** Release readiness
- **Affected files:** `.github/workflows/ci.yml`
- **Root cause:** CI runs `tsc --noEmit`, `eslint`, `vitest` only. A broken Vite/SSR build (e.g. server-only import leaking into client graph — see `tanstack-supabase-import-graph`) passes CI and only blows up on deploy.
- **Technical impact:** Class of failures uniquely caught by `vite build` (SSR boundary leaks, asset resolution, route-tree generation) bypasses the merge gate.
- **User impact:** Higher chance of broken production deploys.
- **Recommended solution:** Add a `Build` step (`bun run build`) after typecheck. Cache `node_modules/.vite` to keep it under ~90 s.
- **Effort:** XS.
- **Risk:** Low.

#### F-06 — `vitest.config.ts` diverges from the real Vite config
- **Severity:** Medium
- **Category:** Test reliability
- **Affected files:** `vitest.config.ts`, `vite.config.ts`
- **Root cause:** Vitest defines its own `@vitejs/plugin-react` + `@` alias rather than reusing `@lovable.dev/vite-tanstack-config`. TanStack route plugin, server-fn transform, and the `entities/lib/decode.js` alias from `vite.config.ts` are absent, so tests can pass on code that fails in build (and vice-versa).
- **Technical impact:** Tests importing route files or server-fn modules behave differently than production; the React Email path can break in Vitest only.
- **User impact:** Indirect — false-green tests.
- **Recommended solution:** Import the project Vite config via `mergeConfig(viteConfig, defineConfig({ test: {...} }))` inside `vitest.config.ts` so both share plugins and aliases.
- **Effort:** S.
- **Risk:** Medium (could surface latent test failures; that's the point, but plan a follow-up batch).

---

### LOW

#### F-07 — Stale ESLint ignore globs
- **Severity:** Low
- **Category:** Dev tooling hygiene
- **Affected files:** `eslint.config.js` (`ignores: ["dist", ".output", ".vinxi"]`)
- **Root cause:** `.vinxi` is from the pre-1.0 TanStack Start (now removed). Real output directories on this stack are `.output`, `.nitro`, and `node_modules/.vite`.
- **Recommended solution:** Replace with `["dist", ".output", ".nitro", "node_modules", "src/routeTree.gen.ts"]`. Adding `routeTree.gen.ts` prevents lint noise on the generated file.
- **Effort:** XS. **Risk:** None.

#### F-08 — `@types/three` in `dependencies` (should be `devDependencies`)
- **Severity:** Low
- **Category:** Packaging hygiene
- **Affected files:** `package.json` (line 64)
- **Root cause:** Type packages never ship at runtime; placement in `dependencies` slightly bloats install closure for downstream consumers (irrelevant here since `private: true`, but it's the only `@types/*` misplaced).
- **Recommended solution:** Move to `devDependencies`.
- **Effort:** XS. **Risk:** None.

---

## Recommended Actions (priority order)

1. **F-01** Swap or pin `xlsx` to a non-vulnerable source. *(High — security)*
2. **F-02** Add `engines` + `packageManager`; replace `nitro` beta pin. *(High — reproducibility)*
3. **F-05** Add `bun run build` step to CI. *(Medium — prevents prod-only failures)*
4. **F-06** Have `vitest.config.ts` extend the real Vite config. *(Medium — test fidelity)*
5. **F-04** Add Node ESLint overlay; warn on unused vars. *(Medium — maintainability)*
6. **F-03** Remove unused `motion` dependency. *(Medium — bundle)*
7. **F-07 / F-08** Hygiene cleanup. *(Low)*

Each batch should be one PR with TypeScript + ESLint + Vitest + `vite build` all green before merge.

---

## Risk Assessment

| Risk | Likelihood | Severity | Notes |
|---|---|---|---|
| Vulnerable `xlsx` exploited via admin upload | Low | High | Admin-gated, but admin accounts exist. |
| Beta `nitro` unpublished / build breaks | Medium | Medium | Mitigated only by lockfile until repinned. |
| Server-only import leak ships to client | Medium | High | CI build step would catch the class. |
| Tests pass, build fails | Medium | Medium | Direct consequence of F-06. |
| Dead code accumulating | Already happening | Low | F-04 + lint sweep. |

**Rollback for every recommended action above is a single `git revert` of the change PR; no DB or runtime migration required in Phase 1 scope.**

---

## Readiness Score (Phase 1 scope only)

| Dimension | Score / 10 | Rationale |
|---|---|---|
| **Build** | 7 | Works, but no CI build gate; nitro beta pin. |
| **Configuration** | 7 | Clean `.env.example` and Vite config; small ESLint/Vitest drifts. |
| **Maintainability** | 6 | Unused-var checks off; dead deps; vitest config drift. |
| **Security** | 5 | `xlsx` CVE class is the dominant drag; bunfig 24h guard helps. |
| **Production Readiness** | 6 | Foundation is shippable today, but reproducibility + CI gates are not yet enterprise-grade. |

**Overall foundation score: 6.2 / 10 — "Solid, not yet hardened."**

---

## What I Need From You Before Phase 2

1. **Approval to proceed** with the prioritized action list above (or tell me which items to drop/defer).
2. **Decision on `xlsx`:** swap to `exceljs`, or stay on SheetJS via the official CDN tarball?
3. **Decision on engines pin:** target Node 20 LTS (recommended) or Node 22?
4. Confirmation that **adding a `bun run build` step to CI** is acceptable (will add ~60–90 s per PR).

Once you answer those four, I'll produce the Phase 2 Engineering Change Proposal with batch breakdown, file-by-file diffs plan, verification steps, and rollback notes — still no code until you approve it.
