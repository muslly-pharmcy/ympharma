
# Phase 2.5 — Identity & Security Integration

Goal: replace the `x-actor-*` demo bridge with real Supabase Auth **without changing any Shipment A/B business logic**. All 13 mutation server fns already funnel through `getActor()` — swapping that one function is the entire cutover.

## Reality check (before I code)

Already present in the project:
- `src/integrations/supabase/auth-middleware.ts` — generated `requireSupabaseAuth` middleware. Validates bearer JWT, injects `{ supabase, userId, claims }`.
- `src/integrations/supabase/auth-attacher.ts` — generated `attachSupabaseAuth` client middleware.
- DB tables: `organization_members` (org + role + branch_id), `user_roles` (app_role enum), `has_role()` security-definer function, `is_org_member()`, `has_org_permission()`.
- `src/routes/login.tsx` — legacy demo login (to be replaced by Supabase auth page).
- No `src/routes/_authenticated/` layout yet — the integration-managed one has not been scaffolded because no route required it.
- `src/start.ts` — empty `createStart(() => ({}))`; **no bearer middleware registered** (that's why Shipment B needed the header bridge).

So the missing pieces are: register the attacher, wire a real auth page, gate the protected surface with a proper `_authenticated` layout, and rewrite `getActor()` to resolve identity from the Supabase claims + `organization_members` instead of from headers.

## Scope

### 1. Auth wiring (foundation)
- `src/start.ts` — append generated `attachSupabaseAuth` to `functionMiddleware`.
- `src/routes/__root.tsx` — add root `supabase.auth.onAuthStateChange` subscriber (filter to `SIGNED_IN`/`SIGNED_OUT`/`USER_UPDATED`, invalidate router + queries per canonical pattern).
- Root context — expose `{ auth: { user, session } }` via `createRootRouteWithContext` so `beforeLoad` can read it. `useAuth` hook reads it.

### 2. Auth pages (public)
- `src/routes/auth.tsx` — email/password sign-in + sign-up + Google OAuth button (via `lovable.auth.signInWithOAuth('google')`). Preserves `?redirect=` search param through every path (password sign-in nav, signup `emailRedirectTo`, OAuth `redirect_uri`). Zod-validated form with proper error surfaces.
- `src/routes/reset-password.tsx` — recovery flow: reads `type=recovery` from hash, calls `updateUser({ password })`.
- Delete legacy `src/routes/login.tsx` and `src/pages/Login.tsx`.
- Configure Supabase auth via `supabase--configure_auth` (disable anon, no auto-confirm, HIBP on) and `supabase--configure_social_auth` for Google.

### 3. Protected layout
- `src/routes/_authenticated/route.tsx` — integration-managed shape: `ssr: false`, `beforeLoad` calls `supabase.auth.getUser()`, throws `redirect({ to: '/auth', search: { redirect: location.href } })` if no user.
- Move `/purchase-orders`, `/purchase-orders/$id`, `/warehouses`, `/suppliers`, `/catalog`, `/catalog/$productId` under `_authenticated/` (rename files). Public landing at `/` stays public.

### 4. Session context on server (the real replacement)
Rewrite `src/lib/session.server.ts` to a Supabase-backed resolver used by every mutation fn — no signature change, no call-site edits.

```ts
// New shape (drop-in for existing getActor())
export interface Actor {
  userId: string
  organizationId: string
  branchId: string | null
  roles: string[]         // app_role: admin/pharmacist/etc from user_roles
  orgRole: string         // role in organization_members
  correlationId: string   // per-request UUID
  ip: string | null
  userAgent: string | null
}
```

Two implementations, chosen at call-site by whether the fn uses `requireSupabaseAuth` middleware:
- `resolveActor(context)` — pure Supabase path. Given the middleware context, queries `organization_members` (default active org for this user) + `user_roles` under RLS via `context.supabase`.
- `resolveActorFromRequest()` — for the small number of call paths that don't use middleware; extracts bearer, validates via `supabase.auth.getUser()`, then queries membership.

**Cache**: in-request memo only. No cross-request policy cache in this shipment (avoids stale-permission bugs; policy engine is a separate phase).

### 5. Migrate all 13 mutation server fns
Each currently does:
```ts
const actor = getActor()
requireOrg(actor, data.organizationId)
```
Becomes:
```ts
// .middleware([requireSupabaseAuth]) added to the chain
const actor = await resolveActor(context)
requireOrg(actor, data.organizationId)
```
No business-logic changes. `catalog.mutations.functions.ts`, `inventory.mutations.functions.ts`, `suppliers.mutations.functions.ts`, `purchasing.functions.ts`.

### 6. Audit trail
- Migration: `audit_events` table (`id, actor_user_id, organization_id, branch_id, action, resource_type, resource_id, ip, user_agent, correlation_id, payload jsonb, created_at`). RLS: org members read own-org rows; service_role writes.
- Helper `audit(actor, action, resource, payload)` in `src/lib/audit.server.ts`, called once per mutation right after the RPC succeeds. Correlation ID threads through domain event + audit row.

### 7. Sign-in affordance
- Update `Navbar` / whatever the top-bar is: show "Sign in" when signed-out, account menu + sign-out when signed-in, both driven by auth context (not local state).
- Sign-out follows canonical 4-step hygiene: `cancelQueries` → `queryClient.clear()` → `supabase.auth.signOut()` → `navigate({ to: '/auth', replace: true })`.

### 8. End-to-end test
- `tests/e2e-inventory-flow.test.ts` — Vitest + real Supabase client, using service-role to seed one org/user/warehouse/product, then hits the server fns through their HTTP boundary with a real signed-in session:
  Login → Create PO → Approve → Receive (creates batch) → ReserveFEFO → Consume → Return → assert `audit_events` + `ai_events` rows exist with matching correlation_id.
- Runs behind `SUPABASE_E2E=1` env gate so CI doesn't fail on projects without seeded fixtures.

## Explicitly out of scope

- **CSRF middleware, rate limiting, replay protection, session expiration policy, secure-cookie handling** — Supabase Auth already handles session lifecycle, cookie security, and refresh rotation. CSRF is a non-issue because we authenticate with Bearer tokens (not cookies) via the attacher. Rate limiting and replay protection deserve their own phase (Phase 2.6 — Edge Protection) with a proper reverse-proxy / Cloudflare Rules layer; hand-rolling them in server fns is theater. I'll flag this as `docs/engineering/PHASE-2.6-DEFERRED.md` rather than pretend it's shipped.
- **Multi-org switcher UI**. `organization_members` supports many orgs per user; this shipment picks the first (or a `preferred_org_id` column if present) and defers the switcher UI. Chief chooses one now → I add the column.
- **Full RBAC policy engine with permission cache**. `has_role()` + `has_org_permission()` already exist as SQL functions; call sites use them via RLS. A dedicated permission engine + cache is Phase 4 territory.
- **Branch switcher UI**. `branchId` resolves to the actor's default branch from `branch_user_assignments` if present, else null.

## Files touched

Created:
- `src/routes/auth.tsx`, `src/routes/reset-password.tsx`
- `src/routes/_authenticated/route.tsx`
- `src/lib/audit.server.ts`
- `tests/e2e-inventory-flow.test.ts`
- `docs/engineering/PHASE-2.6-DEFERRED.md`

Moved (git-mv):
- `catalog.tsx`, `catalog.$productId.tsx`, `warehouses.tsx`, `suppliers.tsx`, `purchase-orders.tsx`, `purchase-orders.$id.tsx` → `_authenticated/` subtree

Rewritten:
- `src/lib/session.server.ts` (public API unchanged)
- `src/start.ts`
- `src/routes/__root.tsx` (context + auth listener)
- All 4 mutation `.functions.ts` files (add middleware only)

Deleted:
- `src/routes/login.tsx`, `src/pages/Login.tsx`

Migration:
- `audit_events` table + RLS + grants + updated_at trigger
- (optional) `preferred_org_id` column on `profiles`

## Acceptance criteria

1. `tsgo --noEmit` clean.
2. SSR probes: `/` 200, `/auth` 200, `/_authenticated/catalog` redirects to `/auth` unauthenticated.
3. Existing tests still pass.
4. New e2e test (behind env gate) runs full inventory flow with a real signed-in user and asserts `audit_events` + `ai_events` rows.
5. `getActor` code path is deleted; `grep -r "x-actor-user-id" src/` returns nothing.
6. Manual smoke: sign up via `/auth` → land on `/catalog` → create warehouse/product/PO → approve/receive → check audit row via `supabase--read_query`.

## Questions before I execute

1. **Google OAuth** — do you want me to enable it now (needs you to add Google Client ID/Secret via `add_secret` when I prompt), or ship email/password only and add Google in a follow-up? Default recommendation: email/password now, Google in the next turn.
2. **Multi-org**: for the initial cutover I'll pick the user's first `organization_members` row deterministically. OK to defer the switcher, or is there a specific org you want new users seeded into?
3. **E2E test in CI**: run it against the live dev DB (fixtures cleaned up in `afterAll`), or skip in CI and keep it as a local-only smoke? I recommend local-only until you have a dedicated test project.

Reply **"go 2.5"** to execute with defaults (email/password only, defer Google, defer switcher, e2e local-only), or tell me which of the three to change.
