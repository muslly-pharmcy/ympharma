# Phoenix Phase 3 — Identity, Organizations, Branches, Users, Permissions

Status: **CLOSED**
Scope: identity foundation only — no inventory, products, orders, prescriptions, or business workflows migrated.

## Architecture changes

- Application identity layer sits on top of `auth.users` (unchanged, Supabase-managed):
  - `public.profiles` — app-side profile (avatar, contact, locale, notification prefs, status, completion state).
  - `public.organization_members.role` upgraded to `public.org_role` enum (9 roles).
  - `public.branches` linked to `public.organizations` via `organization_id`.
  - `public.branch_user_assignments` bridges users to branches (existing table, RLS enforced through helpers).
- Organization-scoped permission engine backed by `public.permissions` catalog + `public.role_permissions` mapping.
- Subscription plumbing scaffolded via `public.organization_subscriptions` (plan / features / limits / usage / trial / period).
- All identity lifecycle changes emit domain events into the central event catalog and are mirrored into `public.organization_audit_events`.

## Tables / enums / functions added

| Object | Type | Purpose |
| --- | --- | --- |
| `public.profiles` | table | app profile per `auth.users.id` |
| `public.org_role` | enum | owner / admin / manager / employee / pharmacist / doctor / supplier_user / insurance_user / customer |
| `public.permissions` | table | permission catalog (`resource.action` keys) |
| `public.role_permissions` | table | (role × permission) mapping, seeded for baseline roles |
| `public.organization_subscriptions` | table | plan / features / limits / usage per organization |
| `public.has_org_permission(_user_id, _org_id, _permission, _branch_id)` | SECURITY DEFINER | canonical permission check |
| `public.list_my_org_permissions(_org_id)` | SECURITY DEFINER | permission snapshot for current user in an org |
| `public.branches.organization_id` | FK | branch → organization link |

Existing SECURITY DEFINER helpers reused: `has_role`, `has_org_role`, `current_org`, `is_org_member`.

## Permissions model

Permission keys (initial seed):

```
org.manage · org.read
members.manage · members.read
branches.manage · branches.read
inventory.read · inventory.update
orders.read · orders.manage
prescriptions.read · prescriptions.review
patients.view · reports.export
subscriptions.manage
```

Resolution order inside `has_org_permission`:

1. Caller must be an `active` row in `organization_members` for `_org_id`.
2. `owner` / `admin` short-circuit to allow.
3. Otherwise the (role → permission) row in `role_permissions` decides.
4. Branch scope: when `_branch_id` is provided, the caller must also appear in `branch_user_assignments` for that branch (or hold `owner`/`admin`).

Application layer: `PermissionService.check(userId, permission, { orgId, branchId })` delegates to the RPC via `src/platform/permissions/adapters/orgPermissionAdapter.server.ts`. The legacy `hasRole` path is preserved for platform-wide admin gating.

## Branch architecture

- `public.branches` is organization-scoped (`organization_id NOT NULL`).
- `public.branch_user_assignments(branch_id, user_id, role)` controls staff placement.
- Server surface: `src/platform/branches/branches.functions.ts` — `listBranches`, `createBranch`, `updateBranch`, `assignUserToBranch`, `removeBranchAssignment`. Each writes calls `PermissionService.require(..., "branches.manage", { orgId })` first.
- Prepared for multi-branch pharmacy networks, warehouse locations, and doctor locations — no business data is moved yet.

## Events emitted (see `src/core/events/constants.ts`)

`USER_CREATED · USER_UPDATED · PROFILE_COMPLETED · ORGANIZATION_MEMBER_ADDED · ORGANIZATION_MEMBER_REMOVED · ROLE_CHANGED · BRANCH_CREATED · BRANCH_UPDATED · BRANCH_MEMBER_ASSIGNED · BRANCH_MEMBER_UNASSIGNED`

All identity events share the payload shape defined in `src/platform/identity/events.ts` (`IdentityEventPayload`): `org_id · actor_user_id · subject_user_id · branch_id · data`. Every event is also persisted to `organization_audit_events` via DB triggers so cross-tenant audit trails are non-forgeable from the app tier.

## Security verification

Executed against the live DB after migration:

- ✓ `has_org_permission` is `SECURITY DEFINER` with `search_path = public`, `has_anon = false`.
- ✓ `list_my_org_permissions` is `SECURITY DEFINER`, `has_anon = false`.
- ✓ `profiles`, `organization_subscriptions`, `permissions`, `role_permissions` all have `ENABLE ROW LEVEL SECURITY` on and explicit GRANTs (`authenticated`, `service_role`; no `anon`).
- ✓ `organization_members.role` cast to `org_role` succeeded with a `member → employee` mapping — no data loss (row count preserved).
- ✓ Cross-tenant probe: user in org A calling `has_org_permission` for org B returns `false`. Contract test asserts the same behaviour in `PermissionService.check`.
- ✓ Branch scope probe: passing a `branch_id` the caller is not assigned to returns `false` unless the caller holds `owner`/`admin`.
- ✓ `PermissionService.check` fails closed on RPC error and when `orgId` is omitted.

## Testing

- Typecheck: PASS.
- Unit tests: `PermissionService` (6 cases, incl. cross-tenant + fail-closed) and identity event catalog (3 cases). Existing Phase 2 suites remain green.
- Import-graph guard: PASS (no core → platform/module leaks; no client-reachable import of `client.server`).

## Migration notes

- Existing organization members with legacy `role = 'member'` are mapped to `employee`. Downstream consumers should treat these as equivalent for backwards compatibility.
- `TenantContext` continues to expose the legacy `OrganizationRole` union but the DB accepts the full `org_role` set — extend the union in a follow-up when UI surfaces the new roles.
- No business tables (inventory, orders, prescriptions, products) were touched. Cross-cutting `organization_id` backfill is scheduled for Phase 4.

## Files created / modified

- `src/platform/identity/{types.ts,events.ts,profile.functions.ts,ProfileContext.tsx,index.ts}`
- `src/platform/branches/{types.ts,branches.functions.ts,index.ts}`
- `src/platform/subscriptions/{types.ts,subscriptions.functions.ts,index.ts}`
- `src/platform/permissions/{PermissionService.ts,types.ts,adapters/orgPermissionAdapter.server.ts}`
- `src/platform/tenant-context/{queries.functions.ts,types.ts}` — role enum + `listMyOrgPermissions`, `assertOrgAccess`.
- `src/core/events/constants.ts` — identity event names.
- `src/__tests__/unit/platform/permissions/PermissionService.test.ts`
- `src/__tests__/unit/platform/identity/events.test.ts`
- Migration: `profiles`, `org_role`, `permissions`, `role_permissions`, `organization_subscriptions`, `has_org_permission`, `list_my_org_permissions`, audit + event triggers.

## Risks

- `organization_members.role` widened from text to enum — third-party writes bypassing PostgREST must use one of the enum values.
- New RLS policies on `profiles` are self-scoped (`auth.uid() = user_id`); admin overviews will need explicit `has_role('admin')` policies added in Phase 4.
- `has_org_permission` returns `false` on any RPC failure (fail-closed). Any observability regression in the RPC surfaces as silent access denial — watch `error_logs` for `has_org_permission` rows.
- Legacy `PERMISSION_ROLE_MAP` (in-memory) removed. Callers depending on unseeded permission keys must add rows to `role_permissions` before enforcement or the check returns `false`.

## Completion gate

Phase 3 is CLOSED. Do NOT start Phase 4 automatically. Awaiting explicit Phoenix Phase 4 directive.
