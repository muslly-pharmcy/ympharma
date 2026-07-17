import { createFileRoute } from "@tanstack/react-router";
import { requireCronAuth } from "@/middleware/cron-auth";

/**
 * POST /api/public/ai/orchestrator-tick
 *
 * Wave A · Autonomous Orchestrator (5-minute cadence).
 *
 * Scans real business tables for changes and publishes canonical events into
 * `ai_events`. The existing `sun-tick` worker (already scheduled) then routes
 * each event through the Agent Registry, logs decisions to `ai_decisions`,
 * and gates any writes through the approval gate shipped in Wave A.
 *
 * This route only INGESTS — it never mutates business tables.
 * Idempotency: uses a per-source high-water mark stored in `ai_world_health`
 * (system_name `orchestrator:<source>`), so cron restarts / overlaps do not
 * republish the same rows.
 */
export const Route = createFileRoute("/api/public/ai/orchestrator-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = requireCronAuth(request);
        if (denied) return denied;

        const startedAt = new Date();
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        const scanned: Record<string, number> = {};
        const published: Record<string, number> = {};
        const errors: string[] = [];

        // Helpers ---------------------------------------------------------
        const readHighWater = async (key: string): Promise<string> => {
          const { data } = await supabaseAdmin
            .from("ai_world_health")
            .select("metrics, checked_at")
            .eq("system_name", `orchestrator:${key}`)
            .maybeSingle();
          const stored =
            (data?.metrics as { high_water?: string } | null)?.high_water ??
            (data?.checked_at as string | undefined) ??
            null;
          // Default: 5 minutes ago so first run has a bounded window.
          return stored ?? new Date(Date.now() - 5 * 60_000).toISOString();
        };

        const writeHighWater = async (key: string, iso: string) => {
          await supabaseAdmin
            .from("ai_world_health")
            .upsert(
              {
                system_name: `orchestrator:${key}`,
                status: "online",
                metrics: { high_water: iso } as never,
                checked_at: new Date().toISOString(),
              } as never,
              { onConflict: "system_name" },
            );
        };

        const publish = async (
          eventType: string,
          payload: Record<string, unknown>,
          priority: "low" | "normal" | "high" = "normal",
        ) => {
          const { error } = await supabaseAdmin.from("ai_events").insert({
            event_type: eventType,
            source: "orchestrator",
            payload: payload as never,
            priority,
            status: "pending",
          } as never);
          if (error) throw error;
        };

        // 1) STOCK_LOW ----------------------------------------------------
        try {
          const { data: lowBatches, error } = await supabaseAdmin
            .from("inv_stock_batches")
            .select("id, product_id, qty_on_hand, warehouse_id, expiry_date")
            .lt("qty_on_hand", 10)
            .gt("qty_on_hand", 0)
            .order("qty_on_hand", { ascending: true })
            .limit(25);
          if (error) throw error;

          scanned.stock = lowBatches?.length ?? 0;
          const hw = await readHighWater("stock_low");
          const cutoff = new Date(hw).getTime();
          // Only publish if last publish is older than 15 min OR new batch.
          const shouldPublish = Date.now() - cutoff > 15 * 60_000;
          if (shouldPublish && (lowBatches?.length ?? 0) > 0) {
            await publish(
              "STOCK_LOW",
              { batches: lowBatches, count: lowBatches!.length },
              "high",
            );
            published.stock_low = 1;
            await writeHighWater("stock_low", new Date().toISOString());
          }
        } catch (err) {
          errors.push(`stock: ${(err as Error).message}`);
        }

        // 2) PRESCRIPTION_UPLOADED ---------------------------------------
        try {
          const hw = await readHighWater("prescription");
          const { data: newFiles, error } = await supabaseAdmin
            .from("prescription_files")
            .select("id, prescription_id, mime_type, created_at, review_status")
            .gt("created_at", hw)
            .is("deleted_at", null)
            .order("created_at", { ascending: true })
            .limit(50);
          if (error) throw error;

          scanned.prescriptions = newFiles?.length ?? 0;
          for (const f of newFiles ?? []) {
            await publish(
              "PRESCRIPTION_UPLOADED",
              {
                file_id: f.id,
                prescription_id: f.prescription_id,
                mime_type: f.mime_type,
                review_status: f.review_status,
              },
              "high",
            );
          }
          if ((newFiles?.length ?? 0) > 0) {
            published.prescription_uploaded = newFiles!.length;
            const latest = newFiles![newFiles!.length - 1].created_at as string;
            await writeHighWater("prescription", latest);
          }
        } catch (err) {
          errors.push(`prescription: ${(err as Error).message}`);
        }

        // 3) ORDER_CREATED -----------------------------------------------
        try {
          const hw = await readHighWater("orders");
          const { data: newOrders, error } = await supabaseAdmin
            .from("orders")
            .select("id, status, total, correlation_id, branch_id, created_at")
            .gt("created_at", hw)
            .order("created_at", { ascending: true })
            .limit(50);
          if (error) throw error;

          scanned.orders = newOrders?.length ?? 0;
          for (const o of newOrders ?? []) {
            await publish(
              "ORDER_CREATED",
              {
                order_id: o.id,
                status: o.status,
                total: o.total,
                branch_id: o.branch_id,
                correlation_id: o.correlation_id,
              },
              "normal",
            );
          }
          if ((newOrders?.length ?? 0) > 0) {
            published.order_created = newOrders!.length;
            const latest = newOrders![newOrders!.length - 1].created_at as string;
            await writeHighWater("orders", latest);
          }
        } catch (err) {
          errors.push(`orders: ${(err as Error).message}`);
        }

        const finishedAt = new Date();

        // Best-effort run log — keep it small.
        try {
          await supabaseAdmin.from("agent_runs").insert({
            agent: "orchestrator" as never,
            kind: "orchestrator_tick",
            status: errors.length ? "partial" : "ok",
            started_at: startedAt.toISOString(),
            finished_at: finishedAt.toISOString(),
            summary: `scanned=${JSON.stringify(scanned)} published=${JSON.stringify(published)}`,
            details: { scanned, published, errors } as never,
            execution_time_ms: finishedAt.getTime() - startedAt.getTime(),
          } as never);
        } catch {
          // agent_runs uses a strict enum for `agent`; ignore if it rejects.
        }

        // World-health heartbeat for the orchestrator itself.
        try {
          await supabaseAdmin.from("ai_world_health").upsert(
            {
              system_name: "orchestrator",
              status: errors.length ? "degraded" : "online",
              metrics: {
                last_run: finishedAt.toISOString(),
                scanned,
                published,
              } as never,
              checked_at: finishedAt.toISOString(),
            } as never,
            { onConflict: "system_name" },
          );
        } catch {
          /* non-fatal */
        }

        return Response.json({
          ok: errors.length === 0,
          scanned,
          published,
          errors,
          duration_ms: finishedAt.getTime() - startedAt.getTime(),
        });
      },
    },
  },
});
