
# TITANUS AI BRAIN — Read-Only Architecture Audit

Scope: discovery only. No code, DB, permission, or workflow changes. Evidence gathered from `src/ai/**`, `src/modules/ai-brain/**`, `src/security/ai/**`, cron catalog, and live queries against `ai_agents`, `ai_events`, `ai_decisions`, `sun_decisions`.

## 1. AI Architecture Map

Two parallel brains coexist:

```text
                    ┌──────────────────────────────┐
  events ─────────► │  src/ai/core (Event Bus v1)  │──► ai_events / ai_decisions
                    │  register.ts → 13 agents     │
                    └──────────────────────────────┘
                    ┌──────────────────────────────┐
  cron (1 min) ───► │  src/ai/sun-core (Sun Engine)│──► sun_decisions / sun_memory
                    │  event-router → 7 DB agents  │    ai_memory / ai_neural_memory
                    └──────────────────────────────┘
  extra layer:       src/modules/ai-brain (SuperBrainSovereign, decide())
  security layer:    src/security/ai (guardian, RLS monitor, secret guardian)
```

- Orchestration cron: `ai-sun-tick` (every minute), `ai-orchestrator-tick` (every 5 min), `run-all-agents-12h`, plus 42 other jobs (45 total, all `active=true`).
- Tools registry: 8 tools (`pharmacy/*`, `inventory/*`, `customer/*`) via `src/ai/tools/register.ts` — separate from `ai/core` agent registry.
- Memory stack: `ai_memory`, `ai_neural_memory`, `ai_neural_synaptic_log`, `sun_memory`, plus pgvector store (from earlier phases).

## 2. Current Active AI Components

- **Registered in code (`src/ai/agents/register.ts`)** — 13 agents: pharmacist_agent, prescription_agent, interaction_agent, patient_companion_agent, inventory_agent, expiry_agent, procurement_agent, customer_agent, support_agent, sales_agent, marketing_agent, guardian_agent, brain_agent.
- **Registered in DB (`ai_agents`)** — 7 rows, all `enabled=true`, `health=healthy`: pharmacist, pharmacist_agent, customer_agent, customer_galaxy, inventory, revenue, security_guardian.
- **Tools active** — 8 (product-search, prescription-check, drug-info, stock-query, reorder, expiry-scan, whatsapp-send, notification).
- **Cron active** — 45 jobs including sun/orchestrator/business/content/ranking ticks, backups, health, retention, engagement, WhatsApp retry.
- **UI surfaces** — `/admin-ai-command`, `/admin-ai-brain`, `/admin-sovereign`, `/admin-agent-runs`, `/admin-production-readiness`.

## 3. Inactive / Disconnected Components

- `ai_events` table: **0 rows in any status** — the Event Bus in `src/ai/core/event-bus.ts` is instantiated but nothing publishes. Sun engine bypasses it and reads a different event source.
- `ai_decisions`: **0 rows in last 7 days** — Decision Engine's `decideAndPersist()` path is not being exercised by the live sun-tick loop, which writes to `sun_decisions` instead.
- Code-side agents not present in `ai_agents` DB: prescription_agent, interaction_agent, patient_companion_agent, expiry_agent, procurement_agent, support_agent, sales_agent, marketing_agent, guardian_agent, brain_agent (10 of 13) — invisible to `/admin-ai-command`.
- DB-side agents not present in code registry: `pharmacist` (naked), `customer_galaxy`, `inventory` (naked), `revenue`, `security_guardian` — dispatchable by sun engine but no executor class to run them.
- `SuperBrainSovereign` (`src/modules/ai-brain`) wrapped as `BrainAgent` but has no event subscription; only reachable via manual dashboard call.
- Tool registry (`src/ai/tools/register.ts`) is not wired into agent `.execute()` — tools are addressable but agents do not call the registry.

## 4. Broken Connections

1. **Event Bus vs Sun Engine split** — `EventBus.publish()` writes `ai_events`; sun-tick reads a different event feed and writes `sun_decisions`. Producers and consumers never meet.
2. **Agent naming drift** — code names use `_agent` suffix; DB rows use bare names. Router (`event-router.ts`) maps to code names; sun engine updates DB rows by code name → `last_dispatched_at` never changes (all `nil`).
3. **Duplicate agents** — `pharmacist` + `pharmacist_agent`; `customer_agent` + `customer_galaxy`. Same event routes to two rows / two implementations.
4. **Decision persistence divergence** — `ai_decisions` (used by dashboards) vs `sun_decisions` (used by engine). Dashboards under-report activity.
5. **Tools ↔ agents unwired** — agents don't dispatch through `ToolRegistry`, so permission guards and `ai_tool_events` telemetry are dormant.
6. **`last_dispatched_at` = null everywhere** — no evidence the sun engine ever wrote to `ai_agents` in production despite cron running per minute; likely silent failure or unmatched `code` filter.

