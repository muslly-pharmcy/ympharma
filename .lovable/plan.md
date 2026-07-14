
# Phoenix Phase 3 — Identity Foundation

Builds the org-aware identity layer on top of Phase 1 tenancy and Phase 2 platform. **No inventory/products/orders/prescriptions migration** — only identity, roles, permissions, branches, and subscription scaffolding.

## 1. Database migrations (single migration)

### 1.1 `public.profiles` (application profile layer)
Columns: `id uuid PK → auth.users(id) on delete cascade`, `display_name`, `avatar_url`, `phone`, `email`, `preferred_language text default 'ar'`, `notification_prefs jsonb default '{}'`, `status text default 'active'` (active/suspended/deleted), `profile_completed_at timestamptz`, `metadata jsonb`, timestamps.
- Trigger: auto-create profile row on `auth.users` insert.
- RLS: user reads/updates own; admins read all via `has_role`.
- GRANTs to `authenticated` + `service_role`.

### 1.2 Org-scoped role enum + rewrite `organization_members.role`
- New enum `public.org_role`: `owner, admin, manager, employee, pharmacist, doctor, supplier_user, insurance_user, customer`.
- Alter `organization_members.role` from `text` → `org_role` (map existing owner/admin/member; member → employee).
- Add `organization_members.branch_scope uuid[] default '{}'` for optional branch restriction.

### 1.3 `public.permissions` catalog + `public.role_permissions`
- `permissions(key text PK, resource text, action text, description text)` — seeded with `inventory.read/update`, `orders.manage`, `patients.view`, `reports.export`, `org.manage`, `members.manage`, `branches.manage`, etc.
- `role_permissions(role org_role, permission_key text, PRIMARY KEY(role, permission_key))` — seeded defaults per role.
- SECURITY DEFINER function `public.has_org_permission(_user_id uuid, _org_id uuid, _permission text, _branch_id uuid default null) returns boolean` — checks membership + role_permissions + optional branch scope.
- GRANT execute to `authenticated`; REVOKE from `anon`.

### 1.4 Attach branches to organizations
- Add `branches.organization_id uuid references organizations(id)` (nullable initially; backfill NULL — legacy single-tenant preserved).
- Add `branches.location jsonb` (lat/lng/city).
- Extend RLS: members can read branches of their org; managers can write.
- `branch_user_assignments`: add `assigned_by uuid`, `status text default 'active'`; RLS scoped via org membership of the branch.

### 1.5 `public.organization_subscriptions` (foundation only, no billing)
Columns: `organization_id PK`, `plan text default 'free'`, `features jsonb default '{}'`, `limits jsonb default '{}'` (e.g. `{max_branches, max_users}`), `usage jsonb default '{}'`, `trial_ends_at`, `current_period_end`, `status text default 'active'`, timestamps.
- Helper: `public.org_feature_enabled(_org_id, _feature text)`, `public.org_within_limit(_org_id, _limit text, _current bigint)`.

### 1.6 Audit / event emission
- `public.identity_audit_events(id, event_type, org_id, actor_user_id, subject_user_id, branch_id, payload jsonb, created_at)`.
- Triggers on `organization_members`, `branches`, `branch_user_assignments`, `profiles` role/status change → insert audit row **and** insert into `agent_events` with event names below (Phase 2 event bus consumes them).

All new tables: GRANT → `authenticated` (scoped SELECT) + `service_role`; RLS enabled; policies via `is_org_member` + `has_org_permission`.

## 2. Platform code

### 2.1 `src/platform/identity/` (new)
- `types.ts` — `UserProfile`, `OrgRole`, `PermissionKey`, `Subscription`.
- `profile.functions.ts` — `getMyProfile`, `updateMyProfile`, `completeProfile` (server fns w/ `requireSupabaseAuth`).
- `ProfileContext.tsx` — client React context, loads current profile, exposes `refresh`.
- `index.ts` barrel.

### 2.2 Extend `src/platform/permissions/`
- Replace static `PERMISSION_ROLE_MAP` with DB-backed `has_org_permission` RPC via `PermissionService.check(userId, permission, { orgId, branchId })`.
- Keep legacy `hasRole` adapter for backward compat.
- Add `useHasPermission(permission, opts)` React hook.
- New unit tests: role→permission mapping, org isolation, branch scope enforcement.

### 2.3 `src/platform/tenant-context/`
- `TenantContext` gains `currentBranch`, `switchBranch`, `permissions` snapshot (permission keys for current user in current org).
- `queries.functions.ts`: add `listOrgBranches`, `assertOrgAccess`, `listMyPermissions`.

### 2.4 `src/platform/branches/` (new)
- `types.ts`, `branches.functions.ts` (`listBranches`, `createBranch`, `updateBranch`, `assignUserToBranch`, `removeAssignment`).
- All server fns validate `has_org_permission(..., 'branches.manage')`.

### 2.5 `src/platform/subscriptions/` (new)
- `types.ts`, `subscriptions.functions.ts` (`getOrgSubscription`, `isFeatureEnabled`, `checkLimit`).
- `FeatureFlagService` extended with `orgFeatureProvider` reading from subscription.

### 2.6 Event catalog
Register in `src/core/events/constants.ts` and emit from server fns / DB triggers:
- `USER_CREATED`, `USER_UPDATED`
- `ORGANIZATION_MEMBER_ADDED`, `ORGANIZATION_MEMBER_REMOVED`
- `ROLE_CHANGED`
- `BRANCH_CREATED`, `BRANCH_UPDATED`, `BRANCH_MEMBER_ASSIGNED`, `BRANCH_MEMBER_UNASSIGNED`
- `PROFILE_COMPLETED`

Zod payload schemas in `src/platform/identity/events.ts`; documented in `docs/engineering/standards/EVENT-CATALOG.md`.

## 3. Tests

- `src/__tests__/unit/platform/permissions/PermissionService.test.ts` — mocks RPC, verifies allow/deny per role.
- `src/__tests__/unit/platform/identity/tenant-isolation.test.ts` — user in org A cannot resolve permission in org B.
- `src/__tests__/unit/platform/branches/branch-scope.test.ts` — user assigned to branch 1 denied on branch 2.
- `src/__tests__/unit/platform/subscriptions/limits.test.ts`.
- Typecheck + `bun run build` + import-graph guard pass.

## 4. Security verification

Run in report:
- Query `pg_policies` on new tables — every table has policies referencing `is_org_member` / `has_org_permission`.
- REVOKE EXECUTE on new SECURITY DEFINER fns from `anon`.
- Confirm cross-org query returns 0 rows via SQL probe.
- Confirm `organization_members` RLS unchanged for owners.

## 5. Documentation

`docs/engineering/reports/PHOENIX-P3-identity.md` — architecture diagram, tables/functions added, permissions matrix (role × permission grid), security verification output, migration notes, risks (branch backfill NULL, legacy `user_roles` still in use for platform admin).

Also update: `docs/engineering/standards/EVENT-CATALOG.md`, `docs/engineering/REGISTRY.yaml` (new features `IDENT-P3-001..005`), `docs/engineering/plans/phase-3.yaml`.

## Explicit non-goals
- No inventory / products / orders / prescriptions changes.
- No billing integration (subscriptions is schema + service only).
- No UI dashboards beyond what's needed to expose profile edit + org/branch switcher.
- Legacy `public.user_roles` (platform admin/owner) preserved; not removed.

## Completion gate
Stop after Phase 3. Return: files created, security probe results, permissions matrix, branch architecture summary, risks.
