## Phase 11 — Patient Operating System (adapted, realistic scope)

Phases 11–20 in the blueprint span months of work and duplicate a lot of what's already shipped (`hc_patients`, `hc_appointments`, `hc_doctors`, `insurance_claims`, `ins_companies`, `ins_patient_coverage`, `medical_entities`, `ai_agents`, `ai_events`, `sun_decisions`, `ai_learning_feedback`-equivalent tables, `provider_ranking_scores`, `telemedicine_sessions`, etc.).

I will NOT re-create parallel tables (`patients`, `medical_records`, `patient_medications`, `insurance_providers`, `insurance_claims` a second time). I'll extend what exists and ship Phase 11 end-to-end first. Later phases will be proposed after 11 lands.

### Scope for this turn (Phase 11 only)

**Database (single migration, reusing existing tables):**
1. `patient_medications` — links `hc_patients` → `medical_entities` (medicine), with dosage/frequency/start/end/active. RLS: patient reads own; doctor reads via existing appointment/consent relationship.
2. `medical_vault_files` — `patient_id`, `file_type`, `storage_path`, `mime`, `size_bytes`, `uploaded_by`, `encryption_status`. Storage bucket `medical-vault` (private).
3. `family_health_accounts` — `owner_patient_id`, `member_patient_id`, `relationship`, `access_level` (`read` | `manage`), `active`.
4. `patient_health_events` — unified timeline row (`patient_id`, `event_type`, `event_date`, `source_table`, `source_id`, `summary`, `payload jsonb`). Populated by triggers on `hc_appointments`, `prescription_orders`, `insurance_claims`, `patient_medications`, `medical_vault_files`.
5. `patient_consents` — `patient_id`, `granted_to_type`, `granted_to_id`, `scope jsonb`, `expires_at`, `active`. Used by future data-exchange phase; already needed for family access checks.

All tables get: GRANTs (authenticated + service_role), RLS enabled, policies scoped to `auth.uid()` via `hc_patients.user_id`, `updated_at` trigger.

**Code:**
- `src/modules/patient-os/medications/medications.functions.ts` — list/add/stop medication (auth'd server fn).
- `src/modules/patient-os/vault/vault.functions.ts` — signed upload URL + list files.
- `src/modules/patient-os/timeline/timeline.functions.ts` — read unified timeline (joins events + latest 50).
- `src/modules/patient-os/family/family.functions.ts` — invite/accept/revoke family link.
- `src/ai/agents/health/patient-companion-agent.ts` — `BaseAgent` subclass; reads timeline + active meds, uses Lovable AI Gateway (Gemini flash) to produce recommendations, logs to `sun_decisions`.
- Register agent in existing `AgentRegistry`; subscribe to new events on the existing `EventBus`: `PATIENT_MEDICATION_STARTED`, `PATIENT_VAULT_UPLOADED`, `PATIENT_TIMELINE_UPDATED`.

**UI (single new route under existing auth gate):**
- `src/routes/_authenticated/my-health.tsx` — three tabs (Timeline / Medications / Vault), Arabic RTL, uses existing `GlassCard` + medical palette. No new design system.

**What I'm deferring (needs its own turn each):**
- Phase 12 exchange/FHIR/insurance-claims flow — insurance tables already exist; will build claim submission UI + consent-gated API in a follow-up.
- Phase 13 autonomous hospital/pharmacy managers — extends existing agents rather than a new universe; will add one agent per turn.
- Phase 14 AGHI "unified brain" — the existing `SunEngine` + `AgentCoordinator` (Phase 3) already fills this role; will add `ai_learning_feedback` loop + governance policy table in a focused turn.
- Phases 15–20 (economy, IoT, zero-trust, simulation, research lab, final form) — will re-plan each against actual state when we get there. Not committing scaffolding I can't finish.

### What I need you to confirm

1. **OK to reuse `hc_patients` as the patient identity** (not create a new `patients` table)? Every existing appointment/prescription/claim already FKs to it.
2. **Medical vault storage**: private Supabase bucket `medical-vault`, patient-scoped RLS on both bucket and metadata table — OK?
3. **Companion agent LLM**: Gemini 2.5 Flash via Lovable AI Gateway (free tier), read-only recommendations, no auto-actions — OK?
4. **UI scope**: single `/my-health` route this turn (no separate pages for family/vault yet — tabs) — OK?

Once you confirm, I ship Phase 11 in one build turn (migration + code + route + agent registration + typecheck).