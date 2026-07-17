
## Plan — Sovereign Engine Dashboard UI

Backend already exists and is real (adapted in the prior turn): `executeNeuralInference` server function + `ai_neural_synaptic_log` table. This slice adds **only** the UI, wired to the real server function — no fictional 800-tool grid, no direct static class call.

### What I'll build

1. **`src/modules/ai-brain/components/SovereignEngineDashboard.tsx`**
   - Same visual layout as the blueprint (RTL, gradient header, inputs on the left, decision matrix on the right).
   - Inputs: district (`عدن / صنعاء / تعز / المكلا / الحديدة`), free-text `userInput`, optional chronic-condition chips (`سكري / ضغط / حامل`) so the safety engine has real signal.
   - "إطلاق" button calls the real server fn via `useServerFn(executeNeuralInference)` — **not** the removed static `SuperBrainSovereign.executeNeuralInference`.
   - Renders `BrainDecisionMatrix`: safety badge, proposed action, alternative, logistic branch + distance/ETA, maternal marketing suggestion, dispatched-tools chips.
   - Error state (Arabic message) when the fn throws; loading spinner while pending.

2. **`src/routes/_authenticated/admin-ai-brain.tsx`**
   - Protected route (server fn requires auth) with head() title/description.
   - Renders `<SovereignEngineDashboard />`.

3. **Export** the component from `src/modules/ai-brain/index.ts`.

### Deliberately NOT doing
- No `generate800ToolsDirectory()` — that's fiction. If you want a tool catalog view, we surface the real `TOOL_REGISTRY` (8 curated tools) as a small side panel instead. **Say the word and I'll add it.**
- No direct `supabase.from('ai_neural_synaptic_log').insert` from the browser — the server fn already logs with the authenticated context (respects RLS + `user_id`).
- No changes to backend, migration, or types.

### Acceptance
- `tsgo` clean, `bun run build:dev` = 0.
- `check-imports.ts` passes (component imports only the server fn, no `client.server`).
- Route reachable at `/admin-ai-brain` for signed-in users; unauthenticated → redirected by the `_authenticated` gate.

Confirm and I'll build it. Want the 8-tool `TOOL_REGISTRY` side panel included?
