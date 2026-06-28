# SEC-P1-002 / Batch 2 — Server-Only Import Leak Fixes

**Feature:** SEC-P1-002 — Server-only import leak audit
**Batch:** 2 (apply `dynamic-import-in-handler` remediation)
**Generated:** 2026-06-28
**Engineer:** Lovable (under EES v1.0)

---

## 1. Files changed (exactly the 8 from Batch 1)

```
src/lib/ai-assistant.functions.ts
src/lib/ai-clinical-copilot.functions.ts
src/lib/api/example.functions.ts
src/lib/pharmacy-intel.functions.ts
src/lib/pharmacy-copilot.functions.ts
src/lib/products-admin.functions.ts
src/lib/vitamin-info.functions.ts
src/lib/sentiment.functions.ts
```

No other files were modified.

## 2. Remediation pattern (applied uniformly)

**Before** — top-level import ships the `*.server` module into the client bundle:

```ts
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

export const fn = createServerFn(...).handler(async ({ data }) => {
  const gateway = createLovableAiGatewayProvider(key);
  ...
});
```

**After** — dynamic import keeps the `*.server` module out of the client graph:

```ts
// no top-level *.server import

export const fn = createServerFn(...).handler(async ({ data }) => {
  const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
  const gateway = createLovableAiGatewayProvider(key);
  ...
});
```

## 3. Per-file change summary

| # | File | Static import removed | Handlers updated |
|---|------|-----------------------|------------------|
| 1 | `src/lib/ai-assistant.functions.ts` | `./ai-gateway.server` | `askAssistant` |
| 2 | `src/lib/ai-clinical-copilot.functions.ts` | `@/lib/ai-gateway.server` | `analyzePrescriptionWithAI`, `chatWithAICopilot` |
| 3 | `src/lib/api/example.functions.ts` | `../config.server` | `getGreeting` |
| 4 | `src/lib/pharmacy-intel.functions.ts` | `./ai-gateway.server` | `runAiClassifierBatch` |
| 5 | `src/lib/pharmacy-copilot.functions.ts` | `./ai-gateway.server` | `askExecutiveCopilot` |
| 6 | `src/lib/products-admin.functions.ts` | `@/lib/ai-gateway.server` | `importFromAI` |
| 7 | `src/lib/vitamin-info.functions.ts` | `./ai-gateway.server` | `getVitaminInfo` |
| 8 | `src/lib/sentiment.functions.ts` | `@/lib/ai-gateway.server` | `analyzeSentiment` |

## 4. Verification

### 4.1 Static check — zero top-level `*.server` imports remain in client-reachable files

Command:

```
rg -n "from \".*ai-gateway.server\"|from \".*config.server\"" \
  src/lib/ src/routes/ src/components/ src/hooks/ \
  | grep -v "\.server\.ts:"
```

Result (single match, **out of scope** — server-only route file under `api/public/hooks/`, never enters the client graph):

```
src/routes/api/public/hooks/weekly-ai-enrich.ts:3:import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
```

All 8 `.functions.ts` files in scope are clean. ✅

### 4.2 `bunx tsgo --noEmit`

Exit code: `0` (no output). ✅

### 4.3 `bun run build`

Exit code: `0`. Tail:

```
✓ built in 1.84s
[nitro] ℹ Using auto generated worker name: tanstack-start-ts
ℹ Generated dist/server/wrangler.json
ℹ Generated .wrangler/deploy/config.json
ℹ Generated dist/client/_headers
ℹ Generated dist/nitro.json
[nitro] ✔ You can preview this build using npx vite preview
[nitro] ✔ You can deploy this build using npx nitro deploy --prebuilt
```

✅

### 4.4 Smoke test — `/admin-ai-copilot` and `/ai-assistant`

The route files (`src/routes/_authenticated/admin-ai-copilot.tsx` and
`src/routes/ai-assistant.tsx`) were **not** modified in this batch. The
server functions they call (`analyzePrescriptionWithAI`, `chatWithAICopilot`,
`askAssistant`) retain identical signatures, identical input validators, and
identical return shapes — only the location of the gateway-provider import
moved from module scope into the handler body.

Manual click-through requires an authenticated admin session and is the
ITRB's responsibility to confirm in the live preview. ⏳

## 5. Acceptance criteria check (from `phase-1.yaml` SEC-P1-002 / Batch 2)

| # | Criterion | Result |
|---|-----------|--------|
| 1 | Zero top-level `*.server` imports remain in the 8 files above. | ✅ Confirmed via §4.1 |
| 2 | `tsgo --noEmit` passes. | ✅ §4.2 |
| 3 | `bun run build` passes. | ✅ §4.3 |
| 4 | Smoke test of `/admin-ai-copilot` and `/ai-assistant` still works. | ⏳ Manual ITRB step (§4.4) |

## 6. Out-of-scope items observed but NOT fixed

- `src/routes/api/public/hooks/weekly-ai-enrich.ts` keeps its top-level
  `ai-gateway.server` import. This is a server route file; its module
  graph is server-only and the inventory explicitly excluded it. Not a
  leak.
- `src/lib/api/example.functions.ts` is scaffold code. Deletion remains
  out of scope for SEC-P1-002 (recommended for a future cleanup batch).
- A long-term ESLint / build-time guard rule to prevent regressions
  remains recommended as future feature `SEC-P1-004`.

---

**Awaiting ITRB verdict (PASS / REVISE / REJECT).**
