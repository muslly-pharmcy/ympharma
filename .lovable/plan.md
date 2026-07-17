
## Reality Check on Blueprint

Real schema vs blueprint diffs I'll adapt around:

1. **`ai_actions` is redundant.** `ai_decisions` already exists with `event_id`, `agent_name`, `decision_type`, `action jsonb`, `reasoning jsonb`, `confidence`, `created_at` — that's what the blueprint calls "AI actions". Adding a parallel table doubles writes for no gain. I'll **not** create `ai_actions`; feedback FKs `ai_decisions.id` instead.
2. **`sun_memory` (legacy, scope/subject/key/value) is unrelated.** The blueprint's `ai_memory` (short/long/experience/knowledge) is a new shape. Keep both; the legacy one stays owned by `src/ai/sun-core/` and is not extended.
3. **pgvector is not enabled.** Migration must `CREATE EXTENSION vector`.
4. **Blueprint vector dim = 1536 + ivfflat.** Lovable AI Gateway default is `google/gemini-embedding-001` @ 3072 dims (per the embeddings knowledge). To honor the 1536 column and get a direct hnsw index (2000-dim cap), I'll use **`openai/text-embedding-3-small`** (1536 dims) via the gateway — appropriate for "cost-sensitive text search" and avoids the halfvec cast dance. Documented in-code.
5. **`@/lib/supabase` doesn't exist.** Correct paths: `@/integrations/supabase/client` (browser), `client.server` (admin, inside handler), or `context.supabase` (auth-middleware).
6. **`setInterval`/module-scope background work is impossible on Cloudflare Workers.** All memory writes happen in-line inside the existing `sun-tick` handler and via admin-triggered server fns — no new daemons.
7. **Neural embedding calls cost credits.** Gated behind a server env flag `AI_NEURAL_ENABLE=1` (off by default), so the worker doesn't drain credits until the user turns it on.

## Adapted Plan (Phase 1.3 + Phase 2)

### Phase 1.3 — Decision & Memory Layer

**Migration 1 — memory + feedback tables**
- `public.ai_memory` — `agent_name text`, `memory_type text CHECK IN (short,long,experience,knowledge)`, `context jsonb`, `importance numeric default 0.5`, `expires_at timestamptz`, standard timestamps. GRANTs: `service_role` full; `authenticated` SELECT (admins-only via RLS `has_role(auth.uid(),'admin')`). RLS on. Index on `(agent_name, importance desc)` and partial index on non-null `expires_at`.
- `public.ai_feedback` — `decision_id uuid REFERENCES public.ai_decisions(id) ON DELETE CASCADE`, `rating numeric CHECK (rating BETWEEN -1 AND 1)`, `feedback jsonb`, `submitted_by uuid`, `created_at`. Same RLS pattern (admins read/insert).
- No `ai_actions` table — feedback rides directly on `ai_decisions`.

**Code**
- `src/ai/memory/memory-manager.server.ts` — server-only class. `remember(agent, type, context, importance)` and `recall(agent, {limit, minImportance})`. Uses `supabaseAdmin` (called only from server handlers).
- Hook memory into the worker: in `src/routes/api/public/ai/sun-tick.ts`, after each successful `ai_decisions.insert`, also call `memoryManager.remember(agentName, 'experience', {event_type, action_type, confidence, decision_id}, confidence)`. Failures logged, don't abort the tick.
- Enhance `src/ai/core/decision-engine.ts` — keep sync `evaluate` for the legacy path; add async `decideAndPersist(agent, event, result, sb)` that inserts to `ai_decisions` and returns the decision id (used by the worker; centralizes the pattern for future callers).
- `src/lib/ai-feedback.functions.ts` — `submitAiFeedback({decisionId, rating, note})` server fn with `requireSupabaseAuth`, verifies caller is `admin` or `pharmacist` via `has_role`, inserts feedback. Returns `{ ok, id }`.
- `src/lib/sun-memory.functions.ts` — `listAgentMemory({agent, limit})` admin-only server fn for dashboard.

