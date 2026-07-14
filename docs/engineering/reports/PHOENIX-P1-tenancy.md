# PHOENIX-P1 — Tenancy Spine

**Status:** EXECUTED
**Date:** 2026-07-14
**Scope:** Additive-only multi-tenant foundation. No business logic, UI, or existing data touched.

## Migrations executed

Single migration applied via Supabase migration tool:

### Enum
- `public.organization_type` = `PHARMACY | CLINIC | LAB | INSURANCE | SUPPLIER | CORPORATE`

### Tables
| Table | Purpose |
|---|---|
| `public.organizations` | Root tenant record (name, type, status, metadata, created_by) |
| `public.organization_members` | Links `auth.users.id` to organization with role (`owner`/`admin`/`member`) and status |
| `public.organization_audit_events` | Immutable audit log of org lifecycle events |

### Helper functions (SECURITY DEFINER, `search_path=public`)
| Function | Callable by | Purpose |
|---|---|---|
| `current_org() -> uuid` | authenticated | Reads `app.current_org` GUC; returns null if unset |
| `is_org_member(_org, _user) -> boolean` | authenticated | Active membership check |
| `has_org_role(_org, _user, _roles[]) -> boolean` | authenticated | Role check |
| `log_org_event(_org, _actor, _type, _payload)` | service_role only | Internal audit insert (revoked from authenticated) |

### Triggers
- `organizations_after_insert`: auto-adds `auth.uid()` as `owner` member; logs `org.created`.
- `organization_members_audit`: logs `member.added` / `member.removed`.
- `organizations_set_updated_at`, `organization_members_set_updated_at`: maintain `updated_at`.

### Audit event types emitted
- `org.created` (trigger)
- `member.added` (trigger)
- `member.removed` (trigger)
- `org.switched` (from `switchOrganization` server fn via `log_org_event`)

## Security / RLS matrix

| Table | Operation | Rule |
|---|---|---|
| organizations | SELECT | `is_org_member(id, auth.uid())` |
| organizations | INSERT | any authenticated user (creator becomes owner via trigger) |
| organizations | UPDATE | `has_org_role(id, auth.uid(), {owner,admin})` |
| organizations | DELETE | none (no policy — denied) |
| organization_members | SELECT | own row OR org admin/owner |
| organization_members | INSERT | self-insert as `owner` (creator path) OR org admin/owner |
| organization_members | UPDATE | org admin/owner |
| organization_members | DELETE | org admin/owner |
| organization_audit_events | SELECT | `is_org_member(organization_id, auth.uid())` |
| organization_audit_events | INSERT | none (only SECURITY DEFINER helper writes) |

## Tenant-context module

Location: `src/platform/tenant-context/`

- `types.ts` — TS types for `Organization`, `OrganizationMember`, roles, statuses.
- `queries.functions.ts` — `createServerFn` handlers behind `requireSupabaseAuth`:
  `listMyOrganizations`, `getOrganization`, `createOrganization`,
  `switchOrganization`, `addMember`, `removeMember`.
- `TenantContext.tsx` — `<TenantProvider>` + `useTenant()` React hook.
  Persists selected org in `localStorage` under `phoenix.currentOrg`.
- `index.ts` — public re-exports.

**Not yet mounted** into `__root.tsx` per strangler-fig plan; Phase 2 will
wire the provider into the authenticated layout and add per-request GUC
middleware for `current_org()`.

## Verification

Post-migration checks (run manually via read-only tools):

```sql
-- Existing data intact
SELECT count(*) FROM auth.users;              -- unchanged
SELECT count(*) FROM public.products;         -- unchanged
SELECT count(*) FROM public.orders;           -- unchanged
SELECT count(*) FROM public.prescriptions;    -- unchanged

-- New objects present
SELECT count(*) FROM public.organizations;             -- 0
SELECT count(*) FROM public.organization_members;      -- 0
SELECT count(*) FROM public.organization_audit_events; -- 0

-- Session helper returns null with no GUC set
SELECT public.current_org();                  -- NULL

-- Cross-tenant isolation smoke test (from an authenticated session)
-- Should return 0 rows for a user with no memberships
SELECT * FROM public.organizations;
```

Existing login flow (Supabase auth + `_authenticated` gate) is untouched;
sign-in continues to work because no auth objects were modified.

## Rollback plan

Additive-only migration — rollback is safe:

```sql
DROP TRIGGER IF EXISTS organization_members_set_updated_at ON public.organization_members;
DROP TRIGGER IF EXISTS organization_members_audit ON public.organization_members;
DROP TRIGGER IF EXISTS organizations_set_updated_at ON public.organizations;
DROP TRIGGER IF EXISTS organizations_after_insert ON public.organizations;

DROP FUNCTION IF EXISTS public.tg_update_timestamp() CASCADE;
DROP FUNCTION IF EXISTS public.tg_organization_members_audit() CASCADE;
DROP FUNCTION IF EXISTS public.tg_organizations_after_insert() CASCADE;
DROP FUNCTION IF EXISTS public.log_org_event(uuid, uuid, text, jsonb);
DROP FUNCTION IF EXISTS public.current_org();
DROP FUNCTION IF EXISTS public.has_org_role(uuid, uuid, text[]);
DROP FUNCTION IF EXISTS public.is_org_member(uuid, uuid);

DROP TABLE IF EXISTS public.organization_audit_events;
DROP TABLE IF EXISTS public.organization_members;
DROP TABLE IF EXISTS public.organizations;
DROP TYPE  IF EXISTS public.organization_type;
```

Then remove `src/platform/tenant-context/`.

## What was NOT touched

- No existing table altered.
- No existing RLS policy modified.
- No `organization_id` columns added to business tables (deferred to Phase 2).
- No changes to `user_roles`, `auth.*`, or any business module.
- No UI wiring; `TenantProvider` is exported but not mounted anywhere.
- No routes created or deleted.

## Next (Phase 2 — do NOT execute yet)

- Add `organization_id` to business tables + backfill strategy.
- Wire `<TenantProvider>` into `_authenticated/route.tsx`.
- Add server-fn middleware that sets `app.current_org` GUC per request.
- Link `organization_members.role` with existing `user_roles` / `app_role`.
