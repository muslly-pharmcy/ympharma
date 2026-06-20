import { createFileRoute } from "@tanstack/react-router";
import { verifyCronSecret } from "@/lib/cron-auth.server";

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
