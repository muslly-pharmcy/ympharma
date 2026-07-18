import { createFileRoute } from "@tanstack/react-router";
import { requireCronAuth } from "@/middleware/cron-auth";

export const Route = createFileRoute("/api/public/engagement/dispatch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = requireCronAuth(request);
        if (denied) {
          console.warn("[engagement/dispatch] unauthorized cron attempt", {
            ip: request.headers.get("x-forwarded-for") ?? "unknown",
            ua: request.headers.get("user-agent") ?? "unknown",
          });
          return denied;
        }
        try {
          const { dispatchDueCampaigns } = await import(
            "@/ai/engagement/campaign-engine.server"
          );
          const result = await dispatchDueCampaigns();
          return Response.json({ ok: true, ...result });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("[engagement/dispatch] failed:", message);
          return Response.json({ ok: false, error: message }, { status: 500 });
        }
      },
    },
  },
});
