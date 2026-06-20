// Phase 7 — Public cron-triggered worker for prescription extractions.
// Call schedule via pg_cron pointing at this URL. Auth: optional header
// EXTRACT_WORKER_SECRET — if set in env, the request must match.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/prescription-extract")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.EXTRACT_WORKER_SECRET;
        if (secret) {
          const header = request.headers.get("x-worker-secret");
          if (header !== secret) return new Response("forbidden", { status: 403 });
        }
        const url = new URL(request.url);
        const limit = Math.min(20, Math.max(1, Number(url.searchParams.get("limit") ?? "5")));
        try {
          const { processPendingExtractions } = await import("@/lib/prescription-extractor.server");
          const out = await processPendingExtractions(limit);
          return Response.json({ ok: true, ...out });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("[rx-extract-worker]", msg);
          return Response.json({ ok: false, error: msg }, { status: 500 });
        }
      },
      GET: async () =>
        Response.json({ ok: true, hint: "POST to run the extraction worker." }),
    },
  },
});
