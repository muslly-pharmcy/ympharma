import { createFileRoute } from "@tanstack/react-router";
import { requireCronAuth as verifyCronSecret } from "@/middleware/cron-auth";

export const Route = createFileRoute("/api/public/hooks/weekly-exec-report")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = verifyCronSecret(request);
        if (denied) return denied;
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin.rpc("weekly_exec_report_build");
          if (error) {
            return new Response(JSON.stringify({ ok: false, error: error.message }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }
          return new Response(JSON.stringify({ ok: true, report: data }), {
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
        new Response(JSON.stringify({ ok: true, hint: "POST with x-cron-secret header to build report." }), {
          headers: { "Content-Type": "application/json" },
        }),
    },
  },
});
