// Daily retention sweep — runs apply_retention_policies() and cleanup_idempotency_keys().
// Auth: x-cron-secret. Idempotent; safe to run multiple times per day.
import { createFileRoute } from "@tanstack/react-router";
import { requireCronAuth as verifyCronSecret } from "@/middleware/cron-auth";

export const Route = createFileRoute("/api/public/hooks/retention-sweep")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauth = verifyCronSecret(request);
        if (unauth) return unauth;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const summary: Record<string, unknown> = { ok: true, ran_at: new Date().toISOString() };

        try {
          const { data, error } = await supabaseAdmin.rpc("apply_retention_policies" as never);
          if (error) throw new Error(error.message);
          summary.retention = data ?? [];
        } catch (e) {
          summary.retention_error = (e as Error).message;
        }

        try {
          const { data, error } = await supabaseAdmin.rpc("cleanup_idempotency_keys" as never);
          if (error) throw new Error(error.message);
          summary.idempotency_deleted = data ?? 0;
        } catch (e) {
          summary.idempotency_error = (e as Error).message;
        }

        return new Response(JSON.stringify(summary), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
