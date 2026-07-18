## Security Post-Hardening Audit — Read-Only Findings

Sources: Supabase linter (166 issues, all `warn`), security scan (166 findings, all `warn`), `pg_policies`, `pg_class` privilege checks, `rg` sweep of `src/routes/api/public/*`.

Overall posture: **no P0 unauthenticated privileged endpoints, no RLS-disabled public tables, no permissive-anon write policies except one intentional one.** Remaining risk is dominated by exposed `SECURITY DEFINER` functions and shared-key auth boundaries.

---

### P0 — Critical
None confirmed by this audit. All cron/hook endpoints under `src/routes/api/public/hooks/**` and `src/routes/api/public/ai/**` gate on `verifyCronSecret` / `requireCronAuth`. All 176 public tables have RLS enabled.

---

### P1 — High

| # | Finding | Location | Recommended next action |
|---|---|---|---|
| 1 | 4 `SECURITY DEFINER` functions in `public` are still callable by role `anon` (`SUPA_anon_security_definer_function_executable` × 4) | Supabase linter items 3–6; DB `public` schema | Identify the 4 functions; keep `EXECUTE TO anon` only for `search_medicines_public`, `pn_search_medicine_nearby`, `pn_get_pharmacy_public`, `pn_list_pharmacy_products`; revoke on any other match. |
| 2 | Two shared-secret auth helpers used inconsistently (`verifyCronSecret` for legacy hooks, `requireCronAuth` for AI/security/engagement) — divergence risk if one is deprecated | `src/lib/cron-auth.server.ts`, `src/middleware/cron-auth.ts` | Consolidate to one helper; confirm both perform constant-time compare and read the same env (`CRON_SECRET`). |
| 3 | Unauthenticated public POST endpoints accept writes with no rate limit visible: `analytics/ingest.ts`, `engagement/track.ts`, `contact.ts`, `doctor-join.ts`, `hooks/social-callback.ts` | those files under `src/routes/api/public/` | Add IP-based rate limit (pattern from `log-error.ts`) + Zod schema + max-body size; ensure inserts land only in write-restricted anon-INSERT policies. |

---

### P2 — Medium

| # | Finding | Location | Recommended next action |
|---|---|---|---|
| 4 | ~150 `SECURITY DEFINER` functions callable by role `authenticated` (`SUPA_authenticated_security_definer_function_executable`) | Supabase linter | Cross-check against `src/` RPC call sites (109 unique); revoke `EXECUTE TO authenticated` on any function only invoked by triggers, cron, or service_role. |
| 5 | 9 RLS policies use `USING/WITH CHECK true` — all currently scoped to `service_role` except `push_subscriptions.anyone can subscribe` (anon INSERT) | `pg_policies` result above | Add a `WITH CHECK` on `push_subscriptions` (validate `endpoint` format, cap payload size) or move ingest behind a signed server function. |
| 6 | Every `public` table has default `GRANT ... TO anon` for INSERT/UPDATE/DELETE — RLS is the sole barrier | database-wide (privilege check confirmed) | Adopt an explicit `REVOKE ALL FROM anon` + narrow re-grants baseline; add a migration lint rule enforcing GRANT-least-privilege on new tables. |
| 7 | Extension installed in `public` schema (`SUPA_extension_in_public`) | Supabase linter item 1 | Move extension to its own schema (`extensions`) when a maintenance window allows; low exploit value but blocks a future clean migration. |

---

### P3 — Low

| # | Finding | Location | Recommended next action |
|---|---|---|---|
| 8 | `whatsapp-webhook.ts` / `uptime-webhook.ts` do HMAC compare — verify they use `timingSafeEqual` on equal-length buffers only (already partially present) | `src/routes/api/public/whatsapp-webhook.ts`, `uptime-webhook.ts` | Add length guard before compare; confirm signature envelope covers the raw body, not the parsed JSON. |
| 9 | Health endpoints exposed publicly (`health.ts`, `monitoring/health.ts`) — potentially fingerprintable | those files | Trim response to `{ok:true}` for anon; gate detailed diagnostics behind `requireCronAuth`. |
| 10 | Secrets exposure risk — `test-alert.ts` returns `slack_url_prefix: url.slice(0,40)` | `src/routes/api/public/hooks/test-alert.ts` | Remove the prefix disclosure once WhatsApp/Slack delivery is verified; endpoint is cron-auth'd but the string still lands in logs. |

---

### Confirmed Clean
- RLS enabled on all 176 public tables.
- No `SECURITY DEFINER` function is missing `search_path` (previous hardening still holds).
- No anon `INSERT/UPDATE/DELETE` policy exists outside `push_subscriptions.anyone can subscribe`.
- Cron/webhook endpoints all import a verified auth helper (spot-checked 40 files).

---

### No Code Changes Requested
This is a read-only audit. To act on any finding, ask to switch to build mode and specify which items (e.g. "fix P1 #1 and P2 #5").
