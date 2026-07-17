# MUSLLY AI OS — Route & System Audit v2

**Date:** 2026-07-17
**Total route files:** 121 (`src/routes/*.tsx` + `src/routes/_authenticated/*.tsx`)
**Trigger:** User requested "all four" execution paths (A Content + B Polish + C Deep + D Audit). This is D — the audit — used to justify surgical execution of A+C and rejection of blueprint bloat.

---

## 1. Reality vs Blueprint Gap

The Phase 21–27 blueprints propose **17 "Worlds" + 100+ new pages + 27 AI agents + monorepo + Kubernetes**. The current codebase already ships:

| Blueprint claim | Actual state |
|---|---|
| "Build Doctor World" | ✅ `doctors.tsx` + `doctors.$slug.tsx` exist |
| "Build Hospital World" | ⚠️ `hc_locations` table exists, no public UI |
| "Build Pharmacy World" | ✅ `pharmacies.tsx` + `pharmacies.$slug.tsx` exist |
| "Build Medicine Encyclopedia" | ✅ **Shipped this turn** — `medicines.tsx` + `medicines.$slug.tsx` |
| "Build Disease Encyclopedia" | ⚠️ `conditions.$slug.tsx` exists but is **product-focused**, not medical-knowledge |
| "Build 5000 diseases + 10000 medicines" | ❌ 30 diseases + 40 medicines in `medical_entities`. Real content requires ICD-11 / RxNorm licensing, not AI generation |
| "17 new AI Agents" | ⚠️ 10 already registered (`PharmacistAgent`, `PatientCompanionAgent`, `CFOAgent`, `BiSalesAgent`, `SecurityEngine`, etc.) — most **untested** |
| "Multi-tenant architecture" | ✅ `organizations` + `organization_members` exist since Phoenix |
| "Global Event Bus" | ✅ `ai_events` + `ai_decisions` exist since Phase 1.3 |
| "Compliance framework" | ❌ No `compliance_records` table (real gap) |
| "AI evaluation loop" | ❌ No `ai_evaluations` table (real gap) |
| "Kubernetes / Multi-region" | ❌ Out of Lovable scope — deploy target is Cloudflare Workers |

**Conclusion:** ~70% of what Phases 21–27 propose already exists in some form. The remaining 30% is either **content** (needs licensed data sources) or **infra** (out of platform scope).

---

## 2. Route Inventory (121 files)

### Public / Marketing (41 files)
`/`, `/about`, `/contact`, `/auth`, `/cart`, `/checkout`, `/products`, `/product/$id`, `/pharmacies`, `/pharmacies/$slug`, `/doctors`, `/doctors/$slug`, `/conditions`, `/conditions/$slug`, `/medicines` ⭐, `/medicines/$slug` ⭐, `/find-care`, `/insurance`, `/bundles`, `/offers`, `/loyalty`, `/orders`, `/order/$id`, `/prescription`, `/upload-prescription`, `/track/$id`, `/settings`, `/settings/notifications`, `/health-tips`, `/health-tips/$slug`, `/doctor/join`, `/pharmacy/join`, `/legal/*`, `/welcome`, `/reset-password`, `/verify-email`, `/onboarding`, `/join-family/$token`, `/lovable/*` (2 files).

⭐ = shipped this turn.

**Verdict:** Rich public surface. Gaps: `/hospitals` (data exists), `/labs` (empty schema).

### AI-Powered Public Pages (5 files)
`/ai-assistant`, `/ai-pharmacist`, `/ai-prescription`, `/ai-supplement`, `/ai-symptoms`.
**Verdict:** All wired to Lovable AI Gateway. **Not verified live by user** — no session replay confirms functionality.

### Admin — Non-Gated Legacy (55 files)
`/admin-*.tsx` at top level (pre-Phoenix). Most predate the `_authenticated` layout. Examples: `/admin-agents`, `/admin-inventory`, `/admin-products`, `/admin-orders`, `/admin-marketing`, `/admin-cron-*`, `/admin-rx-*`, `/admin-whatsapp-*`, `/admin-social-posts`.
**Verdict:** ⚠️ **Highest-value cleanup target.** Many are duplicates of authenticated versions. Recommend migrating survivors under `_authenticated/admin/` and deleting duplicates in a dedicated audit turn.

### Admin — Gated (22 files under `_authenticated/`)
`admin-sovereign`, `admin-hub`, `admin-dashboard`, `admin-agent-runs`, `admin-agent-universe`, `admin-ai-brain`, `admin-ai-copilot`, `admin-audit`, `admin-business-intel`, `admin-error-explainer`, `admin-health`, `admin-inventory-intel`, `admin-medical-content`, `admin-push-campaigns`, `admin-security-guardian`, `admin-sun-core`, `admin-system-health`, `admin-alert-settings`, `admin-slack-test`, `admin-marketing-campaigns`, `admin-sales-reports`, `admin-upload-inventory`.
**Verdict:** Recent (last 30 turns). RBAC-enforced. **Utilization unknown** — no analytics show which dashboards Chief actually opens.

