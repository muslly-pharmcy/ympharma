
# MUSLLY AI OS — Consolidation Plan (adapted from Phases 27-35)

Scope: absorb the Phase 27-35 blueprint into the **existing** codebase without duplication. Three sequenced waves; each wave ships independently and passes typecheck before the next starts.

---

## Wave B — Unification (no new features)

Goal: eliminate the three parallel AI stacks so future work has one home.

Current duplication:
- `src/ai/` (SunEngine, EventBus, AgentRegistry, agents/*, memory/*, tools/*)
- `src/ai/sun-core/` (older duplicate of the same)
- `src/modules/ai-brain/` (SuperBrainSovereign — pure decision core)

Actions:
1. Declare **`src/ai/`** the canonical root. Deprecate `src/ai/sun-core/` by re-exporting from `src/ai/core/*` and marking the folder `@deprecated` in a README.
2. Keep `src/modules/ai-brain/SuperBrainSovereign` as a **pure specialty agent** (drug-safety + geo routing). Wrap it as `BrainAgent` under `src/ai/agents/brain-agent.ts` and register in `bootstrap.ts`. Delete no files — only add the adapter.
3. Publish `docs/engineering/reports/AI-UNIFICATION-MAP.md`: table mapping every existing agent/service to its canonical path, with call-site counts from `rg`.
4. Verify: `bunx tsgo` clean; `/admin-agent-universe` still lists all agents.

No DB migration. No new tables. No behavior change.

---

## Wave A — Gap-Fill (real missing pieces)

Goal: build only what genuinely does not exist. Reuse existing tables where possible.

### A1. AI Approval Workflow (wire the existing table)
- `agent_approval_requests` exists but is not enforced. Add `src/ai/core/approval-gate.ts`:
  - `requireApproval(agentName, action, payload)` → inserts row, returns pending id.
  - `executeIfApproved(id)` runs the deferred action.
- Retrofit **only** write-capable agents (Inventory purchase draft, Campaign dispatch) to route through the gate. Read/insights agents (CFO, BiSales) untouched.
- Admin UI: extend `/admin-agent-universe` with an "Approvals" tab (list pending, Approve/Reject buttons, calls a `createServerFn` gated by `has_role('admin')`).

### A2. Patient Consent Management (new, small)
- New table `patient_consents_v2` (the existing `patient_consents` is scoped to hc_patients self; the new one is provider-grant-based):
  - `patient_id`, `grantee_type` (doctor|pharmacy|hospital), `grantee_id`, `scopes jsonb`, `expires_at`, `revoked_at`.
- RLS: patient owns rows; grantee reads own via security-definer `has_consent(patient_id, grantee_id, scope)`.
- Server fns: `grantConsent`, `revokeConsent`, `listMyConsents`, `listGrantsForMe`.
- UI: tab in `/my-health` → "من يستطيع الوصول إلى بياناتي".

### A3. Digital Health Wallet (aggregation view, not new storage)
- No new storage — data already lives in `patient_medications`, `medical_vault_files`, `hc_appointments`, `prescription_extractions`, `insurance_claims`, `ins_patient_coverage`.
- Add `src/lib/health-wallet.functions.ts` with `getMyWallet()` returning a unified DTO.
- New route `/my-health/wallet` with tabs: ID card, Coverage, Medications, Vault, Appointments, Emergency Card.
- Emergency Card = printable/QR view backed by a **public** signed short-lived token (no auth), exposing only blood type / allergies / emergency contact (opt-in flag).

No touch to organizations, multi-tenant, Hospital OS, Marketplace, Digital Twin, Multi-language beyond what already exists.

---

## Wave C — Controlled AI Employees (highest risk, last)

Goal: promote 3 existing read-only agents to **draft-generating** employees. **Never** direct-execute; always through Wave A's approval gate.

Selected agents:
1. **InventoryAgent** → generates `purchase_recommendations` drafts (already has table). Approval gate required before draft becomes an order.
2. **CFOAgent** → generates weekly financial digest into `ai_business_insights` (already exists). No write outside that table.
3. **PharmacyAgent** (WhatsApp customer replies) → responses auto-send **only** when confidence ≥ 0.9 AND the target number is in `wa_allowlist`; otherwise queued for human review.

Guardrails (non-negotiable):
- Every autonomous write goes through `approval-gate.ts` OR is scoped to insight-only tables.
- All actions logged to `ai_security_audit` via existing `AuditAgent`.
- Kill switch: `app_settings` key `ai.autonomy.enabled` (default `false`); reading via `isFlagEnabled()` blocks execution when off.
- Admin panel `/admin-agent-universe` gains an "Autonomy" toggle + per-agent enable/disable.

Explicitly out of scope for this wave:
- AI CEO/Marketing/Sales "employees" that create campaigns or reply on social channels.
- Anything that spends money, sends SMS/email at scale, or writes to insurance/billing tables.

---

## Explicit Non-Goals (rejected from the blueprint)

Refused as either fictional, duplicative, or out of realistic scope:
- New `src/ai-brain/` folder (duplicates `src/ai/`).
- New tables `ai_agents`, `ai_memory`, `ai_events`, `ai_decisions`, `ai_knowledge_nodes/links` — **already exist**.
- Hospital OS, Global Marketplace, Digital Twin, Blockchain audit, Mobile Super App — these are products, not phases.
- Multi-tenant "Global" architecture — the `organizations` layer already ships; no rebuild.
- Voice Medical Assistant / Multi-language expansion beyond current AR/EN — no user demand signal.

---

## Sequencing & Gates

| Wave | Est. turns | Gate to next wave |
|---|---|---|
| B — Unify | 1-2 | Typecheck clean + unification map committed |
| A — Gap-Fill | 3-4 | Approval gate + consent + wallet routes live; RLS verified |
| C — Employees | 2-3 | Kill switch tested; audit rows appear; human approval loop demoed end-to-end |

Total: ~7 turns of real work vs ~40+ if the blueprint were executed literally.

---

## Technical notes

- All new server fns use `createServerFn` + `requireSupabaseAuth`; admin actions verify role via `context.supabase.rpc('has_role', ...)` before importing `supabaseAdmin`.
- All new tables get GRANTs in the same migration, RLS on, policies scoped to `auth.uid()`.
- No new AI providers — reuse Lovable AI Gateway (Gemini for embeddings/chat).
- No changes to `src/integrations/supabase/*` generated files.