**Dashboard**
- Extend `/admin-sun-core`: add "🧠 Experience Memory" panel (recent memories by agent) and thumbs-up/down buttons on each row in "Last Decisions" that call `submitAiFeedback`.

### Phase 2 — Neural (Vector) Memory Planet

**Migration 2 — pgvector + neural table**
- `CREATE EXTENSION IF NOT EXISTS vector` (in extensions schema, not public — Supabase best practice).
- `public.ai_neural_memory` — `owner_type text NOT NULL`, `owner_id uuid NULL`, `memory_category text NOT NULL`, `content text NOT NULL`, `metadata jsonb default '{}'`, `embedding extensions.vector(1536) NULL`, `importance numeric default 0.5`, `model_version text default 'openai/text-embedding-3-small'`, `created_at`. GRANTs same pattern; RLS admin-only.
- HNSW index directly on the column (1536 dims ≤ 2000): `USING hnsw (embedding vector_cosine_ops)`.
- SQL function `public.match_ai_neural_memory(query_embedding vector(1536), match_count int, filter_owner_type text DEFAULT NULL)` — cosine similarity, optional owner_type filter, SECURITY INVOKER, `SET search_path = public, extensions`, `REVOKE PUBLIC` / `GRANT authenticated`.

**Code**
- `src/lib/ai-embeddings.server.ts` — thin helper `embedText(text): Promise<number[]>` calling `POST https://ai.gateway.lovable.dev/v1/embeddings` with `openai/text-embedding-3-small` and `Lovable-API-Key: process.env.LOVABLE_API_KEY`. Reads env inside the function. Throws typed errors on 402/429/5xx. Batches ≤ 100 items when array input is passed.
- `src/ai/memory/neural-memory.server.ts` — `NeuralMemory.store({owner_type, owner_id?, category, content, metadata?})` embeds `content` and inserts via `supabaseAdmin`. `NeuralMemory.search(queryText, {limit, ownerType?})` embeds the query and calls `match_ai_neural_memory`.
- `src/lib/ai-neural.functions.ts` — `neuralSearch({query, limit, ownerType})` admin-only server fn wrapping the search.
- Worker integration (opt-in): in `sun-tick.ts`, if `process.env.AI_NEURAL_ENABLE === '1'`, after each decision write, best-effort `NeuralMemory.store({owner_type: 'agent', owner_id: null, category: 'decision', content: <human-readable summary>, metadata: {agent, event_id, decision_id, confidence}})`. Wrapped in try/catch — never blocks the tick.

**Dashboard**
- Add "🧠 Neural Search" panel to `/admin-sun-core` with a search box and top-k result list (content, similarity %, owner_type badge). Shows a hint when `AI_NEURAL_ENABLE` isn't set (informational, checked via a small server fn that reports the flag).

### Files touched
- Migrations: `xxxx_ai_memory_layer.sql`, `xxxx_neural_memory.sql`.
- Create: `src/ai/memory/memory-manager.server.ts`, `src/ai/memory/neural-memory.server.ts`, `src/lib/ai-embeddings.server.ts`, `src/lib/ai-feedback.functions.ts`, `src/lib/sun-memory.functions.ts`, `src/lib/ai-neural.functions.ts`.
- Edit: `src/ai/core/decision-engine.ts` (add async persistence helper), `src/routes/api/public/ai/sun-tick.ts` (call memory + optional neural writes), `src/routes/_authenticated/admin-sun-core.tsx` (Memory panel, feedback buttons, Neural Search panel).

### Out of scope (Phase 3)
Agent Universe (Inventory / Sales / WhatsApp / Security agents), tool-calling, RLS-scoped agent tools — user marked these as Phase 3.

### Notes
- No secrets asked of the user. `LOVABLE_API_KEY` is auto-provisioned. `AI_NEURAL_ENABLE` is an optional server env you toggle later when ready to burn embedding credits.
- Feedback rating uses -1..+1 (thumbs-down = -1, thumbs-up = +1, neutral = 0) — matches common RLHF conventions and stays open for later scoring math.
- All new tables are admin-only. No `anon` grants.

Confirm and I'll execute.
