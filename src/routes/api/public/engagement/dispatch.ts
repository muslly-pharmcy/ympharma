import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/engagement/dispatch")({
  server: {
    handlers: {
      POST: async () => {
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
