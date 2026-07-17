# AI Unification Map — Wave B

**Date:** 2026-07-17
**Status:** ✅ Applied
**Scope:** Wave B of the Phase 27-35 consolidation plan (`.lovable/plan.md`).

---

## Canonical roots

| Concern | Canonical path | Notes |
|---|---|---|
| Core engine + types | `src/ai/core/` | `sun-engine.ts`, `event-bus.ts`, `event-router.ts`, `decision-engine.ts`, `phoenix-bridge.ts`, `types.ts` |
| Agent framework | `src/ai/agents/` | `base-agent.ts` + `register.ts` + subject folders (medical, inventory, customer, business, security, brain) |
| Tools | `src/ai/tools/` | `core/*`, subject folders, `register.ts` |
| Memory | `src/ai/memory/` | `memory-manager.server.ts`, `neural-memory.server.ts` (pgvector via Gemini embeddings) |
| Intelligence engines | `src/ai/intelligence/` | Business, security dashboards backends |
| Bootstrap | `src/ai/bootstrap.ts` | Populates `AgentRegistry` on module load |
| Sovereign decision core | `src/modules/ai-brain/services/SuperBrainSovereign` | **Pure**, I/O-free; wrapped as `BrainAgent` |
| Legacy Sun Core (jsonb) | `src/ai/sun-core/` | ⚠️ **Deprecated** — see its `README.md`; kept for `/admin-sun-core` back-compat |

---

## Duplicate → canonical mapping

| Legacy / duplicate module | Canonical replacement | Migration action |
|---|---|---|
| `src/ai/sun-core/agent-registry.ts` | `src/ai/core/agent-registry.ts` + `src/ai/agents/register.ts` | Frozen; no new agents here |
| `src/ai/sun-core/decision-engine.ts` | `src/ai/core/decision-engine.ts` | Frozen |
| `src/ai/sun-core/event-router.ts` | `src/ai/core/event-router.ts` | Frozen |
| `src/ai/sun-core/sun-engine.server.ts` | `src/ai/core/sun-engine.ts` | Frozen |
| `src/ai/sun-core/memory-manager.server.ts` | `src/ai/memory/memory-manager.server.ts` | Frozen |
| `src/modules/ai-brain/services/SuperBrainSovereign.decide` | Now also reachable via `AgentRegistry.get("brain_agent")` | ✅ Wrapped in `src/ai/agents/brain/brain-agent.ts` |

---

## Registered agents (post-Wave-B)

Populated via `src/ai/bootstrap.ts` → `registerAllAgents`:

| # | Name | Class | Domain |
|---|---|---|---|
| 1 | `pharmacist_agent` | `PharmacistAgent` | medical |
| 2 | `prescription_agent` | `PrescriptionAgent` | medical |
| 3 | `interaction_agent` | `InteractionAgent` | medical |
| 4 | `patient_companion_agent` | `PatientCompanionAgent` | medical |
| 5 | `inventory_agent` | `InventoryAgent` | inventory |
| 6 | `expiry_agent` | `ExpiryAgent` | inventory |
| 7 | `procurement_agent` | `ProcurementAgent` | inventory |
| 8 | `customer_agent` (whatsapp) | `WhatsappAgent` | customer |
| 9 | `support_agent` | `SupportAgent` | customer |
| 10 | `sales_agent` | `SalesAgent` | business |
| 11 | `marketing_agent` | `MarketingAgent` | business |
| 12 | `guardian_agent` | `GuardianAgent` | security |
| 13 | **`brain_agent`** | **`BrainAgent`** | **sovereign (NEW)** |

---

## Call-site inventory (informational)

- `src/ai/` importers: 9 files (typecheck-clean)
- `src/ai/sun-core/` importers: 2 files (`/admin-sun-core` dashboard + its test) — intentionally left in place
- `src/modules/ai-brain/` importers: 5 files (2 hooks, 1 test, 1 admin route, 1 command center)

The Sovereign UI (`/admin-ai-brain`, `SovereignCommandCenter`) still calls `executeNeuralInference` directly for its rich adapter-backed flow. `brain_agent` is the **event-driven** entry point (used by `sun-tick`, cron dispatch, and future autonomous workflows).

---

## What Wave B did NOT change

- No files deleted.
- No database migration.
- No behavior change for existing routes.
- `sun-core/` folder kept for `/admin-sun-core` continuity; new work goes to `src/ai/core/`.

---

## Next

Wave A (Gap-Fill): Approval workflow, Patient Consent Management, Digital Health Wallet.
