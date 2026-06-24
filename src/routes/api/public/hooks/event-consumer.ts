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

export type HandlerResult =
  | { ok: true; note: string }
  | { ok: false; error: string; dlqNow?: boolean };

export async function handleEvent(
  ev: ClaimedEvent,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any,
): Promise<HandlerResult> {

  switch (ev.event_name) {
    case "TestEvent":
      return { ok: true, note: "test-acknowledged" };

    case "PrescriptionUploaded": {
      // Real handler: run AI vision analysis on the uploaded prescription
      // and create an admin approval request (idempotent per prescription).
      const prescriptionId = ev.entity_id;
      if (!prescriptionId) {
        return { ok: true, note: "prescription-skipped:no-entity-id" };
      }

      // Idempotency: skip if an approval request already exists for this rx.
      const { data: existing } = await supabaseAdmin
        .from("agent_approval_requests")
        .select("id")
        .eq("action_type", "approve_prescription")
        .contains("payload", { prescriptionId } as never)
        .limit(1)
        .maybeSingle();
      if (existing) {
        return { ok: true, note: `prescription-already-queued:${existing.id}` };
      }

      // Resolve a signed URL from the file registry (fallback to legacy image_urls).
      const [{ data: files }, { data: rx }] = await Promise.all([
        supabaseAdmin
          .from("prescription_files")
          .select("bucket, object_path")
          .eq("prescription_id", prescriptionId)
          .is("deleted_at", null)
          .limit(1),
        supabaseAdmin
          .from("prescriptions")
          .select("image_urls, customer_name")
          .eq("id", prescriptionId)
          .maybeSingle(),
      ]);

      let signedUrl: string | null = null;
      const file = (files ?? [])[0] as { bucket: string; object_path: string } | undefined;
      if (file) {
        const { data: signed } = await supabaseAdmin.storage
          .from(file.bucket)
          .createSignedUrl(file.object_path, 600);
        signedUrl = signed?.signedUrl ?? null;
      }
      if (!signedUrl) {
        const legacy = (rx as { image_urls?: string[] } | null)?.image_urls;
        if (Array.isArray(legacy) && legacy.length > 0 && typeof legacy[0] === "string") {
          signedUrl = legacy[0];
        }
      }
      if (!signedUrl) {
        return { ok: false, error: "no_image_for_prescription" };
      }

      // Run AI vision analysis.
      const { analyzePrescriptionImage } = await import(
        "@/lib/prescription-intelligence.server"
      );
      const analysis = await analyzePrescriptionImage(signedUrl);

      const summary =
        analysis.medicines.length > 0
          ? `${analysis.medicines.length} دواء — ناقص: ${analysis.missingMedicines.length}`
          : "وصفة بحاجة لمراجعة يدوية";

      // Create the approval request.
      const correlationId = crypto.randomUUID();
      const { data: created, error: insErr } = await supabaseAdmin
        .from("agent_approval_requests")
        .insert({
          agent_id: "event_consumer",
          correlation_id: correlationId,
          user_phone: null,
          action_type: "approve_prescription",
          payload: { prescriptionId, analysis, source: "event_consumer" } as never,
          customer_message: summary,
          status: "pending",
        } as never)
        .select("id")
        .single();
      if (insErr || !created) {
        return { ok: false, error: insErr?.message ?? "approval_insert_failed" };
      }

      // Best-effort: notify admins/owners.
      try {
        const { data: roles } = await supabaseAdmin
          .from("user_roles")
          .select("user_id")
          .in("role", ["admin", "owner"] as never);
        const ids = Array.from(
          new Set((roles ?? []).map((r: { user_id: string }) => r.user_id)),
        );
        if (ids.length > 0) {
          await supabaseAdmin.from("notifications").insert(
            ids.map((uid) => ({
              user_id: uid,
              type: "prescription_review",
              title: "وصفة جديدة بحاجة لمراجعة",
              body: summary,
              priority: analysis.missingMedicines.length > 0 ? "high" : "medium",
              metadata: { approvalId: (created as { id: string }).id, correlationId } as never,
            })) as never,
          );
        }
      } catch (err) {
        console.error("[event-consumer] notify admins failed", err);
      }

      return { ok: true, note: `prescription-queued:${(created as { id: string }).id}` };
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
