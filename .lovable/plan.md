
## Goal

Store TITANUS OMEGA v10.0 as the project's constitutional reference, unblock the current build (`getRouter` missing export + stale `react-router-dom` / `axios` imports), and migrate the app to a single routing system (TanStack Start) in small, verifiable phases. No feature rewrite — architecture cleanup first, then feature phases layered on top.

---

## Phase 0 — Adopt the Constitution (docs + memory only, no code)

1. Save the full constitution verbatim to `docs/engineering/CONSTITUTION-v10.md`.
2. Distill enforceable rules into project memory:
   - `mem://index.md` — Core rules (stack = TanStack Start only, Supabase, RLS mandatory, no `src/pages/`, no `react-router-dom`, RTL-capable, security-first).
   - `mem://architecture/stack.md` — full stack + forbidden patterns.
   - `mem://architecture/roadmap.md` — phase list below, so future turns don't drift.
3. No code changes in this phase.

---

## Phase 1 — Unblock the build (P0, minimum surface)

Root cause of the current failure: `@tanstack/start-client-core` imports `getRouter` from `src/router.tsx`, but the file only exports `createRouter`. Secondary: `src/shared/services/api.ts` imports `axios` (not installed) and `App.tsx` imports `react-router-dom`, and `src/routes/__root.tsx` wraps `<Outlet />` in `MainLayout` (which itself likely uses react-router-dom) — leftover from an older router.

Fixes (all mechanical, no behavior change):

1. **`src/router.tsx`** — rename/export `getRouter` (the name the runtime expects) and keep a `createRouter` alias for existing call sites:
   ```ts
   export function getRouter() {
     return createTanStackRouter({ routeTree, defaultPreload: 'intent', scrollRestoration: true })
   }
   export const createRouter = getRouter // back-compat
   ```
   Update the `Register` module augmentation to use `ReturnType<typeof getRouter>`.
2. **`src/shared/services/api.ts`** — delete this file. It's an unused axios wrapper; the project already uses the Supabase client. If any import breaks, replace with the existing `supabase` client.
3. **`src/App.tsx`** — delete. TanStack Start doesn't use it; `src/routes/__root.tsx` + file routes are the entry.
4. **`src/main.tsx`** — verify it doesn't import `App.tsx`; if it does, remove that import (TanStack Start's Vite plugin owns bootstrap).
5. **`src/routes/__root.tsx`** — keep providers (`ThemeProvider`, `AuthProvider`, `AIProvider`, `NotificationsProvider`) around `<Outlet />`. Do NOT wrap `<Outlet />` in `MainLayout` at the root if `MainLayout` uses `react-router-dom` internals; instead move `MainLayout` chrome (nav/sidebar) into route components or refactor `MainLayout` to use `@tanstack/react-router` primitives (`<Link>`, `useNavigate`, `useLocation`).
6. **`src/layouts/MainLayout.tsx`, `src/shared/components/Navbar.tsx`, any component under `src/modules/`, `src/pages/`, `src/shared/`** — replace every `from 'react-router-dom'` with `from '@tanstack/react-router'`. Map: `Link`→`Link`, `NavLink`→`Link` with `activeProps`, `useNavigate`→`useNavigate`, `useLocation`→`useLocation`, `useParams`→`Route.useParams`/`getRouteApi`, `Outlet`→`Outlet`, `Routes/Route`→delete (file-based routing owns this).
7. **Uninstall** `react-router-dom` from `package.json` once all imports are gone (last step, so grep confirms zero references first).
8. **Verify**: `bun run build:dev` succeeds; `/`, `/login`, `/ai-chat`, `/mission-control`, `/planets/:id` all render.

Deliverable: green build, single router.

---

## Phase 2 — Route consolidation (align file tree with constitution)

1. Move any remaining `src/pages/*` page-level modules into `src/routes/*` using flat dot-separated naming. Keep the components; only add the `createFileRoute(...)` wrapper file.
2. Rename `src/routes/planets.$id.tsx` if the app actually links to `/planet/:planetId` (current `App.tsx` uses `/planet/:planetId`; new file uses `/planets/$id`). Pick one, update every `<Link>`.
3. Add `errorComponent` + `notFoundComponent` on every route with a loader; add `defaultErrorComponent` + root `notFoundComponent` (constitution: quality + UX).
4. Add per-route `head()` metadata (title/description/og) — constitution requires SEO and shareable pages.

---

## Phase 3+ — Feature phases (deferred, each its own plan later)

Only listed here so the roadmap is explicit; each becomes a separate approved plan when requested:

- **P3 Foundation hardening**: strict TS pass on `src/` (fix implicit-any, remove dead `src/pages` scaffolding), enable `bun run build` in CI.
- **P4 Auth + RBAC alignment**: consolidate `AuthContext` on Supabase session; `_authenticated` layout with `beforeLoad` gate; `user_roles` + `has_role` (already exist) as sole authority.
- **P5 Domain modules audit**: inventory / patients / doctors / pharmacy — verify each backing table exists, RLS + GRANTs present, no fictional schema.
- **P6 AI layer unification**: fold `src/ai/brain/AIBrain.ts` (in-memory stub) into the existing `src/ai/sun-core` + `src/ai/identity/agent-map.ts` pipeline; no parallel stacks.
- **P7 Observability + automation**: keep existing `hourly-self-heal`, `dlq-alerts`, `ai-events-mirror`; add missing dashboards only where a real gap exists.
- **P8 Testing**: Vitest smoke tests for server functions + Playwright for `/`, `/login`, `/admin-*`.
- **P9 Deploy hardening**: verify cron auth, secret hygiene, published-URL health check.

Each of P3–P9 requires its own plan approval — this document only commits to Phase 0 → Phase 2.

---

## Non-goals (explicit)

- No new database tables, no new agents, no new dashboards in Phases 0–2.
- No visual redesign. The "solar system" UI stays until a later phase decides otherwise.
- No removal of existing working features (WhatsApp, prescription, admin dashboards).

---

## Technical notes

- `getRouter` naming is required by `@tanstack/start-client-core`'s virtual import `#tanstack-router-entry`; `createRouter` is a legacy name from older templates.
- `react-router-dom` cannot coexist with TanStack Router in the same tree — the current `App.tsx` `<Routes>` never mounts (the real entry is `src/routes/__root.tsx`), so removing it is safe.
- `src/routeTree.gen.ts` is regenerated; never edit by hand.
- After Phase 1, `docs/engineering/reports/PHASE-1-router-unification.md` documents what was removed and why.

---

## Success criteria for this plan (Phases 0–2)

- `bun run build:dev` exits 0.
- `rg "react-router-dom" src/` returns zero matches.
- Every URL in the current app resolves via a file under `src/routes/`.
- Constitution stored in `docs/` and memory index updated.