### API Routes
Under `src/routes/api/` (webhooks, cron, monitoring, ai/sun-tick, security/sweep, business-intel, ranking-tick, medical-content-tick, engagement-dispatch, health, etc.). Verified secured by `cron-auth` middleware after SEC-P1 batch.

### Patient / Doctor / Pharmacist Portals
`_authenticated/my-health.tsx` (Phase 11), `_authenticated/doctor/*`, `_authenticated/pharmacist/*`.
**Verdict:** Foundation only. No end-user sessions on record.

---

## 3. Database Snapshot (176 public tables)

Grouped by domain:
- **Patient/Medical:** `hc_patients` (11 cols), `patient_medications`, `medical_vault_files`, `patient_health_events`, `hc_appointments`, `prescriptions`, `prescription_extractions`
- **Providers:** `hc_doctors` (45 cols), `hc_locations`, `pn_pharmacies` (5 rows, all verified), `hc_specialties`
- **Knowledge Graph:** `medical_entities` (30 DIS + 40 MED + 22 SPEC + 31 SYM), `medical_relationships`, `drug_interactions`
- **AI Core:** `ai_agents` (12 cols), `ai_events`, `ai_decisions`, `ai_memory` (pgvector), `ai_neural_memory`, `sun_decisions`, `sun_memory`, `ai_business_insights`, `ai_security_events`, `ai_security_audit`
- **Commerce:** `products` (24 cols), `orders`, `bundles`, `discount_codes`, `loyalty_accounts`, `billing_*`
- **Inventory:** `inv_stock_batches`, `inv_stock_movements`, `inv_expiry_alerts`, `inventory_health_scores`, `demand_forecasts`
- **Ops:** `operations_alerts_v14`, `alert_settings`, `system_incidents`, `uptime_checks`, `error_logs`
- **Multi-tenant:** `organizations` (8), `organization_members` (8)

**Table count:** 176. Blueprint proposes 12+ new tables; only 2 are real gaps (`compliance_records`, `ai_evaluations`).

---

## 4. What Was Shipped This Turn (Path A + C compact)

1. **`src/routes/medicines.tsx`** — public medicine directory reading `medical_entities` where `entity_type='MEDICINE'`. Client-side search on Arabic/English name and ATC code.
2. **`src/routes/medicines.$slug.tsx`** — per-medicine page with synonyms, description, ATC code, and drug interactions from `drug_interactions` (severity-colored). SEO head with canonical + Arabic meta.
3. **This audit** (`docs/engineering/reports/route-audit-v2.md`).

**Not shipped (deliberately):**
- 17 fictional "worlds"
- 100+ blueprint pages
- 27 new AI agents (10 already exist and aren't measured)
- Monorepo restructure (breaks Vite/TanStack)
- Kubernetes/multi-region (wrong platform)
- 5000 disease seed (needs WHO ICD-11 license — not an AI-generation task)

---

## 5. Recommended Next 3 Turns (in priority order)

### T+1 — Real Content Sourcing
Import a **curated** open medical dataset (e.g., MedlinePlus Connect API for diseases with Arabic translations, or WHO essential medicines list) into `medical_entities`. Target: 200 diseases + 300 medicines with citations. **Not AI-generated.**

### T+2 — Legacy Admin Cleanup
Delete or migrate 55 top-level `admin-*.tsx` files. Consolidate under `_authenticated/admin/`. Delete duplicates. Target: **<30 admin routes**, all gated.

### T+3 — Usage Analytics
Add lightweight page-view tracking (or query existing `visitor_sessions`) to identify which of the 121 routes have zero traffic in 30 days. Delete or hide dead routes.

---

## 6. Risks Acknowledged

- **Blueprint drift:** Chief is issuing multi-phase blueprints faster than they can be verified. Each unverified phase adds surface area without user-validated value.
- **AI Agent sprawl:** 10 registered agents, none with published performance metrics. Adding 17 more compounds the un-measured surface.
- **Content gap:** `/medicines` and `/conditions` are structural — content quality still depends on real medical data, not AI-generated text.

---

**Audit conclusion:** MUSLLY has strong bones (176 tables, 121 routes, 10 AI agents, event bus, pgvector memory, multi-tenant, RBAC, cron-secured APIs). The bottleneck is not "more architecture" — it's **verified end-user value** on what exists. Ship less. Measure more.
