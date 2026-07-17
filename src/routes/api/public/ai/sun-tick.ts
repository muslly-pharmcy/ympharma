import { createFileRoute } from "@tanstack/react-router";
import { requireCronAuth } from "@/middleware/cron-auth";
import { drainPhoenixEvents } from "@/ai/core/phoenix-bridge";
import { routeEvent } from "@/ai/core/event-router";
import { registry } from "@/ai/bootstrap";
import type { AIEvent } from "@/ai/core/types";

/**
 * POST /api/public/ai/sun-tick
 *
 * Cron-authenticated worker for the AI Sun Core.
 * 1. Drain unprocessed Phoenix agent_events → ai_events queue.
 * 2. Consume up to N pending ai_events, dispatch through the agent registry,
 *    log to ai_decisions, mark the event completed/failed.
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
            // Leave for a future registered agent — no update.
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

            await supabaseAdmin.from("ai_decisions").insert({
              event_id: event.id,
              agent_name: agentName,
              decision_type: result?.type ?? "generic",
              reasoning: {
                latency_ms: Date.now() - started,
                source: event.source,
              },
              action: (result?.result ?? result) as never,
              confidence: result?.confidence ?? 0.5,
            });

            await supabaseAdmin
              .from("ai_events")
              .update({
                status: "completed",
                processed_at: new Date().toISOString(),
              })
              .eq("id", event.id);

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
          errors: errors.slice(0, 20),
        });
      },
    },
  },
});
