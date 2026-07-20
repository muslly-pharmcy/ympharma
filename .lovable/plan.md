# Phase 4 — Shipment C4: Insurance + Clinical Validation Framework

Accepting the split. C4A ships first as a full transactional insurance module. C4B lays the framework — engines behind interfaces with a safe null-provider — so a licensed drug database can be plugged in later without rewrites. No hand-authored clinical rules will be shipped as data.

---

## Shipment C4A — Insurance Platform

### Database (migration, one shot)

New tables under `public`, with RLS, GRANTs, updated_at triggers, and org scoping via `organization_id`:

- `insurance_providers` — payer directory (name, code, contact, active).
- `insurance_plans` — plans per provider (name, tier, formulary_ref, effective range).
- `patient_insurance` — patient ↔ plan link (policy_number, group_number, holder, primary/secondary, status).
- `insurance_policy_members` — dependents on a policy (relation, dob).
- `insurance_authorizations` — pre-auth records (status, reference, valid range, notes).
- `insurance_claims` — claim header (patient_id, dispense_id, provider_id, plan_id, status, totals, submitted_at, adjudicated_at).
- `insurance_claim_items` — per-line (product_id, qty, billed, allowed, copay, coinsurance, deductible, paid, reason_code).
- `insurance_payment_responses` — payer remittances (claim_id, amount, method, reference, received_at, raw_payload jsonb).

Reuse existing `ins_companies` / `ins_patient_coverage` / `insurance_claims` where compatible — audit their columns and either extend or namespace new ones as `insv2_*`. Decision made in the migration itself based on schema read.

Status machine on `insurance_claims`:
`draft → submitted → in_review → approved | partially_approved | rejected → paid | closed` (cancelled terminal).

### Domain layer (`src/domain/insurance/`)

- `schemas.ts` — Zod for providers, plans, coverage, claims, items, auth.
- `commands.ts` — inputs for verify/create/submit/approve/reject/reconcile.
- `state-machine.ts` — `ALLOWED_TRANSITIONS` for claim status, pure guard function + unit test.

### Server layer

- `src/lib/insurance.functions.ts` — reads: `listInsuranceProviders`, `listPlans`, `getCoverage`, `listClaims`, `getClaim`.
- `src/lib/insurance.mutations.functions.ts` — writes: `verifyCoverage`, `createClaim`, `submitClaim`, `approveClaim`, `rejectClaim`, `reconcileClaim`, `recordPayment`, `createAuthorization`.
- All mutations: `getActor()` → `requirePermission()` → idempotency key → org scoping → `audit()` → `emit_domain_event()`.

### Permissions (extend `session.server.ts`)

`insurance.read`, `insurance.write`, `insurance.approve`.
- viewer/staff: read
- pharmacist: read + write (claims, verify)
- manager: + approve
- admin/owner: all

### Domain events

`insurance.verified`, `insurance.claim.created|submitted|approved|rejected|paid`, `insurance.authorization.created`.

### UI

- `/_authenticated/insurance/index.tsx` — providers + plans list with search.
- `/_authenticated/insurance/coverage.tsx` — patient coverage lookup + verify.
- `/_authenticated/insurance/claims.tsx` — claims list with status filter.
- `/_authenticated/insurance/claims.$claimId.tsx` — claim detail with state-driven actions, items table, authorization panel, payment responses timeline.

Glassmorphism + RTL, matching C1/C2/C3.

---

## Shipment C4B — Clinical Validation Framework

No clinical facts are shipped as data. The framework accepts pluggable providers; the default provider is a `NullProvider` that returns "no data available — pharmacist review required" for every check.

### Provider interface (`src/domain/clinical/providers.ts`)

```ts
export interface DrugKnowledgeProvider {
  readonly id: string;
  readonly source: 'null' | 'external';
  getDrugInteractions(drugs: DrugRef[]): Promise<InteractionFinding[]>;
  getContraindications(drug: DrugRef, patient: PatientContext): Promise<Finding[]>;
  getDoseRecommendations(drug: DrugRef, patient: PatientContext): Promise<DoseFinding[]>;
  getAllergyWarnings(drugs: DrugRef[], allergies: AllergyRef[]): Promise<Finding[]>;
  getPregnancyWarnings(drug: DrugRef, patient: PatientContext): Promise<Finding[]>;
  getRenalAdjustments(drug: DrugRef, renal: RenalStatus): Promise<DoseFinding[]>;
  getHepaticAdjustments(drug: DrugRef, hepatic: HepaticStatus): Promise<DoseFinding[]>;
}
```

### Engines (`src/lib/clinical/`)

Each engine is a pure function that calls the injected provider and normalizes results to a common `Finding { severity, code, message, source, evidence_url? }`.

- `allergy-engine.ts` — cross-refs `patient_allergies` with drug ingredients from provider.
- `interaction-engine.ts`
- `contraindication-engine.ts`
- `dose-engine.ts`
- `pregnancy-engine.ts`
- `renal-engine.ts`
- `hepatic-engine.ts`

### Orchestrator (`src/lib/clinical/validator.server.ts`)

`validatePrescription(prescriptionId)` runs all engines in parallel, dedupes findings, persists to a new `clinical_findings` table (per prescription snapshot), returns aggregated warnings.

### Database (single migration)

- `clinical_providers` — registered providers (id, name, source, active, config jsonb).
- `clinical_findings` — per-prescription snapshot (prescription_id, engine, severity, code, message, source, evidence, created_at).
- `clinical_review_decisions` — pharmacist ack/override (finding_id, decision, rationale, decided_by, decided_at).

RLS: same org scoping; only `prescription.read` sees findings, only `prescription.write` records decisions.

### Provider registry

`src/lib/clinical/registry.server.ts` selects the active provider from `clinical_providers` or falls back to `NullProvider`. Zero external HTTP calls in default build.

### UI integration

- On `/prescriptions/$prescriptionId`: "Clinical Validation" panel — button to run validation, findings table grouped by severity, per-finding acknowledge/override with rationale.
- On dispense flow: warnings surfaced before "Prepare", never blocking — pharmacist decides.

### Safety invariants (asserted in code + tests)

1. No automatic rejection based on clinical findings — always advisory.
2. `NullProvider` returned findings must be labeled `severity: 'unknown', source: 'null'`.
3. All findings and decisions written to `audit_events` and emitted as domain events.

### Domain events

`clinical.validation.started|completed`, `clinical.finding.recorded`, `clinical.decision.ack|override`.

---

## Tests

- `tests/insurance-claim-state-machine.test.ts` — transition matrix.
- `tests/clinical-null-provider.test.ts` — default provider returns unknown-severity findings.
- `tests/clinical-validator.test.ts` — orchestrator dedupe + severity aggregation using an in-memory fake provider.

## Acceptance

- Insurance module transacts end-to-end with RBAC + RLS + audit + events.
- Clinical framework exists, defaults to NullProvider, ships zero hand-authored medical facts.
- Prescription detail page surfaces advisory findings; pharmacist retains final decision.
- Typecheck + tests green.

## Sequencing

1. C4A migration (approval gate).
2. C4A domain + server + UI + tests.
3. C4B migration (approval gate).
4. C4B framework + engines + UI hook + tests.

Approve to proceed with step 1 (C4A migration).
