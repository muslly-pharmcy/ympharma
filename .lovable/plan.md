## Phoenix Phase 1 — Tenancy Spine

Additive-only foundation for multi-tenant organizations. No business logic changes, no UI rebuild, no route deletions.

### 0. Pre-flight: fix broken build

`bun install` is failing because `bun.lockb` pins `xlsx` to the SheetJS CDN tarball which now returns 403. Since `package.json` already has a `resolutions` entry for `xlsx`, regenerate the lockfile:

```
rm -f bun.lockb bun.lock && bun install
```

Nothing else in the codebase changes for this step.

### 1. Database migration (additive-only)

One migration file creating:

**`public.organization_type`** enum: `PHARMACY`, `CLINIC`, `LAB`, `INSURANCE`, `SUPPLIER`, `CORPORATE`.

**`public.organizations`**
- `id uuid pk`, `name text not null`, `type organization_type not null`
- `status text not null default 'active'` (`active` | `suspended` | `archived`)
- `metadata jsonb not null default '{}'`
- `created_at`, `updated_at` timestamps + update trigger
- GRANT `SELECT, INSERT, UPDATE` to `authenticated`; `ALL` to `service_role`
- RLS: members can `SELECT`; only members with role `owner`/`admin` can `UPDATE`; `INSERT` allowed to any authenticated user (creator becomes owner via trigger)

**`public.organization_members`**
- `id uuid pk`, `organization_id uuid fk → organizations(id) on delete cascade`
- `user_id uuid not null` (references `auth.users`, no FK per platform rules)
- `role text not null` (`owner` | `admin` | `member`) — string role for now, integrates later with `user_roles`
- `status text not null default 'active'`
- `created_at`, `updated_at` + unique `(organization_id, user_id)`
- GRANT + RLS: user sees own memberships; org owners/admins see all rows in their orgs; only owners/admins can insert/delete members

**`public.organization_audit_events`**
- `id`, `organization_id`, `actor_user_id`, `event_type` (`org.created` | `member.added` | `member.removed` | `org.switched`), `payload jsonb`, `created_at`
- GRANT + RLS: org members can `SELECT`; inserts via SECURITY DEFINER helper only

**Helpers (SECURITY DEFINER, `search_path = public`)**
- `public.is_org_member(_org uuid, _user uuid) returns boolean`
- `public.has_org_role(_org uuid, _user uuid, _roles text[]) returns boolean`
- `public.current_org() returns uuid` — reads `current_setting('app.current_org', true)::uuid`; returns null if unset
- `public.log_org_event(_org uuid, _type text, _payload jsonb) returns void`
- Trigger on `organizations` insert: auto-insert creator into `organization_members` as `owner` and log `org.created`
- Triggers on `organization_members` insert/delete: log `member.added` / `member.removed`

REVOKE EXECUTE from `authenticated` on `log_org_event` (service/trigger use only); keep `current_org`, `is_org_member`, `has_org_role` available to `authenticated`.

### 2. Tenant context module

New folder `src/platform/tenant-context/`:

- `types.ts` — `Organization`, `OrganizationMember`, `OrganizationRole` types
- `queries.functions.ts` — server fns behind `requireSupabaseAuth`:
  - `listMyOrganizations()` → orgs the current user belongs to
  - `getOrganization({ id })` → single org (RLS-gated)
  - `switchOrganization({ id })` → validates membership, sets `app.current_org` via `set_config`, logs `org.switched`, returns org
  - `createOrganization({ name, type, metadata? })` → inserts org (trigger adds owner membership)
  - `addMember({ organizationId, userId, role })` / `removeMember({ organizationId, userId })`
- `TenantContext.tsx` — React context + `TenantProvider` + `useTenant()` hook; persists selected `organizationId` in `localStorage` under `phoenix.currentOrg`; hydrates via `listMyOrganizations`
- `index.ts` — public re-exports

Provider is **not** mounted into `__root.tsx` yet — Phase 1 only ships the module. Wiring into layouts happens in a later phase per the strangler-fig plan.

### 3. Safety & verification

- All migrations idempotent (`create table if not exists`, `create or replace function`, guarded `create policy` via `do $$ ... $$` blocks).
- No changes to existing tables, no data backfill, no drops.
- Existing auth, RLS, and user data are untouched — verified by inspecting that no `alter table`/`drop`/`update` statements target pre-existing objects.
- Post-migration read-only verification queries (documented in report):
  - `select count(*) from auth.users` unchanged
  - `select count(*) from public.products/orders/prescriptions` unchanged
  - `select current_org()` returns null with no setting
  - member insert/select from a non-member session returns 0 rows

### 4. Documentation

`docs/engineering/reports/PHOENIX-P1-tenancy.md`:
- Migration SQL summary and file name
- Table/enum/function inventory
- RLS matrix (who can read/write what)
- Verification queries + expected results
- Rollback plan (drop new tables/functions/enum in reverse order — safe because additive-only)
- Explicit list of what was **not** touched

Update `docs/engineering/PROJECT_STATE.yaml` → `PHOENIX-P1 / EXECUTED` and append `docs/engineering/CHANGELOG.md`.

### 5. Out of scope (per directive)

- No business module migration
- No UI rebuild, no route changes/deletes
- No `organization_id` columns added to existing tables (Phase 2)
- No changes to existing RLS policies

### Technical notes

- `current_org()` uses PostgreSQL session GUC (`app.current_org`) set per-request via `set_config('app.current_org', $1, true)` inside `switchOrganization`. The `local=true` flag scopes to the transaction; for cross-request tenant state we rely on the client-side `TenantProvider` re-calling `switchOrganization` at the start of each server fn that needs tenant scoping (Phase 2 will add a middleware for this).
- `organization_members.role` is a plain text column now; Phase 2 will link it to the existing `app_role` enum / `user_roles` table once the org-scoped role model is designed.
- Server fns live at `src/platform/tenant-context/queries.functions.ts` (client-safe path per import-graph rules); no `.server.ts` helpers needed this phase.

Stops after Phase 1. Awaits explicit go for Phase 2.
