import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/run-loyalty-reminder")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey") ?? request.headers.get("x-api-key");
        if (!apiKey || apiKey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const { runLoyaltyReminderCron } = await import("@/lib/marketing-cron.server");
          const result = await runLoyaltyReminderCron({ maxPoints: 50, limit: 200 });
          return Response.json({ ok: true, ...result });
        } catch (e) {
          console.error("[cron run-loyalty-reminder]", e);
          return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
