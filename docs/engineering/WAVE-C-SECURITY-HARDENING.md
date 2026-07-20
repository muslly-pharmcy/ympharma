# Wave C — Enterprise Security Hardening

## Phase 1 — Shipped ✅

### 1. Security Headers (all responses)
Applied via `securityHeadersMiddleware` in `src/lib/security/headers.server.ts`,
registered globally in `src/start.ts` as `requestMiddleware`.

| Header | Value | Notes |
|---|---|---|
| `Content-Security-Policy-Report-Only` | Full directive set | **Report-Only** — does not block anything yet. Collect violations from browser DevTools → Console before switching to enforce. |
| `X-Content-Type-Options` | `nosniff` | |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | |
| `X-Frame-Options` | `DENY` | Clickjacking protection. |
| `Permissions-Policy` | Locked: no camera/mic/USB/etc. `geolocation=(self)`, `payment=(self)`. | |
| `Cross-Origin-Opener-Policy` | `same-origin` | |
| `Cross-Origin-Resource-Policy` | `same-origin` | |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | |

CSP directives (Report-Only baseline):
- `default-src 'self'`
- `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`
- `img-src` allows Supabase storage + https/data/blob
- `connect-src` allows Supabase REST + realtime WS
- `style-src` / `script-src` include `'unsafe-inline'` for SSR hydration and Tailwind — tightened to nonces in Phase 1.5

### 2. Cookies / Session review
- Supabase session is stored in `localStorage` (SPA pattern) — no server cookie surface today.
- No custom app cookies set from server code. No cookie hardening gap.
- Auth session lifecycle handled by `@supabase/supabase-js` (`autoRefreshToken: true`).

### 3. Secret leakage audit
- `LOVABLE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — read only inside server-fn `.handler()` bodies (verified in `src/lib/ai/*.server.ts`, `src/integrations/supabase/client.server.ts`).
- All `import.meta.env.VITE_*` reads are the publishable keys only.
- No secrets logged (`grep -R "SERVICE_ROLE\|LOVABLE_API_KEY" src/` returns only defined reads inside handlers).

## Phase 1.5 — Next (CSP nonce migration)
Move away from `'unsafe-inline'` for `script-src` by generating a per-request nonce
in the middleware, injecting it into `<Scripts nonce={...}>`, and switching CSP
to `script-src 'self' 'nonce-<value>'`. Keep Report-Only until the app renders
cleanly with the nonce policy.

## Phase 2 — AI Security (audit checklist, not code)
Verify against Wave I-Zero implementation:
- ModelRouter — enforced tier caps: `src/lib/ai/runtime/model-router.ts`
- Prompt-Injection filter — `SUSPECT` regex list in `safety-layer.server.ts` (expand to full list: role-swap, tool-hijack, exfiltration)
- Tool permission — `capability-registry` gate `can_call_tools`, per-tool policy via `tool-registry`
- Agent isolation — Kernel is single orchestrator; no agent→agent direct paths
- Budget — `budget-engine` enforced pre-flight + settled post-flight
- Human Approval — `PolicyRule.require: ['human_approval']` supported; no queue UI yet (gap)
- Decision Records — `air_kernel_calls`, `air_runs`, `air_evaluations` immutable inserts

**Known gaps to fix in a later shipment:** Approval queue UI + admin action to release/deny; expanded prompt-injection corpus; per-org tool allowlist override.

## Phase 3 — Database security posture
Recent hardening (already shipped):
- `hc_doctors`/`pn_pharmacies` self-verify blocked via triggers
- `reviews` self-approve blocked
- `organization_members` self-insert blocked
- 156 SECURITY DEFINER functions locked with `search_path=public` + revoked `EXECUTE` from `PUBLIC`
- 43 privileged functions revoked from `anon`

**Standing rules for future migrations** (already in constitution):
- Every new `public.*` table → GRANT block + RLS enable + policies in the same migration
- Tenant isolation: all mutation policies must scope by `organization_id` (use `has_role` for admin bypass)
- No `USING (true)` policies in `public` schema

## Phase 4 — API security
- Rate limiting: backend has no primitive yet (documented). Ad-hoc IP-hash cooldowns on high-risk public endpoints already shipped (`public-endpoint-guard.server.ts`).
- Payload limits: enforced on `doctor-join`, `contact`, `social-callback`
- Validation: Zod at every `createServerFn().inputValidator()` boundary (verified across `src/lib/*.functions.ts`)
- Idempotency: `idempotency-keys` table + `idempotency.server.ts` — applied to dispensing, purchasing, insurance claim submission
- Replay protection: webhook endpoints use HMAC via `cron-auth.ts` (34 routes migrated)
- Error sanitization: `classifyError` returns UI-safe copy; raw provider errors never surfaced

## Wave C.5 — Enterprise Penetration Audit (report-only, no code)
Deferred to next shipment. Will cover OWASP Top 10 + AI-specific abuse
(prompt injection corpus, tool abuse, agent escape, secret leakage,
supply-chain via `bun.lock` audit, tenant isolation red-team).

## Files changed
- `src/lib/security/headers.server.ts` — NEW
- `src/start.ts` — registered `requestMiddleware`
- `docs/engineering/WAVE-C-SECURITY-HARDENING.md` — NEW (this file)

## Verification checklist
- [ ] After next deploy, open DevTools → Network → any request → check response headers include `Content-Security-Policy-Report-Only`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`.
- [ ] Open DevTools → Console; navigate the app 5 min; capture any `[Report Only] Refused to load ...` lines → add source to CSP allowlist.
- [ ] Confirm existing flows (auth, catalog, dispense, campaigns) render without regression — Report-Only cannot break them, but this validates no other middleware side-effect.
- [ ] After 1 week of clean reports, switch header name to `Content-Security-Policy` (enforce mode).

## Regression risk
- **Zero enforced changes.** CSP is Report-Only; other headers are additive and
  match modern browser expectations. `X-Frame-Options: DENY` is the only
  behavioral change — the app is not intended to be embedded in third-party
  iframes, so this is safe.
