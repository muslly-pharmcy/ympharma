import { createFileRoute } from "@tanstack/react-router";
import { requireCronAuth as verifyCronSecret } from "@/middleware/cron-auth";

export const Route = createFileRoute("/api/public/hooks/chronic-refills")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = verifyCronSecret(request);
        if (denied) return denied;
        try {
          const body = await request.json().catch(() => ({} as { discount_pct?: number; limit?: number }));
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin.rpc("enqueue_chronic_refills", {
            _discount_pct: typeof body?.discount_pct === "number" ? body.discount_pct : 15,
            _limit: typeof body?.limit === "number" ? body.limit : 50,
          });
          if (error) {
            return new Response(JSON.stringify({ ok: false, error: error.message }), {
              status: 500, headers: { "Content-Type": "application/json" },
            });
          }
          // Emit RefillDue event into the bus (3rd canonical event after PrescriptionUploaded / OrderCreated).
          await supabaseAdmin.rpc("emit_agent_event" as never, {
            _event_name: "RefillDue",
            _entity_type: "chronic_refill_batch",
            _entity_id: null,
            _payload: (data ?? {}) as never,
            _source: "cron:chronic-refills",
          } as never).then(() => null, () => null);
          return new Response(JSON.stringify({ ok: true, result: data }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          return new Response(
            JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
      GET: async () =>
        new Response(JSON.stringify({ ok: true, hint: "POST with x-cron-secret to enqueue chronic refill WhatsApp messages." }), {
          headers: { "Content-Type": "application/json" },
        }),
    },
  },
});
