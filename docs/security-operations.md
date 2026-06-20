# Security Operations Runbook

_Last updated: 2026-06-20 — covers Batches 6 / 7 / 8 hardening._

This runbook explains the three security primitives added during the
production-readiness program: **AdminGate**, **consume_rate_limit**, and
**Sentry**. It is written for operators (not end users); keep it next to the
disaster-recovery plan.

---

## 1 · AdminGate — server-checked admin authorization

### What it does
Every `/admin-*` route in the app is wrapped with `<AdminGate>` (see
`src/components/admin/AdminGate.tsx`). On render, `AdminGate` calls a
TanStack server function (`assertCallerIsAdmin`) protected by
`requireSupabaseAuth`, which invokes the `has_role()` RPC twice — once for
`owner`, once for `admin`. Non-admins are redirected to `/auth`.

### Why it exists
The client-side session check still leaks the route bundle to anonymous
visitors. The server-fn round-trip ensures no admin data is ever returned
to a non-admin caller, even if the route mounts.

### Operating the gate

| Task | How |
| ---- | --- |
| **Wrap a new admin route** | In the new `src/routes/admin-xyz.tsx`, import `AdminGate` and set `component: () => (<AdminGate><Page /></AdminGate>)` |
| **Grant a user admin/owner** | `INSERT INTO public.user_roles(user_id, role) VALUES ('<uuid>', 'admin');` via migration |
| **Revoke admin** | `DELETE FROM public.user_roles WHERE user_id = '<uuid>' AND role = 'admin';` via migration |
| **Audit who currently has admin/owner** | `SELECT u.email, r.role FROM auth.users u JOIN public.user_roles r ON r.user_id = u.id WHERE r.role IN ('admin','owner');` |
| **Verify gate locally** | Sign in as a non-admin, open any `/admin-*` URL → page should redirect to `/auth` within ~300 ms |

### Failure modes
- **Page shows "جارٍ التحقق من الصلاحيات…" indefinitely** → `attachSupabaseAuth` is missing from `src/start.ts` (the bearer token never reaches the server fn).
- **Admin user gets redirected to `/auth`** → check `user_roles` has the row for their `user_id`; the `has_role` RPC is `SECURITY DEFINER` and uses the `_user_id` arg, not `auth.uid()`.

---

## 2 · consume_rate_limit — backend rate-limit primitive

### What it does
A SECURITY-DEFINER Postgres function with the signature

```sql
public.consume_rate_limit(_key text, _max integer, _window_seconds integer) RETURNS boolean
```

It maintains a sliding-window counter in the internal `rate_limit_buckets`
table (no `anon`/`authenticated` grants — only `service_role`). It returns
`true` if the call is allowed, `false` once the limit is exceeded within the
window. After `window_seconds` the counter resets automatically on the next
call.

### Where it's wired today

| Caller | Key shape | Limit |
| ------ | --------- | ----- |
| `place_order` RPC | `place_order:phone:<phone>` | 5 calls / 60 s |
| `/api/public/log-error` | _per-isolate in-memory token bucket_ (separate path, see route file) | 5 / 60 s per IP |

> **Note on transaction semantics:** Because Postgres functions execute in
> a single transaction, the increment is rolled back if the calling RPC
> later raises an exception. In practice this means **only successful
> `place_order` calls count toward the limit** — the desired behaviour for
> abuse prevention (spammers post real successful orders).

### Adding a new rate-limit gate

Inside any SECURITY DEFINER function (or trigger):

```sql
DECLARE v_ok boolean;
BEGIN
  v_ok := public.consume_rate_limit('myfeature:user:' || _uid::text, 30, 60);
  IF NOT v_ok THEN RAISE EXCEPTION 'rate_limited'; END IF;
  ...
END;
```

The function returns `EXECUTE` permission to `service_role` only. Public
RPCs that call it inherit the privileges via SECURITY DEFINER.

### Operating

| Task | How |
| ---- | --- |
| **See who's currently throttled** | `/admin-event-bus` → bottom section "Throttling — آخر طلبات محظورة" (admin/owner only) |
| **Inspect raw counters** | `SELECT * FROM public.rate_limit_buckets WHERE updated_at > now() - interval '5 minutes' ORDER BY count DESC;` |
| **Reset a counter (after legitimate burst)** | Add a one-shot migration: `DELETE FROM public.rate_limit_buckets WHERE key = 'place_order:phone:+9677…';` |
| **Tune the limit** | Update the constant inside the calling function (e.g. `place_order`) and re-deploy via migration |

### Failure modes
- **Function returns `false` after a single call** → row exists with `count >= max` and `window_start` newer than `now() - window_seconds`. Verify the time math against `now()`; legitimate cause is a previous burst.
- **Counter never resets** → the function uses `make_interval(secs => _window_seconds)`; check `window_seconds` is being passed as an integer, not a string.

---

## 3 · Sentry — opt-in error and performance monitoring

### What it does
`src/lib/sentry.ts` initialises `@sentry/react` once on the client when
`VITE_SENTRY_DSN` is set; otherwise it is a no-op. The root error boundary
(`src/routes/__root.tsx`) forwards every caught error to
`captureClientError(error, { boundary: ... })`.

### Configuration

1. Create a Sentry project (or pick an existing one) and copy its DSN.
2. Store it as a Lovable build secret named `VITE_SENTRY_DSN` — the
   `VITE_` prefix makes it available to the client bundle, which Sentry
   requires.
3. Trigger a new build/deploy. No code change is needed.

The DSN is a **public** identifier; it is meant to be embedded in client
bundles and ingest endpoints are designed for hostile environments.

### Verification

After deploy, open the published site and run in the browser console:

```js
throw new Error("sentry_smoke_test")
```

The error appears in Sentry within ~30 s.

To verify locally without a real DSN you can hardcode any string for one
session and watch the network panel:

```js
import.meta.env.VITE_SENTRY_DSN
// → "https://abcdef@o1.ingest.sentry.io/123"
```

### Operating

| Task | How |
| ---- | --- |
| **Disable Sentry temporarily** | Delete the `VITE_SENTRY_DSN` secret and redeploy — `initSentry()` becomes a no-op |
| **Attach correlation_id to events** | Call `setCorrelationId(orderId)` from `src/lib/sentry.ts` after the user completes an order; every subsequent event carries the tag |
| **Tune sample rates** | Edit `src/lib/sentry.ts` (`tracesSampleRate`, `replaysOnErrorSampleRate`) |
| **Verify a release** | Trigger a deliberate error; ensure the event lands under the new release tag in Sentry |

### Failure modes
- **Build succeeds but no events arrive** → `VITE_SENTRY_DSN` was set as a runtime-only (non-`VITE_`) secret. Rename to `VITE_SENTRY_DSN` and redeploy.
- **`Sentry is not defined` console errors** → `@sentry/react` not installed; run `bun add @sentry/react`.
- **Builds fail after enabling** → `initSentry()` is wrapped in `try/catch` and the dependency is optional; if the build itself fails, the package install was incomplete. Re-run install.

---

## Audit trail

All three primitives have audit-friendly properties:

| Primitive | Auditable signal |
| --------- | ---------------- |
| AdminGate | Every `assertCallerIsAdmin` call goes through the server fn middleware, visible in `server-function-logs` |
| consume_rate_limit | `rate_limit_buckets` rows persist with `updated_at`; the `/admin-event-bus` Throttling panel surfaces the latest |
| Sentry | Each captured exception carries the `correlation_id` tag set via `setCorrelationId`, so an incident in Sentry can be linked back to the order/event lifecycle in the database |
