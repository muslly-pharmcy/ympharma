
# MUSLLY AI OS — ZIP Merge Plan

The two uploaded ZIPs are **byte-identical**. Compared to `/dev-server`, the ZIP is an older snapshot of the same project plus a self-contained **Security Hardening layer** and a **SUN-GUARDIAN super-agent** module. The ZIP has **no destructive changes** — all deltas are either new files or minimal 1-line imports added to 4 existing files.

## What will be merged (additive)

### 1. New library modules (copy as-is)
```
src/lib/api/response.ts
src/lib/audit/secure-admin.ts
src/lib/integrations/{index,error-handler,sanitize-form,upload-validator}.ts
src/lib/observability/logger.server.ts
src/lib/sanitize/index.ts
src/lib/upload/validation.server.ts
src/lib/ai/safety/pii-filter.server.ts
src/lib/errors/api-error.ts
```

### 2. New super-agent module
```
src/super-agent/index.ts
src/super-agent/sun-guardian.agent.ts
src/super-agent/core/{constitution,ego-memory,inner-monologue,volition-engine}.ts
src/super-agent/__tests__/sun-guardian.test.ts
```

### 3. Two new migrations (create tables + RLS + grants)
- `20260726122748_audit_logs_production.sql` — `audit_logs` table
- `20260726130000_agent_memory.sql` — `agent_memory` table

Both need adjustment before applying: add `GRANT` statements (project rule requires GRANTs in same migration) and change `user_roles.role = 'admin'` check to use `public.has_role(auth.uid(), 'admin'::app_role)` per project convention.

### 4. Minor edits to 4 existing files
Each is a **single added import line** wiring the new modules:
- `src/lib/ai/runtime/safety-layer.server.ts` — import `redactPII, containsPII` from new pii-filter, apply in `preflight`
- `src/lib/errors/logger.ts` — import `apiErrorFromUnknown, isApiError`
- `src/lib/errors/supabase-sink.ts` — import `apiErrorFromUnknown, isApiError`
- `src/lib/security/public-endpoint-guard.server.ts` — import `requirePermission`, `redactSensitive`

### 5. Documentation
- Copy `SECURITY-HARDENING.md` to `docs/engineering/SECURITY-HARDENING.md`
- Copy 6 new test files to `tests/`

## What will NOT be merged
- `.git/` — never copy into project repo
- `.env`, `.wrangler/`, `.lovable/`, `bun.lock`, `package-lock.json` — keep current
- `ympharma-final-hardened.zip` (nested archive) — ignore
- Files identical to current — skipped automatically
- No files in the current project will be **deleted**; the ZIP is an older superset in the hardening area only

## Order of operations
1. Apply the two migrations (with GRANTs + `has_role` fix) via `supabase--migration`.
2. Copy new source directories (`src/lib/{api,audit,integrations,observability,sanitize,upload}`, `src/lib/ai/safety`, `src/lib/errors/api-error.ts`, `src/super-agent/`).
3. Apply the 4 single-line edits to existing files (verified as pure additions).
4. Copy new tests + `SECURITY-HARDENING.md`.
5. Run `bunx vitest run tests/{magic-number,permission-check,logger-redaction,pii-detection,sanitizer,api-error}.test.ts` + typecheck to confirm no regressions.

## Risks / notes
- The two ZIP migrations reference `user_roles` directly; I'll rewrite the SELECT policy to use `public.has_role(auth.uid(), 'admin')` and add the required `GRANT` block, otherwise they'd violate the project security rule and the memory index.
- `agent_memory` policy in the ZIP allows **any authenticated user** to read all agent memory. I'll tighten it to admin-only reads unless you say otherwise.
- No package.json changes are needed (dependencies already present).
- If anything in the ZIP conflicts silently after copy (e.g. duplicate exports), the typecheck step will catch it and I'll resolve in-place.

Approve to execute.
