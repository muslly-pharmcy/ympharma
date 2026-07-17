import { createFileRoute } from "@tanstack/react-router";
import { requireCronAuth } from "@/middleware/cron-auth";
import { drainPhoenixEvents } from "@/ai/core/phoenix-bridge";
import { routeEvent } from "@/ai/core/event-router";
import { registry } from "@/ai/bootstrap";
import { DecisionEngine } from "@/ai/core/decision-engine";
import type { AIEvent } from "@/ai/core/types";

/**
 * POST /api/public/ai/sun-tick
 *
 * Cron-authenticated worker for the AI Sun Core.
 * 1. Drain unprocessed Phoenix agent_events → ai_events queue.
 * 2. Consume up to N pending ai_events, dispatch through the agent registry,
 *    log to ai_decisions, record experience in ai_memory, mark event completed/failed.
 * 3. If AI_NEURAL_ENABLE=1, best-effort store the decision as a neural
 *    memory (pgvector) for semantic recall. Failures never block the tick.
 *
 * Auth: `x-cron-secret` header (CRON_SECRET env). No PII returned.
 */
export const Route = createFileRoute("/api/public/ai/sun-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = requireCronAuth(request);
        if (denied) return denied;

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { MemoryManager } = await import(
          "@/ai/memory/memory-manager.server"
        );

        const decisionEngine = new DecisionEngine();
        const memory = new MemoryManager(supabaseAdmin);

        const neuralEnabled = process.env.AI_NEURAL_ENABLE === "1";
        const NeuralMemoryMod = neuralEnabled
          ? await import("@/ai/memory/neural-memory.server").catch(() => null)
          : null;
        const neural = NeuralMemoryMod
          ? new NeuralMemoryMod.NeuralMemory(supabaseAdmin)
          : null;

        // 1) Bridge Phoenix → Sun
        const bridge = await drainPhoenixEvents(50);

        // 2) Consume Sun queue
        const { data: pending, error: qErr } = await supabaseAdmin
          .from("ai_events")
          .select("id, event_type, source, payload, priority, target_agent")
          .eq("status", "pending")
          .order("created_at", { ascending: true })
          .limit(50);

        if (qErr) {
          return Response.json(
            { ok: false, stage: "queue", error: qErr.message, bridge },
            { status: 500 },
          );
        }

        let processed = 0;
        let failed = 0;
        let skipped = 0;
        let memories = 0;
        let neuralStored = 0;
        const errors: string[] = [];

        for (const row of pending ?? []) {
          const event: AIEvent & { id: string } = {
            id: row.id as string,
            event_type: row.event_type as string,
            source: (row.source as string) ?? "sun",
            payload: (row.payload as Record<string, unknown>) ?? {},
            priority: (row.priority as AIEvent["priority"]) ?? "normal",
            target_agent: (row.target_agent as string | null) ?? undefined,
          };

          const agentName = routeEvent(event);
          if (!agentName) {
            skipped += 1;
            continue;
          }
          const agent = registry.get(agentName);
          if (!agent) {
            skipped += 1;
            continue;
          }

          const started = Date.now();
          await supabaseAdmin
            .from("ai_events")
            .update({ status: "processing" })
            .eq("id", event.id);

          try {
            const result = (await agent.execute(event)) as {
              type?: string;
              confidence?: number;
              result?: unknown;
            };

            const decisionId = await decisionEngine.decideAndPersist(
              supabaseAdmin,
              { event, agentName, startedAt: started, result },
            );

            await supabaseAdmin
              .from("ai_events")
              .update({
                status: "completed",
                processed_at: new Date().toISOString(),
              })
              .eq("id", event.id);

            // Experience memory — never abort the tick on failure.
            try {
              await memory.remember({
                agent: agentName,
                type: "experience",
                context: {
                  event_type: event.event_type,
                  decision_type: result?.type ?? "generic",
                  decision_id: decisionId,
                  event_id: event.id,
                  latency_ms: Date.now() - started,
                },
                importance: Number(result?.confidence ?? 0.5),
              });
              memories += 1;
            } catch (memErr) {
              errors.push(
                `mem ${event.id}: ${memErr instanceof Error ? memErr.message : String(memErr)}`,
              );
            }

            // Optional neural memory — feature-flagged.
            if (neural && decisionId) {
              try {
                const summary = `[${agentName}] ${event.event_type} → ${result?.type ?? "generic"} (confidence=${result?.confidence ?? 0.5})`;
                await neural.store({
                  owner_type: "agent",
                  owner_id: null,
                  category: "decision",
                  content: summary,
                  metadata: {
                    agent: agentName,
                    event_id: event.id,
                    decision_id: decisionId,
                    confidence: result?.confidence ?? 0.5,
                  },
                  importance: Number(result?.confidence ?? 0.5),
                });
                neuralStored += 1;
              } catch (nErr) {
                errors.push(
                  `neural ${event.id}: ${nErr instanceof Error ? nErr.message : String(nErr)}`,
                );
              }
            }

            processed += 1;
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push(`${event.id}: ${msg}`);
            failed += 1;
            await supabaseAdmin
              .from("ai_events")
              .update({
                status: "failed",
                error_message: msg,
                processed_at: new Date().toISOString(),
              })
              .eq("id", event.id);
          }
        }

        return Response.json({
          ok: true,
          bridge,
          processed,
          failed,
          skipped,
          memories,
          neural_stored: neuralStored,
          neural_enabled: neuralEnabled,
          errors: errors.slice(0, 20),
        });
      },
    },
  },
});
