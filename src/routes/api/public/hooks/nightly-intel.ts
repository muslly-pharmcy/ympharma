import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/nightly-intel")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Light authn: require the project anon apikey header (matches the cron caller).
        const apikey = request.headers.get("apikey") ?? "";
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
        if (!apikey || !expected || apikey !== expected) {
          return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin.rpc("rebuild_customer_intel");
          if (error) {
            return new Response(JSON.stringify({ ok: false, error: error.message }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }
          return new Response(JSON.stringify({ ok: true, result: data }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return new Response(JSON.stringify({ ok: false, error: msg }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
      GET: async () =>
        new Response(JSON.stringify({ ok: true, hint: "POST with apikey header to trigger" }), {
          headers: { "Content-Type": "application/json" },
        }),
    },
  },
});
