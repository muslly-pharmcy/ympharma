// Internal feedback ingestion endpoint — Phase 3.
// Accepts engagement snapshots from n8n (called ~24h after publish), validates,
// deduplicates, and persists via the Feedback Collector. Always responds 2xx
// for valid auth so n8n does not retry-storm on dedup/no-op (P3-GATE-05).
//
// Auth: x-internal-secret header must equal INTERNAL_API_SECRET (server-only).
import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

function safeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export const Route = createFileRoute("/api/internal/collect-feedback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.INTERNAL_API_SECRET;
        if (!secret) {
          return new Response(JSON.stringify({ ok: false, error: "server_misconfigured" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
        const provided = request.headers.get("x-internal-secret") ?? "";
        if (!provided || !safeEq(provided, secret)) {
          return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const items = Array.isArray(body) ? body : [body];
        if (items.length === 0 || items.length > 500) {
          return new Response(JSON.stringify({ ok: false, error: "bad_batch_size" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { collectPostFeedback } = await import("@/lib/agent/feedback.collector.server");

        let accepted = 0;
        let duplicates = 0;
        let rejected = 0;
        const errors: string[] = [];

        for (const item of items) {
          const r = await collectPostFeedback(item);
          if (r.ok && r.duplicate) duplicates += 1;
          else if (r.ok) accepted += 1;
          else {
            rejected += 1;
            if (errors.length < 10 && r.reason) errors.push(r.reason);
          }
        }

        return Response.json({ ok: true, accepted, duplicates, rejected, errors });
      },
    },
  },
});
