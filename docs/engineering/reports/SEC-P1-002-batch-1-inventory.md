# SEC-P1-002 / Batch 1 — Server-Only Import Leak Inventory

**Feature:** SEC-P1-002 — Server-only import leak audit  
**Batch:** 1 (inventory only, no code changes)  
**Generated:** 2026-06-28  
**Engineer:** Lovable (under EES v1.0)

---

## 1. Method

1. Enumerated every `*.server.ts` / `*.server.tsx` module in `src/`.
2. Grepped every other `.ts` / `.tsx` file in `src/` for top-level
   `import … from "…server"` statements.
3. Filtered to files that are **client-reachable** — i.e. imported (even
   transitively) from `src/routes/**`, `src/components/**`, `src/hooks/**`,
   or any other `.functions.ts` module. TanStack only strips the body of
   `createServerFn().handler(...)`; everything else in a `.functions.ts`
   file ships to the client bundle.
4. Excluded server routes (`src/routes/api/public/**`) and test files
   (`src/**/__tests__/**`) — these never enter the client graph.

Result: **8 offending top-level imports** across 8 files. All point at
`src/lib/ai-gateway.server.ts` or `src/lib/config.server.ts`. No other
`.server.ts` modules are leaking.

## 2. Findings

| # | Importer (client-reachable) | Server-only target | Severity | Proposed remediation |
|---|----------------------------|--------------------|----------|----------------------|
| 1 | `src/lib/ai-assistant.functions.ts:6` | `./ai-gateway.server` (`createLovableAiGatewayProvider`) | **HIGH** | `dynamic-import-in-handler` — move `await import("./ai-gateway.server")` inside each `.handler()` body. |
| 2 | `src/lib/ai-clinical-copilot.functions.ts:9` | `@/lib/ai-gateway.server` | **HIGH** | `dynamic-import-in-handler` |
| 3 | `src/lib/api/example.functions.ts:4` | `../config.server` (`getServerConfig`) | **MEDIUM** | `dynamic-import-in-handler` (file is an example; verify still in use or delete in a separate batch). |
| 4 | `src/lib/pharmacy-intel.functions.ts:5` | `./ai-gateway.server` | **HIGH** | `dynamic-import-in-handler` |
| 5 | `src/lib/pharmacy-copilot.functions.ts:5` | `./ai-gateway.server` | **HIGH** | `dynamic-import-in-handler` |
| 6 | `src/lib/products-admin.functions.ts:5` | `@/lib/ai-gateway.server` | **HIGH** | `dynamic-import-in-handler` |
| 7 | `src/lib/vitamin-info.functions.ts:4` | `./ai-gateway.server` | **HIGH** | `dynamic-import-in-handler` |
| 8 | `src/lib/sentiment.functions.ts:10` | `@/lib/ai-gateway.server` | **HIGH** | `dynamic-import-in-handler` |

### Severity rubric

- **HIGH** — `*.server.ts` target reads server secrets (`LOVABLE_API_KEY`,
  service-role config) at module scope. A leak ships the secret-reading
  code path (not the secret itself, but the surrounding logic, request
  URLs, and the import-graph fingerprint) into the client bundle, and
  causes runtime "process is not defined" errors if the client touches
  the export.
- **MEDIUM** — server-only helper without direct secret reads; still
  inflates the client bundle and breaks the import-graph contract.

## 3. What is NOT a leak (verified clean)

- All `src/routes/api/public/**` files — these are server routes; their
  module graph is server-only.
- All other `*.server.ts` modules listed in the appendix below are
  imported **only** from `*.server.ts` siblings or from server-route
  files. None reach the client.
- `src/integrations/supabase/client.server.ts` is **not** imported at
  the top level of any client-reachable file. ✅

## 4. Recommended remediation pattern

For every HIGH/MEDIUM finding, replace:

```ts
// top of file
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

export const askFoo = createServerFn(...).handler(async ({ data }) => {
  const provider = createLovableAiGatewayProvider();
  // ...
});
```

with:

```ts
// no top-level import of *.server

export const askFoo = createServerFn(...).handler(async ({ data }) => {
  const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
  const provider = createLovableAiGatewayProvider();
  // ...
});
```

Type-only imports stay at the top (`import type { ... }`) — they erase
at compile time and do not enter the runtime graph.

## 5. Appendix — full `*.server.ts` inventory (28 modules, all currently clean except via the 8 leaks above)

```
src/integrations/supabase/client.server.ts
src/lib/agent-workers.server.ts
src/lib/agent/content.generator.server.ts
src/lib/agent/context.provider.server.ts
src/lib/agent/decision.engine.server.ts
src/lib/agent/feature-flags.server.ts
src/lib/agent/feedback.analyzer.server.ts
src/lib/agent/feedback.collector.server.ts
src/lib/agent/telemetry.cleanup.server.ts
src/lib/agent/variant.ranker.server.ts
src/lib/ai-gateway.server.ts            ← target of 7 leaks
src/lib/alert-dispatch.server.ts
src/lib/cache.server.ts
src/lib/config.server.ts                ← target of 1 leak
src/lib/cron-auth.server.ts
src/lib/deepseek.server.ts
src/lib/health-check.server.ts
src/lib/idempotency.server.ts
src/lib/marketing-cron.server.ts
src/lib/n8n-callback-auth.server.ts
src/lib/notifications.server.ts
src/lib/prescription-extractor.server.ts
src/lib/prescription-intelligence.server.ts
src/lib/social-content.server.ts
src/lib/social-publisher.server.ts
src/lib/whatsapp-ai-agent.server.ts
src/lib/whatsapp/di.server.ts
src/lib/whatsapp/infrastructure/SupabaseProductRepository.server.ts
```

## 6. Out-of-scope items observed but NOT fixed

- `src/lib/api/example.functions.ts` appears to be a scaffold/example —
  recommend verifying call sites and deleting in a future batch if
  unused. Out of scope for SEC-P1-002.
- A long-term guard (custom ESLint rule or build-time check) to prevent
  regressions belongs in a separate feature (suggest `SEC-P1-004 —
  Import-graph CI guard`).

## 7. Acceptance criteria check (per plan)

- ✅ Every `*.functions.ts` file in `src/` has been grep-checked for
  top-level `*.server` imports (search ran across full `src/` tree;
  results in §2).
- ✅ Each finding has a proposed remediation (column 5 of §2).
- ✅ No code edits in this batch.

---

**Awaiting ITRB verdict (PASS / REVISE / REJECT).**  
On PASS, ITRB should update `PROJECT_STATE.yaml` to
`current: { feature: SEC-P1-002, batch: 2, action: EXECUTE }` and the
engineer will apply the 8 fixes listed in §2.
