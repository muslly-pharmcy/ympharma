// Event Bus consumer (Batch 5b) — FIFO drain of agent_events with
// FOR UPDATE SKIP LOCKED, retry counting, and DLQ routing.
//
// Cron-driven (pg_cron + pg_net). Header: x-cron-secret.
// On each tick: claims up to N due events, dispatches per event_name,
// then marks each as processed (or fails -> increments retry / DLQ).
//
// Handlers here are intentionally minimal — Batch 5d will wire real
// side-effects per event. Today the consumer's job is just to drain.

import { createFileRoute } from "@tanstack/react-router";
import { verifyCronSecret } from "@/lib/cron-auth.server";

type ClaimedEvent = {
  id: string;
  event_name: string;
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, unknown> | null;
  source: string;
  occurred_at: string;
  retry_count: number;
};

type Outcome = { id: string; event_name: string; ok: boolean; note: string };

const WORKER = "event-consumer";
const MAX_RETRIES = 5;
const DEFAULT_BATCH = 25;

async function handleEvent(
  ev: ClaimedEvent,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any,
): Promise<{ ok: true; note: string } | { ok: false; error: string }> {
  switch (ev.event_name) {
    case "TestEvent":
      return { ok: true, note: "test-acknowledged" };

    case "PrescriptionUploaded": {
      // Hand-off: prescription review UI polls prescriptions table directly.
      // Mark processed so the queue stays healthy.
      return { ok: true, note: "prescription-acknowledged" };
    }

    case "OrderCreated": {
      // Hand-off: reserve_order_stock is invoked by application flow; the
      // event acts as observable evidence. Future Batch 5d will use this
      // to drive notifications. For now just acknowledge.
      return { ok: true, note: "order-acknowledged" };
    }

    case "RefillDue": {
      // chronic-refills cron already enqueued the campaign rows before
      // emitting this event. Nothing else to do here today.
      return { ok: true, note: "refill-acknowledged" };
    }

    default:
      // Unknown event: don't retry forever, just acknowledge so the queue
      // stays drained. Operators can inspect via /admin-event-bus.
      return { ok: true, note: `unknown:${ev.event_name}` };
  }
}

export const Route = createFileRoute("/api/public/hooks/event-consumer")({
  server: {
    handlers: {
      GET: async () =>
        new Response(
          JSON.stringify({
            ok: true,
            hint: "POST with x-cron-secret. Optional body: {\"batch\": 25}",
          }),
          { headers: { "Content-Type": "application/json" } },
        ),

      POST: async ({ request }) => {
        const denied = verifyCronSecret(request);
        if (denied) return denied;

        const body = await request.json().catch(() => ({} as { batch?: number }));
        const batch = Math.min(Math.max(Number(body?.batch) || DEFAULT_BATCH, 1), 100);
        const started = Date.now();

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const { data: claimed, error: claimErr } = await supabaseAdmin.rpc(
            "claim_agent_events" as never,
            { _limit: batch, _worker: WORKER } as never,
          );
          if (claimErr) {
            return new Response(
              JSON.stringify({ ok: false, stage: "claim", error: claimErr.message }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          const events = (claimed ?? []) as ClaimedEvent[];
          const outcomes: Outcome[] = [];
          let succeeded = 0;
          let failed = 0;
          let dlqMoved = 0;

          for (const ev of events) {
            try {
              const res = await handleEvent(ev, supabaseAdmin);
              if (res.ok) {
                const { error: mkErr } = await supabaseAdmin.rpc(
                  "mark_event_processed" as never,
                  { _event_id: ev.id, _processed_by: WORKER, _error: null } as never,
                );
                if (mkErr) {
                  failed += 1;
                  outcomes.push({ id: ev.id, event_name: ev.event_name, ok: false, note: `mark_failed:${mkErr.message}` });
                } else {
                  succeeded += 1;
                  outcomes.push({ id: ev.id, event_name: ev.event_name, ok: true, note: res.note });
                }
              } else {
                const { data: failRes } = await supabaseAdmin.rpc(
                  "fail_agent_event" as never,
                  { _event_id: ev.id, _processed_by: WORKER, _error: res.error, _max_retries: MAX_RETRIES } as never,
                );
                failed += 1;
                if ((failRes as { moved_to_dlq?: boolean } | null)?.moved_to_dlq) dlqMoved += 1;
                outcomes.push({ id: ev.id, event_name: ev.event_name, ok: false, note: res.error });
              }
            } catch (e) {
              const errMsg = e instanceof Error ? e.message : String(e);
              await supabaseAdmin.rpc(
                "fail_agent_event" as never,
                { _event_id: ev.id, _processed_by: WORKER, _error: errMsg, _max_retries: MAX_RETRIES } as never,
              );
              failed += 1;
              outcomes.push({ id: ev.id, event_name: ev.event_name, ok: false, note: `exception:${errMsg}` });
            }
          }

          return new Response(
            JSON.stringify({
              ok: true,
              worker: WORKER,
              batch_size: batch,
              claimed: events.length,
              succeeded,
              failed,
              dlq_moved: dlqMoved,
              elapsed_ms: Date.now() - started,
              outcomes: outcomes.slice(0, 50),
            }),
            { headers: { "Content-Type": "application/json" } },
          );
        } catch (e) {
          return new Response(
            JSON.stringify({
              ok: false,
              stage: "consumer",
              error: e instanceof Error ? e.message : String(e),
            }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
