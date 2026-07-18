import { createFileRoute } from "@tanstack/react-router";
import { requireCronAuth } from "@/middleware/cron-auth";

export const Route = createFileRoute("/api/public/ai/ranking-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = requireCronAuth(request);
        if (denied) {
          console.warn("[ranking-tick] unauthorized cron attempt", {
            ip: request.headers.get("x-forwarded-for") ?? "unknown",
            ua: request.headers.get("user-agent") ?? "unknown",
          });
          return denied;
        }
        try {
          const { refreshDoctorRankings } = await import(
            "@/modules/medical-intelligence/ranking/ranker.server"
          );
          const r = await refreshDoctorRankings();
          return Response.json({ ok: true, ...r });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("[ranking-tick]", message);
          return Response.json({ ok: false, error: message }, { status: 500 });
        }
      },
    },
  },
});