## 5. Security Concerns

- Prior SECDEF hardening (v2) is intact; no new anon-executable functions observed. Auditable via `docs/engineering/reports/SECDEF-HARDENING-v2.md`.
- `ai_events`, `ai_decisions`, `sun_decisions` policies: 1 policy each — need re-verification that only `service_role` writes (deferred to Phase 6 of activation).
- `BrainAgent` / `decide()` accepts free-text `userInput` — no PII redaction wired in this path (`AISafetyGuard`/`PIIRedactor` exist under `src/core/ai-safety/` but not invoked from sun-tick).

## 6. Performance Concerns

- 45 active cron jobs, several at `* * * * *` (sun-tick, event-consumer-tick, staff-alerts, rx-notify) with no observed decisions — silent no-op loops burning DB round-trips.
- `sun_decisions` inserts one row per agent per event, unbounded — no retention policy visible in `retention_policies` for this table (needs verification).
- No composite index audit performed on `ai_events(status, created_at)` in this pass.

## 7. Missing Infrastructure

- Unified event contract between publishers (routes, triggers) and consumers (sun-tick, event-consumer-tick).
- Agent-name canonicalization (code ↔ DB).
- Tool dispatch inside agent `.execute()` bodies.
- Feedback / self-learning loop: `agent_feedback_events` and `confidence_calibration_log` tables exist but no writer.
- Brand asset inventory: only `almusalli-golden-mark.png` + `almusalli-golden-og.jpeg` + `almosly-logo.png` present under `src/assets/`; email templates, PDF reports, WhatsApp templates were not verified for logo usage in this read-only pass.

## 8. AI Activation Readiness Score

**48 / 100**

| Dimension | Score | Notes |
|---|---|---|
| Registry & agents | 6/15 | 13 in code, 7 in DB, 10 unmatched |
| Event flow | 3/15 | Bus empty, sun path opaque |
| Decision persistence | 4/10 | Two tables, dashboards misaligned |
| Memory & knowledge | 8/10 | Tables + pgvector present, writers wired |
| Tools | 4/10 | Registered but not dispatched by agents |
| Cron & automation | 8/10 | Comprehensive but noisy |
| Security | 8/10 | SECDEF v2 clean; PII path gap |
| Observability | 4/10 | `agent_runs` populated, decisions not |
| Brand integration | 3/10 | Assets exist; template usage unverified |

## 9. Recommended Activation Roadmap (proposal only)

1. **Canonicalize agent naming** — pick one convention, add compatibility view; align `ai_agents.code` with `register.ts`.
2. **Unify event flow** — pick `ai_events` as the single bus; retire sun-engine's private queue OR add an adapter so sun-tick reads `ai_events`.
3. **Unify decision store** — write to `ai_decisions` from sun-tick (or make `sun_decisions` a materialized view over it).
4. **Wire tools into agents** — invoke `ToolRegistry` from each agent `.execute()`; enforce `tool-permission`.
5. **Enable feedback loop** — populate `agent_feedback_events` from user-visible outcomes; nightly rollup into `confidence_calibration_log`.
6. **Inject `AISafetyGuard`** on any agent that consumes user input (`brain_agent`, `customer_agent`, `support_agent`).
7. **Cron rationalization** — audit `*_tick` jobs writing zero rows; consolidate or lower cadence.
8. **Brand pass** — verify logo in email templates, PDF, WhatsApp templates, admin chrome; document a single brand-guidelines file.

## 10. Priority Order

- **P0 Critical** — (1) agent-name drift, (2) event bus vs sun-engine split. Both block any real activation; every downstream metric is wrong until fixed.
- **P1 High** — (3) decision-store unification, (4) tools ↔ agents wiring, (6) AI safety guard on user-input paths.
- **P2 Medium** — (5) feedback / self-learning wiring, (7) cron rationalization, retention on `sun_decisions`.
- **P3 Low** — (8) brand consistency audit across templates, dashboard copy alignment, dead-code removal in `src/modules/ai-brain` if superseded.

---

Next step (awaiting your GO): tell me which priority to open first. Recommended start is **P0 #1 — agent-name canonicalization plan** (still read-only until you approve implementation).
