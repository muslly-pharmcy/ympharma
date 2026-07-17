
# Phase 9 + 10 — Adapted to Reality

The blueprint proposes new tables (`health_providers`, `appointment_slots`, `provider_reviews`, `medical_organizations`, `patient_profiles`) that duplicate infrastructure already shipped in earlier phases. Building them as-is would fragment the data model. Below is a plan that delivers the same capabilities on top of what exists.

## Reuse map (do NOT recreate)

| Blueprint table | Existing table used instead |
|---|---|
| `health_providers` | `hc_doctors` + `hc_locations` + `pn_pharmacies` (unified via a `provider_directory` view) |
| `appointment_slots` | `hc_doctor_availability` + `hc_appointments` (already scheduling-capable) |
| `patient_profiles` | `hc_patients` + `customer_profiles` |
| `provider_reviews` | `reviews` (already has 9 cols + 5 policies) |
| `medical_organizations` | `organizations` + `hc_locations` |

## New tables (only what's genuinely missing)

1. **`medical_entities`** — knowledge graph nodes (DISEASE / SYMPTOM / MEDICINE / PROCEDURE / LAB_TEST / SPECIALTY). Name (ar + en), synonyms, ICD/ATC codes when known, metadata JSONB, `embedding vector(768)` for semantic search via pgvector (already enabled).
2. **`medical_relationships`** — typed edges (causes, treats, symptom_of, specialist_for, contraindicates, interacts_with) with confidence + evidence source.
3. **`drug_interactions`** — pairwise ATC/name interaction table with severity + mechanism (seeded from a curated JSON, not scraped).
4. **`telemedicine_sessions`** — session shell (doctor_id, patient_id, status, started/ended, join_token). No video provider yet — foundation only, as the blueprint states.
5. **`provider_ranking_scores`** — precomputed nightly (score, level, factors JSONB) referencing `hc_doctors.id` / `pn_pharmacies.id`; keeps ranking off the hot path.

All 5 tables get RLS + explicit `GRANT`s per project rules (public SELECT on entities/relationships/interactions; authenticated write via server functions only; telemedicine scoped to participants).

## Code layout

```
src/modules/medical-intelligence/
├── knowledge-graph/
│   ├── entities.functions.ts      # search + get entity + neighbors
│   ├── relations.server.ts        # edge traversal helpers
│   └── seed/                      # curated JSON seeds (Arabic medical taxonomy)
├── drug-intelligence/
│   ├── interactions.functions.ts  # checkInteractions(medicineIds[])
│   └── safety.server.ts           # contraindication rules
└── ranking/
    └── ranker.server.ts           # provider score calculator
```

```
src/ai/agents/medical/
├── clinical-research-agent.ts     # uses knowledge graph + Gemini for summaries
├── provider-matching-agent.ts     # symptom → specialty → nearest hc_doctors
├── drug-safety-agent.ts           # interaction + contraindication checks
└── health-concierge-agent.ts      # top-level router
```

Each agent extends the existing `BaseAgent` in `src/ai/core/`.

## Server functions & routes

- `src/lib/knowledge-graph.functions.ts` — `searchEntities`, `getEntityWithNeighbors`, `symptomsToSpecialties`.
- `src/lib/drug-safety.functions.ts` — `checkDrugInteractions`, `getDrugInfo`.
- `src/lib/provider-matching.functions.ts` — `matchProvidersForSymptom`, `rankProvidersForSpecialty`.
- `src/routes/api/public/ai/ranking-tick.ts` — nightly cron endpoint that refreshes `provider_ranking_scores`.

## Public UI (Phase 9 marketplace surface)

- `/find-care` — symptom / specialty search box → ranked doctors + nearby pharmacies (uses matching agent).
- `/doctors/$id` — enriched profile (existing data + reviews + rank badge + booking CTA using existing `hc_appointments` flow).
- Keep existing `/health-tips` etc. untouched.

## Admin surfaces

- `/_authenticated/admin-knowledge-graph` — browse entities, add/edit relationships, import seed batches.
- `/_authenticated/admin-provider-ranking` — read-only leaderboard + manual re-rank trigger.

## Cron

- Nightly at 03:15 UTC: refresh `provider_ranking_scores` (calls ranking-tick).
- Weekly Sunday 02:00 UTC: recompute entity embeddings for any rows where `embedding` is null (uses existing Lovable AI embeddings).

## What is explicitly deferred (called out, not built)

- **Real telemedicine video** — schema only; no WebRTC/Twilio wiring yet.
- **Drug database at scale** — ships with a curated seed (~150 common meds in Yemen + top interactions). Full pharmacological DB requires a licensed data source; flag for the user.
- **EMR / Patient OS** — the blueprint's Phase 11 territory; not started.
- **Verification document workflow** for doctors — form + storage bucket exist via `hc_doctor_join_submissions`; no new columns added to organizations.

## Execution order (single build turn)

1. Migration: 5 new tables + view + RLS + GRANTs + indexes (incl. IVFFlat on `medical_entities.embedding`).
2. Seed curated JSON (Arabic taxonomy: ~40 diseases, ~80 symptoms, ~150 meds, ~200 relationships, ~100 interactions) via a second migration (deterministic, per project rule — no seed server function).
3. Server functions + agents + ranker.
4. Cron scheduling via `supabase--insert`.
5. Public UI (`/find-care`, `/doctors/$id` enrichment) + admin pages.
6. Typecheck; smoke-test one query end-to-end.

## Open questions

Before I build, please confirm:

1. **Scope confirmation** — OK to skip the parallel `health_providers` / `patient_profiles` / `medical_organizations` tables and use existing `hc_*` / `pn_*` / `organizations` / `hc_patients`? (Strongly recommend yes; otherwise we get two conflicting sources of truth.)
2. **Seed language** — Arabic primary, English secondary in `medical_entities` (single row with both), or two rows per concept? I recommend one row with `name_ar` + `name_en` cols.
3. **Public exposure** — should `/find-care` be public (SSR, indexable) or gated behind sign-in? Blueprint implies public.
4. **Skip real video for now** — confirm telemedicine ships as schema + status tracking only in this phase.

Answer these and I'll execute in one pass.
