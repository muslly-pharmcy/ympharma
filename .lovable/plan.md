
# Wave A — Gap-Fill Execution Plan (revised)

**Key discovery:** Both target tables already exist with the right schemas:
- `agent_approval_requests` (22 cols, admin-only RLS, action_type check includes `create_order`/`inventory_change`/`transfer`/`price_change`/`refund`)
- `patient_consents` (10 cols, matches proposed v2 exactly — `granted_to_type` supports doctor/hospital/pharmacy/organization/family)

**Result: zero new tables. Wave A becomes pure code + one small RPC.**

---

## A1. Approval Gate (~2 files + 1 UI tab)

### New helper: `src/ai/core/approval-gate.server.ts`
Server-only. Two functions:
- `requestApproval({ agentId, actionType, payload, customerMessage?, correlationId? })` → inserts into `agent_approval_requests`, returns `{ id, status: 'pending' }`. Uses `supabaseAdmin` (called from a `requireSupabaseAuth`-gated fn only).
- `executeIfApproved(id, executor)` → checks status; if `approved`, calls `executor(payload)` and stamps a row in `ai_security_audit` via existing `AuditAgent`.

### New server fns: `src/lib/approvals.functions.ts`
- `listPendingApprovals()` — admin-only, returns pending rows ordered by created_at.
- `decideApproval({ id, decision: 'approved'|'rejected', note? })` — admin-only, verifies role via `has_role`, updates row, logs to `ai_security_audit`.

### UI: extend `/admin-agent-universe`
Add a new "Approvals" tab that lists pending items (agent, action_type, payload preview, customer_message, ai_confidence) with Approve / Reject buttons.

### Wire-through (minimal, non-breaking)
Retrofit **only** these existing agents to route writes through the gate:
- `ProcurementAgent` → `action_type: 'inventory_change'` when it wants to create a real purchase order.
- `WhatsappAgent` → `action_type: 'create_order'` when confidence < 0.9 or number not in `wa_allowlist`.

All other agents untouched.

---

## A2. Patient Consent Management (0 migrations, code only)

Use existing `public.patient_consents` table verbatim. Add:

### RPC: `has_consent(_patient_id uuid, _grantee_type text, _grantee_id uuid, _scope text)`
Security-definer, checks `active AND (expires_at IS NULL OR expires_at > now()) AND revoked_at IS NULL AND scope ? _scope`. Migration is tiny (just this one function) — safe to include.

### Server fns: `src/lib/patient-consent.functions.ts`
- `grantConsent({ grantee_type, grantee_id, scopes: string[], expires_at? })` — patient owns; verifies caller is patient via `patient_belongs_to_current_user`.
- `revokeConsent({ id })` — sets `active=false`, `revoked_at=now()`.
- `listMyConsents()` — returns patient's active grants.

### UI: `src/routes/_authenticated/my-health.tsx` → new tab "الأذونات"
Table of active consents + form to grant a new one (grantee type dropdown + ID input + scope multi-select from `["medications","vault","appointments","allergies","emergency"]` + optional expiry).

---

## A3. Digital Health Wallet (0 migrations, aggregation)

### Server fn: `src/lib/health-wallet.functions.ts` → `getMyWallet()`
Requires auth. Reads existing tables scoped to `hc_patients.user_id = auth.uid()`:
- Identity: name/dob/gender from `hc_patients`
- Medications: `patient_medications`
- Vault files: `medical_vault_files`
- Appointments: `hc_appointments` (upcoming)
- Coverage: `ins_patient_coverage`
- Emergency: allergies + emergency_contact from `hc_patients.metadata`

Returns unified DTO. All existing RLS applies.

### UI: `src/routes/_authenticated/my-health.wallet.tsx`
Tabs: Identity | Coverage | Medications | Vault | Appointments | Consents (from A2) | Emergency Card. Uses Titans/medical design tokens.

### Emergency Card
Printable/QR view rendered **inside the authenticated route** only. Public emergency-card sharing deferred to a later phase (needs signed-token infra + explicit patient opt-in workflow; not blocking anything today).

---

## Sequencing (this turn)

1. Migration: `has_consent` RPC only (10 lines).
2. Create 4 code files (`approval-gate.server.ts`, `approvals.functions.ts`, `patient-consent.functions.ts`, `health-wallet.functions.ts`).
3. Create `src/routes/_authenticated/my-health.wallet.tsx`.
4. Extend `/admin-agent-universe` with Approvals tab (inline, no new route).
5. Wire `ProcurementAgent` + `WhatsappAgent` conservatively (behind feature flag `ai.autonomy.enabled` default off — so behavior is unchanged until admin flips it).
6. Typecheck.

Gate to Wave C: pending approvals show up in admin UI, consent grant + revoke round-trips, wallet page renders for a test patient.

---

## Explicit non-goals for this wave
- No new AI tables.
- No `src/modules/ai/` duplicate folder.
- No public emergency-card token endpoint.
- No changes to non-write agents.
- No changes to existing 156 SECURITY DEFINER functions beyond the one new `has_consent`.
