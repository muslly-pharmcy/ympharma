// ☀️ Sun Engine — central orchestrator. Server-only.
// Ingests an event, routes to agents, records decisions and updates memory.

import { routeEvent } from "./event-router";
import { classifyForAgent, type SunDecision } from "./decision-engine";
import { remember } from "./memory-manager.server";

export interface IngestedEvent {
  id: string;
  event_name: string;
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, unknown> | null;
}

export interface IngestResult {
  handled: boolean;
  agents: string[];
  decisions: SunDecision[];
  note: string;
}

export async function ingestEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  ev: IngestedEvent,
): Promise<IngestResult> {
  const started = Date.now();
  const routed = routeEvent(ev.event_name);

  if (routed.agents.length === 0) {
    // Log as observed but not handled — caller decides DLQ vs skip.
    await admin.from("sun_decisions").insert({
      event_id: ev.id,
      event_name: ev.event_name,
      agent_dispatched: null,
      decision: { action: "observe", priority: routed.priority },
      confidence: 50,
      reasoning: "No agent subscribed to this event.",
      outcome: "observed",
      latency_ms: Date.now() - started,
    });
    return { handled: false, agents: [], decisions: [], note: "no-agent" };
  }

  const decisions: SunDecision[] = [];
  for (const agent of routed.agents) {
    const decision = classifyForAgent(agent, ev.event_name, ev.payload);
    decisions.push(decision);

    await admin.from("sun_decisions").insert({
      event_id: ev.id,
      event_name: ev.event_name,
      agent_dispatched: agent,
      decision: {
        action: decision.action,
        priority: routed.priority,
        metadata: decision.metadata,
      },
      confidence: decision.confidence,
      reasoning: decision.reasoning,
      outcome: "dispatched",
      latency_ms: Date.now() - started,
    });

    await admin
      .from("ai_agents")
      .update({ last_dispatched_at: new Date().toISOString() })
      .eq("code", agent);

    // Cumulative memory: track per-agent event frequency.
    try {
      await remember(admin, {
        scope: "agent",
        subjectId: agent,
        key: `event:${ev.event_name}`,
        value: { lastEntityId: ev.entity_id },
        weightDelta: 1,
      });
    } catch (err) {
      console.error("[sun-engine] memory write failed", err);
    }
  }

  return {
    handled: true,
    agents: routed.agents,
    decisions,
    note: `dispatched:${routed.agents.join(",")}`,
  };
}
