# ⚠️ Reality Check — AI Copilot v17.0 Blueprint

Verified the blueprint against the live schema. Multiple assumptions are **fictional**:

| Blueprint assumes | Reality |
|---|---|
| `profiles` table (age, weight, pregnant, smoking…) | ❌ does not exist |
| `patient_allergies`, `patient_conditions`, `patient_medications` | ❌ none exist |
| `drug_interactions` table | ❌ does not exist |
| `agent_approval_requests.extracted_data`, `ai_confidence`, `customer_id` | ❌ real columns are `extracted_medicines` (jsonb), `missing_medicines` (text[]), `payload`, `user_phone` — no `customer_id` |
| Direct Gemini / Anthropic API keys (`GEMINI_API_KEY`, `ANTHROPIC_API_KEY`) | ❌ project standard is **Lovable AI Gateway** (`LOVABLE_API_KEY`, already set) |
| `@/core/observability/Logger` exports `logger` | ⚠ exports `Logger` class; need to verify shape |
| `@/components/dashboard/DashboardButton`, JSX in route file is corrupted (`useState>([])`, `

` blocks, empty `< />` tags) | ❌ JSX won't compile as-is |
| `AICopilotValidator` extends a `BaseValidator` that we deferred in last turn | ❌ not in repo |
| New tables created without `GRANT` statements | ❌ would 403 via PostgREST |

If I implement the blueprint verbatim it crashes at build time and at runtime. Pick one:

---

## Option A — Adapted AI Copilot (recommended)

Build the **real** functionality on top of the **real** schema, keeping the user-visible feature set (analyze prescription, chat with copilot, history, admin page, safety guardrails).

**Files (new):**
1. `src/lib/ai-clinical-copilot.functions.ts` — three server fns:
   - `analyzePrescriptionWithAI({ prescriptionId })` — reads `agent_approval_requests` (real columns), uses `LOVABLE_API_KEY` via `createLovableAiGatewayProvider` + `generateText` with `google/gemini-3-flash-preview`, writes back to `extracted_medicines` + a new `ai_analysis` jsonb column.
   - `chatWithAICopilot({ message, context, prescriptionId? })` — same gateway, optional prescription grounding from `extracted_medicines`.
   - `getAIAnalysisHistory({ limit })` — reads recent analyzed approval requests (admin-only via `has_role`).
   - `clearAICache()` — admin-only, clears in-memory TTL cache.
   - Built-in: in-memory cache (1 h), retry+timeout via existing `src/lib/retry.ts`, PII redaction via existing `src/core/ai-safety/PIIRedactor.ts`.
2. `src/lib/ai-safety.functions.ts` — thin `checkAISafety` server fn that delegates to the existing `src/core/ai-safety/AISafetyGuard.ts` (no duplicate regex logic).
3. `src/routes/_authenticated/admin-ai-copilot.tsx` — clean admin UI (analyze form, chat panel, history list) using existing shadcn `Button`/`Input`/`Card` — **not** the broken JSX from the blueprint. Routed under existing `_authenticated/` (flat dot path, no `admin/` subfolder).
4. Migration `add_ai_copilot_columns`:
   - `ALTER TABLE agent_approval_requests ADD COLUMN ai_analysis jsonb, ai_confidence numeric, ai_risk_score int, ai_analyzed_at timestamptz` (idempotent).
   - `CREATE TABLE ai_safety_logs (...)` + full `GRANT` block + RLS (admin read, service_role all).
   - No `drug_interactions` table for now (blueprint feature requires content nobody has loaded). Interaction checks fall back to LLM reasoning over the medication list.
   - No `patient_*` tables (no patient profile schema exists). Patient context is built from `whatsapp_conversations` / `prescription_extractions` instead, and gracefully degrades when missing.

**Explicitly dropped from blueprint:**
- `patient_*` table reads (no such schema).
- `drug_interactions` table read (no data source).
- `AICopilotValidator.ts` (deferred since the `BaseValidator` framework itself was rejected last turn).
- Direct Gemini / Anthropic clients.

---

## Option B — Schema-First

I first design proper `patient_profiles`, `patient_allergies`, `patient_conditions`, `patient_medications`, and `drug_interactions` tables (with seed data source you provide), THEN build the copilot against them. Larger scope, needs your input on where allergy/condition data comes from.

---

## Option C — Ship blueprint verbatim

I refuse — it will not build. Listed for completeness only.

---

**Which option?** (A is fastest and won't break anything; B if you want the full clinical-grade feature; C is a no-op.)
