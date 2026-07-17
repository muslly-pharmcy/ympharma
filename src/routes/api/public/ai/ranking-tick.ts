import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/ai/ranking-tick")({
  server: {
    handlers: {
      POST: async () => {
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
