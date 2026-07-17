// Phase 7 — Public cron-triggered worker for prescription extractions.
// Auth: x-cron-secret header (standard). Called by pg_cron every minute.
import { createFileRoute } from "@tanstack/react-router";
import { verifyCronSecret } from "@/lib/cron-auth.server";

export const Route = createFileRoute("/api/public/hooks/prescription-extract")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauth = verifyCronSecret(request);
        if (unauth) return unauth;

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
        Response.json({ ok: true, hint: "POST with x-cron-secret to run the worker." }),
    },
  },
});
