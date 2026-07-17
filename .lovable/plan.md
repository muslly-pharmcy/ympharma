## Scope

Build Phases 3, 4, and 5 of the AI Sun architecture on top of the existing `src/ai/core/`, `src/ai/agents/`, and `src/ai/memory/` foundation established in Phase 1.2 + 1.3 + 2.

The blueprint is adapted to reality — the current codebase already has:
- `src/ai/core/` (SunEngine, EventBus, AgentRegistry, DecisionEngine)
- `src/ai/agents/base-agent.ts` + `pharmacist-agent.ts`
- `src/ai/memory/memory-manager.server.ts` + `neural-memory.server.ts`
- `agent_events`, `ai_events`, `ai_decisions`, `ai_memory`, `ai_neural_memory` tables
- Sun tick worker at `src/routes/api/public/ai/sun-tick.ts`

So I will extend, not duplicate.

---

## PHASE 3 — Agent Universe

**New agents** (each extends existing `BaseAgent`, records to `ai_memory`):
- `src/ai/agents/medical/prescription-agent.ts` — routes `PRESCRIPTION_UPLOADED` to review queue
- `src/ai/agents/medical/interaction-agent.ts` — drug-interaction stub (Gemini-ready)
- `src/ai/agents/inventory/inventory-agent.ts` — reads `STOCK_LOW`, decides reorder
- `src/ai/agents/inventory/expiry-agent.ts` — hooks `inv_expiry_alerts`
- `src/ai/agents/inventory/procurement-agent.ts` — recommendation stub
- `src/ai/agents/customer/whatsapp-agent.ts` — reply intent classification
- `src/ai/agents/customer/support-agent.ts` — escalation logic
- `src/ai/agents/business/sales-agent.ts`, `marketing-agent.ts` — analytics stubs
- `src/ai/agents/security/guardian-agent.ts` — anomaly log

**Reorganize** existing pharmacist agent into `medical/` folder; keep re-export shim for back-compat.

**Registry**: `src/ai/agents/register.ts` centralizes `registry.register(...)` calls; sun-tick imports this.

**Permissions**: new migration for `ai_agent_permissions` table (agent_name, permission) + seed rows. Admin-only RLS.

---

## PHASE 4 — Tool Universe + Autonomous Actions

**Tool framework** under `src/ai/tools/core/`:
- `tool-interface.ts` — `AITool { name, description, permissions, execute }`
- `tool-registry.ts` — Map-based registry
- `tool-engine.ts` — resolves + executes with permission guard
- `tool-permission.ts` — `canExecute(tool, grantedPermissions)`

**First tools** (server-only, use `supabaseAdmin` loaded inside execute):
- `pharmacy/product-search.tool.ts` — searches `catalog_products`
- `pharmacy/prescription-check.tool.ts` — reads `prescription_extractions`
- `pharmacy/drug-info.tool.ts` — Gemini via Lovable AI Gateway
- `inventory/stock-query.tool.ts` — reads `branch_inventory`
- `inventory/reorder.tool.ts` — writes `purchase_recommendations` (guarded, needs approval)
- `inventory/expiry-scan.tool.ts` — reads `inv_expiry_alerts`
- `customer/whatsapp-send.tool.ts` — reuses existing WhatsApp dispatch
- `customer/notification.tool.ts` — inserts `notifications`

**BaseAgent extension**: add `tools?: ToolEngine`, `useTool(name, input)`; sun-tick injects a shared ToolEngine.

**Action ledger**: migration for `ai_actions` (agent_name, tool_name, input, output, status, requires_approval). ToolEngine writes every execution.

**Autonomy guard**: mutation tools default `requires_approval=true`, land in `agent_approval_requests` (already exists) — never auto-execute without an admin `ai_actions.approve` grant.

---

## PHASE 5 — World Integration Layer

**Connector framework** under `src/ai/integration/core/`:
- `connector-interface.ts` — `AIConnector { name, connect, health, handle }`
- `connector-manager.ts` — register/broadcast
- `health-monitor.ts` — pings each connector

**Connectors**:
- `whatsapp/whatsapp-connector.ts` — bridges to existing WhatsApp brain
- `pharmacy/order-connector.ts` — listens for `ORDER_CREATED`, enqueues `ORDER_ANALYSIS_REQUIRED` into `agent_events`
- `pharmacy/inventory-connector.ts` — reacts to `STOCK_LOW`
- `pharmacy/customer-connector.ts` — customer profile enrichment
- `n8n/n8n-bridge.ts` — POSTs to `N8N_WEBHOOK_URL` (already-configured secret)
- `analytics/intelligence-connector.ts` — writes to `executive_reports`

**Bootstrap**: `src/ai/integration/bootstrap.ts` registers all; called from sun-tick startup.

**World health**: new migration for `ai_world_health` table. New server route `src/routes/api/public/ai/world-health.ts` (cron-secret guarded) — pg_cron runs every 5 min.

**Admin UI** additions to `/admin-sun-core`:
- Agent Universe tab — list registered agents, permissions, recent memories per agent
- Tools tab — registry list, recent `ai_actions` with approve/reject
- World tab — connector health table live from `ai_world_health`

---

## Migrations (three, in order)

1. `ai_agent_permissions` + seed
2. `ai_actions` (action ledger)
3. `ai_world_health` + `run_world_health_check()` RPC + pg_cron schedule

All with GRANTs: `service_role` full, `authenticated` SELECT only.

---

## Out of Scope (Phase 6 later)

CFO/CEO agents, sales prediction ML, competitor analysis, growth engine.

---

## Risks & Notes

- Volume of new files (~30). I'll batch parallel writes.
- Zero autonomous mutations without admin approval — all tools that write default to `requires_approval=true`.
- No new secrets required; reuses `LOVABLE_API_KEY`, `N8N_WEBHOOK_URL`, `CRON_SECRET`.
- Typecheck runs automatically after edits.
